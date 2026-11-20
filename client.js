/**
 * Browser half of @local/dsh-ssh-pane.
 *
 * Registers one right-sidebar tab type (`dsh-ssh-pane`) whose body is an xterm
 * terminal speaking the dsh-ssh terminal WebSocket protocol. The conversation
 * stays in the main column; the terminal lives in the right column, docked like
 * files or the browser.
 *
 * The tab type is registered through the public two-stage seat documented by
 * @deepseek-ai/dsh-client-ui-sidebar-right: `sidebarRightTabs.register` declares
 * the type, `slots.register('sidebar.right.pane.tab', { key })` draws its body.
 */
window.__ModuleLoader__.load({
  id: '@local/dsh-ssh-pane',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const TAB_ID = '@local/dsh-ssh-pane'
    const TAB_KIND = 'dsh-ssh-pane'
    const ASSET = {
      css: '/dsh-ssh-pane/xterm.css',
      term: '/dsh-ssh-pane/xterm.js',
      fit: '/dsh-ssh-pane/addon-fit.js',
    }

    const ZH = {
      title: 'SSH 终端',
      guide: 'SSH 终端',
      host: '主机',
      reconnect: '重连',
      idle: '未连接',
      connecting: '连接中…',
      ready: '已连接',
      closed: '已断开',
      noHosts: '还没有配置主机，请先在左侧 SSH 面板里添加。',
      loadFailed: '读取主机列表失败',
      socketFailed: '终端通道打开失败',
      libFailed: 'xterm 资源加载失败',
    }
    const EN = {
      title: 'SSH terminal',
      guide: 'SSH terminal',
      host: 'Host',
      reconnect: 'Reconnect',
      idle: 'Not connected',
      connecting: 'Connecting…',
      ready: 'Connected',
      closed: 'Disconnected',
      noHosts: 'No host configured yet — add one in the SSH panel first.',
      loadFailed: 'Could not read the host list',
      socketFailed: 'The terminal channel failed to open',
      libFailed: 'Could not load the xterm assets',
    }
    const L = (() => {
      const lang = String((globalThis.navigator && globalThis.navigator.language) || '').toLowerCase()
      return lang.indexOf('zh') === 0 ? ZH : EN
    })()

    // ----------------------------------------------------------- assets

    let assetsPromise
    /**
     * Load the stylesheet and the two UMD scripts once per page.
     * @returns {{ Terminal: any, FitAddon: any }} the globals they install.
     */
    function loadAssets() {
      if (assetsPromise !== undefined) return assetsPromise
      assetsPromise = (async () => {
        if (document.querySelector('link[data-dsh-ssh-pane]') === null) {
          const link = document.createElement('link')
          link.rel = 'stylesheet'
          link.href = ASSET.css
          link.setAttribute('data-dsh-ssh-pane', '')
          document.head.appendChild(link)
        }
        if (!globalThis.Terminal) await injectScript(ASSET.term)
        if (!globalThis.FitAddon) await injectScript(ASSET.fit)
        if (!globalThis.Terminal) throw new Error(L.libFailed)
        return {
          Terminal: globalThis.Terminal,
          FitAddon: globalThis.FitAddon && globalThis.FitAddon.FitAddon,
        }
      })().catch((error) => {
        assetsPromise = undefined
        throw error
      })
      return assetsPromise
    }

    /**
     * Append one classic script and resolve when it has run.
     * @param src - same-origin asset URL.
     * @returns a promise settling with the script's load.
     */
    function injectScript(src) {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script')
        script.src = src
        script.async = true
        script.onload = () => resolve()
        script.onerror = () => reject(new Error('script failed: ' + src))
        document.head.appendChild(script)
      })
    }

    // ------------------------------------------------------- socket URL

    const WEB_SCHEMES = new Set(['http:', 'https:', 'blob:', 'data:', 'about:', 'filesystem:'])

    /**
     * The terminal socket URL, resolved exactly as dsh-ssh resolves it: against
     * the page's own origin for a web page, against the shell-published
     * transport base for an application-delivered (dsh-app://) page that
     * carries no upgrade channel of its own.
     * @param alias - configured host alias.
     * @param cols - terminal columns.
     * @param rows - terminal rows.
     * @returns an absolute ws:// or wss:// URL.
     */
    function terminalUrl(alias, cols, rows) {
      const query = new URLSearchParams({ alias, cols: String(cols), rows: String(rows) }).toString()
      const location = window.location
      if (WEB_SCHEMES.has(location.protocol)) {
        const scheme = location.protocol === 'https:' ? 'wss' : 'ws'
        return scheme + '://' + location.host + '/api/dsh-ssh/terminal?' + query
      }
      const transport = globalThis.__DSH_TRANSPORT__
      const base = transport && typeof transport.streamBaseUrl === 'string' ? transport.streamBaseUrl : ''
      if (base === '') throw new Error(L.socketFailed)
      const url = new URL(base)
      const scheme = url.protocol === 'https:' ? 'wss' : 'ws'
      return scheme + '://' + url.host + '/api/dsh-ssh/terminal?' + query
    }

    // ------------------------------------------------------- appearance

    /** Resolve one theme token with a literal fallback. */
    function token(name, fallback) {
      try {
        const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
        return value === '' ? fallback : value
      } catch {
        return fallback
      }
    }

    /** The xterm palette, taken from the page's own theme tokens. */
    function terminalTheme() {
      return {
        background: token('--dsw-alias-bg-base', '#101216'),
        foreground: token('--dsw-alias-label-primary', '#e6e8eb'),
        cursor: token('--dsw-alias-label-primary', '#e6e8eb'),
        cursorAccent: token('--dsw-alias-bg-base', '#101216'),
        selectionBackground: token('--dsw-alias-interactive-bg-hover', '#2a2f3a'),
      }
    }

    const styles = {
      root: { display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, width: '100%' },
      bar: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 10px',
        borderBottom: '1px solid var(--dsw-alias-border-l1, #2a2f3a)',
        fontSize: '12px',
        flex: '0 0 auto',
      },
      label: { color: 'var(--dsw-alias-label-secondary, #8b929c)' },
      select: {
        fontSize: '12px',
        padding: '2px 6px',
        borderRadius: '6px',
        border: '1px solid var(--dsw-alias-border-l1, #2a2f3a)',
        background: 'var(--dsw-alias-bg-layer-2, #16181d)',
        color: 'var(--dsw-alias-label-primary, #e6e8eb)',
        maxWidth: '180px',
      },
      button: {
        fontSize: '12px',
        padding: '2px 8px',
        borderRadius: '6px',
        border: '1px solid var(--dsw-alias-border-l1, #2a2f3a)',
        background: 'transparent',
        color: 'var(--dsw-alias-label-primary, #e6e8eb)',
        cursor: 'pointer',
      },
      status: { marginLeft: 'auto', whiteSpace: 'nowrap' },
      note: {
        color: 'var(--dsw-alias-label-tertiary, #6b7280)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        minWidth: 0,
      },
      term: { flex: '1 1 auto', minHeight: 0, padding: '6px 4px 4px 8px', overflow: 'hidden' },
    }

    /** The status pill's colour for one state. */
    function statusColor(status) {
      if (status === 'ready') return 'var(--dsw-alias-state-success-primary, #3ba55d)'
      if (status === 'error') return 'var(--dsw-alias-state-error-primary, #e5534b)'
      if (status === 'connecting') return 'var(--dsw-alias-state-warn-primary, #d29922)'
      return 'var(--dsw-alias-label-tertiary, #6b7280)'
    }

    /** The status pill's text for one state. */
    function statusText(status) {
      if (status === 'ready') return L.ready
      if (status === 'connecting') return L.connecting
      if (status === 'closed') return L.closed
      return L.idle
    }

    // ------------------------------------------------------------ view

    /**
     * One terminal tab: pick a configured host, then keep a PTY session alive
     * on it. Reconnecting bumps an epoch so the effect tears down and re-runs.
     */
    function SshPane() {
      const [hosts, setHosts] = React.useState([])
      const [alias, setAlias] = React.useState('')
      const [status, setStatus] = React.useState('idle')
      const [note, setNote] = React.useState('')
      const [epoch, setEpoch] = React.useState(0)
      const mountRef = React.useRef(null)

      // Fetch the host inventory once; dsh-ssh owns it and this tab only reads.
      React.useEffect(() => {
        let alive = true
        fetch('/api/dsh-ssh/hosts', { credentials: 'same-origin' })
          .then((response) => response.json())
          .then((payload) => {
            if (!alive) return
            const list = payload && Array.isArray(payload.hosts) ? payload.hosts : []
            setHosts(list)
            if (list.length === 0) {
              setStatus('error')
              setNote(L.noHosts)
            } else {
              setAlias((current) => (current === '' ? list[0].alias : current))
            }
          })
          .catch((error) => {
            if (!alive) return
            setStatus('error')
            setNote(L.loadFailed + ': ' + (error && error.message ? error.message : String(error)))
          })
        return () => { alive = false }
      }, [])

      // One live terminal per (alias, epoch).
      React.useEffect(() => {
        if (alias === '') return undefined
        let disposed = false
        let observer
        let terminal
        let dataSub
        let resizeSub
        let socket
        setStatus('connecting')
        setNote('')

        const boot = async () => {
          const assets = await loadAssets()
          if (disposed) return
          const mount = mountRef.current
          if (mount === null) return

          terminal = new assets.Terminal({
            cursorBlink: true,
            fontSize: 12,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Courier New", monospace',
            theme: terminalTheme(),
            scrollback: 5000,
          })
          const fit = assets.FitAddon ? new assets.FitAddon() : undefined
          if (fit) terminal.loadAddon(fit)
          terminal.open(mount)
          if (fit) { try { fit.fit() } catch { /* hidden pane: fit later */ } }
          if (disposed) { try { terminal.dispose() } catch { /* already gone */ } ; return }

          socket = new WebSocket(terminalUrl(alias, terminal.cols, terminal.rows))

          const send = (frame) => {
            if (socket && socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(frame))
          }

          socket.onmessage = (event) => {
            if (disposed) return
            let frame
            try { frame = JSON.parse(event.data) } catch { return }
            if (frame === null || typeof frame !== 'object') return
            if (frame.type === 'ready') {
              setStatus('ready')
              setNote(String(frame.alias || alias))
            } else if (frame.type === 'output') {
              terminal.write(String(frame.data || ''))
            } else if (frame.type === 'exit') {
              setStatus('closed')
              setNote(frame.error ? String(frame.error) : 'exit ' + String(frame.code))
            } else if (frame.type === 'auth_prompt') {
              const prompts = Array.isArray(frame.prompts) ? frame.prompts : []
              const responses = prompts.map((prompt) => {
                const label = prompt && prompt.prompt ? String(prompt.prompt) : 'code'
                try { return globalThis.prompt(label) || '' } catch { return '' }
              })
              send({ type: 'auth_response', responses })
            }
          }
          socket.onerror = () => {
            if (disposed) return
            setStatus('error')
            setNote(L.socketFailed)
          }
          socket.onclose = () => {
            if (disposed) return
            setStatus((current) => (current === 'ready' ? 'closed' : current))
          }

          dataSub = terminal.onData((data) => send({ type: 'input', data }))
          resizeSub = terminal.onResize(({ cols, rows }) => send({ type: 'resize', cols, rows }))

          if (typeof ResizeObserver === 'function') {
            observer = new ResizeObserver(() => {
              if (disposed || !fit) return
              const element = mountRef.current
              if (element === null || element.clientWidth === 0 || element.clientHeight === 0) return
              try { fit.fit() } catch { /* transient layout */ }
            })
            observer.observe(mount)
          }
        }

        boot().catch((error) => {
          if (disposed) return
          setStatus('error')
          setNote(error && error.message ? error.message : String(error))
        })

        return () => {
          disposed = true
          try { if (observer) observer.disconnect() } catch { /* ignore */ }
          try { if (dataSub) dataSub.dispose() } catch { /* ignore */ }
          try { if (resizeSub) resizeSub.dispose() } catch { /* ignore */ }
          if (socket) {
            // 'close' ends the remote shell; the host drops the PTY with it.
            try {
              if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'close' }))
            } catch { /* ignore */ }
            try { socket.close() } catch { /* ignore */ }
          }
          try { if (terminal) terminal.dispose() } catch { /* ignore */ }
        }
      }, [alias, epoch])

      return h('div', { style: styles.root },
        h('div', { style: styles.bar },
          h('span', { style: styles.label }, L.host),
          h('select', {
            style: styles.select,
            value: alias,
            disabled: hosts.length === 0,
            onChange: (event) => setAlias(event.target.value),
          }, hosts.map((host) => h('option', { key: host.alias, value: host.alias }, host.alias))),
          h('button', {
            style: styles.button,
            onClick: () => setEpoch((value) => value + 1),
            disabled: alias === '',
          }, L.reconnect),
          note === '' ? null : h('span', { style: styles.note, title: note }, note),
          h('span', { style: { ...styles.status, color: statusColor(status) } }, statusText(status)),
        ),
        h('div', { ref: mountRef, style: styles.term }),
      )
    }

    // ------------------------------------------------------ registration

    return {
      inject: ['slots'],
      /**
       * Declare the tab type and its body against the right sidebar's public
       * seats, both inside one effect so unloading the plugin removes both.
       * @param ctx - client plugin context.
       */
      apply(ctx) {
        ctx.inject(['slots', 'sidebarRightTabs'], (scoped) => {
          const tabs = scoped.get('sidebarRightTabs')
          if (tabs === undefined || typeof tabs.register !== 'function') return
          scoped.effect(() => {
            const disposers = []
            disposers.push(tabs.register({
              id: TAB_ID,
              kind: TAB_KIND,
              priority: 'extension',
              keepMounted: true,
              title: () => L.title,
              guide: [{ id: 'ssh-pane', order: 60, title: () => L.guide }],
            }))
            disposers.push(scoped.slots.inject('sidebar.right.pane.tab', () => scoped.slots.register({
              name: 'sidebar.right.pane.tab',
              key: TAB_ID,
              inject: () => ({}),
            }, SshPane)))
            return () => {
              for (const dispose of disposers.splice(0).reverse()) {
                try { dispose() } catch { /* one bad disposer must not block the rest */ }
              }
            }
          })
        })
      },
    }
  },
})
