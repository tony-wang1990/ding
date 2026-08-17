const encoder = new TextEncoder();

export async function createSession(password, env) {
  if (!env?.ADMIN_PASSWORD || password !== env.ADMIN_PASSWORD) return null;
  const expires = Date.now() + 12 * 60 * 60 * 1000;
  const body = `${expires}`;
  const signature = await sign(body, env);
  return `${body}.${signature}`;
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
