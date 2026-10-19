---
title: Threat model
description: "The adversaries Tinline considers, the guarantees signatures and encryption provide, and explicit non-goals."
order: 10
---

# Threat model

Tinline is pre-release software without an independent security audit. It aims to protect content
confidentiality from outsiders and relays and to make accepted authorship/receipt claims
verifiable. It does not promise anonymity, availability or denial-of-service resistance.

## Adversaries

The protocol is open, so peers may run modified clients. Treat contacts, group members, hosts,
call participants, relays, network operators and strangers as potentially malicious within the
keys and content they legitimately possess.

A device holding your account root secret is not cryptographically distinguishable from you. It
can make new attestations, author content and sign receipts. Unlinking is not revocation.

## Main checks

| mechanism | security purpose |
|---|---|
| Domain-separated canonical signatures | Prevent a valid signed statement from being reinterpreted as another kind. |
| DID key recovered from the claim and compared with the expected party | Reject forged and wrong-issuer account statements. |
| Account attestation equals the QUIC-authenticated endpoint | Bind the claimed account device to the connection. |
| Message/call tokens checked against issuer, holder, time and local cut-offs | Restrict direct-chat and calling capabilities. |
| Signed device lists and endpoint succession chains | Bound callable devices and recognize rotation when the optional policy is enabled. |
| Scratch-import plus account-signed CRDT operation spans | Reject forged, replayed or invalid message/group updates atomically. |
| Recipient-signed exact-version receipts | Separate attributable delivery/read claims from unsigned transport ACKs. |
| Blob reference and relationship checks | Refuse ciphertext that no authorized conversation or account device references. |
| Link secret, pair-bound proofs and confirmation code | Detect scanners that do not share the in-person QR ceremony. |

## What is encrypted

- Direct connections, linking and own-device sync use peer-authenticated QUIC/TLS, including when
  carried by public relays.
- Vault secrets, account/chat/group/search records and receipt ledgers are sealed at rest.
- Attachments and compacted history use random per-file keys; only ciphertext enters iroh-blobs.
- Group posts and group-call audio are protected on each member-to-host connection, but hosts can
  read what they relay.

## Metadata

Tinline is not anonymous. Relays and discovery infrastructure can observe endpoint IDs, timing,
traffic sizes and relay use. Direct peers learn network addresses. Contacts receive signed callable
endpoint lists and can infer their size.

While locked, display name, DID and device public key remain readable for account selection.
Directory names, record paths, activity days, file sizes and blob hashes also remain visible due to
storage layout. Notifications, logs and exported plaintext are outside sealed stores.

## What is not protected

- Malware running as Tinline or a rooted/unlocked device can use data available to the app.
- A stolen root secret or linked device cannot be strongly revoked with the current identity
  design.
- Recipients and group hosts can retain, copy, publish or record content they legitimately see.
  Remote deletion, read behavior and recording notices are cooperative.
- There is no forward secrecy for stored databases under their long-lived derived keys.
- Secure erasure cannot be promised on flash or copy-on-write filesystems.
- Tinline is not an emergency calling service.
- A device may remain online while the OS is locked because Android's background service or the
  Linux tray process continues running.

## Abuse and resource limits

Several boundaries are implemented: pending private handshakes are limited, first authentication
steps time out, call/contact control frames are capped at 64 KiB, contact requests are capped at
64 and group-code attempts are rate-limited. Chat, own-device and group protocols currently permit
frames up to 16 MiB; chat authentication now has a timeout, but a peer can still send a large frame
before application authentication completes.

A contact-request inbox can be filled with throwaway identities. A blocked former contact can
keep dialing an address it already knows; endpoint rotation is disabled by default in 0.1.38, so
there is no automatic expiry for that knowledge. Public relay capacity is not controlled by
Tinline. These limits reduce accidental or simple resource exhaustion; they do not support a
denial-of-service-resistance claim.

## Important semantic limits

- Missing receipt evidence proves nothing; a recipient can be offline or withhold it.
- A valid read receipt is an account installation's signed claim, not proof that a human looked.
- Group hosts can withhold or reorder delivery but cannot forge signed member records.
- Removed group members retain old history and receive a bounded grace path for old posts.
- Display names are not unique identity evidence. Version 0.1.38 has no safety-number verification
  UI; compare the DID through a separate trusted channel when identity matters.
