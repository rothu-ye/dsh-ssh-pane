/**
 * Host half of @local/dsh-ssh-pane.
 *
 * Serves the three xterm assets the browser half needs (the UMD build, its fit
 * addon, and its stylesheet) from this package's own `assets/` directory. They
 * are served rather than imported because a plugin's client bundle runs in the
 * browser and cannot resolve a bare module specifier; the loader has no xterm
 * entry either. Copying the files here keeps the plugin working whether it is
 * installed as a copy or linked from a checkout.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))

/** The exact-path routes this plugin claims. */
const ASSETS = [
  { path: '/dsh-ssh-pane/xterm.js', file: 'assets/xterm.js', type: 'text/javascript; charset=utf-8' },
  { path: '/dsh-ssh-pane/addon-fit.js', file: 'assets/addon-fit.js', type: 'text/javascript; charset=utf-8' },
  { path: '/dsh-ssh-pane/xterm.css', file: 'assets/xterm.css', type: 'text/css; charset=utf-8' },
]

export const name = 'dsh-ssh-pane'

export const inject = ['webServer']

/**
 * Register one read-only route per asset, with the bytes read once at
 * activation so a request never touches the filesystem.
 * @param ctx - host plugin context carrying `webServer`.
 */
export function apply(ctx) {
  ctx.effect(() => {
    const disposers = []
    try {
      for (const asset of ASSETS) {
        const body = readFileSync(join(HERE, asset.file))
        disposers.push(ctx.webServer.register({
          kind: 'exact',
          path: asset.path,
          resource: () => new Response(body, {
            headers: {
              'content-type': asset.type,
              'cache-control': 'public, max-age=86400',
            },
          }),
        }))
      }
    } catch (error) {
      for (const dispose of disposers.splice(0)) dispose()
      throw error
    }
    return () => { for (const dispose of disposers.splice(0)) dispose() }
  })
}
