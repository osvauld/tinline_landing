---
title: Threat model
description: "The adversaries Tinline considers, including the wake service, the guarantees signatures and encryption provide, and explicit non-goals."
order: 10
---

# Threat model

Tinline is pre-release software without an independent security audit. It aims to protect content
confidentiality from outsiders, relays and the wake service, and to make accepted authorship and
receipt claims verifiable. It does not promise anonymity, availability or denial-of-service
resistance.

## Adversaries

The protocol is open, so peers may run modified clients. Treat contacts, group members, hosts,
call participants, relays, network operators, the wake service, the push provider and strangers as
potentially malicious within the keys and content they legitimately possess.

| adversary | can | cannot |
|---|---|---|
| Stranger who knows a device address | Open connections, fill pending slots until bounds apply and keep dialing. At an IP address and port it reaches directly, complete the transport handshake and so learn that the device is online and which endpoint key it uses now. | Read anything, forge a message, become a contact without acceptance. |
| Blocked former contact | Keep what it holds and keep dialing addresses it learned. In 0.2.5 its devices could still occupy the 8 reserved contact slots; since 0.2.6 they wait in the general pool like a stranger's. If it hosts a group you share, keep a lasting address for your group endpoint. | Authenticate for chat, calls or blobs; use tokens you issued; wake your phone once its tokens are revoked. |
| Contact | Keep everything you sent it; forward your signed device list, including a rotated address; wake your phone within the limits and learn that it is online before anyone answers. | Sign as you; reuse a message in another chat or day. |
| Group host | Read, withhold, delay or record what it carries. | Forge a post or change membership. |
| Wake-service operator, or Cloudflare as its host | See push addresses, random tags, wake kind, request IPs and timing; correlate them; delay, suppress or fabricate wake hints. | Read content from a wake request; forge author proofs or receipts; make a device accept a message or call. |
| Google, for the Play edition | See the destination device, push timing and an opaque sealed hint; delay or suppress pushes. | Open the hint or learn content. |
| Relay or discovery operator | See endpoint IDs, relay use, timing and sizes. | Read content or impersonate a device. |
| Holder of your root secret | Everything you can do. | Be revoked; identity succession is not built. |

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
| Wake tokens sealed to the relay key, revoked on block and code reset | Keep push addresses from contacts; stop wakes from someone you blocked. |
| A dial-back `CallReady` accepted only from a device held for that contact | Keep an unannounced device from attaching itself to a call. |
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
- A wake push carries only a hint sealed to the receiving phone: a random tag, the kind and the
  time. Names, identifiers and content never enter it.

## Metadata

Tinline is not anonymous. Relays and discovery infrastructure can observe endpoint IDs, timing,
traffic sizes and relay use. Direct peers learn network addresses, and iroh's hole punching may
show a dialer the device's address before the app's own authentication runs. The wake service
sees push addresses, random tags and the IP addresses of devices asking for a wake; Google sees
that a device was pushed and when. Contacts receive signed callable endpoint lists and can infer
their size.

Because iroh's accepting side completes the transport handshake with any dialer, a device that is
directly reachable at an IP address and port tells whoever connects there which endpoint key it
uses now. Endpoint rotation, where enabled, therefore hides a device only from parties that cannot
reach its address directly. Phones behind carrier NAT are rarely reachable that way; a device with
a public address, port forwarding or IPv6 usually is. There is no relay-only setting yet.

While locked, display name, DID and device public key remain readable for account selection.
Directory names, record paths, activity days, file sizes and blob hashes also remain visible due to
storage layout. Notifications, logs and exported plaintext are outside sealed stores.

## What is not protected

- Malware running as Tinline or a rooted/unlocked device can use data available to the app.
- A stolen root secret or linked device cannot be strongly revoked with the current identity
  design.
- Recipients and group hosts can retain, copy, publish or record content they legitimately see.
  Remote deletion, read behavior and recording notices are cooperative.
- A contact code altered on its way to the recipient: both apps then complete a valid exchange
  with the attacker's keys, and the apps show no safety number that would reveal it.
- There is no forward secrecy for stored databases under their long-lived derived keys.
- Secure erasure cannot be promised on flash or copy-on-write filesystems.
- Tinline is not an emergency calling service.
- A device may remain online while the OS is locked because Android's background service or the
  Linux tray process continues running.

## Abuse and resource limits

Implemented bounds: pending private handshakes are limited to 24 general slots plus 8 reserved for
devices of contacts you have not blocked (since 0.2.6), first authentication steps time out after 15 s, call/contact control frames are
capped at 64 KiB, the first frame of a chat or own-device session is capped at 64 KiB and a group
hello at 1 MiB, with at most 32 unidentified connections on the group endpoint (since 0.2.6), contact requests are capped at 64 and group-code attempts are rate-limited. The
wake service allows about two message wakes and three call wakes per minute per token tag and
twenty registrations per minute per IP address; the app itself sends at most one message wake per
30 s per device, backs off for unanswered requests and acts on at most four wakes per ten minutes
from a contact code's shared tag.

Known gaps in 0.2.5, fixed in 0.2.6: chat, own-device and group protocols accepted frames up to
16 MiB before application authentication completed, and a blocked contact's devices still counted
as contact devices for the reserved slots. Remaining gaps: a contact-request inbox can be filled with throwaway identities; and a
blocked former contact can keep dialing an address it knows, with endpoint rotation off by
default, so there is no automatic expiry for that knowledge. Public relay and wake-service
capacity are not under the app's control. None of this supports a denial-of-service-resistance
claim.

## Important semantic limits

- Missing receipt evidence proves nothing; a recipient can be offline or withhold it.
- A valid read receipt is an account installation's signed claim, not proof that a human looked.
- Group hosts can withhold or reorder delivery but cannot forge signed member records.
- Removed group members retain old history and receive a bounded grace path for old posts.
- Display names are not unique identity evidence. The apps have had no safety-number verification
  UI since 0.1.38; compare the DID through a separate trusted channel when identity matters.
- A contact code is a bearer: giving it to someone means trusting them to request contact and,
  once accepted, to reach your devices. Blocking, and rotation where enabled, cover the end of
  that trust. A code altered in transit is the one case neither covers.
- Rotation, where enabled, changes only the endpoint key: not the IP address, the DID, wake tokens
  already issued or the group endpoint that a shared group's host holds, and a mutual contact can
  forward the new list.
