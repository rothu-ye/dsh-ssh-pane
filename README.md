# dsh-ssh-pane

**把 SSH 终端和远程文件树开到 DSH 右侧栏，一会话一标签，主区域继续留给对话。**

[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（DSH）的插件：在右侧栏增加 SSH 终端标签页，复用 [`@linxin666/dsh-ssh`](https://www.npmjs.com/package/@linxin666/dsh-ssh) 的主机配置与连接池。每个标签绑定一台主机，左侧是那台主机的目录树，右侧是终端。

## 为什么需要它

`dsh-ssh` 只注册了两个界面座位：左侧导航的一行，和**中央区域的一整页**。点它会把正在看的会话顶掉，来回切换要两次点击。

这个插件补上第三个座位——右侧栏的标签页。于是「左边看对话、右边操作服务器」可以同时成立，而且终端进程在切换标签后仍然存活。

| | dsh-ssh 面板 | dsh-ssh-pane |
|---|---|---|
| 位置 | 中央区域整页 | 右侧栏标签页 |
| 会话 | 被顶掉 | 保留在中央 |
| 多主机 | 多标签 | **每台主机一个标签**，可并排 |
| 文件 | SFTP 传输（上传/下载） | 只读目录树，双击路径插入终端 |
| 主机管理 / 密钥 / 隧道 | 有 | 无（去左侧 SSH 面板） |

## 安装

需要先装好 `dsh-ssh` 并至少配置一台主机，否则标签页打开后主机下拉框是空的。

从源码安装（本地链接方式）：

```sh
git clone https://github.com/rothu-ye/dsh-ssh-pane.git
dsh plugin --profile desktop add link:$(pwd)/dsh-ssh-pane
```

或者用插件市场 / 插件管理器安装本目录。

安装后**刷新页面**（Ctrl+R）：客户端 bundle 是新增的，只有 `pnpm run dev:web` 在跑时才会免刷新热更新。

## 用法

1. 展开右侧栏（会话标题栏右上角的展开按钮，或对应快捷键）
2. 在起始页或标签栏的 `+` 里选择 **SSH 终端**
3. 顶部下拉框选择主机，终端与该主机的目录树同时连上
4. **换主机 = 开新标签**：在下拉框里选另一台，会新开一个绑定它的标签，当前标签不受影响
5. 顶部 `+` 为同一台主机再开一个标签（各自独立 PTY）
6. **重连** 结束并重建当前标签的会话

### 文件树

- 从文件系统根目录 `/` 开始，**点目录展开、再点收起**；展开过的目录会缓存，收起不丢
- 文件显示体积；`⟳` 刷新会清掉缓存并重读根目录
- **双击文件**把它的绝对路径直接敲进终端当前光标位置（省去手打长路径）
- 左侧宽度可拖拽调整（140–460 px）
- 切换主机时文件树重置

> 文件树是只读的。需要上传/下载请用 dsh-ssh 面板的 SFTP。

## 实现

- **宿主半**（`index.js`）：只用精确路径路由提供 `assets/` 下的三个 xterm 资源，不注册工具、不改配置、不写文件。
- **浏览器半**（`client.js`）：
  - 标签类型走右侧栏公开座位——`ctx.sidebarRightTabs.register({ multiple: true, ... })` 声明类型，`slots.register({ name: 'sidebar.right.pane.tab', key })` 画内容，`sidebar.right.pane.tab.title` 画标签上的主机名。与 DSH 自带的文件、浏览器、终端页同一套机制，没有修改 DSH 内核。
  - 终端复用 dsh-ssh 的 `/api/dsh-ssh/terminal` WebSocket（`ready` / `output` / `exit` / `auth_prompt` 帧）。
  - 文件树复用 `/api/dsh-ssh/ls`（懒加载，逐目录请求）。
  - 配色取自页面主题变量 `--dsw-alias-*`，随明暗主题切换。

本插件**不保存任何凭据**。密码、密钥、主机配置全部留在 dsh-ssh 自己的存储里。

### 关于标签参数

`multiple: true` 的每个标签有独立内容地址。本插件在打开时通过 `openTab(kind, { params: { alias, instance } })` 传入主机名；若当前 DSH 版本不向下传递 `params`，则退化为"最近一次打开请求"的 FIFO 绑定（5 秒内有效），仍能保证一标签一主机。

## 已知限制

- 一个标签对应一台主机与一个 PTY。同一主机可以开多个标签，但同一标签内不能切换主机（换主机即开新标签）。
- 关闭标签会发送 `close` 帧并结束远端 shell。只想暂时不看，请切到别的标签而不是关掉。
- 文件树只做目录列举，不做文件内容预览、上传、下载。
- 依赖 dsh-ssh 的终端与 SFTP 列举协议，dsh-ssh 大版本变动时可能需要同步更新。
- 页面由 Electron 以 `dsh-app://` 提供时，WebSocket 地址改由 `__DSH_TRANSPORT__.streamBaseUrl` 推导；普通 HTTP 页面直接用自身 origin。

## 第三方资源

`assets/` 下的三个文件复制自 MIT 协议的 **xterm.js** 项目，随包分发以避开浏览器端的模块解析限制：

| 文件 | 来源 |
|---|---|
| `assets/xterm.js` | `@xterm/xterm` 6.0.0（UMD 构建） |
| `assets/addon-fit.js` | `@xterm/addon-fit` 0.11.0 |
| `assets/xterm.css` | `@xterm/xterm` 6.0.0 |

许可证见 [`assets/XTERM-LICENSE.txt`](assets/XTERM-LICENSE.txt)。

## 版本

| 版本 | 变化 |
|---|---|
| 0.2.0 | 每个标签绑定一台主机（`multiple`）、左侧远程文件树、双击插入路径、标签显示主机名 |
| 0.1.0 | 单个 SSH 终端标签页 |

## 许可

MIT
