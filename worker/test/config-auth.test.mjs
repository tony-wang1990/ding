import assert from "node:assert/strict";
import test from "node:test";
import {
  adminSecretsReady,
  clearLoginFailures,
  createSession,
  isAdmin,
  loginRateStatus,
  recordLoginFailure,
  sessionCookie,
} from "../src/auth.js";
import { DEFAULT_CONFIG, loadConfig, sanitizeConfig } from "../src/config.js";

function kv() {
  const data = new Map();
  return {
    async get(key, type) {
      const value = data.get(key);
      return type === "json" && value != null ? JSON.parse(value) : value ?? null;
    },
    async put(key, value) { data.set(key, value); },
    async delete(key) { data.delete(key); },
  };
}

test("域名、快捷指令和公共地点配置会被规范化", () => {
  const value = sanitizeConfig({
    brandName: " 测试品牌 ",
    domain: "https://example.com/admin?ignored=yes",
    shortcutSetUrl: "javascript:alert(1)",
    shortcutClearUrl: "https://www.icloud.com/shortcuts/test",
    commonPlaces: [
      { name: "坏坐标", lat: 91, lon: 181 },
      { name: "空坐标不能变成零点", lat: "", lon: "" },
      { name: "正常", lat: 22.5, lon: 113.9 },
    ],
  });
  assert.equal(value.domain, "example.com");
  assert.equal(value.shortcutSetUrl, "");
  assert.equal(value.shortcutClearUrl, "https://www.icloud.com/shortcuts/test");
  assert.deepEqual(value.commonPlaces, [{ name: "正常", lat: 22.5, lon: 113.9 }]);
  assert.equal("publicAccess" in value, false);
});

test("管理员 Secret、会话签名和登录限速工作正常", async () => {
  const env = {
    APP_DATA: kv(),
    ADMIN_PASSWORD: "correct-password",
    SESSION_SECRET: "0123456789abcdef0123456789abcdef",
  };
  assert.equal(adminSecretsReady(env), true);
  assert.equal(await createSession("wrong", env), null);
  const token = await createSession("correct-password", env);
  assert.ok(token);
  const cookie = sessionCookie(token).split(";")[0];
  assert.equal(await isAdmin({ env, req: { header: () => cookie } }), true);

  const id = "test-client-" + Date.now();
  for (let i = 0; i < 5; i++) await recordLoginFailure(env, id);
  assert.equal((await loginRateStatus(env, id)).allowed, false);
  await clearLoginFailures(env, id);
  assert.equal((await loginRateStatus(env, id)).allowed, true);
});

test("缺少任一管理员 Secret 时不创建无效会话", async () => {
  assert.equal(adminSecretsReady({ ADMIN_PASSWORD: "x" }), false);
  assert.equal(await createSession("x", { ADMIN_PASSWORD: "x" }), null);
});

test("KV 暂时不可用时公开配置回退默认值", async () => {
  const value = await loadConfig({ APP_DATA: { async get() { throw new Error("temporary outage"); } } });
  assert.equal(value.brandName, DEFAULT_CONFIG.brandName);
  assert.equal(value.domain, DEFAULT_CONFIG.domain);
});
