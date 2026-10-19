import assert from 'node:assert/strict';
import { readFile, readdir, access } from 'node:fs/promises';

const dist = process.argv[2] ?? 'dist';
const posts = (await readdir('src/content/blog')).filter(f => f.endsWith('.md'));
const live = [];
for (const f of posts) {
  const draft = /^draft:\s*true\s*$/m.test((await readFile(`src/content/blog/${f}`, 'utf8')).split('\n---')[0]);
  if (!draft || process.env.SHOW_DRAFTS === '1') live.push(`blog/${f.replace(/\.md$/, '')}/`);
}
const docRoutes = (await readdir('src/content/docs')).filter(f => f.endsWith('.md'))
  .map(f => f === 'index.md' ? 'docs/' : `docs/${f.slice(0, -3)}/`);
for (const route of ['', 'privacy/', 'security/', 'whitepaper/', 'blog/', ...live, ...docRoutes]) {
  const html = await readFile(`${dist}/${route}index.html`, 'utf8');
  assert(!/<style(?:\s|>)/i.test(html), `${route || '/'}: inline CSS would be blocked by CSP`);
  assert(!/\sstyle\s*=/i.test(html), `${route || '/'}: inline style attribute blocked by CSP`);
  assert(/<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self'; style-src 'self';/.test(html), `${route || '/'}: missing the strict page policy`);
  // Theme and preview fitting must remain external and same-origin.
  const scripts = [...html.matchAll(/<script\b[^>]*>/gi)].map(([tag]) => tag);
  assert(scripts.every(tag => {
    const src = tag.match(/\bsrc="([^"]+)"/)?.[1];
    return src === '/theme.js' || /^\/_astro\/[a-zA-Z0-9_.-]+\.js$/.test(src ?? '');
  }), `${route || '/'}: inline or foreign client script ${scripts}`);
  assert(html.includes('src="/logo.svg"'), `${route || '/'}: missing app logo`);
  if (docRoutes.includes(route)) {
    assert(!/<meta name="robots" content="noindex"/.test(html), `${route}: current technical documentation must be indexable`);
    assert(html.includes('Implementation snapshot: Tinline 0.1.38'), `${route}: missing implementation-version notice`);
    assert(html.includes('has not had an independent security audit'), `${route}: missing audit notice`);
    assert(html.includes('TECHNICAL DOCUMENTATION'), `${route}: missing documentation label`);
    assert(!html.includes('older draft'), `${route}: stale older-draft label`);
  }
  const links = [...html.matchAll(/<link\b[^>]*>/gi)].map(([tag]) => tag);
  const stylesheets = links.filter(tag => /rel="stylesheet"/.test(tag));
  assert(stylesheets.length > 0, `${route || '/'}: missing external stylesheet`);
  for (const tag of stylesheets) {
    const href = tag.match(/href="([^"]+)"/)?.[1];
    assert(href?.startsWith('/_astro/') && href.endsWith('.css'), `Unexpected CSS URL: ${href}`);
    const css = await readFile(`${dist}${href}`, 'utf8');
    assert(css.includes('#0b6b5b') && css.includes('#6fd3bd'), 'App primary colors missing');
  }
}
// The live phones: the playground build, under its own policy (styles set from code need 'unsafe-inline' there only).
const play = (await readFile(`${dist}/play/index.html`, 'utf8')).replaceAll('&#39;', "'");
assert(/http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self';/.test(play), 'play/: missing its page policy');
assert(!/<script(?![^>]*\bsrc="\/play\/)/.test(play), 'play/: inline or foreign script');
for (const font of ['figtree_variable.ttf', 'plexmono_regular.ttf']) {
  await access(`${dist}/fonts/${font}`);
}
assert.equal(await readFile(`${dist}/favicon.svg`, 'utf8'), await readFile(`${dist}/logo.svg`, 'utf8'), 'Favicon must match the app logo');
console.log('Production pages use the app logo, external CSS, app colors and self-hosted fonts; no inline styles/scripts.');
