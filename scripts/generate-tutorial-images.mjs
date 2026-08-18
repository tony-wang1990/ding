import { mkdir, writeFile } from "node:fs/promises";

const out = new URL("../docs/images/", import.meta.url);
await mkdir(out, { recursive: true });

const steps = [
  ["01-open-site", "打开老王打卡", "Safari 输入 ding.199060.xyz", "确认页面顶部显示“老王打卡”"],
  ["02-install-module", "安装定位模块", "点击“安装小火箭模块”", "系统将自动拉起 Shadowrocket"],
  ["03-confirm-import", "确认导入模块", "在 Shadowrocket 中选择安装", "名称应显示“老王打卡定位”"],
  ["04-enable-module", "启用模块", "配置 → 模块 → 打开开关", "模块关闭时网页无法写入坐标"],
  ["05-open-mitm", "打开 HTTPS 解密", "配置详情 → HTTPS 解密", "仅解密项目所需的 Apple 定位域名"],
  ["06-create-cert", "生成并安装证书", "证书 → 生成新证书 → 安装", "随后会跳转到 iOS 设置"],
  ["07-install-profile", "安装描述文件", "设置 → 已下载描述文件 → 安装", "按系统提示完成安装"],
  ["08-trust-cert", "完全信任证书", "设置 → 关于本机 → 证书信任设置", "打开 Shadowrocket 证书开关"],
  ["09-select-place", "选择目标地点", "搜索地点、点击地图或粘贴地图链接", "地图标记落点后核对经纬度"],
  ["10-save-location", "写入设备", "点击“储存到设备”", "看到绿色成功提示才算写入完成"],
  ["11-refresh-location", "刷新系统定位", "iOS 15–18 关开定位；iOS 26+ 建议重启", "高版本缓存无法保证仅靠飞行模式清除"],
  ["12-verify-map", "验证结果", "彻底关闭并重新打开苹果地图", "先用苹果地图测试，再测试其他 App"],
  ["13-restore-location", "恢复真实定位", "网页点击“清除数据”或关闭模块", "iOS 26+ 清除后仍建议重启"],
  ["14-use-favorites", "收藏常用地点", "选点 → 收藏位置 → 输入名称", "收藏仅保存在当前浏览器"],
  ["15-use-history", "使用定位历史", "在“最近定位”中点击旧记录", "最多保存最近 20 条记录"],
  ["15a-default-favorite", "设置快捷指令默认收藏", "收藏列表 → 选择地点 → 设默认", "名称前出现 ★ 才表示设置完成"],
  ["15b-install-switch", "安装一键切换快捷指令", "首页 → 安装一键切换快捷指令", "这是安装入口，不会在安装时改位置"],
  ["15c-run-switch", "运行一键切换", "快捷指令 App 或小组件 → 一键切换", "Safari 会读取同域名的 ★ 默认收藏"],
  ["15d-install-restore", "安装一键恢复快捷指令", "首页 → 安装恢复定位快捷指令", "这是安装入口，安装完成后再运行"],
  ["15e-run-restore", "运行一键恢复", "快捷指令 App 或小组件 → 一键恢复", "网页显示清除成功后再退出目标 App"],
  ["16-admin-login", "进入管理后台", "打开 /admin 并输入管理员密码", "后台会话 12 小时后自动失效"],
  ["17-admin-settings", "维护公共配置", "修改公告、常用地点和快捷指令链接", "保存后约 60 秒内同步到首页"],
  ["18-create-kv", "创建 Cloudflare KV", "wrangler kv namespace create APP_DATA", "把返回的 namespace id 写入 wrangler.jsonc"],
  ["19-set-secrets", "设置后台密钥", "写入 ADMIN_PASSWORD 与 SESSION_SECRET", "密钥必须用 wrangler secret put，不能提交 Git"],
  ["20-deploy-worker", "发布 Worker", "执行 pnpm deploy", "部署完成后先检查 workers.dev 临时地址"],
  ["21-bind-domain", "绑定自定义域名", "Worker → 域 → 添加域名", "选择区域后填写子域名，例如 ding"],
];

for (const [name, title, action, note] of steps) {
  await writeFile(new URL(`${name}.svg`, out), svg(title, action, note));
}

function esc(s) {
  return s.replace(/[&<>"']/g, (x) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[x]);
}

function svg(title, action, note) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675" role="img" aria-label="${esc(title)}">
  <defs><marker id="arrow" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto"><path d="M0 0L12 6L0 12Z" fill="#c62828"/></marker><filter id="shadow"><feDropShadow dx="0" dy="8" stdDeviation="12" flood-opacity=".16"/></filter></defs>
  <rect width="1200" height="675" fill="#edf1ee"/>
  <rect x="0" y="0" width="1200" height="88" fill="#173b35"/><rect x="0" y="83" width="1200" height="5" fill="#a71f25"/>
  <text x="70" y="38" fill="#d7e3df" font-size="16" font-family="Arial" letter-spacing="4">LAO WANG · CHECK-IN</text>
  <text x="70" y="70" fill="white" font-size="30" font-weight="700" font-family="PingFang SC,Arial">${esc(title)}</text>
  <rect x="72" y="132" width="1056" height="455" rx="18" fill="white" stroke="#cbd8d2" filter="url(#shadow)"/>
  <rect x="112" y="175" width="390" height="350" rx="30" fill="#1f2826"/><rect x="132" y="204" width="350" height="292" rx="8" fill="#f8faf8"/>
  <rect x="152" y="228" width="310" height="52" rx="8" fill="#173b35"/><text x="173" y="261" fill="white" font-size="22" font-weight="700" font-family="PingFang SC,Arial">老王打卡</text>
  <rect x="155" y="306" width="300" height="48" rx="8" fill="#eef2ef" stroke="#ccd7d1"/><text x="175" y="337" fill="#29433e" font-size="18" font-family="PingFang SC,Arial">${esc(shorten(action, 18))}</text>
  <rect x="155" y="380" width="300" height="62" rx="10" fill="#a71f25"/><text x="305" y="418" text-anchor="middle" fill="white" font-size="20" font-weight="700" font-family="PingFang SC,Arial">点击这里</text>
  <path d="M760 275 C675 275 610 330 474 397" fill="none" stroke="#c62828" stroke-width="8" marker-end="url(#arrow)"/>
  <circle cx="785" cy="272" r="42" fill="#fff2f1" stroke="#c62828" stroke-width="4"/><text x="785" y="282" text-anchor="middle" fill="#c62828" font-size="30" font-weight="800">!</text>
  <text x="855" y="235" fill="#19312d" font-size="20" font-weight="700" font-family="PingFang SC,Arial">操作</text>
  <foreignObject x="855" y="255" width="230" height="90"><div xmlns="http://www.w3.org/1999/xhtml" style="font:22px/1.45 -apple-system,PingFang SC,Arial;color:#233b36">${esc(action)}</div></foreignObject>
  <rect x="635" y="425" width="455" height="105" rx="10" fill="#fff8e7" stroke="#d8b66e"/>
  <text x="660" y="458" fill="#8a5c12" font-size="18" font-weight="700" font-family="PingFang SC,Arial">注意</text>
  <foreignObject x="660" y="470" width="405" height="52"><div xmlns="http://www.w3.org/1999/xhtml" style="font:18px/1.4 -apple-system,PingFang SC,Arial;color:#5c513d">${esc(note)}</div></foreignObject>
  <text x="72" y="632" fill="#65736e" font-size="15" font-family="PingFang SC,Arial">示意图 · 不同 iOS / Shadowrocket 版本的文字位置可能略有差异</text>
</svg>`;
}

function shorten(value, max) { return value.length > max ? `${value.slice(0, max)}…` : value; }
