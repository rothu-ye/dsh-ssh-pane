# dsh-ssh-pane

**把 SSH 终端开到 DSH 右侧栏，会话继续占据中央区域。**

[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（DSH）的插件：在右侧栏增加一个 SSH 终端标签页，复用 [`@linxin666/dsh-ssh`](https://www.npmjs.com/package/@linxin666/dsh-ssh) 的主机配置与连接池。

## 为什么需要它

`dsh-ssh` 只注册了两个界面座位：左侧导航的一行，和**中央区域的一整页**。点它会把正在看的会话顶掉，来回切换要两次点击。

这个插件补上第三个座位——右侧栏的一个标签页。于是「左边看对话、右边敲命令」可以同时成立，而且终端进程在切换标签后仍然存活。

| | dsh-ssh 面板 | dsh-ssh-pane |
|---|---|---|
| 位置 | 中央区域整页 | 右侧栏标签页 |
| 会话 | 被顶掉 | 保留在中央 |
| 主机管理 / 密钥 / 文件传输 / 隧道 | 有 | 无（去左侧 SSH 面板） |
| 终端 | 多标签 | 单标签，内置主机切换与重连 |

## 安装

需要先装好 `dsh-ssh` 并至少配置一台主机，否则标签页打开后是空的下拉框。

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
3. 顶部下拉框选择已在 dsh-ssh 中配置好的主机，终端自动连接
4. 断线或要换主机时点 **重连**

顶部状态反映的是终端通道状态（未连接 / 连接中 / 已连接 / 已断开），不代表远端命令的执行结果。

## 实现

- **宿主半**（`index.js`）：只用精确路径路由提供 `assets/` 下的三个 xterm 资源，不注册工具、不改配置、不写文件。
- **浏览器半**（`client.js`）：通过右侧栏的公开座位注册标签类型——`ctx.sidebarRightTabs.register()` 声明类型，`ctx.slots.register({ name: 'sidebar.right.pane.tab', key })` 画内容，与 DSH 自带的文件、浏览器、终端页走同一套机制，没有修改 DSH 内核。
- **终端协议**：复用 dsh-ssh 的 `/api/dsh-ssh/terminal` WebSocket（`ready` / `output` / `exit` / `auth_prompt` 帧）与 `/api/dsh-ssh/hosts` 主机列表。
- **配色**：取自页面主题变量 `--dsw-alias-*`，随明暗主题切换。

本插件**不保存任何凭据**。密码、密钥、主机配置全部留在 dsh-ssh 自己的存储里。

## 已知限制

- 一个标签页对应一个 PTY。切换主机时会结束上一个会话；需要同时连多台，用 dsh-ssh 面板的多标签终端。
- 关闭标签会发送 `close` 帧并结束远端 shell。只想暂时不看，请切到别的标签而不是关掉。
- 依赖 dsh-ssh 的终端协议，dsh-ssh 大版本变动时可能需要同步更新。
- 页面由 Electron 以 `dsh-app://` 提供时，WebSocket 地址改由 `__DSH_TRANSPORT__.streamBaseUrl` 推导；普通 HTTP 页面直接用自身 origin。

## 第三方资源

`assets/` 下的三个文件复制自 MIT 协议的 **xterm.js** 项目，随包分发以避开浏览器端的模块解析限制：

| 文件 | 来源 |
|---|---|
| `assets/xterm.js` | `@xterm/xterm` 6.0.0（UMD 构建） |
| `assets/addon-fit.js` | `@xterm/addon-fit` 0.11.0 |
| `assets/xterm.css` | `@xterm/xterm` 6.0.0 |

许可证见 [`assets/XTERM-LICENSE.txt`](assets/XTERM-LICENSE.txt)。

## 许可

MIT
