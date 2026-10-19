/* Writes the site's static art into public/art/: the cast's fingerprint mandalas and a few Tinline line icons.
   Same maths as the app: the mandalas come from the playground's port of crates/core/src/avatar.rs (byte-checked
   against the Rust golden file by tools/avatar/golden.mjs) and the icons from crates/tin-icons' generated set.
   Every file uses presentation attributes only (the site's CSP blocks inline styles, SVG <style> included), so each
   picture has a -light and a -dark file, chosen with <picture> and prefers-color-scheme.
   Run: node scripts/art.mts   (Node 22.18+ strips the TypeScript types itself) */
import { mkdirSync, writeFileSync } from 'node:fs';
import { SW, DX, GAP, VB_X, VB_W, VB_H, TICK } from '../playground/src/lib/ui/ticks.gen.ts';
import { avatarArt, groupAvatarArt, strokePath, syntheticDid, type AvatarArt } from '../playground/src/lib/ui/fingerprint.ts';
import { TIN, TIN_STROKE } from '../playground/src/lib/ui/tin-icons.gen.ts';

const out = new URL('../public/art/', import.meta.url);
mkdirSync(new URL('avatars/', out), { recursive: true });
mkdirSync(new URL('icons/', out), { recursive: true });

// Gold string and ink per theme, from site/playground/src/tokens.css.
const theme = {
  light: { gold: '#c98a1e', ink: '#17201d', accent: '#0a5d50' },
  dark: { gold: '#e8b04a', ink: '#e6ece9', accent: '#6fd3bd' },
} as const;

function mandala(art: AvatarArt, mode: 'light' | 'dark', group: boolean): string {
  const c = art[mode];
  const shape = group
    ? `<rect width="100" height="100" rx="28" fill="${c.bg}"/>`
    : `<circle cx="50" cy="50" r="50" fill="${c.bg}"/>`;
  const strokes = art.strokes
    .map((s) => `<path d="${strokePath(s)}" stroke="${s.gold ? theme[mode].gold : c.fg}"${s.alpha < 1 ? ` stroke-opacity="${s.alpha}"` : ''}/>`)
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${shape}<g fill="none" stroke-width="${art.strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${strokes}</g></svg>\n`;
}

// The demo cast (docs/design/CAST.md). Ids match the playground, so these are the same mandalas the app draws.
const cast = ['me', 'gilfoyle', 'dinesh', 'richard', 'jared', 'bighead', 'erlich', 'laurie', 'carla'];
for (const id of cast) {
  const art = avatarArt(syntheticDid(id), false)!;
  for (const mode of ['light', 'dark'] as const) writeFileSync(new URL(`avatars/${id}-${mode}.svg`, out), mandala(art, mode, false));
}
const hostel = groupAvatarArt('pg-group:hike', false);
for (const mode of ['light', 'dark'] as const) writeFileSync(new URL(`avatars/hacker-hostel-${mode}.svg`, out), mandala(hostel, mode, true));

// Icons at the 24px tier: body in ink (accent for features), the string in gold, like the logo.
const icons = ['chat', 'call', 'video', 'users', 'file', 'devices', 'lock', 'direct', 'bell', 'relayed', 'key', 'shield', 'mic', 'sun', 'moon'];
for (const name of icons) {
  const g = TIN[name][2];
  for (const mode of ['light', 'dark'] as const) {
    const t = theme[mode];
    const body = g.body.replace(/<path class="f"/g, `<path fill="${t.accent}" stroke="none"`);
    const string = g.string.replace(/<path class="str"/g, `<path stroke="${t.gold}"`);
    writeFileSync(new URL(`icons/${name}-${mode}.svg`, out),
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${t.accent}" stroke-width="${TIN_STROKE}" stroke-linecap="round" stroke-linejoin="round">${body}${string}</svg>\n`);
  }
}
console.log(`wrote ${cast.length + 1} mandalas and ${icons.length} icons (light + dark) to public/art/`);

// Receipt ticks, drawn as the mark's string: the points come from crates/tin-icons (generated/tin_ticks.rs, the same
// numbers iced and Compose draw). One = it left your device, two = their device signed delivery, lavender = read.
// Local export shared with the live preview: ordinary site builds need no app checkout.
// Refresh with scripts/import-ticks.mjs when the app's geometry changes.
{
  const d = (dx = 0) => 'M' + TICK.map(([x, y]) => `${+(x + dx).toFixed(3)} ${y}`).join('L');
  // Sent-bubble inks from tokens.css (--bub-meta-out, --bub-out) and the apps' read ink (desktop ui.rs tick_read).
  const ink = { light: { meta: '#33655a', read: '#374582', bg: '#cdebe3' }, dark: { meta: '#8fc9b9', read: '#b8b0ff', bg: '#0e4e43' } } as const;
  mkdirSync(new URL('ticks/', out), { recursive: true });
  for (const mode of ['light', 'dark'] as const) {
    const t = ink[mode];
    const svg = (body: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VB_X} 0 ${VB_W} ${VB_H}" fill="none" stroke-linecap="round" stroke-linejoin="round">${body}</svg>\n`;
    const two = (c: string) => `<path d="${d()}" stroke="${c}" stroke-width="${SW}"/><path d="${d(DX)}" stroke="${t.bg}" stroke-width="${SW + 2 * GAP}"/><path d="${d(DX)}" stroke="${c}" stroke-width="${SW}"/>`;
    writeFileSync(new URL(`ticks/one-${mode}.svg`, out), svg(`<path d="${d()}" stroke="${t.meta}" stroke-width="${SW}"/>`));
    writeFileSync(new URL(`ticks/two-${mode}.svg`, out), svg(two(t.meta)));
    writeFileSync(new URL(`ticks/read-${mode}.svg`, out), svg(two(t.read)));
  }
  console.log('wrote receipt ticks (one, two, read; light + dark) to public/art/ticks/');
}
