---
title: Threat model
description: "What each protocol check defends against, what Tinline does not protect, and known gaps."
order: 8
---

# Threat model

Tinline is pre-release software without an independent audit. This page states what the design
is meant to defend, and where it stops. For reporting a vulnerability, see
[Security](/security).

## What each check defends against

| check | defends against |
|---|---|
| Domain-separated signatures | A signed object of one kind replayed as another |
| Key recovered from the claimed DID, then compared with the expected issuer | Forged claims; objects signed by the wrong party |
| Attested device equals the connected device | A relay or man-in-the-middle forwarding someone else's hello over its own connection |
| Ticket's visible fields equal its signed fields | A tampered QR or code swapping name, device or relay |
| Invite issued by me, for my device | Redeeming another person's or another device's ticket here |
| Expiry on tickets and grants | Stale QR codes; grants living forever |
| Spent-nonce set | Replaying a captured hello to add a second contact from one ticket |
| Binding over nonce and both devices | Lifting a hello onto another ticket or device pair |
| Grant holder equals the attested DID; grant issued by me | Stolen grants; grants minted by third parties |
| Contact check on every call | A valid grant surviving after the contact was removed |
| Device list signed by the DID, newest wins, 1–8 devices | Forged or replayed device lists; dial amplification |
| "Verified" resets on an unfamiliar device | A new device silently inheriting trust |
| `Cancel` honoured only on that call's connection | A third party stopping someone else's ringing |
| Link proof bound to the QR secret, role and both devices | A scanner without the QR; reflected or replayed proofs |
| Link confirmation code, 5-minute single-use QR | A photographed QR raced by a third device |
| Own-device sync needs an attestation of our own DID, not removed | Contacts, strangers or unlinked devices entering account sync |
| One Loro peer id per chat batch, signed by its device | Ops forged in someone else's name |
| Per-message author signatures over the doc id | Rewritten, replayed or rolled-back messages |
| Blob serving gated on contact and message reference | Fetching attachments you were never sent |

## What is encrypted

- **In transit:** calls, chat, attachments, linking and own-device sync ride iroh's
  peer-authenticated QUIC with TLS 1.3, including through relays. A relay sees ciphertext and can
  deny service, but cannot read or forge traffic.
- **At rest:** the recovery phrase and device key (vault); contacts, grants, call history and the
  sync document (`account.redb`); chats (`chat.redb`); attachments (random per-file keys).

## What Tinline does not protect

- **A compromised or already-unlocked device.** Malware running as the app, or a rooted device
  while unlocked, can read everything the app can.
- **A stolen recovery phrase, or a stolen linked device.** There is no revocation. Unlinking
  stops sync and dialling, but the removed device knew the phrase.
- **Metadata.** Peers, relays and discovery providers can observe IP addresses and connection
  timing. Tinline is not anonymous. The account name, DID and device public key are readable in
  `account.json`, and file names show how many accounts a device holds.
- **Local plaintext copies.** Viewing or exporting an attachment can leave plaintext copies;
  encrypted files do not prove older plaintext was erased from flash.
- **Copies others hold.** Deleting a message or contact does not erase the other person's copy.
- **Emergencies.** Tinline is not an emergency-calling service, and both devices must be
  reachable. Only the selected account on a device is online.

## Known gaps

- No per-grant or device revocation list; removing a contact is a block that syncs to your own
  devices.
- Attestations never expire.
- A contact ticket is a bearer secret until redeemed: whoever scans first wins.
- No clock-skew tolerance on expiry checks.
- No application-level media cipher or ratchet beyond TLS 1.3; key-compromise behaviour has not
  been independently audited.
