/* Blog posts are the Markdown files in src/content/blog. A post with `draft: true` shows while developing
   (`npm run dev`) or when built with SHOW_DRAFTS=1, and stays out of the normal production build. */
import type { MarkdownInstance } from 'astro';

type Meta = { title: string; date: string; author?: string; summary?: string; draft?: boolean };
export type Post = { slug: string; meta: Meta; Content: MarkdownInstance<Meta>['Content']; words: number };

const files = import.meta.glob<MarkdownInstance<Meta>>('../content/blog/*.md', { eager: true });
const showDrafts = import.meta.env.DEV || process.env.SHOW_DRAFTS === '1';

export const posts: Post[] = Object.entries(files)
  .map(([path, md]) => ({
    slug: path.split('/').pop()!.replace(/\.md$/, ''),
    meta: md.frontmatter,
    Content: md.Content,
    words: md.rawContent().split(/\s+/).filter(Boolean).length,
  }))
  .filter((p) => showDrafts || !p.meta.draft)
  .sort((a, b) => String(b.meta.date).localeCompare(String(a.meta.date)));

export const readingTime = (words: number) => `${Math.max(1, Math.round(words / 220))} min read`;

export const longDate = (d: string | Date) =>
  new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
