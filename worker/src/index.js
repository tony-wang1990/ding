import { Hono } from "hono/tiny";
import { getPageHtml } from "./page.js";
import { getAdminHtml } from "./admin-page.js";
import { loadConfig, saveConfig } from "./config.js";
import { clearSessionCookie, createSession, isAdmin, sessionCookie } from "./auth.js";
import { parseCoords, gcj02ToWgs84, toWgs84, round6, inRange } from "./parse.js";

const app = new Hono();

app.get("/", async (c) => {
  return c.html(getPageHtml(await loadConfig(c.env)));
});

app.get("/admin", (c) => c.html(getAdminHtml()));

app.get("/api/config", async (c) => {
  const config = await loadConfig(c.env);
  return c.json(config, 200, { "Cache-Control": "public, max-age=60" });
});

app.post("/api/admin/login", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const token = await createSession(String(body.password || ""), c.env);
  if (!token) return c.json({ error: "密码错误" }, 401);
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
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "6");
  url.searchParams.set("accept-language", "zh-CN");
  url.searchParams.set("q", q);
  const resp = await fetch(url, {
    headers: { "User-Agent": "LaoWangCheckin/1.0 (ding.199060.xyz)" },
    cf: { cacheTtl: 300, cacheEverything: true },
  });
  if (!resp.ok) return c.json({ error: "搜索服务暂时不可用" }, 502);
  const data = await resp.json();
  return c.json(data.map((p) => ({
    name: p.display_name,
    lat: Number(p.lat),
    lon: Number(p.lon),
    type: p.type || "",
  })));
});

app.get("/scripts/:name", async (c) => {
  const files = {
    "wloc.js": "https://cdn.jsdelivr.net/gh/Yu9191/wloc@main/dist/wloc.js",
    "wloc-settings.js": "https://cdn.jsdelivr.net/gh/Yu9191/wloc@main/dist/wloc-settings.js",
  };
  const upstream = files[c.req.param("name")];
  if (!upstream) return c.text("Not found", 404);
  const resp = await fetch(upstream, { cf: { cacheTtl: 86400, cacheEverything: true } });
  if (!resp.ok) return c.text("脚本暂时不可用", 502);
  c.header("content-type", "application/javascript; charset=utf-8");
  c.header("cache-control", "public, max-age=3600");
  return c.body(await resp.text());
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
  const raw = c.req.query("u") || "";
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
  return c.text(`${e && e.message ? e.message : e}`, 500);
});

export default app;
