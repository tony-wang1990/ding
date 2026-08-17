# 安全说明

- 不要把 `ADMIN_PASSWORD`、`SESSION_SECRET`、Cloudflare API Token 或证书私钥提交到 Git。
- 管理员密码必须通过 `wrangler secret put ADMIN_PASSWORD` 写入。
- `SESSION_SECRET` 建议使用 `openssl rand -hex 32` 生成并通过 Secret 写入。
- Shadowrocket HTTPS 解密证书只能由用户在自己的设备上生成；不要分发证书或私钥。
- 本项目会处理 Apple 网络定位响应，但普通运行不会保存 Wi-Fi/BSSID、蜂窝列表或用户坐标到服务器。
- 收藏与历史记录保存在用户浏览器 `localStorage`；公共地点和站点配置保存在 Cloudflare KV。

发现安全问题时，请通过 GitHub Security Advisory 私下报告，不要在公开 Issue 中粘贴 Token、证书或定位日志。
