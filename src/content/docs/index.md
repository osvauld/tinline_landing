---
title: Overview
description: "How Tinline is built: one Rust core, native Android and Linux apps, signed content, linked devices, groups, calls and no server of ours."
order: 1
---

# Technical overview

Tinline is a peer-to-peer messenger and calling app. Android and Linux use the same Rust core.
Devices connect over [iroh](https://iroh.computer): directly when hole punching succeeds and
through public relays otherwise. Osvauld does not run an account, messaging or calling server.
Relays still observe endpoint addresses, timing and traffic sizes; Tinline does not promise
anonymity.

An account starts with a 256-bit **root secret**. It derives a stable `did:key` identity and can
be exported as either a BIP39 recovery phrase or a checksummed `tlkey-…` recovery key. Each
installation has a replaceable device key. The account key proves which devices belong to the
identity, while transport authentication proves possession of the connected device key.

These pages describe implementation version **0.1.38** at app commit `dc0fb7c3`. They distinguish shipped behavior from
planned work, and source code wins if documentation and implementation disagree.

> **Pre-release security notice.** Tinline has not had an independent security audit and the
> implementation described here is newer than the currently published release. Read the
> [threat model](/docs/threat-model) before relying on it.

## Architecture

```text
 Android app (Kotlin, Compose)          Linux desktop (Rust, iced)
        │ UniFFI + one video JNI path          │ direct Rust calls
        └────────────────┬─────────────────────┘
                         ▼
                p2pcore (crates/core)
 identity · contacts · profiles · chat · groups · receipts · calls · blobs
        │             │              │                 │
      proto          audio          video            storage
 signed tokens,   Opus + jitter   AV1 / VP8       sealed redb stores
 handshakes       and mixing      adaptation      and local search
                         │
                         ▼
           iroh 1.3: QUIC/TLS, hole punching, relays and discovery
           iroh-blobs: resumable transfer of encrypted files
```

| crate | role |
|---|---|
| `identity`, `cryptography` | Root-secret recovery formats, `did:key`, strict Ed25519 verification, AEAD and KDFs. |
| `proto` | Canonical signed statements, contact tickets, message/call tokens, device lists, linking and call control. |
| `core` (`p2pcore`) | Accounts, endpoints, contacts, chat, groups, receipts, calls, blobs, profiles, linking and own-device sync. |
| `audio`, `video` | Opus and adaptive playout; AV1/VP8 media and quality adaptation. |
| `storage` | redb records sealed with keys derived for each store. |
| `desktop` | Iced Linux app, cpal audio, WebRTC audio processing and tray integration. |
| Android app | Kotlin/Compose UI over UniFFI, foreground service, notifications, Telecom and MediaCodec integration. |

## Endpoints and protocols

Each selected account has a private endpoint. An installation that belongs to a group also has a
separate group endpoint, shared by that installation's groups. Group members dial hosts rather
than one another, so ordinary membership does not expose the private endpoint.

| endpoint | ALPN | carries |
|---|---|---|
| private | `osvauld/p2p/1` | Contact requests, signed notices and tokens, device-list updates and 1:1 call control/media. |
| private | `tinline/chat/7` | 1:1 authentication, profiles, Loro chat updates, presence and signed receipts. |
| private | iroh-blobs | Authorized transfer of encrypted attachments, pictures and compacted history. |
| private | `tinline/link/1` | Authenticated transfer of the root secret to a linked device. |
| private | `tinline/self/5` | Account, profile, chat, group, call-log and cursor sync between the account's devices. |
| group | `tinline/group/4` | Group membership records, posts, history, requests and member receipts. |
| group | `tinline/gcall/1` | Group-call control and forwarded media. |

Current binary protocols use length-prefixed postcard frames; call/contact control uses bounded
JSON frames; Loro updates and some profile values retain their own binary or JSON representations.
Superseded ALPNs are accepted only far enough to return a clear update error.

The core contains crash-safe private and hosting-group endpoint rotation beneath the stable DID,
but version 0.1.38 leaves that policy **disabled by default** and the apps expose no rotation
control. Blocking and group removal do not enable or trigger it. See
[Accounts and devices](/docs/identity).

## Implementation status

| area | shipped | not shipped or incomplete |
|---|---|---|
| Identity | Stable DID, recovery exports, per-install keys and linking | Endpoint rotation exists in core but is off by default with no app control; account identity succession/revocation is not built |
| Chat | Signed 1:1 CRDT messages, files, voice messages, profiles, local search, signed delivered/read receipts | Third-party store-and-forward |
| Groups | Signed record log, host replication, history, invitations, chat requests and signed member receipts | Group edits, files, reactions and video |
| Calls | 1:1 audio/video, group audio, host failover, Android Telecom | Group video; cooperative recording UI is still design work |
| Platforms | Android 9+ and Linux x86-64 packages | Windows and macOS packages/support |
| Hardening | Admission limits, handshake timeouts and frame bounds on several paths | No denial-of-service-resistance guarantee; some pre-auth work remains broader than ideal |

## Read next

- [Accounts and devices](/docs/identity): root secret, DIDs, optional endpoint rotation, vault and storage.
- [Contacts and capabilities](/docs/contacts): reusable tickets, held requests, message/call tokens and blocking.
- [Linked devices](/docs/devices): linking, own-device synchronization and unlinking.
- [Direct chat](/docs/chat): signed CRDT messages, attachments, search and presence.
- [Groups](/docs/groups): signed records, member hosts, invitations and removal.
- [Receipts](/docs/receipts): what delivered/read evidence proves and does not prove.
- [Calls and media](/docs/calls): 1:1 audio/video and hosted group audio.
- [Android and Linux](/docs/platforms): service lifecycle, key storage and packaging.
- [Threat model](/docs/threat-model): adversaries, metadata and explicit non-goals.
- [Build and test](/docs/build): reproducible commands and release artifacts.
