---
title: Chat
description: "One-to-one chat as Loro day shards, signed batches, deterministic validation and encrypted attachments."
order: 6
---

# Chat

One-to-one chat is built on Loro CRDT documents synchronised directly between the two devices.
There is no server and no third party to relay through, so **a message is delivered when both
devices are online at the same time**. With the Android always-on service that is usually
seconds. Group chat is designed but not implemented.

## The rule everything rests on

No authority can reject a write and make the writer roll back. Each device validates every
update itself, so validation must be **deterministic**: two honest devices receiving the same
updates, in any order, reach the same verdict. A rejected update is dropped and never forwarded.

## Documents

- A conversation is one Loro document per **UTC day**: `dm/{pair}/{YYYY-MM-DD}`, where `{pair}`
  is the hex of `BLAKE3(sorted(did_a, did_b))`, so both sides name it identically. The UI groups
  by local day; the shard boundary is UTC so both sides agree.
- Each device writes with a Loro peer id derived from
  `BLAKE3("tinline-loro-peer-v1" ‖ device key ‖ doc name)`. That is what makes "who wrote this op"
  checkable.
- A message is `messages/<id> = { id, author, text, at, edited_at?, deleted?, reply_to?, file?, sig }`.
  `id`, `author`, `at`, `reply_to` and `file` never change. Only the author may change `text`,
  `edited_at` and `deleted`. A deleted message keeps its id and loses its text.
- The existing contact relationship is the permission. No extra tokens are needed for 1:1.

## Wire: `tinline/chat/1`

One bidirectional stream per contact device (each of your devices keeps its own), framed as a 32-bit big-endian length plus bincode (up to
16 MiB).

| frame | purpose |
|---|---|
| `Auth { attestation, grant, relay }` | Both ways first: the same proof as a call, checked by the same code. |
| `Hello { shards: [(day, vv)] }` | The last 7 days plus any day with unacknowledged ops. Also acts as an ack. |
| `Sync { doc, vv, update, sig }` | "Here is my version and what you lack." The receiver validates, imports and answers. |
| `Push { doc, update, sig }` | A live write while connected. |
| `Ack { doc, vv }` | "I now hold up to here." Drives the delivered tick. |
| `HistoryReq` / `HistoryResp` | Older days, as encrypted snapshot blobs and their keys. |

`sig` is an Ed25519 signature by the device key over
`"tinline-chat-batch-v1" ‖ len(doc) ‖ doc ‖ update`. A device only ever sends **its own** ops, so
a receiver can require exactly one Loro peer id per batch. If both sides dial at once, the
session dialled by the lower device key stays.

## Validation

A batch is imported into a scratch fork first. The whole batch is rejected, nothing stored and
the session closed, if any of these hold:

- it contains ops from any peer id other than the signer's, or is not self-contained;
- the doc holds anything but `messages`, or a message has an unknown or ill-typed field;
- a new message's `author` is not the signer;
- `at` falls outside the shard's day ±1 h (live pushes: also more than 24 h from now);
- an immutable field changed, a non-author edited, a message disappeared, or a deleted message
  kept text.

### Per-message signatures

Every message also carries `sig`: the author's device signature over `"tinline-chat-msg-v1"`,
the doc id, the message id, author, `at`, current text, `edited_at`, `deleted`, `reply_to` and the
full file reference. Creating, editing and deleting all re-sign. Because the doc id is signed, a
message cannot be replayed into another day or conversation. A change may not move `edited_at`
backwards or un-delete, so an old signed version cannot roll back an edit.

History snapshots (older days, or ops of ours we lost after a reinstall) are accepted only if
every message carries a valid signature from its author. A contact cannot put words in your
mouth; the worst it can do is withhold messages.

## Storage

| store | holds | protection |
|---|---|---|
| `chat.redb` | open shards, shard index, outbox markers, acks, read cursors, blob keys | Each value AES-256-GCM sealed under `BLAKE3-derive-key("tinline/chat-store/v2", recovery phrase)` and bound to its path, so a restore in place reopens it. Paths stay visible. |
| `blobs/` (iroh-blobs) | attachments, voice messages, closed days | Ciphertext only, addressed by the BLAKE3 hash of the ciphertext. |

Days older than 8 days are compacted into an encrypted snapshot blob. Editing an old message
adds a delta; the next compaction replaces the snapshot.

## Attachments and voice messages

- The author encrypts each file once with a **fresh random AES-256-GCM key**, in chunks so large
  files stream and resume. Random keys, not content-derived ones: convergent keys would reveal
  that two people hold the same file.
- The message carries `{ hash, key, name, size, mime }`, end-to-end encrypted in transit and
  sealed at rest.
- A device serves a blob to a contact's device only if a message in that conversation names the
  hash, and to your own linked devices if any of your conversations names it.
- Files up to the auto-download limit (10 MB by default) are fetched as soon as the message
  arrives; larger ones on request. A fetch with no progress for 20 s fails and retries after 2, 5,
  15, 30 and 60 s, resuming from the bytes already held.
- A voice message is a file message with a duration and a ~64-byte waveform. The apps record Ogg
  Opus, 16 kHz mono.

Displaying, playing or exporting an attachment can create plaintext copies outside the
encrypted store.

## Delivery

- A local write goes into the document and an outbox marker. The engine dials on start, on each
  write, on network change and every 30 s while something is unsent, with 2–60 s backoff.
- One tick: written on this device. Two ticks: the peer's `Ack` covers it. Ticks are not read
  receipts, and an edit does not take the second tick away.
- Concurrent edits of one message from two of the author's devices resolve last-writer-wins per
  field.
- Removing a contact deletes the conversation and its blobs on every one of your devices. It
  cannot erase the other person's copy.

## Your own devices

Your linked devices hold the same conversations. The pair id depends only on the two DIDs, so a
conversation is the same document on every device of the account. The devices exchange its
shards over the own-device link (`tinline/self/1`, see [Linked devices](/docs/devices)). A
contact never learns how many devices you have.

- **What travels:** each device lists every shard it holds with its version vector (up to 4096,
  newest day first) and receives what it lacks, including what the contact wrote. A write on any
  device is pushed to your other connected devices at once, so messages the contact sent to your
  phone reach your laptop through the phone, even while the contact is offline.
- **What is checked:** a batch relayed by your own device is validated like a history snapshot.
  It must belong to a current conversation, its authors can only be you and that contact, and
  **every new or changed message must carry its author's device signature**: yours checked against
  your device registry (removed devices included, so old messages stay valid), the contact's
  against the devices you know for them. So even your own device cannot forge your words or the
  contact's. A rejected batch is dropped and the session goes on.
- **Toward the contact,** each of your devices still sends only its own writes.
- **Read state** is a read position per conversation, merged by taking the newest. Reading on one
  device clears the unread count on the others, whatever order things arrive in.
- **Ticks** mean the same on every one of your devices: two ticks only once the contact holds the
  message. Each device remembers which change created a message, and your devices relay the
  contact's acknowledgements to each other; the contact also acknowledges to your other connected
  devices.
- **Files:** a download tries the contact's connected device, then your own devices, then the
  contact's other devices. Any holder can serve the ciphertext.
- **"You"** is a conversation with yourself, for notes and files. It syncs only between your own
  devices; a contact can neither request nor send it.

One limit: when one of your devices learns of a contact's new device before another does, the
second drops batches containing that device's messages until the contact list reaches it, and
retries at every session.

## Groups (planned)

Groups will root permissions in the creator's DID with osvauld2 `courier` tokens, and validate
each batch against the group metadata **as of the version it names**, which Loro can check out.
That keeps the verdict identical on every device. Delivery will be member-to-member, with no
group key, for groups of up to about 50. None of this ships today.
