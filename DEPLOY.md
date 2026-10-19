# Deployment preparation

## Prepared locally

- Standalone website: this repository (`osvauld/tinline_landing`), no app checkout required.
- Whitepaper: `src/content/whitepaper.md` is byte-for-byte identical to app commit `26623f72130bd11d3f50c2900fed203630299922` (`docs/whitepaper.md`, 18 October 2026).
- Whitepaper SHA-256: `652398d23945c7ba8d8127d65cea27b4f8548e4f4bc19ae15a732a12b095e04f`.
- App-first alpha homepage, independent `/play/`, Mobile / Desktop preview switch, silent demo, updated string receipt marks, contact `abe@osvauld.com`.
- Security/privacy wording aligned with the snapshot for encrypted local stores, public relay/DNS metadata, group-host visibility, signed receipts and recording's planned status.
- `/docs/*` technical documentation has been refreshed against app version 0.1.38 at `dc0fb7c3`, including current protocol versions, disabled-by-default endpoint rotation, groups, receipts, live video controls and release packaging. It carries a pre-release/audit warning but is no longer labelled as an older draft.
- Production scripts and CSS remain external. Netlify now runs `npm run check` before accepting a build.

## Owner confirmations before publishing

1. **Download version:** checked 19 October 2026, GitHub's public release listing contains only `v0.1.3` (including a check for prereleases); the whitepaper snapshot describes `0.1.33`, while the technical docs now describe app `0.1.38` at `dc0fb7c3`. The public Cloudflare-backed APT index also lists `0.1.3`. The expected `/releases/v0.1.33/tinline-v0.1.33.apk` and `/releases/v0.1.33/SHA256SUMS` URLs at `repo.osvauld.com` returned 404. The homepage links to `https://github.com/osvauld/tinline/releases`. Confirm this is the intended public download destination, or supply the approved alpha artifact URL. Do not imply that the currently downloadable release implements every feature in the paper.
2. Review the updated privacy/security wording and refreshed technical docs. The paper remains labelled draft; alpha software has not had an independent security audit.
3. Confirm the production hosting project's repository, branch and domain. The repository's existing configuration targets Netlify, repository root, production branch `main`, publish directory `dist`, domain `tinline.osvauld.com`. A public HTTP 200 from the domain is not verification of account-level deployment settings.
4. Authorize the exact push or deploy-preview operation. The local branch is `launch`; approval to commit locally does not authorize a push, branch switch, DNS change or deployment.

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
- Task 916: the final refreshed site built all 16 pages, including 11 technical-doc routes; Svelte/TypeScript reported 0 errors and 0 warnings, and production CSP/site checks passed. The separate Vite large-chunk advisory remains.
- Task 917: all 11 final technical-doc routes returned HTTP 200 in Chromium at 390px and 1440px. They were indexable, showed the 0.1.38/`dc0fb7c3` snapshot notice and current navigation, and had no horizontal overflow or browser errors. Generated internal links also passed a separate local check.
- The paper's SHA-256 still matches the exact commit above. No app/device integration test, independent security audit or real hosting deployment was performed by these checks.

## After an authorized deployment

- Confirm HTTPS and the intended host at `/`, `/play/`, `/whitepaper`, `/security`, `/privacy` and the current `/docs` pages.
- Check Mobile / Desktop switching on a phone-width and desktop-width browser, without moving surrounding text.
- Open a chat and search in the demo; verify the string ticks and silence.
- Check light/dark themes, browser console and production response headers. The site should have external scripts/CSS only; `/play/` has its own policy, and framing is same-origin only.
- Confirm the download button resolves to the owner-approved release/assets; do not install on a device without separate authorization.
- Check the paper date and draft label, technical-doc version/audit notice, contact address, and that removed homepage sections have not returned.
- If a rollback is needed, use the hosting provider's previous successful deployment; do not reset the shared checkout or discard unfinished work.
