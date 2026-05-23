/*
 * Surge airport traffic monitor.
 *
 * Surge iOS script example:
 * traffic = type=cron,cronexp="0 9 * * *",timeout=30,debug=true,script-path=https://raw.githubusercontent.com/pangtaocai/surge-rules/master/script/traffic.js,script-update-interval=86400,argument=name=MyAirport;url=https://example.com/sub?token=xxx;warn=80;expire=7
 *
 * Recommended argument format:
 * name=MyAirport;url=https://example.com/sub?token=xxx;warn=80;expire=7;policy=DIRECT
 *
 * Required:
 * - url: Surge subscription URL
 *
 * Optional:
 * - name: display name, default "Airport"
 * - warn: traffic usage warning percent, default 80
 * - expire: expiration warning days, default 7
 * - policy: policy used for the HTTP request, default empty
 *
 * This script does not post notifications. It stores the latest result in
 * $persistentStore and prints a summary to the Surge script log.
 */

const DEFAULTS = {
  name: "Airport",
  warn: 80,
  expire: 7,
  timeout: 15,
};

function finish() {
  if (typeof $done === "function") $done();
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

  return text.split(";").reduce((result, segment) => {
    const index = segment.indexOf("=");
    if (index < 0) return result;
    const key = segment.slice(0, index).trim();
    const value = segment.slice(index + 1).trim();
    if (!key) return result;
    result[key] = value;
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

function normalizeHeaders(headers) {
  return Object.keys(headers || {}).reduce((result, key) => {
    result[key.toLowerCase()] = headers[key];
    return result;
  }, {});
}

function parseUserInfo(header) {
  const info = {};
  String(header || "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((part) => {
      const index = part.indexOf("=");
      if (index < 0) return;
      const key = part.slice(0, index).trim().toLowerCase();
      const value = Number(part.slice(index + 1).trim());
      if (Number.isFinite(value)) info[key] = value;
    });

  const upload = info.upload || 0;
  const download = info.download || 0;
  const total = info.total || 0;
  const used = upload + download;
  const remaining = Math.max(total - used, 0);
  const percent = total > 0 ? (used / total) * 100 : 0;

  return {
    upload,
    download,
    total,
    used,
    remaining,
    percent,
    expire: info.expire || 0,
  };
}

function formatBytes(bytes) {
  const value = Number(bytes) || 0;
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  let size = Math.abs(value);
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  const prefix = value < 0 ? "-" : "";
  return `${prefix}${size.toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}

function formatDate(seconds) {
  if (!seconds) return "Unknown";
  const date = new Date(seconds * 1000);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function daysUntil(seconds) {
  if (!seconds) return null;
  return Math.ceil((seconds * 1000 - Date.now()) / 86400000);
}

function hash(input) {
  const text = String(input || "");
  let value = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    value ^= text.charCodeAt(i);
    value += (value << 1) + (value << 4) + (value << 7) + (value << 8) + (value << 24);
  }
  return (value >>> 0).toString(16);
}

function readPrevious(key) {
  try {
    const raw = $persistentStore.read(key);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

function saveCurrent(key, data) {
  try {
    $persistentStore.write(JSON.stringify(data), key);
  } catch (_) {}
}

function log(message) {
  console.log(`[AirportTraffic] ${message}`);
}

const args = parseArgument(typeof $argument === "string" ? $argument : "");
const name = decodeValue(args.name || DEFAULTS.name);
const url = decodeValue(args.url || args.subscribe || args.subscription || "");
const warnPercent = Number(args.warn || DEFAULTS.warn);
const expireWarnDays = Number(args.expire || DEFAULTS.expire);
const policy = decodeValue(args.policy || "");

if (!url || !/^https?:\/\//i.test(url)) {
  log(`${name} 配置错误：请在 argument 里填写 url，例如 name=我的机场;url=https://example.com/sub;warn=80;expire=7`);
  finish();
} else {
  const request = {
    url,
    timeout: Number(args.timeout || DEFAULTS.timeout),
    headers: {
      "User-Agent": "Surge iOS",
      "Cache-Control": "no-cache",
    },
  };

  if (policy) request.policy = policy;

  $httpClient.get(request, (error, response) => {
    if (error) {
      log(`${name} 获取失败：${String(error)}`);
      finish();
      return;
    }

    const status = response && response.status;
    const headers = normalizeHeaders((response && response.headers) || {});
    const userInfo = headers["subscription-userinfo"];

    if (!userInfo) {
      log(`${name} 获取失败：订阅响应没有 subscription-userinfo 头。HTTP 状态：${status || "Unknown"}`);
      finish();
      return;
    }

    const data = parseUserInfo(userInfo);
    const key = `airport-traffic-monitor:${hash(url)}`;
    const previous = readPrevious(key);
    const deltaUsed = previous && Number.isFinite(previous.used) ? data.used - previous.used : null;
    const expireDays = daysUntil(data.expire);
    const isTrafficWarning = data.total > 0 && data.percent >= warnPercent;
    const isExpireWarning = expireDays !== null && expireDays <= expireWarnDays;

    const lines = [
      `${name} · 已用 ${data.percent.toFixed(2)}%`,
      `已用：${formatBytes(data.used)} / ${formatBytes(data.total)}`,
      `剩余：${formatBytes(data.remaining)}`,
      `上传：${formatBytes(data.upload)}`,
      `下载：${formatBytes(data.download)}`,
      `到期：${formatDate(data.expire)}${expireDays === null ? "" : `（剩余 ${expireDays} 天）`}`,
    ];

    if (deltaUsed !== null) {
      lines.push(`本次增加：${formatBytes(Math.max(deltaUsed, 0))}`);
    }

    if (isTrafficWarning) {
      lines.push(`流量提醒：已达到 ${warnPercent}% 阈值`);
    }

    if (isExpireWarning) {
      lines.push(`到期提醒：剩余天数不超过 ${expireWarnDays} 天`);
    }

    saveCurrent(key, {
      used: data.used,
      total: data.total,
      remaining: data.remaining,
      percent: data.percent,
      expire: data.expire,
      checkedAt: Date.now(),
      summary: lines.join("\n"),
      warning: isTrafficWarning || isExpireWarning,
    });

    $persistentStore.write(lines.join("\n"), `${key}:summary`);
    log(lines.join(" | "));
    finish();
  });
}
