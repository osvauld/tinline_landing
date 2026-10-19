<script lang="ts">
  /* Blog lab (`?lab=blog`): reads the site's blog drafts (site/src/content/blog/*.md) in the playground's own type and
     colour, so the words can be judged next to the app. Reading view only: the site renders the same files itself. */
  const files = import.meta.glob('../../../../src/content/blog/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

  type Post = { slug: string; title: string; date: string; summary: string; draft: boolean; body: string };

  function parse(path: string, raw: string): Post {
    const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
    const meta: Record<string, string> = {};
    for (const line of (m?.[1] ?? '').split('\n')) {
      const i = line.indexOf(':');
      if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^"(.*)"$/, '$1');
    }
    return {
      slug: path.split('/').pop()!.replace(/\.md$/, ''),
      title: meta.title ?? '', date: meta.date ?? '', summary: meta.summary ?? '',
      draft: meta.draft === 'true', body: m?.[2] ?? raw,
    };
  }

  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const inline = (s: string) => esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');

  /** Just enough Markdown for these posts: headings, paragraphs, ordered and unordered lists. */
  function render(md: string): string {
    const out: string[] = [];
    for (const block of md.trim().split(/\n{2,}/)) {
      const lines = block.split('\n');
      const h = block.match(/^(#{2,3}) (.*)$/);
      if (h) { out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); continue; }
      if (/^- /.test(block) || /^\d+\. /.test(block)) {
        const tag = /^- /.test(block) ? 'ul' : 'ol';
        const items: string[] = [];
        for (const l of lines) {
          if (/^(- |\d+\. )/.test(l)) items.push(l.replace(/^(- |\d+\. )/, ''));
          else items[items.length - 1] += ' ' + l.trim();
        }
        out.push(`<${tag}>${items.map((i) => `<li>${inline(i)}</li>`).join('')}</${tag}>`);
        continue;
      }
      out.push(`<p>${inline(lines.join(' '))}</p>`);
    }
    return out.join('\n');
  }

  const posts = Object.entries(files).map(([p, raw]) => parse(p, raw)).sort((a, b) => b.date.localeCompare(a.date));
  let current = $state(posts[0]?.slug ?? '');
  const post = $derived(posts.find((p) => p.slug === current));
  const words = $derived(post ? post.body.split(/\s+/).filter(Boolean).length : 0);

  let theme = $state<'light' | 'dark'>(matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  $effect(() => { document.documentElement.dataset.theme = theme; });
</script>

<div class="page">
  <header class="bar">
    <span class="where">Blog drafts</span>
    {#if posts.length > 1}
      <select bind:value={current} aria-label="Post">
        {#each posts as p (p.slug)}<option value={p.slug}>{p.title}</option>{/each}
      </select>
    {/if}
    <button class="theme" onclick={() => (theme = theme === 'light' ? 'dark' : 'light')}>{theme === 'light' ? 'Dark' : 'Light'}</button>
  </header>

  {#if post}
    <article>
      <p class="meta">
        {#if post.draft}<span class="draft">Draft</span>{/if}
        <span>{post.date}</span><span aria-hidden="true">·</span><span>{Math.max(1, Math.round(words / 220))} min read</span>
      </p>
      <h1>{post.title}</h1>
      {#if post.summary}<p class="summary">{post.summary}</p>{/if}
      <div class="body">{@html render(post.body)}</div>
    </article>
  {:else}
    <p class="empty">No drafts in site/src/content/blog yet.</p>
  {/if}
</div>

<style>
  .page { min-height: 100vh; background: var(--bg); color: var(--ink); }
  .bar {
    position: sticky; top: 0; display: flex; align-items: center; gap: 12px;
    padding: 12px 16px; background: var(--bg); box-shadow: inset 0 -1px 0 var(--hairline);
  }
  .where { font-weight: 600; margin-right: auto; }
  select, .theme {
    font: inherit; color: var(--ink); background: var(--surface); border: 0; border-radius: 14px;
    box-shadow: inset 0 0 0 1px var(--line); padding: 8px 14px; min-height: 40px; cursor: pointer;
  }
  article { max-width: 640px; margin: 0 auto; padding: 48px 16px 96px; }
  .meta { display: flex; gap: 8px; align-items: center; color: var(--muted); font-size: 14px; margin: 0 0 12px; font-variant-numeric: tabular-nums; }
  .draft { background: var(--accent-soft); color: var(--accent-ink); border-radius: 999px; padding: 2px 10px; font-weight: 600; }
  h1 { font-size: clamp(30px, 6vw, 42px); line-height: 1.12; letter-spacing: -0.02em; margin: 0 0 16px; text-wrap: balance; }
  .summary { font-size: 19px; line-height: 1.5; color: var(--muted); margin: 0 0 40px; text-wrap: pretty; }
  .body { font-size: 18px; line-height: 1.7; }
  .body :global(p) { margin: 0 0 1.1em; text-wrap: pretty; }
  .body :global(h2) { font-size: 26px; line-height: 1.25; letter-spacing: -0.01em; margin: 2.2em 0 0.6em; }
  .body :global(h3) { font-size: 19px; line-height: 1.35; margin: 1.8em 0 0.4em; }
  .body :global(ul), .body :global(ol) { margin: 0 0 1.2em; padding-left: 1.3em; }
  .body :global(li) { margin: 0 0 0.5em; }
  .body :global(li::marker) { color: var(--accent-ink); }
  .body :global(a) { color: var(--accent-ink); text-underline-offset: 3px; }
  .body :global(strong) { font-weight: 650; }
  .empty { padding: 48px 16px; color: var(--muted); text-align: center; }
</style>
