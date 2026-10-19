# Website design playground

A self-contained Svelte 5 / TypeScript interaction preview, bundled at `/play/` by the parent website. This is a design reference with synthetic data, not the shipped messaging client.

From the website root, `npm run dev` starts both the site and playground on one origin. `npm run build` builds both; `npm run check` includes the playground type check.

For playground-only development:

```sh
npm ci
npm run dev
npm run check
```

The standalone playground dev server uses http://127.0.0.1:5178/. `?form=android|desktop` forces the form factor, `?theme=light|dark` forces the theme, and hash routes such as `#/chats` and `#/chat/richard` open screens. `?embed` removes the harness, uses the website cast and follows the parent site's theme. The website's `/play/` build and embedded previews are silent.

Website receipt marks use the app's exported string geometry in `src/lib/ui/ticks.gen.ts`. Explicit demo receipt states are illustrative; they are not signed evidence or proof of production integration. Refresh the geometry through the parent site's `scripts/import-ticks.mjs`.

Keep the mock's behavior honest about the protocol: no anonymity claim, linked devices hold the account secret, group hosts can read the group, and offline messages require overlapping online devices. App product/security decisions belong in the app repository, not in this preview.
