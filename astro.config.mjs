import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://tinline.osvauld.com',
  output: 'static',
  // Netlify CSP deliberately forbids inline styles, including Astro's small-CSS optimization.
  build: { inlineStylesheets: 'never' },
  // Shiki writes inline style attributes on code blocks, which the CSP would also block.
  markdown: { syntaxHighlight: false },
  // Small scripts must also stay external: script-src 'self' does not allow inline JS.
  vite: { build: { assetsInlineLimit: 0 } },
});
