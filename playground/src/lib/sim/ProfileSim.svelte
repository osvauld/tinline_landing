<script lang="ts">
  /* Profiles simulation: contacts and my other devices changing profiles, pictures arriving late or never, the network,
     and the failures. Lives only in the drawer. Numbers follow the backend packet's scenarios 1-10. */
  import { flushSync } from 'svelte';
  import Switch from '../ui/Switch.svelte';
  import { db, person } from '../model/store.svelte';
  import { clock, hhmm, T } from '../model/clock.svelte';
  import { nav } from '../nav/router.svelte';
  import { BAD_FILES, samplePortrait } from '../model/images';
  import { clearImages, hasBlob, px, reloadPicture } from '../model/actions/profile.svelte';
  import { addContact, deletionState, remoteUpdate, remotePictureReady, siblingUpdate } from '../model/actions/profile';

  /* ---- 1. new contact ---- */
  const gilfoyle = $derived(person('gilfoyle'));
  const newContact = () => addContact('gilfoyle', 'Gilfoyle', 3);
  const gilfoyleProfile = () => remoteUpdate('gilfoyle', { name: 'Gilfoyle', fields: { status: 'Just got here', about: 'Marine biologist. Slow runner.', location: 'Kozhikode' }, picture: { hash: 'sample:gilfoyle-1', ready: false } }, 'a profile');
  const gilfoylePicture = () => remotePictureReady('gilfoyle', 'sample:gilfoyle-1');

  /* ---- 2. a contact edits while their profile and chat are open ---- */
  let who = $state('dinesh');
  const people = $derived(db.people.filter((p) => p.contact || p.profile));
  const w = $derived(person(who));
  let n = 0;
  const STATUS = ['In a meeting', 'On a train', 'Back soon', 'Out for lunch'];
  const orig: Record<string, string> = {};
  function rename() {
    if (!w) return;
    const o = (orig[w.id] ??= w.name);
    remoteUpdate(w.id, { name: w.name === o ? `${o} (new)` : o }, 'a name change');
  }
  const status = () => w && remoteUpdate(w.id, { fields: { status: STATUS[n++ % STATUS.length] } }, 'a status change');
  const newPicture = () => w && remoteUpdate(w.id, { picture: { hash: `sample:${w.id}-new${++n}`, ready: true } }, 'a new picture');
  const removePic = () => w && remoteUpdate(w.id, { picture: null }, 'a picture removal');
  const selectNotReady = () => w && remoteUpdate(w.id, { picture: { hash: `sample:${w.id}-late${++n}`, ready: false } }, 'a picture reference');
  const readyLatest = () => { const h = w?.profile?.picture; if (w && h && !h.ready) remotePictureReady(w.id, h.hash); };

  /* ---- 3. an old image finishes after a newer one is selected ---- */
  const staleA = () => { px.sim.stallHash = 'sample:dinesh-stale-a'; remoteUpdate('dinesh', { picture: { hash: 'sample:dinesh-stale-a', ready: true } }, 'picture A'); };
  const staleB = () => remoteUpdate('dinesh', { picture: { hash: 'sample:dinesh-stale-b', ready: true } }, 'picture B');
  const release = () => { for (const h of [...px.held]) h.release(); };

  /* ---- 4/6. my pictures: offered like a file chosen in the picker ---- */
  async function offerSample(seed: string, light = false) {
    const b = await samplePortrait(seed, 512, { light });
    px.offered = { file: new File([b], seed + '.png', { type: 'image/png' }), n: Date.now() };
    if (nav.top.name !== 'profile') nav.push({ name: 'profile' });
  }
  async function offerBad(k: keyof typeof BAD_FILES) {
    px.offered = { file: await BAD_FILES[k](), n: Date.now() };
    if (nav.top.name !== 'profile') nav.push({ name: 'profile' });
  }
  const lastDeleted = $derived(px.deletions.find((d) => d.owner === 'me'));
  const siblingReselect = () => lastDeleted && hasBlob(lastDeleted.hash) && siblingUpdate({ picture: { hash: lastDeleted.hash, ready: true } }, 'selected the previous picture again');
  const siblingOther = () => siblingUpdate({ picture: { hash: `sample:me-sibling${++n}`, ready: true } }, 'selected another picture');

  /* ---- 5. my other device ---- */
  const sibLocation = () => siblingUpdate({ fields: { location: 'Thrissur' } }, 'edited Location');
  const sibNested = () => siblingUpdate({ fields: { studio: { name: 'The corner room', hours: { from: '09:00', to: '17:30' }, desks: [4, 5, 6] } } }, 'added a nested “studio” entry');

  /* ---- 7. availability ---- */
  const sibBusy = () => siblingUpdate({ availability: { available: false, until: clock.now + T.HOUR } }, 'set Busy for an hour');
  const sibAvail = () => siblingUpdate({ availability: { available: true } }, 'set Available');
  const newInstall = () => px.log.unshift({ id: Date.now(), at: clock.now, text: 'A new linked install joined. It adopted the existing profile and availability; it wrote no defaults.' });
  const bighead = $derived(person('bighead'));

  /* ---- 8. failures ---- */

  /* ---- 9. account switch / lock mid-load ---- */
  const midLoad = () => { px.sim.stallHash = db.people.find((p) => p.id === 'laurie')?.profile?.picture?.hash ?? ''; reloadPicture('laurie'); flushSync(); }; // flush so the load has really started under the current account before it changes
  const switchAccount = () => { midLoad(); clearImages('switched account'); };
  const lockMid = () => { midLoad(); db.account.gate = 'locked'; };

  /* ---- 10. block ---- */
  const peterChanges = () => remoteUpdate('peter', { name: 'Pete', fields: { status: 'Changed while blocked' }, picture: { hash: 'sample:peter-new', ready: true } }, 'a profile update');
</script>

<div class="rows">
  <label class="row"><span>This device online</span><Switch label="Profiles: this device online" bind:checked={db.env.networkOnline} /></label>
  <div class="sub">Queued for the network: {px.inbound.length} incoming · {px.pending} of mine unsent</div>

  <h4>1. New contact</h4>
  <div class="btns">
    <button type="button" disabled={!!gilfoyle} onclick={newContact}>Gilfoyle becomes a contact</button>
    <button type="button" disabled={!gilfoyle || !!gilfoyle.profile} onclick={gilfoyleProfile}>Her profile arrives</button>
    <button type="button" disabled={!gilfoyle?.profile?.picture || gilfoyle.profile.picture.ready} onclick={gilfoylePicture}>Her picture arrives</button>
  </div>

  <h4>2. A contact edits their profile</h4>
  <label class="row"><span>Contact</span>
    <select bind:value={who} aria-label="Contact who edits">{#each people as p (p.id)}<option value={p.id}>{p.name}</option>{/each}</select></label>
  <div class="btns">
    <button type="button" onclick={rename}>Changes name</button>
    <button type="button" onclick={status}>Changes status</button>
    <button type="button" onclick={newPicture}>New picture</button>
    <button type="button" onclick={selectNotReady}>Selects a picture (not here yet)</button>
    <button type="button" onclick={readyLatest}>…it arrives</button>
    <button type="button" onclick={removePic}>Removes picture</button>
  </div>

  <h4>3. Old image finishes late</h4>
  <div class="btns">
    <button type="button" onclick={staleA}>Dinesh picks A (load stalls)</button>
    <button type="button" onclick={staleB}>Dinesh picks B</button>
    <button type="button" onclick={release}>Stalled load for A finishes{px.held.length ? ` (${px.held.length})` : ''}</button>
  </div>

  <h4>4. My picture</h4>
  <div class="btns">
    <button type="button" onclick={() => offerSample('monica-a')}>Choose sample A</button>
    <button type="button" onclick={() => offerSample('monica-b')}>Choose sample B</button>
    <button type="button" onclick={() => offerSample('monica-light', true)}>Choose a pale sample</button>
  </div>
  <div class="sub">Deletion requests (drawer only):</div>
  <ol class="log" aria-label="Deletion requests">
    {#each px.deletions as d (d.at + d.hash)}
      <li><b>{d.owner === 'me' ? 'Mine' : d.owner}</b> {d.hash.slice(0, 12)} · {deletionState(d) === 'deferred' ? 'Deferred: selected again elsewhere' : 'Requested'} · {hhmm(d.at)}</li>
    {:else}<li class="none">None yet. Replace or remove the picture.</li>{/each}
  </ol>

  <h4>5. My other device</h4>
  <div class="btns">
    <button type="button" onclick={sibLocation}>Edits Location</button>
    <button type="button" onclick={sibNested}>Adds a nested entry</button>
  </div>

  <h4>6. Picture conflict</h4>
  <div class="btns">
    <button type="button" disabled={!lastDeleted} onclick={siblingReselect}>Other device re-selects my previous picture</button>
    <button type="button" onclick={siblingOther}>Other device picks another</button>
  </div>

  <h4>7. Availability</h4>
  <div class="btns">
    <button type="button" onclick={sibBusy}>Other device: Busy for 1 hour</button>
    <button type="button" onclick={sibAvail}>Other device: Available</button>
    <button type="button" onclick={() => clock.jump(T.HOUR)}>+1 h</button>
    <button type="button" onclick={newInstall}>A new linked install joins</button>
  </div>
  {#if bighead}<label class="row"><span>Big Head is online (separate)</span><Switch label="Profiles: Big Head online" bind:checked={bighead.online} /></label>{/if}

  <h4>8. Failures</h4>
  <label class="row"><span>Next save fails</span><Switch label="Next profile save fails" bind:checked={px.sim.failNextSave} /></label>
  <label class="row"><span>Dinesh’s picture unavailable</span><Switch label="Dinesh picture unavailable" bind:checked={px.sim.unavailable.dinesh} onchange={() => reloadPicture('dinesh')} /></label>
  <div class="btns">
    <button type="button" onclick={() => offerBad('text')}>Not a picture</button>
    <button type="button" onclick={() => offerBad('gif')}>A GIF</button>
    <button type="button" onclick={() => offerBad('heavy')}>Over 2 MB</button>
    <button type="button" onclick={() => offerBad('wide')}>Over 4096 px</button>
  </div>

  <h4>9. Switch account or lock mid-load</h4>
  <div class="btns">
    <button type="button" onclick={switchAccount}>Switch account while loading</button>
    <button type="button" onclick={lockMid}>Lock while loading</button>
    <button type="button" onclick={release}>Old load finishes</button>
  </div>

  <h4>10. Block</h4>
  <div class="btns"><button type="button" onclick={peterChanges}>Peter (blocked) updates his profile</button></div>

  <h4>Log</h4>
  <ol class="log" aria-label="Profile log">
    {#each px.log.slice(0, 12) as l (l.id)}<li>{hhmm(l.at)} {l.text}</li>{:else}<li class="none">Nothing yet.</li>{/each}
  </ol>

  <div class="notes">
    <p><b>Decided 2026-10-12.</b></p>
    <ul>
      <li>Busy does not stop calls: incoming calls still show while I'm Busy. Busy is what my contacts see. The core currently refuses calls while unavailable, so it needs changing to match.</li>
      <li>A nickname syncs to my other linked devices (still mine only, never sent to the person). The sim keeps it on this install.</li>
      <li>Busy lengths: 30 minutes, 1 hour, 4 hours, tomorrow morning, no end; choosing Busy defaults to 1 hour.</li>
    </ul>
    <p><b>Proposed, not decided.</b></p>
    <ul>
      <li>Additional information: custom entries are text only. Structured values from other app versions are shown readably, can be removed, and are never edited by this form.</li>
      <li>Picture: round window, drag/zoom/keys, output a 512 px PNG. Cropping is app-side preparation, not a core feature.</li>
      <li>Unblocking resumes updates going forward; changes dropped while blocked are not replayed (the core decides).</li>
      <li>Playground only: account switch bumps the image epoch and re-reads the same sample people; a second account's contacts are not modelled.</li>
      <li>Playground only: the deletion log is a drawer view. The app never shows a completion state or per-contact delivery.</li>
    </ul>
  </div>
</div>

<style>
  .rows { display: grid; gap: 4px; }
  .row { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 40px; font-size: var(--fs-sub); }
  h4 { margin: 12px 0 2px; font-size: var(--fs-sub); color: var(--muted); font-weight: 650; }
  .sub { font-size: var(--fs-sub); color: var(--muted); margin-top: 6px; }
  .btns { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
  button:not([role]) { border: 1px solid var(--line); background: var(--surface); border-radius: 10px; padding: 6px 10px; font-size: var(--fs-sub); cursor: pointer; }
  button:disabled { opacity: .45; cursor: default; }
  select { border: 1px solid var(--line); background: var(--surface); border-radius: 10px; padding: 6px 8px; font-size: var(--fs-sub); max-width: 60%; }
  .log { margin: 4px 0 0; padding-inline-start: 16px; display: grid; gap: 2px; font-size: var(--fs-sub); color: var(--muted); }
  .log b { color: var(--ink); }
  .log .none { list-style: none; margin-inline-start: -16px; }
  .notes { margin-top: 12px; font-size: var(--fs-sub); color: var(--muted); }
  .notes p { margin: 0 0 4px; }
  .notes ul { margin: 0; padding-inline-start: 18px; display: grid; gap: 3px; }
</style>
