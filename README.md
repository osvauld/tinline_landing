# Tinline website

Standalone Astro launch site for **https://tinline.osvauld.com**, with a bundled Svelte design playground. The site builds and runs without the Rust/Android repository.

- App source: https://github.com/osvauld/tinline
- Site source: https://github.com/osvauld/tinline_landing

## Develop

Use Node 24 (`.nvmrc`). Install both lockfile-controlled dependency sets:

```sh
npm ci
npm ci --prefix playground
npm run dev
```

Open **http://localhost:4321/**. The dev command runs Astro and the playground together, proxying `/play/` through the same origin. Both support live updates. Override the site address with `npm run dev -- --host 0.0.0.0 --port 4322`.

The homepage embeds one clickable design preview with a Mobile / Desktop switch. `/play/` also opens directly. People, conversations and receipt states in the preview are synthetic; it is not a running Tinline client. Website previews are silent.

## Build and check

```sh
npm run build
npm run check
npm run preview
```

`build` produces the Astro pages and then the playground at `dist/play/`. `check` type-checks the playground and verifies every generated site/docs page uses external CSS/scripts and the production CSP. A Vite large-chunk advisory is currently expected; it is not a failed build.

On the shared development machine, follow the active task-manager admission rules for builds/checks. To keep isolated local build artifacts on the cache disk, Astro's `cacheDir` and `outDir` must be on the **same filesystem**: Astro renames prerender assets between them. Do not move or delete outputs used by another session.

## Content and assets

- `/`: app-first alpha landing page and GitHub download link.
- `/whitepaper`: `src/content/whitepaper.md`, an exact snapshot of app commit `26623f72` (18 October 2026).
- `/security` and `/privacy`: site-owned public policies and explanations.
- `/docs/*`: current technical documentation for app version 0.1.38 at commit `dc0fb7c3`, one Markdown file per page in `src/content/docs/`, ordered by frontmatter `order`.
- `/blog/*`: retained article drafts, not promoted on the homepage.
- `/play/`: standalone design playground in `playground/`.

The technical docs were refreshed against app version 0.1.38 (`dc0fb7c3`) and cover identity, contacts, linking, chat, groups, receipts, calls, platforms, threats and builds. Content snapshots do **not** synchronize automatically with the app repository; review implementation and status claims before publishing updates.

Colors, icons, identity patterns and tick geometry are bundled here. To regenerate static art from local exports:

```sh
node scripts/art.mts
```

To refresh tick geometry from a newer app export, explicitly supply that file, then regenerate the art. Ordinary builds do not need it:

```sh
node scripts/import-ticks.mjs /path/to/tin-icons/generated/tin_ticks.rs
node scripts/art.mts
```

Legacy app/playground design QA scripts that require another checkout were not imported. The standalone checks above are the supported validation entry points; the app repository retains its broader design flow suite.

## Deployment

Netlify imports `osvauld/tinline_landing`, production branch `main`, repository root as base, `dist` as publish directory. `netlify.toml` installs the playground dependencies, runs the combined build and runs `npm run check` before accepting it; Netlify installs the root npm dependencies automatically. GitHub Actions installs both sets, type-checks the playground, builds, checks production policies and rejects known analytics references.

Keep production CSS external (`build.inlineStylesheets: 'never'`). Pages carry their own CSP; the playground has a separate policy for generated bubble styles. Development-only inline/HMR allowances are not included in production. Fonts and art are self-hosted. No analytics or third-party scripts are included.

See [DEPLOY.md](DEPLOY.md) for the snapshot provenance, owner confirmations and post-deployment checklist. In particular, the published GitHub app release must be checked against the implementation version described by the paper.

Contact: **abe@osvauld.com**. Do not commit hosting credentials or signing keys. Updating this checkout is not a deployment: publishing, pushes and account-level hosting/DNS changes need explicit approval. Do not invent release URLs or legal terms; the app's `/terms` link still needs owner-approved terms before an unrestricted release.
