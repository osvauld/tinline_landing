import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig, type Plugin } from 'vite'

/* Built for the website (site/package.json `build:play`, served at /play/): the page carries its own CSP, scripts from
   this site only. Svelte sets styles from code (style: directives, shaped bubbles), hence 'unsafe-inline' for styles
   here and nowhere else on the site. Dev builds stay unrestricted. */
const sitePolicy = (): Plugin => ({
  name: 'site-policy',
  apply: 'build',
  transformIndexHtml: () => [{
    tag: 'meta', injectTo: 'head-prepend',
    attrs: { 'http-equiv': 'Content-Security-Policy', content: "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; base-uri 'none'; form-action 'none'" },
  }],
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte(), sitePolicy()],
  build: { target: 'es2022' },
  // The blog lab reads drafts from the site next door (site/src/content/blog).
  server: { fs: { allow: ['..'] } },
})
