---
title: Overview
description: "How Tinline is built: one Rust core over iroh, native Android and desktop apps, linked devices, and no server of ours."
order: 1
---

# Technical overview

Tinline is a peer-to-peer voice calling and one-to-one chat app. Each device is a node on
[iroh](https://iroh.computer), addressed by its own public key. Devices dial each other
directly when hole punching works and through iroh's public relays when it doesn't. Osvauld
runs no calling, messaging or account server.

A person is an **identity** (a DID derived from a 24-word recovery phrase). An identity can be
linked to up to 8 devices, each with its own device key. Contacts store the identity and its
signed list of devices, so a call rings all of them.

These pages describe the system as built, including its limits. They are written from the app
source and its engineering notes in [osvauld/tinline](https://github.com/osvauld/tinline).
Where the two disagree, the source wins.

> **Pre-release.** Tinline has not had an independent security audit. See
> [Threat model](/docs/threat-model) before relying on it.

## The pieces

```text
 Android app (Kotlin, Compose)        Desktop app (Rust, iced)
        │  UniFFI bindings                    │  direct Rust calls
        └──────────────┬──────────────────────┘
                       ▼
             p2pcore  (crates/core)
   accounts · contacts · calls · chat · blobs · device sync
        │           │             │             │
      proto       audio        storage       identity, cryptography
   tickets,     Opus 1.6,     redb with      BIP39 → did:key,
   grants,      jitter        sealed         signing
   device lists buffer        records        (from osvauld2)
                       │
                       ▼
        iroh 1.3: QUIC + TLS 1.3, hole punching, relays, discovery
        iroh-blobs: content-addressed transfer of encrypted files
```

| crate | role |
|---|---|
| `identity`, `cryptography` | 24-word mnemonic → `did:key`, Ed25519 signing. Taken from osvauld2 at `abcae3d`. |
| `proto` | Contact tickets, device attestations, call grants, signed device lists, link proofs and every handshake check. Pure functions: the caller supplies the clock and persisted state. |
| `audio` | Opus 1.6 encoder/decoder with FEC, DRED and deep PLC; adaptive jitter buffer. No threads, no I/O. |
| `storage` | redb key-value store whose values are sealed and bound to their key path. |
| `core` (`p2pcore`) | Accounts, the iroh endpoint, contacts, the multi-device call engine, chat, the blob store, device linking and own-device sync. Exposed to Kotlin through UniFFI. |
| `desktop` (`p2p-desktop`) | iced app with cpal audio, WebRTC echo cancellation, an account switcher and a tray icon. |
| `peer` (`p2p-peer`) | Headless peer for end-to-end tests: tone or WAV in, WAV out, linking. |

## Protocols on one endpoint

Every install runs one iroh endpoint for the selected account. Five ALPNs share it:

| ALPN | carries |
|---|---|
| `osvauld/p2p/0` | Adding contacts and calls: a framed JSON control stream plus Opus frames as QUIC datagrams. |
| `tinline/chat/1` | Chat sync for one conversation: authentication, then Loro update exchange. |
| iroh-blobs | Encrypted attachments and compacted history, fetched by BLAKE3 hash. |
| `tinline/link/1` | Linking a new device to an account: QR secret proofs, a confirmation code, the sealed phrase. |
| `tinline/self/1` | Sync between your own devices: device registry, contacts, call history. |

## Where it comes from

Tinline is the first product to come out of Osvauld's research into software people own.
The [osvauld](https://github.com/osvauld/osvauld) platform explored Ed25519/X25519 identities,
QUIC over iroh and Loro CRDT sync. [osvauld2](https://github.com/osvauld/osvauld2) refined the
identity, vault, sealed storage and `courier` sync protocol. Tinline takes its identity,
cryptography and storage crates from osvauld2, adapts osvauld2's chat design from "the node is
the referee" to "every device is its own referee", and keeps the scope to people talking.

## Read next

- [Accounts and keys](/docs/identity): the phrase, device keys, the vault, sealed stores.
- [Contacts](/docs/contacts): tickets, the add-contact handshake, grants, device lists, safety numbers.
- [Calls](/docs/calls): ringing every device, the audio pipeline, how calls end.
- [Linked devices](/docs/devices): linking, own-device sync, unlinking.
- [Chat](/docs/chat): day shards, signed batches, encrypted attachments.
- [Android and desktop](/docs/platforms): staying reachable, remembered keys, audio.
- [Threat model](/docs/threat-model): what each check defends and what is not protected.
- [Build and test](/docs/build): building from source and the test suites.
