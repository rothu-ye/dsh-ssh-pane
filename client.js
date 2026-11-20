/**
 * Browser half of @local/dsh-ssh-pane.
 *
 * Registers a right-sidebar tab type (`dsh-ssh-pane`) that hosts one remote
 * host: an SFTP file tree on the left and an xterm terminal on the right. The
 * conversation stays in the main column.
 *
 * Two-stage seat, as documented by @deepseek-ai/dsh-client-ui-sidebar-right:
 * `sidebarRightTabs.register({ id, kind, multiple, ... })` declares the type,
 * `slots.register('sidebar.right.pane.tab', { key })` draws a tab body, and the
 * optional `sidebar.right.pane.tab.title` seat draws its chip.
 *
 * One tab binds to one host. Picking another host in a tab's toolbar opens a
 * NEW tab for that host instead of rebinding the current one, so several hosts
 * can stay open side by side.
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
    const API = {
      hosts: '/api/dsh-ssh/hosts',
      ls: '/api/dsh-ssh/ls',
      terminal: '/api/dsh-ssh/terminal',
      upload: '/api/dsh-ssh/upload',
      download: '/api/dsh-ssh/download',
      exec: '/api/dsh-ssh/exec',
    }

    const ZH = {
      title: 'SSH 终端',
      guide: 'SSH 终端',
      host: '主机',
      files: '文件',
      newTab: '新标签',
      reconnect: '重连',
      refresh: '刷新',
      idle: '未连接',
      connecting: '连接中…',
      ready: '已连接',
      closed: '已断开',
      empty: '空目录',
      loadFail: '读取目录失败',
      upload: '上传',
      download: '下载',
      uploading: '上传中',
      downloading: '下载中',
      uploadDone: '已上传',
      downloadDone: '已下载',
      uploadFail: '上传失败',
      downloadFail: '下载失败',
      downloadCancel: '已取消下载',
      rootDenied: '不能打包整个根目录',
      packing: '打包中',
      working: '处理中',
      copied: '已复制路径',
      copyToPrompt: '复制到（绝对路径）',
      renamePrompt: '新名称',
      mkdirPrompt: '新文件夹名称',
      touchPrompt: '新文件名称',
      deleteConfirm: '确定删除这个条目？此操作不可撤销。',
      downloadDir: '下载（打包为 tar.gz）',
      copyPath: '复制路径',
      copyTo: '复制到…',
      rename: '重命名',
      remove: '删除',
      newFile: '新建文件',
      newFolder: '新建文件夹',
      uploadHere: '上传到此处',
      openInTerminal: '在终端中打开',
      refreshHere: '刷新此目录',
      done: '完成',
      ok: '确定',
      cancel: '取消',
      noHosts: '还没有配置主机，请先在左侧 SSH 面板里添加。',
      hostsFail: '读取主机列表失败',
      socketFail: '终端通道打开失败',
      libFail: 'xterm 资源加载失败',
      insertHint: '双击插入路径 · ⇪ 上传到当前目录 · ⇩ 下载文件',
    }
    const EN = {
      title: 'SSH terminal',
      guide: 'SSH terminal',
      host: 'Host',
      files: 'Files',
      newTab: 'New tab',
      reconnect: 'Reconnect',
      refresh: 'Refresh',
      idle: 'Not connected',
      connecting: 'Connecting…',
      ready: 'Connected',
      closed: 'Disconnected',
      empty: 'Empty directory',
      loadFail: 'Could not read the directory',
      upload: 'Upload',
      download: 'Download',
      uploading: 'Uploading',
      downloading: 'Downloading',
      uploadDone: 'Uploaded',
      downloadDone: 'Downloaded',
      uploadFail: 'Upload failed',
      downloadFail: 'Download failed',
      downloadCancel: 'Download cancelled',
      rootDenied: 'Refusing to archive the filesystem root',
      packing: 'Packing',
      working: 'Working',
      copied: 'Path copied',
      copyToPrompt: 'Copy to (absolute path)',
      renamePrompt: 'New name',
      mkdirPrompt: 'New folder name',
      touchPrompt: 'New file name',
      deleteConfirm: 'Delete this entry? This cannot be undone.',
      downloadDir: 'Download as tar.gz',
      copyPath: 'Copy path',
      copyTo: 'Copy to…',
      rename: 'Rename',
      remove: 'Delete',
      newFile: 'New file',
      newFolder: 'New folder',
      uploadHere: 'Upload here',
      openInTerminal: 'Open in terminal',
      refreshHere: 'Refresh this folder',
      done: 'Done',
      ok: 'OK',
      cancel: 'Cancel',
      noHosts: 'No host configured yet — add one in the SSH panel first.',
      hostsFail: 'Could not read the host list',
      socketFail: 'The terminal channel failed to open',
      libFail: 'Could not load the xterm assets',
      insertHint: 'Double-click to type the path · ⇪ uploads here · ⇩ downloads',
    }
    const L = (() => {
      const lang = String((globalThis.navigator && globalThis.navigator.language) || '').toLowerCase()
      return lang.indexOf('zh') === 0 ? ZH : EN
    })()

    // ------------------------------------------------------------ assets

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
        if (!globalThis.Terminal) throw new Error(L.libFail)
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
     * The terminal socket URL, resolved exactly as dsh-ssh resolves it.
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
        return scheme + '://' + location.host + API.terminal + '?' + query
      }
      const transport = globalThis.__DSH_TRANSPORT__
      const base = transport && typeof transport.streamBaseUrl === 'string' ? transport.streamBaseUrl : ''
      if (base === '') throw new Error(L.socketFail)
      const url = new URL(base)
      const scheme = url.protocol === 'https:' ? 'wss' : 'ws'
      return scheme + '://' + url.host + API.terminal + '?' + query
    }

    // ------------------------------------------------------------ utils

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

    /** Join one remote path segment onto a directory path. */
    function joinPath(dir, name) {
      if (dir === '' || dir === '/') return '/' + name
      return dir.replace(/\/+$/, '') + '/' + name
    }

    /** A short human size for a directory listing row. */
    function formatSize(bytes) {
      if (typeof bytes !== 'number' || !isFinite(bytes) || bytes < 0) return ''
      if (bytes < 1024) return bytes + 'B'
      const units = ['K', 'M', 'G', 'T']
      let value = bytes / 1024
      let unit = 0
      while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit++ }
      return (value < 10 ? value.toFixed(1) : String(Math.round(value))) + units[unit]
    }

    /** The parent directory of a remote path (never above the filesystem root). */
    function parentPath(path) {
      const clean = String(path).replace(/\/+$/, '')
      const index = clean.lastIndexOf('/')
      return index <= 0 ? '/' : clean.slice(0, index)
    }

    /** The last path segment, used as a display name. */
    function baseName(path) {
      const parts = String(path).replace(/\/+$/, '').split('/')
      return parts[parts.length - 1] || path
    }

    /**
     * Upload one browser File to a remote absolute path, reading the NDJSON
     * progress stream dsh-ssh answers with.
     * @param file - the picked browser file.
     * @param alias - host alias.
     * @param remotePath - absolute destination on the host.
     * @param onProgress - receives percent updates.
     */
    async function uploadFile(file, alias, remotePath, onProgress) {
      const url = API.upload + '?alias=' + encodeURIComponent(alias) + '&remotePath=' + encodeURIComponent(remotePath)
      const response = await fetch(url, { method: 'POST', body: file, credentials: 'same-origin' })
      if (!response.ok || response.body === null) {
        const text = await response.text().catch(() => '')
        throw new Error(text === '' ? 'HTTP ' + response.status : text.slice(0, 200))
      }
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let failure = ''
      let sawResult = false
      for (;;) {
        const chunk = await reader.read()
        if (chunk.done) break
        buffer += decoder.decode(chunk.value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          if (line.trim() === '') continue
          let frame
          try { frame = JSON.parse(line) } catch { continue }
          if (frame.type === 'progress' && frame.progress) {
            onProgress(frame.progress)
          } else if (frame.type === 'result') {
            sawResult = true
            if (!frame.ok) failure = frame.error || 'upload failed'
          }
        }
      }
      if (failure !== '') throw new Error(failure)
      if (!sawResult) throw new Error('upload ended without a result frame')
    }

    /**
     * Download a remote file, preferring the File System Access API so the
     * bytes stream straight to disk, and falling back to a Blob link.
     * @param alias - host alias.
     * @param remotePath - absolute source path on the host.
     * @param onProgress - receives percent updates.
     * @returns the saved filename and byte count.
     */
    async function downloadFile(alias, remotePath, onProgress, nameHint) {
      const url = API.download + '?alias=' + encodeURIComponent(alias) + '&remotePath=' + encodeURIComponent(remotePath)
      const response = await fetch(url, { credentials: 'same-origin' })
      if (!response.ok || response.body === null) {
        const text = await response.text().catch(() => '')
        throw new Error(text === '' ? 'HTTP ' + response.status : text.slice(0, 200))
      }
      const total = Number(response.headers.get('content-length') || '0')
      const disposition = response.headers.get('content-disposition') || ''
      const match = /filename="([^"]+)"/.exec(disposition)
      const filename = nameHint !== undefined && nameHint !== ''
        ? nameHint
        : (match !== null ? match[1] : (remotePath.split('/').pop() || 'download'))
      const reader = response.body.getReader()

      let writable
      if (typeof window.showSaveFilePicker === 'function') {
        let handle
        try {
          handle = await window.showSaveFilePicker({ suggestedName: filename })
        } catch (failure) {
          // A dismissed picker ends the transfer. Falling through to the Blob
          // path here would pop a second, unwanted download.
          if (isCancelled(failure)) {
            try { await response.body.cancel() } catch { /* already gone */ }
            throw new TransferCancelled()
          }
          handle = undefined
        }
        if (handle !== undefined) {
          try {
            writable = await handle.createWritable()
          } catch (failure) {
            if (isCancelled(failure)) {
              try { await response.body.cancel() } catch { /* already gone */ }
              throw new TransferCancelled()
            }
            writable = undefined
          }
        }
      }

      const chunks = []
      let received = 0
      for (;;) {
        const chunk = await reader.read()
        if (chunk.done) break
        if (writable !== undefined) await writable.write(chunk.value)
        else chunks.push(chunk.value)
        received += chunk.value.length
        onProgress({ percent: total > 0 ? Math.round((received / total) * 1000) / 10 : 0 })
      }
      if (writable !== undefined) {
        await writable.close()
        return { filename, bytes: received }
      }
      const blob = new Blob(chunks)
      const objectUrl = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = objectUrl
      anchor.download = filename
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      setTimeout(() => URL.revokeObjectURL(objectUrl), 10000)
      return { filename, bytes: received }
    }

    /** Marker for "the user dismissed the save dialog"; never an error toast. */
    class TransferCancelled extends Error {
      constructor() {
        super('cancelled')
        this.name = 'TransferCancelled'
      }
    }

    /** Whether a picker failure means the user dismissed the dialog. */
    function isCancelled(failure) {
      if (failure === null || failure === undefined) return false
      const name = String(failure.name || '')
      const message = String(failure.message || '').toLowerCase()
      return name === 'AbortError' || message.indexOf('abort') >= 0 || message.indexOf('cancel') >= 0
    }

    /** Quote one value for a POSIX shell command line. */
    function shQuote(value) {
      return "'" + String(value).replace(/'/g, "'\\''") + "'"
    }

    /**
     * Run one command on the host through dsh-ssh's non-interactive exec route.
     * @returns the command's stdout.
     */
    async function execRemote(alias, command) {
      const response = await fetch(API.exec, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ alias, command }),
      })
      let payload
      try { payload = await response.json() } catch { payload = undefined }
      if (!response.ok) throw new Error(payload && payload.error ? payload.error : 'HTTP ' + response.status)
      const result = (payload && payload.result) || {}
      if (result.success !== true) {
        const detail = result.stderr || result.error || ('exit ' + String(result.exitCode))
        throw new Error(String(detail).trim().slice(0, 300))
      }
      return String(result.stdout || '')
    }

    /**
     * Pack one remote directory with tar, download the archive, then remove it.
     * @returns the saved filename and byte count.
     */
    async function downloadDirectory(alias, dirPath, onProgress) {
      const name = baseName(dirPath) || 'directory'
      const parent = parentPath(dirPath)
      const archive = '/tmp/.dsh-pane-' + Date.now() + '.tgz'
      onProgress({ percent: 0 })
      await execRemote(alias, 'tar czf ' + shQuote(archive) + ' -C ' + shQuote(parent) + ' ' + shQuote(name))
      try {
        return await downloadFile(alias, archive, onProgress, name + '.tar.gz')
      } finally {
        try { await execRemote(alias, 'rm -f ' + shQuote(archive)) } catch { /* best effort */ }
      }
    }

    /**
     * Host aliases waiting for a tab body that cannot read its own params.
     * Entries are timestamped so a stale one never binds the wrong host.
     */
    const pendingAliases = []

    /** Remember the alias an open was asked for. */
    function rememberPending(alias) {
      pendingAliases.push({ alias, at: Date.now() })
      while (pendingAliases.length > 20) pendingAliases.shift()
    }

    /** Take the freshest pending alias, or undefined when none is recent. */
    function takePending() {
      const entry = pendingAliases.shift()
      if (entry === undefined) return undefined
      return Date.now() - entry.at < 5000 ? entry.alias : undefined
    }

    // ----------------------------------------------------------- styles

    const colors = {
      border: 'var(--dsw-alias-border-l1, #2a2f3a)',
      label: 'var(--dsw-alias-label-primary, #e6e8eb)',
      secondary: 'var(--dsw-alias-label-secondary, #8b929c)',
      tertiary: 'var(--dsw-alias-label-tertiary, #6b7280)',
      layer: 'var(--dsw-alias-bg-layer-2, #16181d)',
      hover: 'var(--dsw-alias-interactive-bg-hover, #2a2f3a)',
    }

    const styles = {
      root: { display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, width: '100%' },
      bar: {
        display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px',
        borderBottom: '1px solid ' + colors.border, fontSize: '12px', flex: '0 0 auto',
      },
      select: {
        fontSize: '12px', padding: '2px 6px', borderRadius: '6px',
        border: '1px solid ' + colors.border, background: colors.layer,
        color: colors.label, maxWidth: '160px',
      },
      button: {
        fontSize: '12px', padding: '2px 8px', borderRadius: '6px',
        border: '1px solid ' + colors.border, background: 'transparent',
        color: colors.label, cursor: 'pointer', whiteSpace: 'nowrap',
      },
      status: { marginLeft: 'auto', whiteSpace: 'nowrap' },
      note: {
        color: colors.tertiary, overflow: 'hidden', textOverflow: 'ellipsis',
        whiteSpace: 'nowrap', minWidth: 0,
      },
      body: { display: 'flex', flex: '1 1 auto', minHeight: 0 },
      tree: {
        display: 'flex', flexDirection: 'column', minWidth: 0,
        borderRight: '1px solid ' + colors.border, overflow: 'auto', flex: '0 0 auto',
      },
      treeHead: {
        display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px',
        fontSize: '11px', color: colors.secondary, borderBottom: '1px solid ' + colors.border,
        position: 'sticky', top: 0, background: 'inherit',
      },
      row: {
        display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px',
        padding: '2px 6px', cursor: 'pointer', color: colors.label, whiteSpace: 'nowrap',
      },
      caret: { width: '10px', flex: '0 0 auto', color: colors.tertiary, fontSize: '10px' },
      name: { overflow: 'hidden', textOverflow: 'ellipsis' },
      size: { marginLeft: 'auto', color: colors.tertiary, fontSize: '10px', paddingLeft: '8px' },
      divider: { width: '4px', cursor: 'col-resize', flex: '0 0 auto', background: 'transparent' },
      termWrap: { display: 'flex', flexDirection: 'column', flex: '1 1 auto', minWidth: 0, minHeight: 0 },
      term: { flex: '1 1 auto', minHeight: 0, padding: '6px 4px 4px 8px', overflow: 'hidden' },
      hint: { padding: '2px 8px', fontSize: '10px', color: colors.tertiary, borderTop: '1px solid ' + colors.border },
    }

    /** The status pill's colour for one state. */
    function statusColor(status) {
      if (status === 'ready') return 'var(--dsw-alias-state-success-primary, #3ba55d)'
      if (status === 'error') return 'var(--dsw-alias-state-error-primary, #e5534b)'
      if (status === 'connecting') return 'var(--dsw-alias-state-warn-primary, #d29922)'
      return colors.tertiary
    }

    /** The status pill's text for one state. */
    function statusText(status) {
      if (status === 'ready') return L.ready
      if (status === 'connecting') return L.connecting
      if (status === 'closed') return L.closed
      return L.idle
    }

    // ------------------------------------------------------------ dialog

    /**
     * A small in-app modal, because an Electron renderer refuses
     * `window.prompt`. `kind: 'input'` resolves to the text or null;
     * `kind: 'confirm'` resolves to true or false.
     */
    function Dialog(props) {
      const [value, setValue] = React.useState(typeof props.initial === 'string' ? props.initial : '')
      const inputRef = React.useRef(null)

      React.useEffect(() => {
        if (inputRef.current !== null) {
          inputRef.current.focus()
          if (typeof inputRef.current.select === 'function') inputRef.current.select()
        }
      }, [])

      const accept = () => props.onResolve(props.kind === 'input' ? value : true)
      const dismiss = () => props.onResolve(props.kind === 'input' ? null : false)

      return h('div', {
        style: {
          position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(0, 0, 0, 0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        },
        onMouseDown: dismiss,
      }, h('div', {
        style: {
          minWidth: '320px', maxWidth: '78vw', padding: '14px', borderRadius: '10px',
          background: colors.layer, border: '1px solid ' + colors.border,
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.42)',
        },
        onMouseDown: (event) => event.stopPropagation(),
      },
        h('div', {
          style: { fontSize: '12px', color: colors.secondary, marginBottom: '8px', whiteSpace: 'pre-wrap', lineHeight: 1.5 },
        }, props.title),
        props.kind === 'input' ? h('input', {
          ref: inputRef,
          value,
          onChange: (event) => setValue(event.target.value),
          onKeyDown: (event) => {
            if (event.key === 'Enter') accept()
            if (event.key === 'Escape') dismiss()
          },
          style: {
            width: '100%', boxSizing: 'border-box', fontSize: '13px', padding: '6px 8px',
            borderRadius: '6px', border: '1px solid ' + colors.border,
            background: colors.layer, color: colors.label,
          },
        }) : null,
        h('div', { style: { display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px' } },
          h('button', { style: styles.button, onClick: dismiss }, L.cancel),
          h('button', {
            style: {
              ...styles.button,
              borderColor: props.danger === true ? 'var(--dsw-alias-state-error-primary, #e5534b)' : colors.border,
              color: props.danger === true ? 'var(--dsw-alias-state-error-primary, #e5534b)' : colors.label,
            },
            onClick: accept,
          }, L.ok),
        ),
      ))
    }

    // -------------------------------------------------------- file tree

    /**
     * A lazy remote directory tree over dsh-ssh's SFTP listing route. Each
     * directory is fetched the first time it expands; collapsing keeps it.
     * @param props.alias - host alias to list.
     * @param props.width - the column's pixel width.
     * @param props.onInsertPath - receives a clicked file's remote path.
     */
    function FileTree(props) {
      const alias = props.alias
      const [expanded, setExpanded] = React.useState({})
      const [listing, setListing] = React.useState({})
      const [loading, setLoading] = React.useState({})
      const [error, setError] = React.useState('')
      const [selected, setSelected] = React.useState('')
      const [currentDir, setCurrentDir] = React.useState('/')
      const [transfer, setTransfer] = React.useState(undefined)
      const [menu, setMenu] = React.useState(undefined)
      const [dialog, setDialog] = React.useState(undefined)
      const fileInputRef = React.useRef(null)
      const uploadTargetRef = React.useRef('/')

      const load = React.useCallback(async (path) => {
        setLoading((current) => ({ ...current, [path]: true }))
        setError('')
        try {
          const url = API.ls + '?alias=' + encodeURIComponent(alias) + '&path=' + encodeURIComponent(path)
          const response = await fetch(url, { credentials: 'same-origin' })
          const payload = await response.json()
          if (!response.ok) throw new Error(payload && payload.error ? payload.error : 'HTTP ' + response.status)
          const entries = Array.isArray(payload.entries) ? payload.entries.slice() : []
          entries.sort((a, b) => {
            const ad = a.type === 'dir' ? 0 : 1
            const bd = b.type === 'dir' ? 0 : 1
            if (ad !== bd) return ad - bd
            return String(a.name).localeCompare(String(b.name))
          })
          setListing((current) => ({ ...current, [path]: entries }))
        } catch (failure) {
          setListing((current) => ({ ...current, [path]: [] }))
          setError(L.loadFail + ': ' + (failure && failure.message ? failure.message : String(failure)))
        } finally {
          setLoading((current) => ({ ...current, [path]: false }))
        }
      }, [alias])

      // A new host starts from a clean tree at the filesystem root.
      React.useEffect(() => {
        setExpanded({ '/': true })
        setListing({})
        setSelected('')
        setCurrentDir('/')
        setTransfer(undefined)
        setError('')
        if (alias !== '') load('/')
      }, [alias, load])

      const toggle = (path) => {
        if (expanded[path] === true) {
          setExpanded((current) => ({ ...current, [path]: false }))
          return
        }
        setExpanded((current) => ({ ...current, [path]: true }))
        if (listing[path] === undefined) load(path)
      }

      /** Drop one directory's cached listing and read it again. */
      const reloadDir = (dir) => {
        setListing((current) => {
          const next = { ...current }
          delete next[dir]
          return next
        })
        load(dir)
      }

      /** Upload every picked file into the directory the menu targeted. */
      const handleUpload = async (fileList) => {
        const dir = uploadTargetRef.current
        const files = []
        for (const file of Array.from(fileList || [])) files.push(file)
        if (files.length === 0) return
        for (const file of files) {
          const name = file.name
          setTransfer({ label: L.uploading + ' ' + name, percent: 0 })
          try {
            await uploadFile(file, alias, joinPath(dir, name), (progress) => {
              setTransfer({ label: L.uploading + ' ' + name, percent: Math.round(progress.percent || 0) })
            })
            reloadDir(dir)
            setTransfer({ label: L.uploadDone + ' ' + name, percent: 100 })
          } catch (failure) {
            setTransfer({ label: L.uploadFail + ': ' + (failure && failure.message ? failure.message : String(failure)), percent: 0 })
          }
        }
      }

      /** Ask the OS picker for files, then upload them into `dir`. */
      const pickUpload = (dir) => {
        uploadTargetRef.current = dir
        if (fileInputRef.current !== null) fileInputRef.current.click()
      }

      /** Show a failure or the cancellation note in the transfer line. */
      const report = (failure) => {
        if (failure instanceof TransferCancelled) {
          setTransfer({ label: L.downloadCancel, percent: 0 })
          return
        }
        setTransfer({ label: failure && failure.message ? failure.message : String(failure), percent: 0 })
      }

      /** Download one entry: a file as-is, a directory as a tar.gz archive. */
      const handleDownload = async (entry) => {
        const name = entry.name
        if (entry.type === 'dir' && entry.path === '/') {
          setTransfer({ label: L.rootDenied, percent: 0 })
          return
        }
        const progress = (update) => {
          setTransfer({ label: L.downloading + ' ' + name, percent: Math.round(update.percent || 0) })
        }
        setTransfer({ label: L.downloading + ' ' + name, percent: 0 })
        try {
          if (entry.type === 'dir') {
            setTransfer({ label: L.packing + ' ' + name, percent: 0 })
            const packed = await downloadDirectory(alias, entry.path, progress)
            setTransfer({ label: L.downloadDone + ' → ' + packed.filename, percent: 100 })
          } else {
            const result = await downloadFile(alias, entry.path, progress)
            setTransfer({ label: L.downloadDone + ' → ' + result.filename, percent: 100 })
          }
        } catch (failure) {
          report(failure)
        }
      }

      /** Run one context-menu action against one entry (or the tree background). */
      const runAction = async (action, entry) => {
        setMenu(undefined)
        if (action === 'download') { await handleDownload(entry); return }
        const target = entry.path
        const name = entry.name
        const parent = entry.type === 'dir' ? target : parentPath(target)
        try {
          if (action === 'copyPath') {
            try { await navigator.clipboard.writeText(target) } catch { /* clipboard may be blocked */ }
            setTransfer({ label: L.copied + ' ' + target, percent: 100 })
            return
          }
          if (action === 'copyTo') {
            const destination = await ask('input', L.copyToPrompt, joinPath(currentDir, name))
            if (destination === null || destination === '') return
            setTransfer({ label: L.working + ' ' + name, percent: 0 })
            await execRemote(alias, 'cp -a -- ' + shQuote(target) + ' ' + shQuote(destination))
            reloadDir(parentPath(destination))
            setTransfer({ label: L.done, percent: 100 })
            return
          }
          if (action === 'rename') {
            const next = await ask('input', L.renamePrompt, name)
            if (next === null || next === '' || next === name) return
            setTransfer({ label: L.working + ' ' + name, percent: 0 })
            await execRemote(alias, 'mv -- ' + shQuote(target) + ' ' + shQuote(joinPath(parentPath(target), next)))
            reloadDir(parentPath(target))
            setTransfer({ label: L.done, percent: 100 })
            return
          }
          if (action === 'remove') {
            const approved = await ask('confirm', L.deleteConfirm + '\n\n' + target, '', true)
            if (approved !== true) return
            setTransfer({ label: L.working + ' ' + name, percent: 0 })
            await execRemote(alias, 'rm -rf -- ' + shQuote(target))
            if (entry.type === 'dir') {
              setListing((current) => {
                const next = { ...current }
                for (const key of Object.keys(next)) {
                  if (key === target || key.indexOf(target + '/') === 0) delete next[key]
                }
                return next
              })
            }
            reloadDir(parentPath(target))
            setTransfer({ label: L.done, percent: 100 })
            return
          }
          if (action === 'mkdir' || action === 'touch') {
            const label = action === 'mkdir' ? L.mkdirPrompt : L.touchPrompt
            const child = await ask('input', label, '')
            if (child === null || child === '') return
            setTransfer({ label: L.working + ' ' + child, percent: 0 })
            const full = joinPath(parent, child)
            await execRemote(alias, action === 'mkdir' ? 'mkdir -p -- ' + shQuote(full) : 'touch -- ' + shQuote(full))
            reloadDir(parent)
            setTransfer({ label: L.done, percent: 100 })
            return
          }
          if (action === 'uploadHere') {
            pickUpload(parent)
            return
          }
          if (action === 'openInTerminal') {
            props.onRunText('cd ' + shQuote(target))
            return
          }
          if (action === 'refreshHere') {
            reloadDir(parent)
            return
          }
        } catch (failure) {
          report(failure)
        }
      }

      /** Open the context menu at the pointer; `entry` undefined means background. */
      const openMenu = (event, entry) => {
        event.preventDefault()
        event.stopPropagation()
        setMenu({ x: event.clientX, y: event.clientY, entry })
      }

      /** Ask for one line of text (or a confirmation) in an in-app modal. */
      const ask = (kind, title, initial, danger) => new Promise((resolve) => {
        setDialog({ kind, title, initial, danger, resolve })
      })

      /** Settle the open dialog and close it. */
      const resolveDialog = (value) => {
        const current = dialog
        setDialog(undefined)
        if (current !== undefined) current.resolve(value)
      }

      // Any press outside the menu, or Escape, dismisses it.
      React.useEffect(() => {
        if (menu === undefined) return undefined
        const close = () => setMenu(undefined)
        const onKey = (event) => { if (event.key === 'Escape') setMenu(undefined) }
        window.addEventListener('mousedown', close)
        window.addEventListener('keydown', onKey)
        return () => {
          window.removeEventListener('mousedown', close)
          window.removeEventListener('keydown', onKey)
        }
      }, [menu])

      /** The menu's rows for the current target (undefined = tree background). */
      const menuItems = () => {
        if (menu === undefined) return []
        const entry = menu.entry
        if (entry === undefined) {
          const background = { path: currentDir, name: baseName(currentDir), type: 'dir' }
          return [
            { label: L.newFile, run: () => runAction('touch', background) },
            { label: L.newFolder, run: () => runAction('mkdir', background) },
            { label: L.uploadHere, run: () => runAction('uploadHere', background) },
            { label: L.refreshHere, run: () => runAction('refreshHere', background) },
          ]
        }
        if (entry.type === 'dir') {
          return [
            { label: L.downloadDir, run: () => runAction('download', entry) },
            { label: L.openInTerminal, run: () => runAction('openInTerminal', entry) },
            { label: L.newFile, run: () => runAction('touch', entry) },
            { label: L.newFolder, run: () => runAction('mkdir', entry) },
            { label: L.uploadHere, run: () => runAction('uploadHere', entry) },
            { label: L.copyPath, run: () => runAction('copyPath', entry) },
            { label: L.copyTo, run: () => runAction('copyTo', entry) },
            { label: L.rename, run: () => runAction('rename', entry) },
            { label: L.remove, run: () => runAction('remove', entry) },
            { label: L.refreshHere, run: () => runAction('refreshHere', entry) },
          ]
        }
        return [
          { label: L.download, run: () => runAction('download', entry) },
          { label: L.copyPath, run: () => runAction('copyPath', entry) },
          { label: L.copyTo, run: () => runAction('copyTo', entry) },
          { label: L.rename, run: () => runAction('rename', entry) },
          { label: L.remove, run: () => runAction('remove', entry) },
        ]
      }

      /** The floating menu, clamped inside the viewport. */
      const renderMenu = () => {
        const items = menuItems()
        if (menu === undefined || items.length === 0) return null
        const width = 200
        const height = items.length * 26 + 10
        const left = Math.max(4, Math.min(menu.x, window.innerWidth - width - 8))
        const top = Math.max(4, Math.min(menu.y, window.innerHeight - height - 8))
        return h('div', {
          style: {
            position: 'fixed', left: left + 'px', top: top + 'px', zIndex: 80,
            width: width + 'px', padding: '4px', borderRadius: '8px',
            border: '1px solid ' + colors.border, background: colors.layer,
            boxShadow: '0 10px 28px rgba(0, 0, 0, 0.38)',
          },
          onMouseDown: (event) => event.stopPropagation(),
          onContextMenu: (event) => { event.preventDefault(); event.stopPropagation() },
        }, items.map((item, index) => h('div', {
          key: index + ':' + item.label,
          style: {
            padding: '5px 10px', fontSize: '12px', borderRadius: '6px',
            cursor: 'pointer', color: colors.label, whiteSpace: 'nowrap',
            overflow: 'hidden', textOverflow: 'ellipsis',
          },
          onMouseEnter: (event) => { event.currentTarget.style.background = colors.hover },
          onMouseLeave: (event) => { event.currentTarget.style.background = 'transparent' },
          onClick: () => item.run(),
        }, item.label)))
      }


      const renderLevel = (path, depth) => {
        const entries = listing[path]
        if (!entries) return null
        if (entries.length === 0 && depth === 0) {
          return [h('div', { key: 'empty', style: { ...styles.row, color: colors.tertiary, paddingLeft: '18px' } }, L.empty)]
        }
        return entries.map((entry) => {
          const name = String(entry.name)
          const full = joinPath(path, name)
          const isDir = entry.type === 'dir'
          const isOpen = expanded[full] === true
          const isSelected = selected === full
          return h(React.Fragment, { key: full },
            h('div', {
              style: {
                ...styles.row,
                paddingLeft: (10 + depth * 12) + 'px',
                background: isSelected ? colors.hover : 'transparent',
              },
              title: full,
              onClick: () => {
                setCurrentDir(isDir ? full : parentPath(full))
                if (isDir) toggle(full)
                else setSelected(full)
              },
              onDoubleClick: () => { if (!isDir) props.onInsertPath(full) },
              onContextMenu: (event) => {
                setCurrentDir(isDir ? full : parentPath(full))
                setSelected(full)
                openMenu(event, { path: full, name, type: isDir ? 'dir' : 'file' })
              },
            },
              h('span', { style: styles.caret }, isDir ? (isOpen ? '▾' : '▸') : '·'),
              h('span', { style: styles.name }, name + (isDir ? '/' : '')),
              isDir ? null : h('span', { style: styles.size }, formatSize(entry.size)),
              isDir ? null : h('button', {
                style: { ...styles.button, padding: '0 4px', fontSize: '10px', marginLeft: '4px', lineHeight: 1.2 },
                title: L.download + ' ' + name,
                onClick: (event) => {
                  event.stopPropagation()
                  handleDownload({ path: full, name, type: 'file' })
                },
              }, '⇩'),
            ),
            isDir && isOpen ? renderLevel(full, depth + 1) : null,
          )
        })
      }

      return h('div', {
        style: { ...styles.tree, width: props.width + 'px' },
        onContextMenu: (event) => openMenu(event, undefined),
      },
        h('div', { style: styles.treeHead },
          h('span', { style: { overflow: 'hidden', textOverflow: 'ellipsis', flex: '1 1 auto' }, title: currentDir }, L.files),
          h('button', {
            style: { ...styles.button, padding: '0 6px', fontSize: '11px' },
            title: L.upload + ' → ' + currentDir,
            disabled: alias === '',
            onClick: () => pickUpload(currentDir),
          }, '⇪'),
          h('button', {
            style: { ...styles.button, padding: '0 6px', fontSize: '11px' },
            title: L.refresh,
            disabled: alias === '',
            onClick: () => { if (alias !== '') reloadDir(currentDir) },
          }, '⟳'),
          h('input', {
            ref: fileInputRef,
            type: 'file',
            multiple: true,
            style: { display: 'none' },
            onChange: (event) => {
              const files = event.target.files
              event.target.value = ''
              handleUpload(files)
            },
          }),
        ),
        transfer === undefined ? null : h('div', {
          style: { ...styles.hint, borderTop: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
          title: transfer.label,
        }, transfer.label + (transfer.percent > 0 && transfer.percent < 100 ? ' ' + transfer.percent + '%' : '')),
        error === '' ? null : h('div', { style: { padding: '6px 8px', fontSize: '11px', color: 'var(--dsw-alias-state-error-primary, #e5534b)' } }, error),
        alias === '' ? null : renderLevel('/', 0),
        h('div', { style: styles.hint }, L.insertHint),
        renderMenu(),
        dialog === undefined ? null : h(Dialog, { ...dialog, onResolve: resolveDialog }),
      )
    }

    // ------------------------------------------------------------- pane

    /**
     * One tab: a remote file tree beside a PTY on the same host.
     * @param props.alias - resolved host alias for this tab (may be empty).
     * @param props.openPaneTab - opens another tab for a host.
     */
    function SshPane(props) {
      const [hosts, setHosts] = React.useState([])
      const [status, setStatus] = React.useState('idle')
      const [note, setNote] = React.useState('')
      const [epoch, setEpoch] = React.useState(0)
      const [treeWidth, setTreeWidth] = React.useState(230)
      const [alias, setAlias] = React.useState(typeof props.alias === 'string' ? props.alias : '')
      const [authAsk, setAuthAsk] = React.useState(undefined)
      const mountRef = React.useRef(null)
      const terminalRef = React.useRef(null)

      // Fetch the host inventory once; dsh-ssh owns it and this tab only reads.
      React.useEffect(() => {
        let alive = true
        fetch(API.hosts, { credentials: 'same-origin' })
          .then((response) => response.json())
          .then((payload) => {
            if (!alive) return
            const list = payload && Array.isArray(payload.hosts) ? payload.hosts : []
            setHosts(list)
            if (list.length === 0) {
              setNote(L.noHosts)
              return
            }
            setAlias((current) => {
              if (current !== '') return current
              const fallback = takePending()
              return typeof fallback === 'string' ? fallback : list[0].alias
            })
          })
          .catch((failure) => {
            if (!alive) return
            setNote(L.hostsFail + ': ' + (failure && failure.message ? failure.message : String(failure)))
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
          terminalRef.current = terminal

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
              const titles = prompts.map((prompt) => (prompt && prompt.prompt ? String(prompt.prompt) : 'code'))
              if (titles.length === 0) {
                send({ type: 'auth_response', responses: [] })
                return
              }
              setAuthAsk({ remaining: titles, answers: [], send })
            }
          }
          socket.onerror = () => {
            if (disposed) return
            setStatus('error')
            setNote(L.socketFail)
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

        boot().catch((failure) => {
          if (disposed) return
          setStatus('error')
          setNote(failure && failure.message ? failure.message : String(failure))
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
          terminalRef.current = null
        }
      }, [alias, epoch])

      // Type a remote path into the live shell, where the cursor already is.
      const insertPath = React.useCallback((path) => {
        const terminal = terminalRef.current
        if (terminal !== null) terminal.paste(path)
      }, [])

      // Type a whole command and press Enter.
      const runText = React.useCallback((text) => {
        const terminal = terminalRef.current
        if (terminal === null) return
        try {
          terminal.input(text)
          terminal.input('\r')
        } catch { /* the shell may already be gone */ }
      }, [])

      /** Answer one keyboard-interactive prompt at a time, then reply. */
      const resolveAuth = (value) => {
        const current = authAsk
        setAuthAsk(undefined)
        if (current === undefined) return
        const answers = value === null ? current.answers : current.answers.concat([value])
        const remaining = value === null ? [] : current.remaining.slice(1)
        if (remaining.length === 0) {
          current.send({ type: 'auth_response', responses: answers })
          return
        }
        setAuthAsk({ ...current, answers, remaining })
      }

      const startDrag = (event) => {
        event.preventDefault()
        const startX = event.clientX
        const startWidth = treeWidth
        const move = (moveEvent) => {
          setTreeWidth(Math.max(140, Math.min(460, startWidth + moveEvent.clientX - startX)))
        }
        const stop = () => {
          window.removeEventListener('mousemove', move)
          window.removeEventListener('mouseup', stop)
        }
        window.addEventListener('mousemove', move)
        window.addEventListener('mouseup', stop)
      }

      const hostOptions = hosts.map((host) => h('option', { key: host.alias, value: host.alias }, host.alias))

      return h('div', { style: styles.root },
        h('div', { style: styles.bar },
          h('span', { style: { color: colors.secondary } }, L.host),
          h('select', {
            style: styles.select,
            value: alias,
            disabled: hosts.length === 0,
            title: alias,
            onChange: (event) => {
              const next = event.target.value
              if (next === alias) return
              // Another host is a different tab, never a rebind of this one.
              props.openPaneTab(next)
            },
          }, hostOptions.length === 0 ? [h('option', { key: 'none', value: '' }, '—')] : hostOptions),
          h('button', {
            style: styles.button,
            title: L.newTab,
            onClick: () => props.openPaneTab(alias),
            disabled: alias === '',
          }, '+'),
          h('button', {
            style: styles.button,
            onClick: () => setEpoch((value) => value + 1),
            disabled: alias === '',
          }, L.reconnect),
          note === '' ? null : h('span', { style: styles.note, title: note }, note),
          h('span', { style: { ...styles.status, color: statusColor(status) } }, statusText(status)),
        ),
        h('div', { style: styles.body },
          h(FileTree, { alias, width: treeWidth, onInsertPath: insertPath, onRunText: runText }),
          h('div', { style: styles.divider, onMouseDown: startDrag }),
          h('div', { style: styles.termWrap },
            h('div', { ref: mountRef, style: styles.term }),
          ),
        ),
        authAsk === undefined ? null : h(Dialog, {
          kind: 'input',
          title: authAsk.remaining[0],
          initial: '',
          onResolve: resolveAuth,
        }),
      )
    }

    // ------------------------------------------------------ registration

    return {
      inject: ['slots'],
      /**
       * Declare the tab type, its body and its chip against the right sidebar's
       * public seats, all inside one effect so unload removes every piece.
       * @param ctx - client plugin context.
       */
      apply(ctx) {
        ctx.inject(['slots', 'sidebarRight', 'sidebarRightTabs'], (scoped) => {
          const tabs = scoped.get('sidebarRightTabs')
          const right = scoped.get('sidebarRight')
          if (tabs === undefined || typeof tabs.register !== 'function') return

          /** Open one more tab bound to a host. */
          const openPaneTab = (alias) => {
            if (right === undefined || typeof right.openTab !== 'function') return
            rememberPending(alias)
            try {
              right.openTab(TAB_KIND, { params: { alias, instance: String(Date.now()) } })
            } catch {
              // Older shells take the kind alone; the FIFO then supplies the alias.
              right.openTab(TAB_KIND)
            }
          }

          /** Read this tab's params, falling back to the newest pending alias. */
          const aliasOf = (props) => {
            const tab = props && props.tab
            const navigation = tab && tab.navigation
            const params = (navigation && navigation.params) || (tab && tab.params) || (props && props.params) || {}
            const alias = params && typeof params.alias === 'string' ? params.alias : ''
            if (alias !== '') return alias
            return takePending() || ''
          }

          /** The body: resolve the alias once per mount, then render the pane. */
          function PaneBody(props) {
            const [alias] = React.useState(() => aliasOf(props))
            return h(SshPane, { alias, openPaneTab })
          }

          /** The chip: show the host when the tab info carries it. */
          function PaneTitle(props) {
            const tab = props && props.tab
            const navigation = tab && tab.navigation
            const params = (navigation && navigation.params) || (tab && tab.params) || (props && props.params) || {}
            const alias = params && typeof params.alias === 'string' && params.alias !== '' ? params.alias : L.title
            return h('span', { style: { overflow: 'hidden', textOverflow: 'ellipsis' } }, alias)
          }

          scoped.effect(() => {
            const disposers = []
            disposers.push(tabs.register({
              id: TAB_ID,
              kind: TAB_KIND,
              priority: 'extension',
              keepMounted: true,
              multiple: true,
              title: () => L.title,
              guide: [{ id: 'ssh-pane', order: 60, title: () => L.guide }],
            }))
            disposers.push(scoped.slots.inject('sidebar.right.pane.tab', () => scoped.slots.register({
              name: 'sidebar.right.pane.tab',
              key: TAB_ID,
              inject: () => ({}),
            }, PaneBody)))
            disposers.push(scoped.slots.inject('sidebar.right.pane.tab.title', () => scoped.slots.register({
              name: 'sidebar.right.pane.tab.title',
              key: TAB_ID,
              inject: () => ({}),
            }, PaneTitle)))
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
