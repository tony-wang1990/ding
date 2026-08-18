import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const workerDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const script = await readFile(path.resolve(workerDir, "../dist/wloc-settings.js"), "utf8");

function createShadowrocketRunner() {
  const store = new Map();
  return async function run(url) {
    let resolveDone;
    const done = new Promise((resolve) => { resolveDone = resolve; });
    const context = vm.createContext({
      $rocket: {},
      $request: { url },
      $persistentStore: {
        read(key) { return store.has(key) ? store.get(key) : null; },
        write(value, key) { store.set(key, value); return true; },
      },
      $done: resolveDone,
      console: { log() {} },
    });
    vm.runInContext(script, context);
    const payload = await done;
    return JSON.parse(payload.response.body);
  };
}

function createQuantumultRunner() {
  const store = new Map();
  return async function run(url) {
    let resolveDone;
    const done = new Promise((resolve) => { resolveDone = resolve; });
    const context = vm.createContext({
      $task: {},
      $request: { url },
      $prefs: {
        valueForKey(key) { return store.has(key) ? store.get(key) : null; },
        setValueForKey(value, key) { store.set(key, value); return true; },
        removeValueForKey(key) { store.delete(key); return true; },
      },
      $done: resolveDone,
      console: { log() {} },
    });
    vm.runInContext(script, context);
    const payload = await done;
    return { status: payload.status, body: JSON.parse(payload.body) };
  };
}

test("设置脚本完成保存、查询和清除闭环", async () => {
  const run = createShadowrocketRunner();
  assert.deepEqual(await run("https://gs-loc.apple.com/wloc-settings/save?lon=113.9&lat=22.5&acc=25"), {
    success: true, longitude: 113.9, latitude: 22.5, accuracy: 25, randomRadius: 0,
  });
  const query = await run("https://gs-loc.apple.com/wloc-settings/save?action=query");
  assert.equal(query.success, true);
  assert.equal(query.longitude, 113.9);
  assert.equal(query.latitude, 22.5);
  assert.equal((await run("https://gs-loc.apple.com/wloc-settings/save?action=clear")).success, true);
  assert.equal((await run("https://gs-loc.apple.com/wloc-settings/save?action=query")).success, false);
});

test("缺少或越界坐标必须拒绝，不能静默写入 0,0", async () => {
  const run = createShadowrocketRunner();
  assert.equal((await run("https://gs-loc.apple.com/wloc-settings/save")).success, false);
  assert.equal((await run("https://gs-loc.apple.com/wloc-settings/save?lon=&lat=")).success, false);
  assert.equal((await run("https://gs-loc.apple.com/wloc-settings/save?lon=181&lat=91")).success, false);
});

test("合法的零经纬度可以保存和查询", async () => {
  const run = createShadowrocketRunner();
  assert.equal((await run("https://gs-loc.apple.com/wloc-settings/save?lon=0&lat=0")).success, true);
  const query = await run("https://gs-loc.apple.com/wloc-settings/save?action=query");
  assert.equal(query.success, true);
  assert.equal(query.longitude, 0);
  assert.equal(query.latitude, 0);
});

test("Quantumult X 返回合法状态行并能完成保存与清除", async () => {
  const run = createQuantumultRunner();
  const saved = await run("https://gs-loc.apple.com/wloc-settings/save?lon=0&lat=0");
  assert.equal(saved.status, "HTTP/1.1 200 OK");
  assert.equal(saved.body.success, true);
  assert.equal((await run("https://gs-loc.apple.com/wloc-settings/save?action=clear")).body.success, true);
});

test("扰动半径和精度被限制在安全范围", async () => {
  const run = createShadowrocketRunner();
  const result = await run("https://gs-loc.apple.com/wloc-settings/save?lon=113.9&lat=22.5&acc=99999&randomRadius=99999");
  assert.equal(result.accuracy, 1000);
  assert.equal(result.randomRadius, 5000);
});

test("Worker 内嵌脚本与 dist 成品逐字节一致", async () => {
  const asset = await readFile(path.resolve(workerDir, "src/assets/wloc-settings.js.txt"), "utf8");
  assert.equal(asset, script);
  const wloc = await readFile(path.resolve(workerDir, "../dist/wloc.js"), "utf8");
  const wlocAsset = await readFile(path.resolve(workerDir, "src/assets/wloc.js.txt"), "utf8");
  assert.equal(wlocAsset, wloc);
  assert.ok(wloc.includes('null!=a.longitude&&""!==a.longitude'));
  assert.ok(wloc.includes("Number.isFinite(r.longitude)&&Number.isFinite(r.latitude)"));
  assert.ok(wloc.includes("Math.min(1e3,Math.max(1,Math.round(n)))"));
  assert.ok(wloc.includes("Math.min(5e3,Math.max(0,i))"));
});
