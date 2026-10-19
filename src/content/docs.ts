// Docs pages: one Markdown file per page in ./docs, ordered by `order` in its frontmatter.
// `index.md` is served at /docs, every other file at /docs/<file name>.
import type { MarkdownInstance } from 'astro';

interface DocFrontmatter {
  title: string;
  description: string;
  order: number;
}

const files = import.meta.glob<MarkdownInstance<DocFrontmatter>>('./docs/*.md', { eager: true });

export const docs = Object.entries(files)
  .map(([path, md]) => {
    const name = path.slice('./docs/'.length, -'.md'.length);
    return { slug: name === 'index' ? '' : name, ...md.frontmatter, Content: md.Content };
  })
  .sort((a, b) => a.order - b.order);
