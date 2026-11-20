# SSH 右侧终端

把 dsh-ssh 的主机终端和远程文件树开到**右侧栏**里，中央区域继续留给会话。

dsh-ssh 自己只注册了两个座位：左侧导航的一行，和中央区域的一整页。点它会把会话顶掉。这个插件补上第三个座位——右侧栏的一个标签页，于是「左边看对话、右边操作服务器」可以同时成立。

## 布局

一个标签 = 一台主机：

```
┌──────────────────────────────────────────┐
│ 主机 [10.0.1.23 ▾]  +  重连      已连接   │  ← 工具栏
├───────────────┬──────────────────────────┤
│ ▾ /           │                          │
│   ▸ etc/      │  [yeyy@HR30 ~]$           │  ← 终端
│   ▸ home/     │                          │
│   ▸ var/      │                          │
├───────────────┴──────────────────────────┤
│ 双击文件把路径插入终端                      │
└──────────────────────────────────────────┘
```

左侧宽度可拖拽（140–460 px）。

## 多标签多主机

- 顶部下拉框换主机 → **新开一个绑定该主机的标签**，当前标签不变
- 顶部 `+` → 为同一台主机再开一个标签（独立 PTY）
- 标签标题显示该标签绑定的主机名
- 标签之间互不影响：各自一条 SSH 连接、一个 PTY、一份目录树缓存
- 切换标签不会断开终端（`keepMounted`），只有关闭标签才结束远端 shell

## 文件树

- 懒加载：目录展开时才请求，展开过的缓存保留，收起不丢
- 从 `/` 开始；`⟳` 重读当前目录
- 文件行显示体积；双击把绝对路径插入终端光标处
- 切换主机时整棵树重置

## 上传与下载

- **⇪** 打开文件选择器（可多选），逐个上传到**当前目录**。当前目录 = 最后点击的文件夹；点的是文件则取其父目录；没点过就是 `/`。上传完成后自动刷新该目录。
- **⇩** 出现在每个文件行右侧，把这一个文件下载到运行浏览器的本机。优先用 File System Access API 流式写盘（不占内存），不支持时回退为 Blob 下载。
- 进度显示在文件树顶部：`上传中 name 42%`、`已上传 name`、`已下载 → name`、失败原因。
- 协议：`POST /api/dsh-ssh/upload?alias=&remotePath=`（请求体为原始字节，响应为 NDJSON 进度流，末帧 `{type:"result",ok,transferredBytes}`）；`GET /api/dsh-ssh/download?alias=&remotePath=`（二进制流，带 `Content-Length` 与 `Content-Disposition` 文件名）。
- 上传的 `remotePath` 必须是绝对路径（dsh-ssh 的限制）。目录下载与断点续传不支持。

## 主机与凭据

主机列表、连接池、密码/密钥全部来自 dsh-ssh。本插件不保存任何凭据，也不新增任何配置项；宿主半只为 `assets/` 下三个 xterm 文件注册了静态路由。

## 已知限制

- 一个标签绑定一台主机，标签内不能切换主机（换主机等于开新标签）。
- 关闭标签会发送 `close` 帧结束远端 shell；只想暂时不看请切标签。
- 文件树支持目录列举与单文件上传/下载，不支持目录下载、断点续传、文件内容预览。
- 标签参数依赖 `openTab(kind, { params })` 向下传递；不支持时退化为最近一次打开请求的 FIFO 绑定（5 秒有效）。
- 页面由 Electron 以 `dsh-app://` 交付时，WebSocket 地址改由 `__DSH_TRANSPORT__.streamBaseUrl` 推导；普通 http 页面直接用自身 origin。

## 实现说明

- 浏览器半通过 `sidebarRightTabs.register({ id, kind, multiple: true, keepMounted: true, guide })` 声明标签类型，用 `slots.register({ name: 'sidebar.right.pane.tab', key })` 画内容、`sidebar.right.pane.tab.title` 画标签名——和 DSH 自带的文件、浏览器、终端页走同一套公开座位。
- 终端协议复用 dsh-ssh 的 `/api/dsh-ssh/terminal` WebSocket（`ready` / `output` / `exit` / `auth_prompt`）。
- 目录列举复用 `/api/dsh-ssh/ls?alias=&path=`，返回 `{ entries: [{ name, type, size, mtimeMs }] }`。
- 宿主半以精确路径提供 `assets/` 下的 xterm UMD 构建、fit 插件和样式表（复制自 `@xterm/*`，MIT）。
- 终端配色取自 `--dsw-alias-*` 主题变量。
