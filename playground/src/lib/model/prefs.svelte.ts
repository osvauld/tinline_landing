/* Harness preferences (not app data): form factor and theme. Persisted per browser. */
import type { FormFactor, Theme } from './types';

const load = <T extends string>(k: string, d: T, ok: readonly T[]): T => {
  const q = new URLSearchParams(location.search).get(k) as T | null;
  if (q && ok.includes(q)) return q;
  try { const v = localStorage.getItem('tinline.pg.' + k) as T | null; if (v && ok.includes(v)) return v; } catch { /* private mode */ }
  return d;
};

/** `?embed`: the app inside a phone frame on the website. It follows the site's light/dark choice (same origin, so it
    reads the parent's `data-theme`) and keeps its own preferences out of this browser's storage. */
export const embed = new URLSearchParams(location.search).has('embed');
const parentTheme = (): Theme => {
  try {
    const t = window.parent !== window ? window.parent.document.documentElement.dataset.theme : undefined;
    return t === 'light' || t === 'dark' ? t : 'system';
  } catch { return 'system'; }
};

class Prefs {
  form = $state<FormFactor>(load('form', innerWidth < 700 ? 'android' : 'desktop', ['android', 'desktop'] as const));
  theme = $state<Theme>(embed ? parentTheme() : load('theme', 'system', ['system', 'light', 'dark'] as const));
  save() {
    if (embed) return;
    try { localStorage.setItem('tinline.pg.form', this.form); localStorage.setItem('tinline.pg.theme', this.theme); } catch { /* ignore */ }
  }
}
export const prefs = new Prefs();

if (embed && window.parent !== window) {
  try {
    new MutationObserver(() => (prefs.theme = parentTheme()))
      .observe(window.parent.document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  } catch { /* not same origin: follow the system setting */ }
}
