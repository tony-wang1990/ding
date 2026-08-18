import { copyFile, mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";

const bundleDir = path.resolve(".pages-bundle");
const outputDir = path.resolve("pages/dist");

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

const files = await readdir(bundleDir);
if (!files.includes("index.js")) throw new Error("Wrangler 没有生成 index.js");

await copyFile(path.join(bundleDir, "index.js"), path.join(outputDir, "_worker.js"));
for (const file of files.filter((name) => name.endsWith(".txt"))) {
  await copyFile(path.join(bundleDir, file), path.join(outputDir, file));
}

await rm(bundleDir, { recursive: true, force: true });
console.log("Cloudflare Pages 高级模式产物已生成到 worker/pages/dist");
