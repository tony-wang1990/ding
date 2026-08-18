const encoder = new TextEncoder();
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_FAILURES = 5;
const memoryFailures = new Map();

export function adminSecretsReady(env) {
  return Boolean(env?.ADMIN_PASSWORD && env?.SESSION_SECRET);
}

export async function createSession(password, env) {
  if (!adminSecretsReady(env) || !timingSafeEqual(String(password), String(env.ADMIN_PASSWORD))) return null;
  const expires = Date.now() + 12 * 60 * 60 * 1000;
  const body = `${expires}`;
  const signature = await sign(body, env);
  return `${body}.${signature}`;
}

export async function loginRateStatus(env, identifier) {
  const key = await loginRateKey(identifier);
  const current = await readFailures(env, key);
  if (!current || Date.now() - current.startedAt >= LOGIN_WINDOW_MS) {
    return { allowed: true, retryAfter: 0 };
  }
  if (current.count < LOGIN_MAX_FAILURES) return { allowed: true, retryAfter: 0 };
  return {
    allowed: false,
    retryAfter: Math.max(1, Math.ceil((LOGIN_WINDOW_MS - (Date.now() - current.startedAt)) / 1000)),
  };
}

export async function recordLoginFailure(env, identifier) {
  const key = await loginRateKey(identifier);
  const now = Date.now();
  const previous = await readFailures(env, key);
  const current = !previous || now - previous.startedAt >= LOGIN_WINDOW_MS
    ? { count: 1, startedAt: now }
    : { count: previous.count + 1, startedAt: previous.startedAt };
  memoryFailures.set(key, current);
  pruneMemoryFailures(now);
  if (env?.APP_DATA) {
    try {
      await env.APP_DATA.put(key, JSON.stringify(current), { expirationTtl: Math.ceil(LOGIN_WINDOW_MS / 1000) });
    } catch {}
  }
}

function pruneMemoryFailures(now) {
  if (memoryFailures.size <= 1000) return;
  for (const [key, value] of memoryFailures) {
    if (!value || now - value.startedAt >= LOGIN_WINDOW_MS) memoryFailures.delete(key);
  }
  // 极端攻击下即使全部仍在窗口内，也限制单个 isolate 的内存占用。
  while (memoryFailures.size > 1000) {
    memoryFailures.delete(memoryFailures.keys().next().value);
  }
}

export async function clearLoginFailures(env, identifier) {
  const key = await loginRateKey(identifier);
  memoryFailures.delete(key);
  if (env?.APP_DATA?.delete) {
    try { await env.APP_DATA.delete(key); } catch {}
  }
}

export async function isAdmin(c) {
  const token = readCookie(c.req.header("cookie") || "", "laowang_admin");
  if (!token || !c.env?.SESSION_SECRET) return false;
  const [expires, signature] = token.split(".");
  if (!expires || !signature || Number(expires) < Date.now()) return false;
  const expected = await sign(expires, c.env);
  return timingSafeEqual(signature, expected);
}

export function sessionCookie(token) {
  return `laowang_admin=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=43200`;
}

export function clearSessionCookie() {
  return "laowang_admin=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0";
}

async function sign(value, env) {
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(env.SESSION_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const bytes = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function loginRateKey(identifier) {
  const value = String(identifier || "unknown").slice(0, 200);
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
  const suffix = Array.from(hash.slice(0, 12), (b) => b.toString(16).padStart(2, "0")).join("");
  return `login_rate:${suffix}`;
}

async function readFailures(env, key) {
  if (env?.APP_DATA) {
    try {
      const saved = await env.APP_DATA.get(key, "json");
      if (saved && Number.isFinite(saved.count) && Number.isFinite(saved.startedAt)) return saved;
    } catch {}
  }
  return memoryFailures.get(key) || null;
}

function readCookie(header, name) {
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return "";
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
