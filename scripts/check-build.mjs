import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';

for (const route of ['', 'privacy/', 'security/']) {
  const html = await readFile(`dist/${route}index.html`, 'utf8');
  assert(!/<style(?:\s|>)/i.test(html), `${route || '/'}: inline CSS would be blocked by CSP`);
  assert(!/\sstyle\s*=/i.test(html), `${route || '/'}: inline style attribute blocked by CSP`);
  assert(!/<script(?:\s|>)/i.test(html), `${route || '/'}: unexpected client script`);
  const links = [...html.matchAll(/<link\b[^>]*>/gi)].map(([tag]) => tag);
  const stylesheets = links.filter(tag => /rel="stylesheet"/.test(tag));
  assert(stylesheets.length > 0, `${route || '/'}: missing external stylesheet`);
  for (const tag of stylesheets) {
    const href = tag.match(/href="([^"]+)"/)?.[1];
    assert(href?.startsWith('/_astro/') && href.endsWith('.css'), `Unexpected CSS URL: ${href}`);
    const css = await readFile(`dist${href}`, 'utf8');
    assert(css.includes('#0b6b5b') && css.includes('#6fd3bd'), 'App primary colors missing');
  }
}
for (const font of ['figtree_variable.ttf', 'plexmono_regular.ttf']) {
  await access(`dist/fonts/${font}`);
}
console.log('Production pages use external CSS, app colors and self-hosted fonts; no inline styles/scripts.');
