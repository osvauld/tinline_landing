---
title: Direct chat
description: "Signed per-day CRDT messages, direct synchronization, attachments, presence, search and own-device relay."
order: 5
---

# Direct chat

Direct chat synchronizes Loro CRDT documents between a contact's devices. There is no operator
store-and-forward server: delivery needs a reachable device on each side, although either side's
linked devices can relay account-owned history.

## Day documents and writers

Each conversation has one document per UTC day. The conversation identifier is derived from the
sorted pair of DIDs, so every device names it consistently. The UI may display local-day groups;
the replication boundary remains UTC.

A message contains immutable identity/time/reference fields and per-writer versions for text,
edit and deletion state. An account can write from several installations without reusing a Loro
writer identity. Deterministic ranking makes concurrent account-owned versions converge.

Text is bounded to 20,000 characters. Old days are compacted into encrypted snapshots, with later
changes represented as deltas.

## Author proofs

Every message version is signed by the author's **account key**. The proof covers the document,
message and author fields, full file reference, installation/writer identity and the exact CRDT
operation span that created the version.

A receiver stages an update on a scratch document and checks:

- every new operation belongs to a signed span;
- the writer matches the claimed author and installation;
- immutable fields did not change;
- versions do not move backwards or resurrect a deletion;
- records are structurally valid and in the permitted day/time window.

One failure rejects the whole batch. The original proof remains in the document across direct
sync, own-device relay, snapshots, reinstall and endpoint rotation. A relay can withhold content,
but cannot produce another person's author proof.

## Wire and session lifecycle

`tinline/chat/7` uses u32-length-prefixed postcard frames with a 16 MiB frame ceiling. Both sides
first authenticate the QUIC peer's account attestation and message token; first-message and reply
steps have a 15-second authentication timeout. The broad pre-auth frame ceiling is still 16 MiB,
which is a hardening limitation rather than a denial-of-service guarantee.

Peers exchange document names and version vectors, then only the operations the other side lacks.
Local changes are persisted with outbox state and retried on write, startup and network changes.
Unsigned transport acknowledgements drive synchronization and retry bookkeeping; they are **not**
displayed as delivery proof.

An idle chat session closes after 60 seconds unless recent interaction, a live call or pending work
keeps it useful. Presence is ephemeral, unsigned and unstored. “Online” means the person is
currently active with that contact; absence of the indicator means unknown, not offline.

## Attachments, photos and voice

Each file gets a fresh random AES-256-GCM key and is encrypted in 64 KiB chunks. The signed message
contains its hash, key, name, size, type and applicable media metadata. iroh-blobs transfers the
ciphertext in resumable 16 KiB chunks.

A device serves a blob only when an authorized current conversation references it. The sender's
other linked devices may serve account-owned copies as well as the contact's authorized devices.
Files up to the configured auto-download threshold (10 MiB by default) are fetched automatically;
larger files wait for a request.

Voice messages are Ogg Opus files with duration and waveform metadata. Viewing, playing, sharing
or exporting media can create plaintext outside Tinline's sealed stores.

## Own-device relay and visibility

Linked devices exchange direct-chat documents over `tinline/self/5`. Relayed batches still need
each changed message's original account signature. Read cursors synchronize by taking the newest
position. A “You” conversation is offered only to the account's own devices.

Contacts receive signed callable-device lists as part of the relationship, so they can infer the
number of devices listed there. They do not receive device labels.

## Search

Search is local. A sealed index stores keyed token hashes rather than plaintext terms, including
bounded prefixes and bigrams for scripts without spaces. Storage paths and activity days remain
visible as metadata even though index values and message content are sealed.

## Receipts

Displayed delivery/read marks come from recipient-signed evidence, not transport ACKs. Read
receipts are optional per account; delivered receipts continue. See [Receipts](/docs/receipts).

## Current limits

- No third party stores direct messages while both accounts are unreachable.
- Author timestamps are not trusted timestamps; they are bounded for document admission.
- A recipient can keep any version it has seen, ignore cooperative deletion and withhold receipts.
- Anyone holding an account's root secret can produce valid future author proofs for that account.
