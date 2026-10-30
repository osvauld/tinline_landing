# Deployment preparation

## Prepared locally

- Standalone website: this repository (`osvauld/tinline_landing`), no app checkout required.
- Whitepaper: `src/content/whitepaper.md` incorporates the post-`26623f72` audit and the 29 October 2026 source review (wake service, handshake key disclosure, reserved slots, group host endpoints) and is updated for app version 0.2.5 at `656ebf84` (29 October 2026).
- Whitepaper SHA-256: `010c69b3f4bb251f2ad6a20c92401e28b7a975d2583fc74192e1d8e4bb2c5ff7`.
- App-first alpha homepage, independent `/play/`, Mobile / Desktop preview switch, silent demo, updated string receipt marks, contact `abe@osvauld.com`.
- Security/privacy wording aligned with the snapshot for encrypted local stores, public relay/DNS metadata, group-host visibility, signed receipts and recording's planned status.
- `/docs/*` technical documentation has been refreshed against app version 0.2.5 at `656ebf84`, including the wake service, the two Android editions, several reachable accounts, current protocol versions (`tinline/group/5`), call wake dial-back, public groups, disabled-by-default endpoint rotation and release packaging. It carries a pre-release/audit warning but is no longer labelled as an older draft.
- Production scripts and CSS remain external. Cloudflare Workers Builds runs `npm run check` before deploying.

## Owner confirmations before publishing

1. **Latest downloads and host:** binary downloads and the Linux APT repository use `https://dl.tinline.osvauld.com`. Homepage buttons use stable `/releases/latest/` aliases, with no fixed release version. The Cloudflare release publisher must create and update `tinline-play.apk`, `tinline-liberum.apk`, `tinline_amd64.deb`, `tinline-linux-x86_64.AppImage` and `tinline-linux-x86_64.tar.gz` there after verifying the new release's files. These aliases are not implemented by the website; configure short/no-cache behavior for them, preserve immutable versioned files, and verify every alias before publishing the site. The Linux installer uses GitHub only to discover the newest published version unless `TINLINE_VERSION` is specified, then downloads the versioned tarball and `SHA256SUMS` from the new host. On 29 October 2026, the versioned checksum manifests checked on the new host returned 404; the owner confirmed publication is upcoming.
2. Review the updated privacy/security wording and refreshed technical docs. The paper remains labelled draft; alpha software has not had an independent security audit.
3. Confirm the production hosting project's repository, branch and domain. The repository's configuration targets Cloudflare Workers (`wrangler.jsonc`), repository root, production branch `main`, publish directory `dist`, domain `tinline.osvauld.com`. A public HTTP 200 from the domain is not verification of account-level deployment settings.
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

### Latest local results (29 October 2026)

- Tasks 1573 and 1574: after the 0.2.5 refresh, `npm run build` built all 16 Astro pages plus the playground, and `npm run check` passed (Svelte/TypeScript 0 errors and 0 warnings; production CSP/site checks; the whitepaper date, the 0.2.5 implementation snapshot and the docs banner assertions in `scripts/check-build.mjs` updated to match). The separate Vite large-chunk advisory remains. The claims on the refreshed pages were checked against the app source at `656ebf84`, not run on devices.

### Earlier local results (19 October 2026)

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
