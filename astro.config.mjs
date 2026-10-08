import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://tinline.osvauld.com',
  output: 'static',
  // Netlify CSP deliberately forbids inline styles, including Astro's small-CSS optimization.
  build: { inlineStylesheets: 'never' },
});
