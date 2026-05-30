/*
 * Surge Network Pro panel.
 *
 * Converted from:
 * https://raw.githubusercontent.com/xcgtb/Egern-Widgets/main/Network-Pro.js
 *
 * Surge panels return text payloads, not Egern widget trees. This script keeps
 * the original diagnostic checks and renders them as a Surge information panel.
 */

const DEFAULTS = {
  group: "代理策略",
  label: "网络诊断雷达",
  timeout: 5,
  icon: "waveform.path.ecg",
  color: "#5E8DEE",
};

const FALLBACK_GROUPS = [
  "代理策略",
  "节点选择",
  "手动选择",
  "🚀 节点选择",
  "Proxy",
  "GLOBAL",
];

const BASE_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";
const COMMON_HEADERS = {
  "User-Agent": BASE_UA,
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
};

function finish(panel) {
  if (typeof $done === "function") $done(panel || {});
}

function parseArgument(argument) {
  const text = String(argument || "").trim();
  if (!text) return {};

  if (text[0] === "{") {
    try {
      return JSON.parse(text);
    } catch (_) {
      return {};
    }
  }

  const splitter = text.includes(";") ? ";" : "&";
  return text.split(splitter).reduce((result, segment) => {
    const index = segment.indexOf("=");
    if (index < 0) return result;
    const key = segment.slice(0, index).trim();
    const value = segment.slice(index + 1).trim();
    if (!key) return result;
    result[key] = decodeValue(value);
    return result;
  }, {});
}

function decodeValue(value) {
  if (typeof value !== "string") return value;
  try {
    return decodeURIComponent(value);
  } catch (_) {
    return value;
  }
}

function option(input, fallback) {
  const text = String(input === undefined || input === null ? "" : input).trim();
  if (!text || /^%[^%]+%$/.test(text) || /^\{\{\{.+\}\}\}$/.test(text)) return fallback;
  return text;
}

function httpAPI(method, path, body) {
  return new Promise((resolve, reject) => {
    if (typeof $httpAPI !== "function") {
      reject(new Error("$httpAPI unavailable"));
      return;
    }

    $httpAPI(method, path, body, (result) => {
      if (!result) {
        reject(new Error("empty API response"));
        return;
      }
      if (result.error) {
        reject(new Error(result.error));
        return;
      }
      resolve(result);
    });
  });
}

function httpGet(options) {
  return new Promise((resolve, reject) => {
    $httpClient.get(options, (error, response, data) => {
      if (error) {
        reject(error);
        return;
      }
      resolve({ response: response || {}, body: data || "" });
    });
  });
}

function statusOf(response) {
  return Number(response && (response.status || response.statusCode || response.code || 0));
}

function headersOf(response) {
  const source = (response && response.headers) || {};
  return Object.keys(source).reduce((result, key) => {
    result[key.toLowerCase()] = source[key];
    return result;
  }, {});
}

function parseJSON(text) {
  try {
    return JSON.parse(text);
  } catch (_) {
    return null;
  }
}

function readNetwork() {
  const network = typeof $network === "object" && $network ? $network : {};
  const wifi = network.wifi || {};
  const cellular = network.cellular || {};
  const v4 = network.v4 || {};
  const primaryInterface = network.primaryInterface || "";

  const ssid = wifi.ssid || network.ssid || "";
  const carrier = cellular.carrier || "";
  const radio = cellular.radio || "";

  let name = "未知网络";
  if (ssid) name = `Wi-Fi ${ssid}`;
  else if (carrier || radio) name = `蜂窝 ${[carrier, radio].filter(Boolean).join(" ")}`;
  else if (primaryInterface) name = primaryInterface;

  return {
    name,
    localIp: v4.primaryAddress || network.primaryAddress || "未知",
    gateway: v4.primaryRouter || network.primaryRouter || "未知",
  };
}

function unique(items) {
  return items.filter((item, index) => item && items.indexOf(item) === index);
}

function candidateGroups(group) {
  return unique([group].concat(FALLBACK_GROUPS));
}

function selectGroup(group) {
  return httpAPI("GET", `/v1/policy_groups/select?group_name=${encodeURIComponent(group)}`, null).then((result) => {
    const policy = result && (result.policy || result.selected || result.now);
    if (!policy) throw new Error(`empty policy for ${group}`);
    return { group, policy, routedBy: policy };
  });
}

function trySelectGroups(groups, index) {
  if (index >= groups.length) {
    return Promise.reject(new Error("no available policy group"));
  }

  return selectGroup(groups[index]).catch(() => trySelectGroups(groups, index + 1));
}

function selectedPolicy(group, forcedPolicy) {
  if (forcedPolicy) return Promise.resolve({ group, policy: forcedPolicy, routedBy: forcedPolicy });

  return trySelectGroups(candidateGroups(group), 0).catch(() => ({ group, policy: group, routedBy: group }));
}

function withPolicy(policy, request) {
  const output = Object.assign({}, request);
  if (policy) output.policy = policy;
  return output;
}

function requestOptions(url, timeout, headers) {
  return {
    url,
    timeout,
    headers: headers || COMMON_HEADERS,
    "auto-redirect": false,
    followRedirect: false,
  };
}

function fetchLocalPublic(timeout) {
  return httpGet(withPolicy("DIRECT", requestOptions("https://myip.ipip.net/json", timeout, COMMON_HEADERS)))
    .then(({ body }) => {
      const data = parseJSON(body);
      const info = data && data.data;
      if (info && info.ip) {
        const location = Array.isArray(info.location)
          ? [info.location[1], info.location[2]].filter(Boolean).join(" ")
          : "";
        return { ip: info.ip, loc: location || "未知" };
      }
      throw new Error("empty ipip response");
    })
    .catch(() => ({ ip: "获取失败", loc: "未知" }));
}

function fmtProxyISP(isp) {
  if (!isp) return "未知";
  const s = String(isp);
  if (/it7/i.test(s)) return "IT7 Network";
  if (/dmit/i.test(s)) return "DMIT Network";
  if (/cloudflare/i.test(s)) return "Cloudflare";
  if (/akamai/i.test(s)) return "Akamai";
  if (/amazon|aws/i.test(s)) return "AWS";
  if (/google/i.test(s)) return "Google Cloud";
  if (/microsoft|azure/i.test(s)) return "Azure";
  if (/alibaba|aliyun/i.test(s)) return "阿里云";
  if (/tencent/i.test(s)) return "腾讯云";
  if (/oracle/i.test(s)) return "Oracle Cloud";
  return s.length > 16 ? `${s.slice(0, 16)}...` : s;
}

function getFlag(code) {
  if (!code) return "";
  const normalized = String(code).toUpperCase();
  if (normalized === "TW") return "🇨🇳";
  if (normalized === "XX" || normalized === "OK") return "✅";
  if (!/^[A-Z]{2}$/.test(normalized)) return "";
  return String.fromCodePoint(...normalized.split("").map((char) => 127397 + char.charCodeAt()));
}

function fetchProxyPublic(policy, timeout) {
  return httpGet(withPolicy(policy, requestOptions("http://ip-api.com/json/?lang=zh-CN", timeout, COMMON_HEADERS)))
    .then(({ body }) => {
      const data = parseJSON(body) || {};
      const countryCode = data.countryCode || "XX";
      const flag = getFlag(countryCode);
      return {
        ip: data.query || "获取失败",
        loc: [flag, data.city || data.regionName || data.country || ""].filter(Boolean).join(" ") || "未知",
        isp: fmtProxyISP(data.isp || data.org),
        cc: countryCode,
      };
    })
    .catch(() => ({ ip: "获取失败", loc: "未知", isp: "未知", cc: "XX" }));
}

function fetchPurity(policy, timeout) {
  return httpGet(withPolicy(policy, requestOptions("https://my.ippure.com/v1/info", timeout, COMMON_HEADERS)))
    .then(({ body }) => parseJSON(body) || {})
    .catch(() => ({}));
}

function fetchDelay(policy, url, timeout) {
  const start = Date.now();
  return httpGet(withPolicy(policy, requestOptions(url, timeout, COMMON_HEADERS)))
    .then(() => `${Date.now() - start} ms`)
    .catch(() => "超时");
}

function checkNetflix(policy, timeout) {
  const checkStatus = (id) =>
    httpGet(withPolicy(policy, requestOptions(`https://www.netflix.com/title/${id}`, timeout, COMMON_HEADERS)))
      .then(({ response }) => statusOf(response))
      .catch(() => 0);

  return Promise.all([checkStatus(70143836), checkStatus(81280792)])
    .then(([full, original]) => {
      if (full === 200) return "OK";
      if (original === 200) return "🍿";
      return "❌";
    })
    .catch(() => "❌");
}

function checkDisney(policy, timeout) {
  return httpGet(withPolicy(policy, requestOptions("https://www.disneyplus.com", timeout, COMMON_HEADERS)))
    .then(({ response }) => {
      const status = statusOf(response);
      const headers = headersOf(response);
      const location = String(headers.location || "");
      if (status === 403 || location.includes("unavailable")) return "❌";
      return "OK";
    })
    .catch(() => "❌");
}

function checkTikTok(policy, timeout) {
  return httpGet(withPolicy(policy, requestOptions("https://www.tiktok.com/explore", timeout, COMMON_HEADERS)))
    .then(({ response, body }) => {
      const status = statusOf(response);
      if (status === 403 || status === 401) return "❌";
      if (String(body).includes("Access Denied") || String(body).includes("Please wait...")) return "❌";
      const match = String(body).match(/"region":"([A-Z]{2})"/i);
      return match && match[1] ? match[1].toUpperCase() : "OK";
    })
    .catch(() => "❌");
}

function checkChatGPT(policy, timeout) {
  return httpGet(withPolicy(policy, requestOptions("https://chatgpt.com/cdn-cgi/trace", timeout, COMMON_HEADERS)))
    .then(({ body }) => {
      const match = String(body).match(/loc=([A-Z]{2})/);
      return match && match[1] ? match[1].toUpperCase() : "OK";
    })
    .catch(() => "❌");
}

function checkClaude(policy, timeout) {
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  };

  return httpGet(withPolicy(policy, requestOptions("https://claude.ai/login", timeout, headers)))
    .then(({ response, body }) => {
      const status = statusOf(response);
      const text = String(body);
      if (text.includes("App unavailable") || text.includes("certain regions")) return "❌";
      if (status === 403 && text.includes("1020")) return "❌";
      if (status === 403 && (text.includes("cf-turnstile") || text.includes("Just a moment") || text.includes("Challenge"))) return "OK";
      if (status === 200 || status === 301 || status === 302) return "OK";
      return "❌";
    })
    .catch(() => "❌");
}

function checkGemini(policy, timeout) {
  return httpGet(withPolicy(policy, requestOptions("https://gemini.google.com/app", timeout, COMMON_HEADERS)))
    .then(({ response }) => {
      const headers = headersOf(response);
      const location = String(headers.location || "");
      if (location.includes("faq")) return "❌";
      return "OK";
    })
    .catch(() => "❌");
}

function formatUnlock(name, result, cc) {
  let mark = "🚫";
  if (result === "🍿" || result === "APP") mark = result;
  else if (result !== "❌") mark = getFlag(result === "OK" || result === "XX" ? cc : result) || "✅";
  return `${name} ${mark}`;
}

function purityText(data) {
  const isResidential = data && data.isResidential;
  const fraudScore = data && data.fraudScore;

  const nativeText = isResidential === true ? "原生住宅" : isResidential === false ? "商业机房" : "未知属性";
  let riskText = "无数据";
  let riskStyle = "info";
  let color = "#5E8DEE";

  if (fraudScore !== undefined && fraudScore !== null) {
    if (fraudScore >= 70) {
      riskText = `高危 (${fraudScore})`;
      riskStyle = "error";
      color = "#FF3B30";
    } else if (fraudScore >= 30) {
      riskText = `中危 (${fraudScore})`;
      riskStyle = "alert";
      color = "#FF9500";
    } else {
      riskText = `纯净 (${fraudScore})`;
      riskStyle = "good";
      color = "#34C759";
    }
  }

  return { nativeText, riskText, riskStyle, color };
}

function formatTime(date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function value(input) {
  return input === undefined || input === null || input === "" ? "未知" : String(input);
}

function panel(title, content, style, icon, color) {
  return {
    title,
    content,
    style,
    icon,
    "icon-color": color,
  };
}

const args = parseArgument(typeof $argument === "string" ? $argument : "");
const group = option(args.group || args.GROUP, DEFAULTS.group);
const forcedPolicy = option(args.policy || args.POLICY, "");
const label = option(args.label || args.LABEL, DEFAULTS.label);
const timeout = Number(option(args.timeout || args.TIMEOUT, DEFAULTS.timeout));
const icon = option(args.icon || args.ICON, DEFAULTS.icon);
const normalColor = option(args.color || args.COLOR, DEFAULTS.color);
const network = readNetwork();

selectedPolicy(group, forcedPolicy)
  .then((selection) => {
    const proxyPolicy = selection.routedBy;
    return Promise.all([
      fetchLocalPublic(timeout),
      fetchProxyPublic(proxyPolicy, timeout),
      fetchPurity(proxyPolicy, timeout),
      fetchDelay("DIRECT", "http://www.baidu.com", 2),
      fetchDelay(proxyPolicy, "http://cp.cloudflare.com/generate_204", 2),
      checkNetflix(proxyPolicy, timeout),
      checkDisney(proxyPolicy, timeout),
      checkTikTok(proxyPolicy, timeout),
      checkChatGPT(proxyPolicy, timeout),
      checkClaude(proxyPolicy, timeout),
      checkGemini(proxyPolicy, timeout),
    ]).then((results) => ({ selection, results }));
  })
  .then(({ selection, results }) => {
    const [localPublic, proxyPublic, purity, localDelay, proxyDelay, netflix, disney, tiktok, chatgpt, claude, gemini] = results;
    const purityInfo = purityText(purity);
    const video = [
      formatUnlock("NF", netflix, proxyPublic.cc),
      formatUnlock("DP", disney, proxyPublic.cc),
      formatUnlock("TK", tiktok, proxyPublic.cc),
    ].join("   ");
    const ai = [
      formatUnlock("GPT", chatgpt, proxyPublic.cc),
      formatUnlock("CL", claude, proxyPublic.cc),
      formatUnlock("GM", gemini, proxyPublic.cc),
    ].join("   ");

    finish(
      panel(
        `${label}: ${selection.policy};`,
        [
          `环境: ${value(network.name)}`,
          `网关: ${value(network.gateway)}`,
          `内网: ${value(network.localIp)}`,
          `公网: ${value(localPublic.ip)}`,
          `位置: ${value(localPublic.loc)}`,
          `本地延迟: ${value(localDelay)}`,
          "",
          `出口: ${value(proxyPublic.ip)}`,
          `落地: ${value(proxyPublic.loc)}`,
          `厂商: ${value(proxyPublic.isp)}`,
          `属性: ${purityInfo.nativeText}`,
          `纯净: ${purityInfo.riskText}`,
          `代理延迟: ${value(proxyDelay)}`,
          "",
          `影视: ${video}`,
          `AI: ${ai}`,
          `执行时间: ${formatTime(new Date())}`,
        ].join("\n"),
        purityInfo.riskStyle,
        icon,
        purityInfo.color || normalColor,
      ),
    );
  })
  .catch((error) => {
    finish(
      panel(
        `${label}: 获取失败;`,
        [`错误: ${error && error.message ? error.message : String(error)}`, `执行时间: ${formatTime(new Date())}`].join("\n"),
        "error",
        "exclamationmark.triangle",
        "#FF3B30",
      ),
    );
  });
