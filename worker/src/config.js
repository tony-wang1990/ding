export const DEFAULT_CONFIG = {
  brandName: "老王打卡",
  domain: "ding.199060.xyz",
  announcement: "请选择目标地点并储存到设备。首次使用请先完成模块和证书安装。",
  shortcutSetUrl: "",
  shortcutClearUrl: "",
  publicAccess: true,
  commonPlaces: [
    { name: "北京天安门", lat: 39.908823, lon: 116.39747 },
    { name: "上海外滩", lat: 31.24001, lon: 121.490317 },
    { name: "深圳市民中心", lat: 22.543096, lon: 114.057865 },
    { name: "广州塔", lat: 23.105758, lon: 113.324553 },
  ],
};

export async function loadConfig(env) {
  if (!env?.APP_DATA) return DEFAULT_CONFIG;
  const saved = await env.APP_DATA.get("site_config", "json");
  return sanitizeConfig({ ...DEFAULT_CONFIG, ...(saved || {}) });
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
  clean.domain = text(value.domain, 120) || DEFAULT_CONFIG.domain;
  clean.announcement = text(value.announcement, 300);
  clean.shortcutSetUrl = safeUrl(value.shortcutSetUrl);
  clean.shortcutClearUrl = safeUrl(value.shortcutClearUrl);
  clean.publicAccess = value.publicAccess !== false;
  clean.commonPlaces = Array.isArray(value.commonPlaces)
    ? value.commonPlaces.slice(0, 30).map((p) => ({
        name: text(p?.name, 40),
        lat: Number(p?.lat),
        lon: Number(p?.lon),
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

function inRange(lat, lon) {
  return Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
}
