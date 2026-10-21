# Deployment preparation

## Prepared locally

- Standalone website: this repository (`osvauld/tinline_landing`), no app checkout required.
- Whitepaper: `src/content/whitepaper.md` incorporates the post-`26623f72` audit and is updated for app version 0.1.38 at `dc0fb7c3` (19 October 2026).
- Whitepaper SHA-256: `c1a4ddf786673744dec660ee602fa3d6e481138c7b67eb68b02313c853f4b953`.
- App-first alpha homepage, independent `/play/`, Mobile / Desktop preview switch, silent demo, updated string receipt marks, contact `abe@osvauld.com`.
- Security/privacy wording aligned with the snapshot for encrypted local stores, public relay/DNS metadata, group-host visibility, signed receipts and recording's planned status.
- `/docs/*` technical documentation has been refreshed against app version 0.1.38 at `dc0fb7c3`, including current protocol versions, disabled-by-default endpoint rotation, groups, receipts, live video controls and release packaging. It carries a pre-release/audit warning but is no longer labelled as an older draft.
- Production scripts and CSS remain external. Netlify now runs `npm run check` before accepting a build.

## Owner confirmations before publishing

1. **Download version:** checked 19 October 2026, GitHub's public release listing contains only `v0.1.3` (including a check for prereleases), while the whitepaper and technical docs describe app `0.1.38` at `dc0fb7c3`. The public Cloudflare-backed APT index also lists `0.1.3`. The homepage links to `https://github.com/osvauld/tinline/releases/latest` (the newest published, non-prerelease release) and offers `curl -fsSL https://tinline.osvauld.com/install.sh | sh`, which installs that same release on Linux x86-64 and the documentation explicitly says its implementation is newer than the published release. Do not imply that the downloadable release implements every documented feature.
2. Review the updated privacy/security wording and refreshed technical docs. The paper remains labelled draft; alpha software has not had an independent security audit.
3. Confirm the production hosting project's repository, branch and domain. The repository's existing configuration targets Netlify, repository root, production branch `main`, publish directory `dist`, domain `tinline.osvauld.com`. A public HTTP 200 from the domain is not verification of account-level deployment settings.
4. Authorize the exact push or deploy-preview operation. The canonical local branch is `main`; approval to commit locally does not authorize a push, DNS change or deployment.

## Validation

From a clean independent checkout with Node 24:

```sh
npm ci
npm ci --prefix playground
npm run build
npm run check
```

Use the shared task manager for local heavy work. On this machine, place both the isolated checkout's `.astro` intermediates and `dist` on the cache disk: Astro renames files between them and cannot do that across filesystems. Do not reuse a directory currently being served.

`npm run check` includes playground type checks and all production site/docs pages' CSP constraints. Vite's current large-chunk warning is a performance advisory, not a build failure. These checks do not prove app integration, app release readiness, or security-review completion.

### Latest local results (19 October 2026)

- Task 878: fresh root/playground npm installs, `npm run build`, `npm run check` passed in an isolated cache-disk copy. npm reported 0 known vulnerabilities for both dependency sets; this is not a security audit. Svelte/TypeScript: 0 errors and 0 warnings. The separate Vite large-chunk advisory remains.
- Tasks 910 and 911: app 0.1.38 passed the three named core integration targets (17 tests) and the `video_call` library filter (56 tests). These are targeted Rust checks, not platform or device validation.
- Task 3474: the fully reconciled site built all 16 Astro pages plus the playground; Svelte/TypeScript reported 0 errors and 0 warnings, and production CSP/site checks passed. The separate Vite large-chunk advisory remains.
- Task 3475: all 17 public routes (including the playground and 11 technical-doc routes) returned HTTP 200 in Chromium at 390px and 1440px in light and dark themes. They had no page overflow, browser errors or stale whitepaper/docs version notices; the embedded preview loaded. Generated internal links also passed a separate local check.
- The paper's SHA-256 matches the audited standalone snapshot above. Targeted app tests are recorded in the technical build page; no independent security audit or real hosting deployment was performed by these checks.

## After an authorized deployment

- Confirm HTTPS and the intended host at `/`, `/play/`, `/whitepaper`, `/security`, `/privacy` and the current `/docs` pages.
- Check Mobile / Desktop switching on a phone-width and desktop-width browser, without moving surrounding text.
- Open a chat and search in the demo; verify the string ticks and silence.
- Check light/dark themes, browser console and production response headers. The site should have external scripts/CSS only; `/play/` has its own policy, and framing is same-origin only.
- Confirm the download button resolves to the owner-approved release/assets; do not install on a device without separate authorization.
- Check the paper date and draft label, technical-doc version/audit notice, contact address, and that removed homepage sections have not returned.
- If a rollback is needed, use the hosting provider's previous successful deployment; do not reset the shared checkout or discard unfinished work.
