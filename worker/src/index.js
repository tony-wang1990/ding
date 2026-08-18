import { Hono } from "hono/tiny";
import { getPageHtml } from "./page.js";
import { getAdminHtml } from "./admin-page.js";
import { getQuickPageHtml } from "./quick-page.js";
import { loadConfig, saveConfig } from "./config.js";
import {
  adminSecretsReady,
  clearLoginFailures,
  clearSessionCookie,
  createSession,
  isAdmin,
  loginRateStatus,
  recordLoginFailure,
  sessionCookie,
} from "./auth.js";
import { parseCoords, gcj02ToWgs84, toWgs84, round6, inRange } from "./parse.js";
import wlocScript from "./assets/wloc.js.txt";
import settingsScript from "./assets/wloc-settings.js.txt";

const app = new Hono();
const searchAttempts = new Map();
let nextSearchAt = 0;

app.use("*", async (c, next) => {
  await next();
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  c.header("Permissions-Policy", "geolocation=(self), camera=(), microphone=()");
  if (c.req.path.startsWith("/admin") || c.req.path.startsWith("/api/admin")) {
    c.header("Cache-Control", "no-store");
  }
});

app.get("/", async (c) => {
  const config = await loadConfig(c.env);
  return c.html(getPageHtml(config, new URL(c.req.url).origin));
});

app.get("/admin", (c) => c.html(getAdminHtml()));
app.get("/quick", (c) => c.html(getQuickPageHtml()));

app.get("/api/config", async (c) => {
  const config = await loadConfig(c.env);
  return c.json(config, 200, { "Cache-Control": "public, max-age=60" });
});

app.post("/api/admin/login", async (c) => {
  if (!adminSecretsReady(c.env)) return c.json({ error: "后台 Secret 尚未配置完整" }, 503);
  const identifier = c.req.header("CF-Connecting-IP") || c.req.header("X-Forwarded-For") || "unknown";
  const rate = await loginRateStatus(c.env, identifier);
  if (!rate.allowed) {
    c.header("Retry-After", String(rate.retryAfter));
    return c.json({ error: "尝试次数过多，请稍后再试" }, 429);
  }
  const body = await c.req.json().catch(() => ({}));
  const token = await createSession(String(body.password || ""), c.env);
  if (!token) {
    await recordLoginFailure(c.env, identifier);
    return c.json({ error: "密码错误" }, 401);
  }
  await clearLoginFailures(c.env, identifier);
  c.header("Set-Cookie", sessionCookie(token));
  return c.json({ success: true });
});

app.post("/api/admin/logout", (c) => {
  c.header("Set-Cookie", clearSessionCookie());
  return c.json({ success: true });
});

app.get("/api/admin/config", async (c) => {
  if (!(await isAdmin(c))) return c.json({ error: "未登录" }, 401);
  return c.json(await loadConfig(c.env));
});

app.put("/api/admin/config", async (c) => {
  if (!(await isAdmin(c))) return c.json({ error: "未登录" }, 401);
  const body = await c.req.json().catch(() => null);
  if (!body) return c.json({ error: "无效配置" }, 400);
  return c.json(await saveConfig(c.env, body));
});

app.get("/api/search", async (c) => {
  const q = String(c.req.query("q") || "").trim().slice(0, 80);
  if (q.length < 2) return c.json([]);
  const rate = await acquireSearchSlot(c);
  if (!rate.allowed) {
    c.header("Retry-After", String(rate.retryAfter));
    return c.json({ error: "搜索过于频繁，请稍后重试", retryAfter: rate.retryAfter }, 429);
  }
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "6");
  url.searchParams.set("accept-language", "zh-CN");
  url.searchParams.set("q", q);
  const origin = new URL(c.req.url).origin;
  let resp;
  try {
    resp = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: {
        "User-Agent": `LaoWangCheckin/1.1 (+${origin})`,
        "Referer": `${origin}/`,
      },
      cf: { cacheTtl: 86400, cacheEverything: true },
    });
  } catch {
    return c.json({ error: "搜索服务连接超时，请稍后重试" }, 502);
  }
  if (!resp.ok) return c.json({ error: "搜索服务暂时不可用" }, 502);
  const data = await resp.json();
  return c.json(data.map((p) => ({
    name: p.display_name,
    lat: Number(p.lat),
    lon: Number(p.lon),
    type: p.type || "",
  })).filter((p) => p.name && inRange(p.lat, p.lon)));
});

app.get("/scripts/:name", (c) => {
  const files = {
    "wloc.js": wlocScript,
    "wloc-settings.js": settingsScript,
  };
  const script = files[c.req.param("name")];
  if (!script) return c.text("Not found", 404);
  c.header("content-type", "application/javascript; charset=utf-8");
  c.header("cache-control", "public, max-age=86400");
  c.header("Access-Control-Allow-Origin", "*");
  return c.body(script);
});

app.get("/modules/wloc.module", (c) => {
  const origin = new URL(c.req.url).origin;
  c.header("content-type", "text/plain; charset=utf-8");
  return c.body(`#!name=老王打卡定位\n#!desc=老王打卡 iOS 网络定位模块 | 选点页面: ${origin}/\n#!author=老王打卡 / Yu9191\n#!homepage=${origin}/\n#!category=Tools\n\n[Script]\nApple WLOC = type=http-response,pattern=^https?:\\/\\/(?:gs-loc(?:-cn)?\\.apple\\.com|gsp-ssl\\.ls\\.apple\\.com|bluedot\\.is\\.autonavi\\.com(?:\\.gds\\.alibabadns\\.com)?)\\/clls\\/wloc,requires-body=1,binary-body-mode=1,max-size=0,timeout=30,script-path=${origin}/scripts/wloc.js,argument=longitude=113.94114&latitude=22.544577&accuracy=25&randomRadius=0&logLevel=info\nWLOC Settings = type=http-request,pattern=^https?:\\/\\/gs-loc(-cn)?\\.apple\\.com\\/wloc-settings\\/save,requires-body=0,max-size=0,timeout=10,script-path=${origin}/scripts/wloc-settings.js\n\n[MITM]\nhostname = %APPEND% gs-loc.apple.com, gs-loc-cn.apple.com, gsp-ssl.ls.apple.com, bluedot.is.autonavi.com, bluedot.is.autonavi.com.gds.alibabadns.com\n`);
});

// 地图链接解析: 供快捷指令调用。
// GET /api/parse?u=<链接>&format=json&cs=<gcj|none>
//   返回 {lat, lon, name}; 高德/苹果地图(中国大陆均为 GCJ-02)自动转 WGS84; 境外坐标自动跳过(out_of_china)。cs=none 可强制不转换。
//   不带 format=json 时返回纯文本 "lat=..&lon=.." 片段。
app.get("/api/parse", async (c) => {
  const raw = String(c.req.query("u") || "").slice(0, 4096);
  const cs = (c.req.query("cs") || "").toLowerCase();
  const fmt = (c.req.query("format") || "").toLowerCase();
  try {
    let { lat, lon, name, src } = await parseCoords(raw);
    // 默认按来源自动换算; cs=none 强制不转换, cs=gcj/bd 强制按指定坐标系转换。
    if (cs === "gcj") ({ lat, lon } = gcj02ToWgs84(lat, lon));
    else if (cs === "bd") ({ lat, lon } = toWgs84(lat, lon, "baidu"));
    else if (cs !== "none") ({ lat, lon } = toWgs84(lat, lon, src));
    // 出口再校验一次: cs= 是调用方指定的, 强行按错误坐标系换算也可能把值推出值域。
    // 宁可报错也不要返回一个能被当成坐标写进设备的数字。
    if (!inRange(lat, lon)) throw new Error("解析出的坐标超出合法范围");
    lat = round6(lat);
    lon = round6(lon);
    name = name || "";
    c.header("Access-Control-Allow-Origin", "*");
    if (fmt === "json") return c.json({ lat, lon, name });
    return c.text(`lat=${lat}&lon=${lon}`);
  } catch (e) {
    c.header("Access-Control-Allow-Origin", "*");
    return c.json({ error: String(e && e.message ? e.message : e) }, 422);
  }
});

// 兜底 500 也要带 CORS —— 否则快捷指令那边看到的是跨域错误, 而不是真正的原因。
app.onError((e, c) => {
  c.header("Access-Control-Allow-Origin", "*");
  return c.json({ error: "服务暂时不可用" }, 500);
});

async function acquireSearchSlot(c) {
  const now = Date.now();
  const identifier = c.req.header("CF-Connecting-IP") || c.req.header("X-Forwarded-For") || "unknown";
  const previous = searchAttempts.get(identifier) || [];
  const recent = previous.filter((time) => now - time < 60_000);
  if (recent.length >= 10) {
    searchAttempts.set(identifier, recent);
    return { allowed: false, retryAfter: Math.max(1, Math.ceil((60_000 - (now - recent[0])) / 1000)) };
  }
  if (now < nextSearchAt) return { allowed: false, retryAfter: 1 };

  if (c.env?.APP_DATA) {
    try {
      const saved = Number(await c.env.APP_DATA.get("nominatim_next_at"));
      if (Number.isFinite(saved) && now < saved) {
        return { allowed: false, retryAfter: Math.max(1, Math.ceil((saved - now) / 1000)) };
      }
      await c.env.APP_DATA.put("nominatim_next_at", String(now + 1100), { expirationTtl: 60 });
    } catch {}
  }

  nextSearchAt = now + 1100;
  recent.push(now);
  searchAttempts.set(identifier, recent);
  if (searchAttempts.size > 1000) {
    for (const [key, times] of searchAttempts) {
      if (!times.some((time) => now - time < 60_000)) searchAttempts.delete(key);
    }
  }
  return { allowed: true, retryAfter: 0 };
}

export default app;
