import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { getAdminHtml } from "../src/admin-page.js";
import { getPageHtml } from "../src/page.js";
import { getQuickPageHtml } from "../src/quick-page.js";

test("模块安装始终使用当前访问域名，而不是后台误填域名", () => {
  const html = getPageHtml({ domain: "wrong.example", commonPlaces: [] }, "https://right.example");
  assert.ok(html.includes(encodeURIComponent("https://right.example/modules/wloc.module")));
  assert.ok(!html.includes(encodeURIComponent("https://wrong.example/modules/wloc.module")));
});

test("页面不再把快捷指令安装入口描述成立即恢复", () => {
  const html = getPageHtml({ commonPlaces: [] }, "https://ding.199060.xyz");
  assert.ok(html.includes("安装恢复定位快捷指令"));
  assert.ok(html.includes("网页内立即清除请使用下方“清除数据”"));
  assert.ok(html.includes("https://tile.openstreetmap.org/{z}/{x}/{y}.png"));
  assert.ok(html.includes("03bab2c213834b288128bbb344d24659"));
  assert.ok(html.includes("bb0fb2e7b9e34f959e09f85ec23508cb"));
});

test("快捷执行页拒绝缺少的经纬度参数", () => {
  const html = getQuickPageHtml();
  assert.ok(html.includes("lonRaw===null"));
  assert.ok(html.includes("latRaw===null"));
  assert.ok(html.includes("模块没有返回可识别结果"));
});

test("三个页面的内联 JavaScript 都能通过语法编译", () => {
  const pages = [
    getPageHtml({ commonPlaces: [] }, "https://ding.199060.xyz"),
    getAdminHtml(),
    getQuickPageHtml(),
  ];
  for (const html of pages) {
    const start = html.lastIndexOf("<script>");
    const end = html.indexOf("</script>", start);
    assert.ok(start >= 0 && end > start);
    assert.doesNotThrow(() => new vm.Script(html.slice(start + 8, end)));
  }
});
