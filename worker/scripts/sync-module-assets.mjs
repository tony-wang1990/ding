import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const workerDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const projectDir = resolve(workerDir, "..");
const assetDir = resolve(workerDir, "src/assets");

await mkdir(assetDir, { recursive: true });
await Promise.all([
  copyFile(resolve(projectDir, "dist/wloc.js"), resolve(assetDir, "wloc.js.txt")),
  copyFile(resolve(projectDir, "dist/wloc-settings.js"), resolve(assetDir, "wloc-settings.js.txt")),
]);

console.log("模块脚本已同步到 Worker 资源目录");
