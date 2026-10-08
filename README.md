# Tinline landing site

Static, analytics-free Astro site for **https://tinline.osvauld.com**.
App source: https://github.com/osvauld/tinline
Site source: https://github.com/osvauld/tinline_landing

## Develop

Node 24 (see `.nvmrc`):

```sh
npm ci
npm run dev
npm run build
npm run preview
```

Routes: `/` (pre-release homepage), `/privacy` (app + website policy), `/security`
(threat model/reporting). No analytics, external fonts or client-side scripts.
No download links are invented while Android testing is pending.

## Netlify continuous deployment

1. In Netlify: **Add new project → Import an existing project → GitHub**.
2. Authorize access to `osvauld/tinline_landing` and select it.
3. Production branch: `main`; base directory: root. Build command: `npm run build`;
   publish directory: `dist`. `netlify.toml` configures Node 24 and security headers.
4. Deploy and check the generated `*.netlify.app` site, including `/privacy`.
5. Domain management: add **tinline.osvauld.com** as the production custom domain.
6. In the DNS provider for `osvauld.com`, add the record Netlify instructs you to use:
   normally a **CNAME**, name **tinline**, target **YOUR-SITE.netlify.app**.
   Use the actual assigned hostname, not that placeholder. Do not alter root/MX/NS records.
7. Wait for DNS validation and Netlify's HTTPS certificate. Set the subdomain as the
   primary domain and verify HTTPS redirect, canonical URLs, and security headers.
8. Subsequent pushes to `main` trigger production builds; pull requests can create
   deploy previews. GitHub Actions additionally checks the build.

Public NS lookup during setup returned `ns47.domaincontrol.com` and
`ns48.domaincontrol.com` (GoDaddy DNS). Confirm in the owner's account; no DNS was changed.
Netlify's automatic dependency install should use the committed npm lockfile.

## Before publishing the app

- Review the policy in `src/content/privacy.md` against the exact Android release.
  It is derived from the app repo's `docs/play/privacy.md`, with public-facing wording
  and a website/hosting section. These copies do not synchronize automatically.
- Confirm developer identity, contact address, intended audience and metadata disclosures.
- Publish owner-approved Tinline-specific terms at `/terms`: the app currently links there,
  but this scaffold deliberately does not invent legal terms or copy the parent product's
  MIT terms (Tinline uses GPL-3.0-or-later).
- Verify live `https://tinline.osvauld.com/privacy` before entering it in Play Console.
- When testing is available, add only real Play testing/download URLs and approved screenshots.
- This site scaffolding does not resolve the app's security/release blockers.

Do not commit hosting tokens, DNS credentials or app signing keys. Remote hosting and DNS
configuration are account-level steps, not performed by this repository.
