<script lang="ts">
  // Visual mock of the app's receipt marks, using its exported string geometry/spring samples.
  // Receipt state is explicit demo data, never inferred from a transport acknowledgement.
  import { motion } from '../fx/reduced.svelte';
  import { SW, DX, GAP, VB_X, VB_W, VB_H, FRAME_HZ, TICK, SLACK, PULL, PLUCK } from './ticks.gen';
  type State = 'slack' | 'one' | 'two' | 'read' | 'bad';
  let { state: vis, label, size = 12 }: { state: State; label: string; size?: number } = $props();
  const shape = (s: State) => s === 'slack' || s === 'bad' ? 0 : s === 'one' ? 1 : 2;
  let previous: State | undefined;
  let from = $state<State>('slack');
  let sample = $state<number | null>(null);
  $effect(() => {
    const to = vis, reduced = motion.reduced, before = previous;
    previous = to;
    sample = null;
    if (!before || before === to || reduced) return;
    from = before;
    const a = shape(before), b = shape(to);
    const curve = (a === 0 && b > 0) || (a === 1 && b === 2) ? PULL :
      a === 2 && b === 2 && to === 'read' && before !== 'read' ? PLUCK : null;
    if (!curve) return;
    let frame = 0, start: number | undefined;
    const animate = (now: number) => {
      start ??= now;
      const i = Math.floor((now - start) * FRAME_HZ / 1000);
      sample = curve[i] ?? null;
      if (i < curve.length) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  });
  const pose = $derived.by(() => {
    const a = shape(from), b = shape(vis), x = sample;
    let k0 = b ? 1 : 0, k1 = 1, offset = 1;
    if (x !== null) {
      if (a === 0 && b === 1) k0 = x;
      else if (a === 1 && b === 2) { k1 = .5 + .5 * x; offset = Math.max(0, x); }
      else if (b === 2) { k0 = x; k1 = x; }
    }
    return { k0, k1, offset, second: b === 2 };
  });
  function points(k: number, offset = 0) {
    return SLACK.map(([sx, sy], i) => `${sx + (TICK[i][0] - sx) * k + offset},${sy + (TICK[i][1] - sy) * k}`).join(' ');
  }
</script>

<svg class="receipt-ticks" class:read={vis === 'read'} class:bad={vis === 'bad'} class:reduced={motion.reduced}
  data-receipt-state={vis} role="img" aria-label={label} viewBox={`${VB_X} 0 ${VB_W} ${VB_H}`}
  width={size * VB_W / VB_H} height={size} fill="none" stroke="currentColor" stroke-width={SW} stroke-linecap="round" stroke-linejoin="round">
  <polyline points={points(pose.k0)} />
  {#if pose.second}
    <polyline points={points(pose.k1, DX * pose.offset)} stroke="var(--bub-out)" stroke-width={SW + 2 * GAP} />
    <polyline points={points(pose.k1, DX * pose.offset)} />
  {/if}
</svg>

<style>
  .receipt-ticks { display: inline-block; vertical-align: middle; flex: none; color: var(--bub-meta-out); transition: color var(--dur-overlayOpen) var(--ease-out); }
  .receipt-ticks.read { color: var(--lav-ink); }
  :global(:root[data-theme=dark]) .receipt-ticks.read { color: #b8b0ff; }
  @media (prefers-color-scheme: dark) { :global(:root:not([data-theme=light])) .receipt-ticks.read { color: #b8b0ff; } }
  .receipt-ticks.bad { color: var(--danger); }
  .receipt-ticks.reduced { transition: none; }
</style>
