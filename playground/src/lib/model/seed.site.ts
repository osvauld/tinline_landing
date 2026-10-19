/* The website's data set (`?embed`, the live devices on tinline.osvauld.com). Same shapes and ids as ./seed.ts, but
   the conversations follow the cast's show: the hacker house, Anton the server, the term sheet. ./seed.ts stays the
   design reference that the flow tests read (search for "landlord", "lunch", "station"...), so keep the two apart.
   Rules from docs/design/CAST.md still hold: no show companies or logos, no real businesses, nothing unkind. */
import type { Account, Chat, Device, Group, Message, Person, Profile } from './types';
import { clock, T } from './clock.svelte';

const at = (h: number, m: number, daysAgo = 0) => {
  const d = new Date(clock.ago(0));
  d.setDate(d.getDate() - daysAgo);
  d.setHours(h, m, 0, 0);
  return d.getTime();
};

let seq = 0;
const msg = (m: Omit<Message, 'id'>): Message => ({ id: 's' + ++seq, ...m });

const prof = (fields: Record<string, unknown>, picture?: { hash: string; ready: boolean }): Profile => ({ fields: { availability: { available: true }, ...fields }, ...(picture ? { picture } : {}) });
const pic = (seed: string, ready = true) => ({ hash: 'sample:' + seed, ready });

export function seedAccount(): Account {
  return {
    id: 'me', name: 'Monica', hue: 0, availability: 'available', gate: 'ready',
    profile: prof({ status: 'Reading term sheets', about: 'Investor. I back people who build things that work.', pronouns: 'she/her', location: 'Palo Alto' }),
  };
}

export function seedPeople(): Person[] {
  const p = (id: string, name: string, hue: number, extra: Partial<Person> = {}): Person =>
    ({ id, name, hue, online: true, callsAllowed: true, blocked: false, contact: true, ...extra });
  return [
    p('richard', 'Richard', 1, { profile: prof({ status: 'Middle-out, still', about: 'Writes compression code. Better at it than at pitching.', pronouns: 'he/him', location: 'Palo Alto' }, pic('richard-light')) }),
    p('gilfoyle', 'Gilfoyle', 3, { profile: prof({ status: 'Anton is running warm', about: 'Systems and servers. Answers questions, eventually.', location: 'The garage' }) }),
    p('dinesh', 'Dinesh', 5, { profile: prof({ status: 'Better coder than Gilfoyle', about: 'Back end. Excellent taste in jewellery.', pronouns: 'he/him', location: 'Palo Alto' }, pic('dinesh-1')) }),
    p('bighead', 'Big Head', 4, { online: false, profile: prof({ status: 'At the beach, I think', about: 'Not totally sure what I do. Happy to be here.', availability: { available: false, until: at(18, 0) } }, pic('bighead-1')) }),
    p('erlich', 'Erlich', 1, { callsAllowed: false, profile: prof({ status: 'Visionary', about: 'Runs the incubator. Owns ten percent of whatever you are working on.' }) }), // met through the house group: message-only until he allows calls
    p('jared', 'Jared', 3, { profile: prof({ status: 'Here if you need me', about: 'Operations. There is a binder for everything.', pronouns: 'he/him' }, pic('jared-1', false)) }),
    p('laurie', 'Laurie', 2, { profile: prof({
      status: 'In meetings', about: 'Managing partner. Prefers numbers to small talk.', pronouns: 'she/her',
      // A key this version has never heard of, with nested data: it must be shown readably and survive edits.
      work: { title: 'Managing partner', office: { name: 'The glass room', city: 'Menlo Park' }, tools: ['Spreadsheets', 'Silence'] },
    }, pic('laurie-1')) }),
    p('ron', 'Ron', 2, { profile: prof({ status: 'Reading the fine print', about: 'Lawyer. Very relaxed about it.' }) }),
    p('carla', 'Carla', 0, { contact: false, profile: prof({ status: 'First week in the house' }) }),
    p('gavin', 'Gavin', 2, { contact: false, profile: prof({ status: 'Making the world a better place', about: 'Has a spiritual advisor and a lot of opinions.' }) }),
    p('denpok', 'Denpok', 5, { contact: false }),
    p('hoover', 'Hoover', 1, { contact: false }),
    p('russ', 'Russ', 4, { contact: false, profile: prof({ status: 'Three commas' }) }),
    p('peter', 'Peter', 0, { blocked: true, profile: prof({ status: 'Thinking about sesame seeds' }, pic('peter-1')) }),
  ];
}

export function seedChats(): Chat[] {
  const direct = (person: string, messages: Message[], extra: Partial<Chat> = {}): Chat =>
    ({ kind: 'direct', id: person, person, messages, unread: 0, muted: false, draft: '', ...extra } as Chat);

  // The house group. Gilfoyle's machine in the garage hosts it, of course.
  const hike: Group = {
    kind: 'group', id: 'hike', name: 'Hacker Hostel', status: 'active', unread: 3, muted: false, draft: '',
    members: [
      { id: 'erlich', role: 'owner', host: false, callHost: false, since: at(9, 0, 120) },
      { id: 'richard', role: 'admin', host: false, callHost: false, since: at(9, 0, 120) },
      { id: 'gilfoyle', role: 'member', host: true, callHost: true, since: at(9, 0, 120) },
      { id: 'dinesh', role: 'member', host: false, callHost: false, since: at(9, 0, 120) },
      { id: 'bighead', role: 'member', host: false, callHost: false, since: at(9, 0, 119) },
      { id: 'jared', role: 'admin', host: false, callHost: false, since: at(9, 0, 60), invitedBy: 'richard' },
      { id: 'me', role: 'member', host: false, callHost: false, since: at(9, 0, 45), invitedBy: 'richard' },
      { id: 'carla', role: 'member', host: false, callHost: false, since: at(9, 2), invitedBy: 'richard' },
    ],
    invited: [], flags: {},
    messages: [
      msg({ from: 'erlich', at: at(18, 0, 8), text: 'House rules are on the fridge. Rule one: this is an incubator, not a hostel.' }),
      msg({ from: 'jared', at: at(9, 30, 5), text: 'I put a fruit bowl in the kitchen. Please take a banana if you’re feeling low.' }),
      msg({ from: 'richard', at: at(20, 10, 3), text: '', call: { kind: 'voice', outcome: 'answered', durationS: 1140, direction: 'in', group: true, people: 5 } }),
      msg({ from: 'erlich', at: at(19, 5, 2), text: '', call: { kind: 'voice', outcome: 'missed', durationS: 300, direction: 'in', group: true, people: 3 } }),
      msg({ from: 'carla', at: at(9, 2), text: 'Carla joined, invited by Richard', system: true }),
      msg({ from: 'dinesh', at: at(12, 30), text: 'Who turned the garage into a sauna?' }),
      msg({ from: 'gilfoyle', at: at(12, 31), text: 'Anton likes it warm.' }),
      msg({ from: 'gilfoyle', at: at(12, 31), text: 'You’re welcome to work somewhere else.' }),
      msg({ from: 'me', at: at(12, 33), text: 'I can bring a fan on Thursday.', delivery: 'delivered' }),
      msg({ from: 'erlich', at: at(12, 38), text: 'Nobody touches the thermostat. That is a house rule now.' }),
      msg({ from: 'carla', at: at(12, 52), text: 'First week here. Is the quiet room fine for calls?' }),
      msg({ from: 'jared', at: at(12, 55), text: 'It is! Quiet after nine. I left earplugs and a small blanket in there.' }),
    ],
  };

  const board: Group = {
    kind: 'group', id: 'family', name: 'Board prep', status: 'active', unread: 4, muted: true, draft: '',
    members: [
      { id: 'me', role: 'owner', host: true, callHost: true, since: at(10, 0, 90) },
      { id: 'laurie', role: 'admin', host: false, callHost: false, since: at(10, 0, 90) },
      { id: 'richard', role: 'member', host: false, callHost: false, since: at(10, 0, 90) },
      { id: 'jared', role: 'member', host: false, callHost: false, since: at(10, 0, 89) },
      { id: 'ron', role: 'member', host: false, callHost: false, since: at(10, 0, 80) },
    ],
    invited: [], flags: {},
    messages: [
      msg({ from: 'laurie', at: at(20, 5, 10), text: 'The numbers are fine. I would like them to be better than fine.' }),
      msg({ from: 'jared', at: at(8, 30, 3), text: 'I’ve made a binder for the board meeting. It has tabs.' }),
      msg({ from: 'me', at: at(18, 5, 1), text: 'Slides for Thursday', delivery: 'delivered', file: { name: 'board-slides.pdf', size: 1.8e6, kind: 'doc', progress: 1, state: 'done' } }),
      msg({ from: 'richard', at: at(19, 40, 1), text: 'Can I take the chart off slide four?' }),
      msg({ from: 'laurie', at: at(20, 2, 1), text: 'No.' }),
      msg({ from: 'ron', at: at(21, 10, 1), text: 'Paperwork’s in. Sign wherever there’s a sticky note.' }),
    ],
  };

  const offsite: Group = {
    kind: 'group', id: 'book', name: 'Mindful offsite', status: 'removed', unread: 0, muted: false, draft: '',
    members: [], invited: [], flags: { me: ['gavin', 'hoover', 'denpok'] }, flagAt: { me: [at(9, 0, 17), at(9, 40, 16), at(14, 2, 14)] },
    messages: [
      msg({ from: 'denpok', at: at(20, 0, 16), text: 'Bring nothing. Especially not your phone.' }),
      msg({ from: 'me', at: at(20, 30, 15), text: 'I’ll be on my phone the whole time', delivery: 'delivered' }),
      msg({ from: 'gavin', at: at(14, 2, 14), text: 'You were removed from the group', system: true }),
    ],
  };

  const after6 = msg({ from: 'me', at: at(12, 38), text: 'Yes, after 6 works for me', delivery: 'delivered', demoReceipt: 'delivered', edited: true });
  return [
    direct('richard', [
      msg({ from: 'richard', at: at(19, 2, 9), text: 'Could you look at the deck before Thursday? I changed the chart slide again.' }),
      msg({ from: 'me', at: at(19, 10, 9), text: 'Send it over. Fewer words on the chart this time', delivery: 'delivered', demoReceipt: 'read' }),
      msg({ from: 'richard', at: at(11, 20, 6), text: 'The demo crashed twice in rehearsal. Gilfoyle says it’s my code.' }),
      msg({ from: 'me', at: at(11, 25, 6), text: 'Is it your code?', delivery: 'delivered', demoReceipt: 'read' }),
      msg({ from: 'richard', at: at(17, 45, 4), text: 'It’s partly my code.' }),
      // Photos (chat/5 sizes): one with a caption, one not downloaded yet (its preview shows), one of mine.
      msg({ from: 'richard', at: at(17, 47, 4), text: 'The whiteboard after last night', file: { name: 'whiteboard.jpg', size: 2.1e6, kind: 'image', progress: 1, state: 'done', w: 4032, h: 3024 } }),
      msg({ from: 'richard', at: at(17, 48, 4), text: '', file: { name: 'napkin-maths.jpg', size: 3.2e6, kind: 'image', progress: 1, state: 'done', w: 3024, h: 4032, remote: true } }),
      msg({ from: 'me', at: at(17, 52, 4), text: '', delivery: 'delivered', file: { name: 'notes.png', size: 6.4e5, kind: 'image', progress: 1, state: 'done', w: 1080, h: 1080 } }),
      msg({ from: 'richard', at: at(21, 12, 1), text: 'How did the partner meeting go?' }),
      msg({ from: 'me', at: at(21, 14, 1), text: 'Better than last time. Nobody threw anything', delivery: 'delivered' }),
      msg({ from: 'me', at: at(21, 15, 1), text: 'Laurie even said “fine”', delivery: 'delivered' }),
      msg({ from: 'richard', at: at(21, 20, 1), text: 'That’s basically a hug 🙂' }),
      msg({ from: 'me', at: at(21, 32, 1), text: '', call: { kind: 'voice', outcome: 'answered', durationS: 742, direction: 'out' } }),
      msg({ from: 'richard', at: at(12, 36), text: 'Are we still on for the call about the term sheet?' }),
      after6,
      msg({ from: 'me', at: at(12, 39), text: 'I’ll call from the car, the office is loud', delivery: 'delivered' }),
      msg({ from: 'richard', at: at(12, 41), text: 'Great. Jared laminated a copy, just in case', replyTo: after6.id }),
    ], { unread: 2 }),
    hike,
    direct('gilfoyle', [
      msg({ from: 'me', at: at(16, 2, 2), text: 'Is the demo server ready for Thursday?', delivery: 'delivered' }),
      msg({ from: 'gilfoyle', at: at(16, 40, 2), text: 'It’s been ready since Tuesday.' }),
      msg({ from: 'gilfoyle', at: at(16, 41, 2), text: 'The demo is another matter.' }),
      msg({ from: 'gilfoyle', at: at(10, 4), text: '', call: { kind: 'voice', outcome: 'answered', durationS: 95, direction: 'in' } }),
    ]),
    direct('dinesh', [
      msg({ from: 'dinesh', at: at(19, 2, 3), text: 'Quick question. Does Gilfoyle ever mention me?' }),
      msg({ from: 'me', at: at(19, 6, 3), text: 'Only in the group chat', delivery: 'delivered' }),
      msg({ from: 'dinesh', at: at(19, 7, 3), text: 'So, constantly. Great.' }),
      msg({ from: 'dinesh', at: at(11, 50), text: 'Is it weird if I bring my own fan?' }),
    ], { unread: 1 }),
    direct('erlich', [
      msg({ from: 'erlich', at: at(14, 0, 7), text: 'Monica. I have a pitch. It’s a pitch about pitches.' }),
      msg({ from: 'me', at: at(11, 2), text: 'Free this week?', delivery: 'delivered' }),
      msg({ from: 'erlich', at: at(11, 5), text: 'For you, always. Thursday, and you’re buying.' }),
    ], { draft: 'Lunch Thursday?' }),
    board,
    direct('bighead', [
      msg({ from: 'bighead', at: at(10, 15, 12), text: 'Hey, which meeting am I supposed to be at?' }),
      msg({ from: 'me', at: at(10, 20, 12), text: 'None today. Enjoy it', delivery: 'delivered' }),
      msg({ from: 'bighead', at: at(17, 40, 1), text: 'Cool cool. Is the beach far from the office?' }),
      msg({ from: 'me', at: at(17, 46, 1), text: 'Which office? Call me when you’re back', delivery: 'waiting' }),
      msg({ from: 'me', at: at(17, 50, 1), text: '', call: { kind: 'voice', outcome: 'failed', durationS: 0, direction: 'out' } }),
    ]),
    offsite,
  ];
}

export function seedDevices(): Device[] {
  return [
    { id: 'pixel', name: 'Spare phone', kind: 'phone', self: true, lastSeen: clock.ago(0) },
    { id: 'laptop', name: 'Work laptop', kind: 'desktop', self: false, lastSeen: clock.ago(3 * T.HOUR) },
  ];
}
