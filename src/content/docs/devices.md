---
title: Linked devices
description: "Linking a new device to an account by QR and confirmation code, own-device sync, and unlinking."
order: 5
---

# Linked devices

An account can live on several devices: a phone, a laptop, a tablet. Each linked device holds
the full identity and its own device key, rings for incoming calls, and stays in sync with the
others.

## The decision behind it

Everything a device must sign is signed by the **DID key**: attestations, contact tickets,
grants, and the renewed grant on every answered call. So a device that answers calls and adds
contacts must hold the identity secret. Linking therefore **transfers the recovery phrase** to
the new device over an authenticated, encrypted channel. It is "restore from phrase without
typing 24 words", plus data sync.

The alternative, delegated device keys signed by one primary device, would allow real
revocation but changes every verifier, needs chain verification at every contact, and makes the
primary a single point of failure. It is deferred until identity rotation is designed.

## Linking

E is the existing device (account unlocked), N the new one. Either can show the QR; usually the
device without a camera shows it.

```text
 E (existing)                                              N (new)
   │                     QR:  OSVL1:  device · secret[16] · 5 min     │
   │ ◀─────────────────────── shown on screen, in person ──────────── │
   │  dial N.device, ALPN tinline/link/1                              │
   │ ───────────────────────────────────────────────────────────────▶ │
   │  LinkHello{role, proof}          ◀────▶          LinkHello{...}  │
   │                                                                  │
   │  shows 482 913                                    shows 482 913  │
   │  person compares, approves with passphrase                       │
   │  LinkGrant (sealed): phrase, account name, device registry       │
   │ ───────────────────────────────────────────────────────────────▶ │
   │                         N creates the account: own device key,   │
   │                         own data key, checks the DIDs            │
   │  LinkDone{attestation(DID → N.device), label}                    │
   │ ◀─────────────────────────────────────────────────────────────── │
   │  E registers N, re-signs its device list, own-device sync starts │
```

- **The QR** is `OSVL1:` + base32 of the displayer's device key, a 16-byte random secret, an
  expiry (5 minutes) and a relay hint. It is unsigned and single-use: the first connection to it
  consumes it, and a late or wrong scanner gets a plain close.
- **Proofs.** With `T = "tinline/link/v1" ‖ E.device ‖ N.device ‖ secret` and
  `K = HKDF-SHA256(secret, T)`, each side sends `HMAC(K, role ‖ own device)`. The receiver
  compares it in constant time against the QUIC-authenticated device. The secret never crosses
  the network, and because `T` names both devices, a proof cannot be replayed onto another pair.
- **Confirmation code.** Both screens show the first 20 bits of `HMAC(K, "confirm")` as six
  digits. A third device racing a photographed QR would produce a different code.
- **Approval.** E asks for the same authorization as revealing the recovery phrase: the
  passphrase, or device authentication on Android when there is none. The user has 5 minutes.
- **The grant** is AES-256-GCM under `HKDF(K, "grant")` with `T` as associated data, inside the
  already encrypted QUIC session.
- **LinkDone** must carry an attestation of E's own DID for the device that is actually
  connected.

Only one link runs at a time, and locking E cancels it. A device that crashes after creating its
account but before `LinkDone` is still a valid device of the account; it announces itself on its
first sync.

## Own-device sync

Linked devices keep one Loro document, `account`, sealed in each device's `account.redb`. They
sync it over ALPN `tinline/self/1`:

- A session opens with `Auth { attestation }`. The other side accepts only an attestation of
  **its own DID** for the connected device, and not a removed one. A call grant never opens
  own-device sync, and an own-device attestation never gets a call accepted.
- Then both sides exchange version vectors (`Hello`) and send the updates the other lacks
  (`Sync`), each batch signed by the sending device. Later changes are pushed live.
- Devices redial every 15 s, at start, after a link and on network change, with per-device
  backoff from 20 s to 300 s.

| synced | merge rule |
|---|---|
| Device registry: attestation, label, relay | Per field, last writer wins; "removed" is sticky |
| Contacts: name, devices, grant, alias, verified | Newest signed device list wins; the longer-lived grant wins; "verified" only counts against a device set at least as new |
| Removed contacts | Tombstone with a time: removal beats older edits; a later ticket scan re-adds on every device |
| Spent ticket nonces, revoked grants | Union, never shrinks |
| Call history | One record per call; an answered record beats an "elsewhere" one; newest 500 |

The same session also carries **chats**: every day shard of every conversation, "You" (notes and
files saved to yourself), and each conversation's read position, so reading on one device clears
the unread count on the others. See [Chat](/docs/chat#your-own-devices).

**Never synced:** the device secret, the data key, the passphrase, availability, the current
ticket and live calls.

Contacts learn about a new device the next time they call or are called: the device list rides
in every `CallHello` and `Accept`. They never see device labels.

## Unlinking

Unlinking marks a device as removed in the registry. The removed device is told `Unlinked` the
next time it connects to any of the account's devices (after proving it is one), and it locks and
deletes the account locally. Contacts stop dialling it once they receive the new device list.

Unlinking is **not revocation**. The removed device already knew the recovery phrase and could
mint new attestations with it. Stopping a stolen device for good requires a new identity.

## Several accounts on one device

A device can also hold several separate accounts. Only the selected one is online; see
[Accounts and keys](/docs/identity#accounts).
