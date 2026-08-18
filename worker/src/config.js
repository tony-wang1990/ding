export const DEFAULT_CONFIG = {
  brandName: "老王打卡",
  domain: "ding.199060.xyz",
  announcement: "请选择目标地点并储存到设备。首次使用请先完成模块和证书安装。",
  shortcutSetUrl: "https://www.icloud.com/shortcuts/03bab2c213834b288128bbb344d24659",
  shortcutClearUrl: "https://www.icloud.com/shortcuts/bb0fb2e7b9e34f959e09f85ec23508cb",
  commonPlaces: [
    { name: "北京天安门", lat: 39.908823, lon: 116.39747 },
    { name: "上海外滩", lat: 31.24001, lon: 121.490317 },
    { name: "深圳市民中心", lat: 22.543096, lon: 114.057865 },
    { name: "广州塔", lat: 23.105758, lon: 113.324553 },
  ],
};

export async function loadConfig(env) {
  if (!env?.APP_DATA) return sanitizeConfig(DEFAULT_CONFIG);
  try {
    const saved = await env.APP_DATA.get("site_config", "json");
    return sanitizeConfig({ ...DEFAULT_CONFIG, ...(saved || {}) });
  } catch {
    // KV 短暂不可用时，公开首页仍可用默认配置；后台保存仍会明确报错。
    return sanitizeConfig(DEFAULT_CONFIG);
  }
}

export async function saveConfig(env, value) {
  if (!env?.APP_DATA) throw new Error("APP_DATA KV 尚未绑定");
  const config = sanitizeConfig(value);
  await env.APP_DATA.put("site_config", JSON.stringify(config));
  return config;
}

export function sanitizeConfig(value) {
  const clean = { ...DEFAULT_CONFIG };
  clean.brandName = text(value.brandName, 40) || DEFAULT_CONFIG.brandName;
  clean.domain = safeHost(value.domain) || DEFAULT_CONFIG.domain;
  clean.announcement = text(value.announcement, 300);
  clean.shortcutSetUrl = safeUrl(value.shortcutSetUrl);
  clean.shortcutClearUrl = safeUrl(value.shortcutClearUrl);
  clean.commonPlaces = Array.isArray(value.commonPlaces)
    ? value.commonPlaces.slice(0, 30).map((p) => ({
        name: text(p?.name, 40),
        lat: coordinate(p?.lat),
        lon: coordinate(p?.lon),
      })).filter((p) => p.name && inRange(p.lat, p.lon))
    : DEFAULT_CONFIG.commonPlaces;
  return clean;
}

function text(value, max) {
  return String(value || "").trim().slice(0, max);
}

function safeUrl(value) {
  const raw = text(value, 500);
  if (!raw) return "";
  try {
    const url = new URL(raw);
    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function safeHost(value) {
  const raw = text(value, 160);
  if (!raw) return "";
  try {
    const url = new URL(raw.includes("://") ? raw : `https://${raw}`);
    if (url.protocol !== "https:" || url.username || url.password) return "";
    return url.host;
  } catch {
    return "";
  }
}

function coordinate(value) {
  if (value == null || String(value).trim() === "") return NaN;
  return Number(value);
}

function inRange(lat, lon) {
  return Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
}
