<p align="center"><img src="wloc.jpg" width="132" alt="老王打卡"></p>

# 老王打卡

基于 Apple WLOC 网络定位响应修改的中文选点工具，包含在线地图、搜索联想、常用地点、收藏、历史记录、管理后台、访问控制和 Cloudflare Workers 部署支持。

> 仅用于开发测试、隐私研究和获得授权的场景。它修改的是 Apple 的 Wi-Fi/基站网络定位响应，不等同于硬件 GPS 模拟，也不保证所有 App 都采用该结果。

## 直接使用

- 在线页面：<https://ding.199060.xyz>
- Shadowrocket 模块：<https://ding.199060.xyz/modules/wloc.module>
- 图文教程：**[从安装到自部署的 21 步完整教程](docs/USER_GUIDE.md)**
- 管理入口：部署者自己的域名后加 `/admin`

## 功能

- 完整中文选点页，支持高德、Apple、Google、百度链接及坐标文本
- 搜索联想、常用地点、收藏位置和定位历史
- 动态生成 Shadowrocket 模块安装链接
- 后台修改品牌、域名、公告、快捷指令与公共地点
- 管理员密码和 HMAC 签名会话 Cookie
- Cloudflare Workers + KV，支持自定义域名
- GCJ-02 / WGS84 坐标换算与解析回归测试

## 自部署速览

```bash
git clone https://github.com/tony-wang1990/ding.git
cd ding/worker
npm install
npx wrangler login
npx wrangler kv namespace create APP_DATA
cp wrangler.example.jsonc wrangler.jsonc
# 把输出的 KV id 写入 wrangler.jsonc
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put SESSION_SECRET
npm test
npm run deploy
```

完整的 Cloudflare 控制台图文步骤、自定义域名绑定、iPhone 安装、证书信任及故障排查均在 **[docs/USER_GUIDE.md](docs/USER_GUIDE.md)**。

## 他人能否部署

可以。部署者需要自己的 Cloudflare 账号，并自行创建 KV、设置 `ADMIN_PASSWORD` 和随机的 `SESSION_SECRET`。不要复制本项目线上实例的密钥，也不要把 `.dev.vars`、API Token 或密码提交到 Git。

本项目延续上游的 **GNU AGPL-3.0** 许可证。允许使用、修改和再发布；如果修改版通过网络向用户提供服务，需要按许可证向这些用户提供对应源代码，并保留许可证及原作者声明。详见 [LICENSE](LICENSE) 和 [SECURITY.md](SECURITY.md)。

## 本地开发

```bash
cd worker
npm install
cp ../.dev.vars.example .dev.vars
npm test
npm run dev
```

目录说明：

- `worker/src/index.js`：路由与 API
- `worker/src/page.js`：中文选点页面
- `worker/src/admin-page.js`：管理后台
- `worker/src/auth.js`：管理员会话认证
- `worker/src/config.js`：KV 配置模型
- `worker/src/parse.js`：地图链接解析与坐标换算
- `modules/`：各代理客户端模块
- `docs/`：图文教程与配图

## 上游与致谢

本项目是在 [Yu9191/wloc](https://github.com/Yu9191/wloc) 基础上的二次开发，保留原 Git 历史和 AGPL-3.0 许可证。感谢上游作者及贡献者。
