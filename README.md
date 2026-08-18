<p align="center"><img src="wloc.jpg" width="132" alt="老王打卡"></p>

# 老王打卡

一个面向 iPhone 的中文网络定位选点工具。项目通过代理模块处理 Apple WLOC 网络定位请求，提供地图选点、地点搜索、地图链接解析、收藏、历史、一键快捷指令、管理后台，以及 Cloudflare Workers/Pages 部署支持。

- 在线站点：<https://ding.199060.xyz>
- 完整教程：[安装、使用、快捷指令与部署图文教程](TUTORIAL.md)
- 源代码：<https://github.com/tony-wang1990/ding>

> 本项目适用于开发测试、定位接口研究和获得授权的场景。它处理的是 Apple Wi-Fi/基站网络定位结果，不是硬件 GPS 模拟。只使用 GPS、蓝牙信标、缓存位置或自有风控的应用，可能不会采用该结果。

## 功能

- 中文响应式选点页面，适配 iPhone Safari
- 卫星、WGS-84、高德、标准、彩色和暗色地图
- 地图点击、当前位置、常用地点和经纬度选点
- Apple、Google、高德、百度地图分享链接解析
- 中国大陆与境外坐标自动识别和换算
- 输入时联想本机收藏、历史和公共地点
- 点击“搜索”后进行网络地点搜索
- 收藏、稳定默认收藏、一键切换和最近定位历史
- 查询、保存、清除当前生效坐标
- 0～5000 米随机扰动半径
- 两条公开 iCloud 快捷指令
- 管理员登录、登录限速和 HMAC 签名会话
- 品牌、公告、快捷指令和公共地点后台配置
- 模块脚本由当前部署直接提供，不依赖上游仓库的 main 分支
- Cloudflare Workers 与 Pages 高级模式部署

## 先理解四件事

### 1. 地图 App 只能选地点

老王打卡网页、Apple 地图和高德地图都能帮助找到目标地点。Apple 地图和高德地图本身不能修改本项目的生效坐标；从地图 App 选点后，仍要把分享链接粘贴到老王打卡网页并点击“储存到设备”。

### 2. 收藏保存在 Safari，不在服务器

普通用户没有账号。每个人的收藏、默认收藏和历史记录，只保存在当前设备、当前 Safari 普通浏览模式、当前域名的 localStorage 中。后台和 Cloudflare KV 看不到这些个人收藏。

换手机、换浏览器、换域名、使用无痕浏览，或清除 Safari 网站数据后，需要重新收藏并设置默认地点。

### 3. “保存成功”不等于所有 App 已刷新

保存成功表示坐标已经写入代理模块。iOS 或目标 App 可能还在使用旧缓存，需要彻底退出 App 后重开；仍未刷新时可等待、重新连接代理或重启设备。

### 4. 恢复定位是清除项目坐标

“一键恢复”会清除代理模块中保存的坐标，使模块停止使用项目保存的位置。它不会删除 Safari 中的收藏和历史，也不会改变系统定位权限。清除后仍显示旧位置通常是系统或 App 缓存。

## 使用要求

- iPhone 或 iPad
- Shadowrocket，或能兼容相同脚本规则的代理工具
- 可正常连接的代理配置
- 已安装并启用本项目模块
- 已开启 HTTPS 解密，并信任自己在代理工具中生成的 CA 证书
- 使用 Safari 普通浏览模式打开站点和运行网页流程

只应信任自己在代理工具中生成的证书，不要安装来源不明的根证书。

## 第一次安装

### 1. 安装模块

用 iPhone Safari 打开 <https://ding.199060.xyz>，点击“安装小火箭模块”。

模块直链：

~~~text
https://ding.199060.xyz/modules/wloc.module
~~~

如果没有自动跳转，请复制直链，在 Shadowrocket 的模块页面手动添加并打开模块开关。

### 2. 配置 HTTPS 解密

1. 在 Shadowrocket 当前配置中开启 HTTPS 解密。
2. 生成并安装自己的 CA 证书。
3. 打开 iOS“设置 → 通用 → 关于本机 → 证书信任设置”。
4. 完全信任刚生成的证书。
5. 保持 Shadowrocket 已连接、模块已启用。

### 3. 选择地点并保存

1. 在网页点击地图、搜索地点、选择常用地点，或粘贴地图分享链接。
2. 检查标记和经纬度。
3. 点击“储存到设备”。
4. 看到成功提示后，彻底退出目标 App 再重新打开。

每一步的箭头示意图见：[完整图文教程](TUTORIAL.md)。

## 两种选点方式

| 方式 | 在哪里选地点 | 怎样写入坐标 | 适合场景 |
| --- | --- | --- | --- |
| 网页直接选点 | 老王打卡网页 | 点击“储存到设备” | 最简单，推荐 |
| 地图 App 选点 | Apple 地图或高德地图 | 复制分享链接，回网页解析并保存 | 已在地图 App 找到地点 |

### 方式一：网页直接选点

1. Safari 打开 <https://ding.199060.xyz>。
2. 点击地图，或输入地名后点击“搜索”。
3. 输入时出现的联想只来自本机收藏、历史和后台公共地点，不会自动请求网络。
4. 点击“搜索”才会查询网络地点服务。
5. 检查标记后点击“储存到设备”。

### 方式二：Apple 地图或高德地图选点

Apple 地图：

1. 打开目标地点的完整地点卡片。
2. 点击“分享 → 拷贝”。
3. 回到 Safari 的老王打卡网页。
4. 在“粘贴地图链接”中粘贴并点击“解析”。
5. 检查标记后点击“储存到设备”。

高德地图：

1. 打开目标地点详情。
2. 点击“分享 → 复制链接”。
3. 回到老王打卡，粘贴并解析。
4. 短链接会由服务器展开，网页会把高德坐标换算后选中地点。
5. 检查标记后点击“储存到设备”。

坐标说明：Apple 地图在中国大陆的分享坐标通常带有 GCJ-02 偏移，境外通常为 WGS-84；高德在中国大陆使用 GCJ-02。项目会根据链接来源和地点范围自动处理，不要手工猜测或重复换算。

## 收藏与历史

1. 选好地点后点击“收藏位置”并填写名称。
2. 在收藏右侧点击“设默认”，名称前会显示 ★。
3. 点击收藏条目的“一键切换”，可以直接写入该收藏坐标。
4. 每次成功保存或切换后，网页会更新最近定位历史。

默认收藏使用稳定 ID 保存。删除其他收藏不会再导致默认地点错误地跳到另一个条目。

## 一键快捷指令

### 老王打卡一键切换

安装地址：<https://www.icloud.com/shortcuts/03bab2c213834b288128bbb344d24659>

首次准备：

1. 在 iPhone Safari 安装快捷指令。
2. Safari 打开 <https://ding.199060.xyz>。
3. 收藏一个地点。
4. 点击该收藏旁的“设默认”，确认名称前出现 ★。

以后使用：

1. 保持 Shadowrocket、模块和 HTTPS 解密可用。
2. 从快捷指令 App、桌面或小组件点击“老王打卡一键切换”。
3. 快捷指令先显示“正在读取这台 iPhone 的 ★ 默认收藏”。
4. 快捷指令打开 <https://ding.199060.xyz/?quick=default>。
5. Safari 按同源规则读取这台手机为 ding.199060.xyz 保存的默认收藏。
6. 网页校验收藏坐标并写入代理模块。
7. 网页显示真实成功或失败结果，不会预先假报成功。

快捷指令没有登录后台，也不会去 Cloudflare KV 查询个人收藏。它能读取收藏，是因为它打开了同一个域名，而 Safari 允许该页面读取自己域名的本地网站数据。

更换默认地点时不用重装快捷指令。只需打开网页，对另一个收藏点击“设默认”。

### 老王打卡一键恢复

安装地址：<https://www.icloud.com/shortcuts/bb0fb2e7b9e34f959e09f85ec23508cb>

使用过程：

1. 点击“老王打卡一键恢复”。
2. 快捷指令显示“正在清除已保存坐标”。
3. 快捷指令打开 <https://ding.199060.xyz/quick?action=clear>。
4. 网页请求代理模块清除 wloc_settings。
5. 模块返回成功后，网页才显示“保存坐标已清除”。
6. 彻底退出目标 App 后重开；仍显示旧位置时重启设备。

这条快捷指令不会自动切换系统“定位服务”开关，也不会自动删除收藏和历史。它只清除本项目保存的坐标。

## 管理后台

后台地址：

~~~text
https://你的域名/admin
~~~

后台可配置品牌名称、公开域名、公告、两条快捷指令地址和公共常用地点。站点配置保存在 Cloudflare KV APP_DATA 中。

- ADMIN_PASSWORD：管理员登录密码
- SESSION_SECRET：管理员会话签名密钥
- 连续登录失败 5 次后，当前来源会被限制 15 分钟
- 两个 Secret 缺少任意一个时，后台会明确提示配置不完整

管理员密码和会话密钥不应写入源码、截图、README 或 GitHub。

## 部署到 Cloudflare Workers

### 1. 准备代码

~~~bash
git clone https://github.com/tony-wang1990/ding.git
cd ding/worker
npm install
npx wrangler login
~~~

### 2. 创建 KV 并填写配置

~~~bash
npx wrangler kv namespace create APP_DATA
cp wrangler.example.jsonc wrangler.jsonc
~~~

把 wrangler.jsonc 中的 REPLACE_WITH_YOUR_KV_NAMESPACE_ID 换成刚创建的 namespace ID。绑定名称必须保持为 APP_DATA。

### 3. 设置后台 Secret

~~~bash
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put SESSION_SECRET
~~~

SESSION_SECRET 建议使用至少 32 个随机字符。终端输入 Secret 时不显示字符属于正常现象。

### 4. 测试并部署

~~~bash
npm test
npm run deploy
~~~

部署完成后检查 /、/admin、/modules/wloc.module、/scripts/wloc.js 和 /scripts/wloc-settings.js。

### 5. 绑定域名

在 Cloudflare Worker 的“设置 → 域和路由”中添加自定义域名。域名生效后，在 /admin 更新公开域名并刷新首页。

## 部署到 Cloudflare Pages

Workers 是推荐方式。需要 Pages 时，本项目会先用 Wrangler 打包同一份 Hono Worker，再生成 Pages 高级模式 _worker.js，两种部署不会使用两套业务代码。

1. 先按 Workers 部署的步骤安装依赖、登录 Cloudflare、创建 APP_DATA，并填写根目录的 wrangler.jsonc。
2. 复制 Pages 配置：

~~~bash
cp pages/wrangler.example.jsonc pages/wrangler.jsonc
~~~

3. 把 pages/wrangler.jsonc 中的 KV ID 换成自己的 ID，并修改 Pages 项目名。
4. 首次部署：

~~~bash
npm run pages:deploy
~~~

5. Pages 项目创建后设置两个 Secret：

~~~bash
npx wrangler pages secret put ADMIN_PASSWORD --project-name 你的Pages项目名
npx wrangler pages secret put SESSION_SECRET --project-name 你的Pages项目名
~~~

6. 再运行一次 npm run pages:deploy，并在 Pages 后台绑定自定义域名。

本地测试 Pages 产物：

~~~bash
npm run pages:dev
~~~

## 本地开发

~~~bash
cd worker
npm install
cp ../.dev.vars.example .dev.vars
npm test
npm run dev
~~~

.dev.vars 示例：

~~~text
ADMIN_PASSWORD=your-admin-password
SESSION_SECRET=replace-with-a-long-random-string
~~~

## 项目结构

~~~text
.
├── dist/                       # 代理脚本成品
├── modules/                    # 各代理工具模块入口
├── shortcuts/                  # 快捷指令 plist 源文件和签名成品
├── docs/                       # 图文教程与图片
├── worker/
│   ├── src/
│   │   ├── assets/             # 随 Worker 一起部署的脚本
│   │   ├── index.js            # 路由、API 与安全响应头
│   │   ├── page.js             # 中文选点页面
│   │   ├── quick-page.js       # 快捷执行与结果页
│   │   ├── admin-page.js       # 管理后台
│   │   ├── auth.js             # 会话与登录限速
│   │   ├── config.js           # 配置校验与 KV
│   │   └── parse.js            # 地图链接和坐标换算
│   ├── test/                   # 自动测试
│   ├── pages/                  # Pages 配置和构建产物目录
│   └── scripts/                # 脚本同步与 Pages 构建
├── TUTORIAL.md                 # 完整图文教程
├── SECURITY.md
├── LICENSE
└── README.md
~~~

## 主要路由

| 路径 | 作用 |
| --- | --- |
| / | 地图选点首页和默认收藏快捷入口 |
| /admin | 管理后台 |
| /quick | 快捷执行与真实结果页面 |
| /modules/wloc.module | 按当前访问域名动态生成模块 |
| /scripts/wloc.js | 随当前版本部署的定位脚本 |
| /scripts/wloc-settings.js | 随当前版本部署的设置脚本 |
| /api/search | 用户主动触发的地点搜索 |
| /api/parse | 地图链接与坐标解析 |
| /api/admin/* | 管理员登录与配置 |

## 数据存储

| 数据 | 存储位置 |
| --- | --- |
| 收藏、默认收藏、历史 | 当前 Safari、当前域名的 localStorage |
| 当前生效坐标 | 代理工具的本地持久化存储 |
| 品牌、公告、快捷指令、公共地点 | Cloudflare KV APP_DATA |
| 管理员密码、会话密钥 | Cloudflare Secret |

重新部署不会主动删除 KV 配置。清除 Safari 网站数据会删除收藏和历史，但不会自动清除代理模块中已经保存的坐标。

## 常见问题

### 保存失败

依次检查代理连接、模块开关、HTTPS 解密、证书信任，以及 MITM 主机名是否包含 gs-loc.apple.com。

### 保存成功但位置没变化

彻底退出目标 App 再打开。仍未变化时重新连接代理或重启设备。目标 App 也可能不使用 WLOC 结果。

### 一键切换提示没有默认收藏

必须在同一台 iPhone、Safari 普通浏览模式、ding.199060.xyz 下收藏地点并点击“设默认”。另一台设备或其他浏览器的数据不能自动读取。

### 一键恢复后仍显示旧位置

确认网页已经显示“保存坐标已清除”，然后退出目标 App。仍有缓存时重启设备；也可以临时关闭模块验证。

### 后台无法登录

检查 ADMIN_PASSWORD 和 SESSION_SECRET 是否都已配置。达到失败次数上限后需等待 15 分钟。

### 网络搜索提示过于频繁

输入联想仍可使用本机收藏、历史和公共地点。网络搜索设置了限速和缓存，以保护公共搜索服务；稍后再点击“搜索”即可。

## 安全与许可证

- 不要公开管理员密码、Cloudflare API Token、.dev.vars 或真实 Secret。
- 只在自己的设备上生成和信任 HTTPS 解密证书。
- 公共设备不要保留敏感地点。
- 使用时应遵守所在地法律、服务条款和设备管理规定。
- 安全问题见 [SECURITY.md](SECURITY.md)。

本项目基于 [Yu9191/wloc](https://github.com/Yu9191/wloc) 二次开发，采用 [GNU Affero General Public License v3.0](LICENSE)。修改或对外提供网络服务时，请遵守许可证并保留原作者与许可证声明。
