---
title: Overview
description: "How Tinline is built: one Rust core, native Android and Linux apps, signed content, linked devices, groups, calls, and a content-free wake service as the only server of ours."
order: 1
---

# Technical overview

Tinline is a peer-to-peer messenger and calling app. Android and Linux use the same Rust core.
Devices connect over [iroh](https://iroh.computer): directly when hole punching succeeds and
through public relays otherwise. Osvauld runs no account, messaging or calling server. The one
service it does run is a **wake service** (`push.osvauld.com`) that asks Google to nudge a
sleeping Play-edition phone; the nudge carries no content, and the normal peer protocol does the
rest. Relays, the discovery service and the wake service still observe addresses, timing and
traffic sizes; Tinline does not promise anonymity.

An account starts with a 256-bit **root secret**. It derives a stable `did:key` identity and can
be exported as either a BIP39 recovery phrase or a checksummed `tlkey-…` recovery key. Each
installation has a replaceable device key. The account key proves which devices belong to the
identity, while transport authentication proves possession of the connected device key.

These pages describe implementation version **0.2.5** at app commit `656ebf84`, refreshed on
29 October 2026. They distinguish shipped behavior from planned work, and source code wins if
documentation and implementation disagree.

> **Pre-release security notice.** Tinline has not had an independent security audit. Read the
> [threat model](/docs/threat-model) before relying on it.

## Architecture

```text
 Android app (Kotlin, Compose)          Linux desktop (Rust, iced)
        │ UniFFI + one video JNI path          │ direct Rust calls
        └────────────────┬─────────────────────┘
                         ▼
                p2pcore (crates/core)
 identity · contacts · profiles · chat · groups · receipts · calls · blobs · wake
        │             │              │                 │
    runtimes        models         media           storage
 node, chat,     account, chat,  Opus + jitter   sealed redb stores
 group, sync,    group, receipts, AV1 / VP8      and local search
 transfer        search, crdt     adaptation
                         │
                         ▼
   iroh 1.3: QUIC/TLS, hole punching, relays and discovery · iroh-blobs: encrypted files
   wake service (Cloudflare Worker) → Firebase Cloud Messaging → a sleeping Play phone
```

| layer | crates | role |
|---|---|---|
| Primitives | `identity`, `cryptography`, `proto` | Root-secret recovery formats, `did:key`, strict Ed25519 verification, AEAD and KDFs; canonical signed statements, contact tickets, message/call tokens, device lists, linking and call control. |
| Models, no I/O | `account-model`, `chat-core`, `group-core`, `receipts-core`, `search-core`, `crdt`, `video-call-core`, `gcall-core`, `wake`, `wake-relay-core` | Pure state and decisions: account state, per-day chat documents, the group record log, receipt ledgers, the sealed search index, Loro helpers, video adaptation, group-call engines, wake-token policy and the relay's token format. |
| Runtimes | `node-runtime`, `chat-runtime`, `group-runtime`, `sync-runtime`, `transfer`, `gcall-net`, `call-video` | Endpoints and sessions: contact and call handshakes, wake routing, chat sync, group hosting, own-device sync and linking, iroh-blobs transfer, group-call and video I/O. |
| Media | `audio`, `video` | Opus with adaptive playout; AV1 and VP8 encode/decode. |
| Storage | `storage`, `search-ix` | redb records sealed with keys derived per store; the open search index. |
| App API | `core` (`p2pcore`) | Composes the above behind the UniFFI and desktop API, including background account slots. |
| Apps and tools | `desktop`, `peer`, `present`, `tin-icons`, Android app, iOS app | Iced Linux app; headless test peer; shared presentation logic; generated icons; Kotlin/Compose app with foreground service, notifications, Telecom, MediaCodec and, in the Play edition, Firebase Messaging; a SwiftUI app that is not released. |
| Wake service | `wake-relay-worker`, a separate Cargo project | Cloudflare Worker that turns a sealed wake token into an empty push. |

## Endpoints and protocols

Each open account has a private endpoint. An installation that belongs to a group also has a
separate group endpoint, shared by that installation's groups. Group members dial hosts rather
than one another, so ordinary membership does not expose the private endpoint.

| endpoint | ALPN | carries |
|---|---|---|
| private | `osvauld/p2p/1` | Contact requests, signed notices and tokens, device-list updates, wake material and 1:1 call control/media. |
| private | `tinline/chat/7` | 1:1 authentication, profiles, Loro chat updates, presence and signed receipts. |
| private | iroh-blobs | Authorized transfer of encrypted attachments, pictures and compacted history. |
| private | `tinline/link/1` | Authenticated transfer of the root secret to a linked device. |
| private | `tinline/self/5` | Account, profile, chat, group, call-log and cursor sync between the account's devices. |
| group | `tinline/group/5` | Group membership records, posts, images and voice, history, requests, open links and member receipts. |
| group | `tinline/gcall/1` | Group-call control and forwarded media. |

Current binary protocols use length-prefixed postcard frames; call/contact control uses bounded
JSON frames; Loro updates and some profile values retain their own binary or JSON representations.
Superseded ALPNs are accepted only far enough to return a clear update error.

## Reaching a sleeping phone

A phone on the Play edition does not keep a connection open. When a contact's device cannot reach
it, that device asks the wake service to send a content-free push; the phone starts the account's
endpoint and the ordinary authenticated protocol delivers the message or rings. Calls request a
wake about 2 s into an unanswered dial and messages after about 3 s; a woken phone dials the
caller back (0.2.5). Remembered accounts that are not open are woken the same way. Liberum and
desktop have no wake-ups: Liberum stays connected, and desktop keeps every remembered account
connected while it runs. See [Contacts](/docs/contacts), [Direct chat](/docs/chat),
[Calls](/docs/calls), [Android and Linux](/docs/platforms) and the
[threat model](/docs/threat-model).

The core contains crash-safe private and hosting-group endpoint rotation beneath the stable DID,
but version 0.2.5 leaves that policy **disabled by default** and the apps expose no rotation
control. Blocking and group removal do not enable or trigger it. See
[Accounts and devices](/docs/identity).

## Implementation status

| area | shipped | not shipped or incomplete |
|---|---|---|
| Identity | Stable DID, recovery exports, per-install keys, linking, several accounts reachable on one installation | Endpoint rotation exists in core but is off by default with no app control; account identity succession/revocation is not built |
| Reachability | Content-free wake service, Play wake-ups, wake-enabled contact codes, callee dial-back, background accounts | Liberum UnifiedPush; iOS release; wake-ups for group posts and calls |
| Chat | Signed 1:1 CRDT messages, files, voice messages, profiles, local search, signed delivered/read receipts | Third-party store-and-forward |
| Groups | Signed record log, host replication, history, invitations, public open links, chat requests, images, voice posts and signed member receipts | Group edits, deletion, reactions, general files and video |
| Calls | 1:1 audio/video, group audio, host failover, Android Telecom | Group video; cooperative recording UI is still design work |
| Platforms | Android 9+ in two editions, Linux x86-64 packages | iOS release; Windows and macOS packages/support |
| Hardening | Admission limits, handshake timeouts, frame bounds on several paths, wake rate limits | No denial-of-service-resistance guarantee; 16 MiB pre-auth frames on chat, sync and group paths; blocked devices still use reserved slots; no relay-only setting |

## Read next

- [Accounts and devices](/docs/identity): root secret, DIDs, several accounts, optional endpoint rotation, vault and storage.
- [Contacts and capabilities](/docs/contacts): reusable tickets with wake tokens, held requests, message/call tokens and blocking.
- [Linked devices](/docs/devices): linking, own-device synchronization and unlinking.
- [Direct chat](/docs/chat): signed CRDT messages, attachments, search, presence and wake-ups.
- [Groups](/docs/groups): signed records, member hosts, invitations, public groups and removal.
- [Receipts](/docs/receipts): what delivered/read evidence proves and does not prove.
- [Calls and media](/docs/calls): 1:1 audio/video, waking a sleeping phone and hosted group audio.
- [Android and Linux](/docs/platforms): editions, service lifecycle, key storage and packaging.
- [Threat model](/docs/threat-model): adversaries, the wake service, metadata and explicit non-goals.
- [Build and test](/docs/build): reproducible commands and release artifacts.
