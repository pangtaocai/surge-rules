/*
 * Surge proxy information panel.
 *
 * Module:
 * https://raw.githubusercontent.com/pangtaocai/surge-rules/master/module/proxy-info-panel.sgmodule
 *
 * Recommended argument format:
 * group=代理策略;label=代理策略;policy=;icon=globe.asia.australia;color=#5E8DEE
 *
 * Optional:
 * - group: policy group name, default "代理策略"
 * - label: title label, default same as group
 * - policy: force a policy/proxy name. If empty, the script tries to read selected policy from group.
 * - icon: panel SF Symbol name, default globe.asia.australia
 * - color: panel icon HEX color, default #5E8DEE
 * - timeout: request timeout in seconds, default 5
 */

const DEFAULTS = {
  group: "代理策略",
  icon: "globe.asia.australia",
  color: "#5E8DEE",
  timeout: 5,
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
      if (!response || response.status < 200 || response.status >= 300) {
        reject(new Error(`HTTP ${response ? response.status : "NO_RESPONSE"}`));
        return;
      }
      resolve(data);
    });
  });
}

function parseJSON(text) {
  try {
    return JSON.parse(text);
  } catch (_) {
    return null;
  }
}

function selectedPolicy(group, forcedPolicy) {
  if (forcedPolicy) return Promise.resolve({ group, policy: forcedPolicy, routedBy: forcedPolicy });

  return httpAPI("GET", `/v1/policy_groups/select?group_name=${encodeURIComponent(group)}`, null)
    .then((result) => {
      const policy = result && (result.policy || result.selected || result.now);
      return {
        group,
        policy: policy || group,
        routedBy: policy || group,
      };
    })
    .catch(() => ({
      group,
      policy: group,
      routedBy: group,
    }));
}

function geo(policy) {
  const request = {
    url: "http://ip-api.com/json/?lang=zh-CN&fields=status,message,query,country,countryCode,regionName,city,isp,org,as,asname,timezone",
    timeout,
    headers: {
      "User-Agent": "Surge iOS",
      "Cache-Control": "no-cache",
    },
  };

  if (policy) request.policy = policy;

  return httpGet(request)
    .then((data) => {
      const parsed = parseJSON(data);
      if (!parsed || parsed.status !== "success") {
        throw new Error((parsed && parsed.message) || "ip-api failed");
      }
      return normalizeGeo(parsed);
    })
    .catch(() => {
      const fallback = {
        url: "https://api.ip.sb/geoip",
        timeout,
        headers: {
          "User-Agent": "Surge iOS",
          "Cache-Control": "no-cache",
        },
      };
      if (policy) fallback.policy = policy;

      return httpGet(fallback).then((data) => normalizeGeo(parseJSON(data) || {}));
    })
    .catch((error) => ({
      ip: "获取失败",
      country: "",
      countryCode: "",
      region: "",
      city: "",
      isp: error && error.message ? error.message : String(error),
      org: "",
    }));
}

function normalizeGeo(raw) {
  return {
    ip: raw.query || raw.ip || "未知",
    country: raw.country || "",
    countryCode: raw.countryCode || raw.country_code || "",
    region: raw.regionName || raw.region || raw.region_name || "",
    city: raw.city || "",
    isp: raw.isp || raw.organization || raw.org || raw.asname || "",
    org: raw.org || raw.organization || raw.as || "",
  };
}

function flag(countryCode) {
  if (!countryCode || countryCode.length !== 2) return "";
  const code = countryCode.toUpperCase();
  return String.fromCodePoint(code.charCodeAt(0) + 127397) + String.fromCodePoint(code.charCodeAt(1) + 127397);
}

function location(info) {
  const parts = [];
  const mark = flag(info.countryCode);
  if (mark) parts.push(mark);

  if (info.countryCode === "CN") {
    parts.push([info.region, info.city].filter(Boolean).join(" "));
  } else {
    parts.push([info.country || info.region, info.city].filter(Boolean).join(" "));
  }

  return parts.filter(Boolean).join(" ") || "未知";
}

function value(input) {
  return input === undefined || input === null || input === "" ? "未知" : String(input);
}

function option(input, fallback) {
  const text = String(input === undefined || input === null ? "" : input).trim();
  if (!text || /^\{\{\{.+\}\}\}$/.test(text)) return fallback;
  return text;
}

function formatTime(date) {
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");
  return `${hour}:${minute}:${second}`;
}

function panel(title, content) {
  return {
    title,
    content,
    icon,
    "icon-color": color,
  };
}

const args = parseArgument(typeof $argument === "string" ? $argument : "");
const group = option(args.group || args.groupName || args.policyGroup, DEFAULTS.group);
const label = option(args.label, group);
const forcedPolicy = option(args.policy, "");
const icon = option(args.icon, DEFAULTS.icon);
const color = option(args.color, DEFAULTS.color);
const timeout = Number(option(args.timeout, DEFAULTS.timeout));

selectedPolicy(group, forcedPolicy)
  .then((selection) =>
    Promise.all([geo("DIRECT"), geo(selection.routedBy)]).then((results) => ({
      selection,
      local: results[0],
      remote: results[1],
    })),
  )
  .then(({ selection, local, remote }) => {
    finish(
      panel(
        `${label}: ${selection.policy};`,
        [
          `IP: ${value(local.ip)}`,
          `位置: ${location(local)}`,
          `运营商: ${value(local.isp || local.org)}`,
          "",
          `落地 IP: ${value(remote.ip)}`,
          `位置: ${location(remote)}`,
          `运营商: ${value(remote.isp || remote.org)}`,
          `执行时间: ${formatTime(new Date())}`,
        ].join("\n"),
      ),
    );
  })
  .catch((error) => {
    finish(
      panel(
        `${label}: 获取失败;`,
        [`错误: ${error && error.message ? error.message : String(error)}`, `执行时间: ${formatTime(new Date())}`].join("\n"),
      ),
    );
  });
