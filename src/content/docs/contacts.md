---
title: Contacts
description: "Contact tickets, the add-contact handshake, call grants, signed device lists, removal and safety numbers."
order: 3
---

# Contacts

Tinline has no directory and no phone numbers. Two people become contacts by exchanging a
signed, single-use **ticket** and then a pair of **grants**: tokens in which each DID says
"you may call me". After that, each side learns the other's full set of devices from a
**device list** signed by the other's DID.

## The ticket

The ticket is what the QR code and the "copy code" button carry. The current format (v2) is
`OSVC2:` followed by uppercase base32 without padding, so the QR code can use alphanumeric mode
(about 260 characters). Its binary body is:

```text
signing_pk[32] | device[32] | nonce[6] | exp[3] | flags[1] | name[n] | relay_ext | sig[64]
```

- `signing_pk` is the owner's DID key; `device` is the device to dial.
- `nonce` makes the ticket single-use. `exp` is minutes since 2026-01-01 UTC (24-bit).
- `flags` packs a relay code (one of the four n0 relays, none, or a custom URL in `relay_ext`)
  and the name length, so names are capped at 31 bytes.
- `sig` is the DID's Ed25519 signature over `osvauld/p2p/invite/v2\0 || 0x02 || body`.

Nothing is displayed that is not signed. The older v1 format (`osvc1.` + base64url JSON) is
still accepted.

The app hands out one ticket at a time. Tickets live 7 days, and one with less than a day left
is replaced. Redeeming it, renaming yourself, removing a contact or resetting the code all
retire the current ticket, so a leaked old code is dead even if nobody used it.

## Adding a contact

B scans A's ticket and dials A's device.

```text
 B (scanner)                                           A (ticket owner)
   │  ContactHello                                         │
   │   attestation(B → B.dev), B's name, A's invite,       │
   │   binding = sign_B(bind ‖ nonce ‖ B.dev ‖ A.dev),     │
   │   grant_for_you (B lets A call B)                     │
   │ ────────────────────────────────────────────────────▶ │
   │                                                       │ checks, then one
   │                                                       │ sealed write
   │  ContactWelcome                                       │
   │   attestation(A → A.dev), A's name, grant for B       │
   │ ◀──────────────────────────────────────────────────── │
```

A accepts only if every check passes: the invite is signed by A and names A's device, it is
unexpired, its nonce is unspent, B's attestation is valid and names the device that actually
connected, the binding verifies under B's DID for this nonce and these two devices, and B's
grant is issued by B to A.

A then commits the new contact, the spent nonce and the retired ticket **in one sealed-store
write, before** it sends `ContactWelcome`. If that write fails it sends `Reject`, nothing has
changed, and the same ticket can be tried again.

B checks that A's attestation matches the ticket's DID and device, that the device equals the
one it connected to, and that the grant is issued by A to B. On any failure, either side sends
`Reject` and closes; the reason is for logs and is never trusted.

## Grants

A grant is A's signed statement that B's DID may call A. It carries a random 16-byte id and an
expiry of a year. Every answered call returns a `renewed_grant`, which replaces the stored one
only if it is validly signed by the callee for us and expires later. Grants belong to the
identity, so any of B's devices with a valid attestation can use B's grant.

## Device lists

A `DeviceList { v: 1, did, seq, devices: [{ device, relay? }] }` is signed by the DID under its
own domain. It holds 1 to 8 devices with no duplicates; `seq` is the signer's clock in
milliseconds. Every `CallHello` and `Accept` carries the sender's current list.

- A received list replaces the stored one only if it is newer: higher `seq`, and on a tie the
  larger signature, so every receiver converges on the same list. Older, forged or other-DID lists
  change nothing.
- A list that contains a device not seen before **resets "verified"** for that contact.
- Once a contact has a list, a device outside it that calls with a valid attestation is accepted
  for that call, is not dialled later, and also resets "verified".

## Removing a contact

There is no revocation message. Removing a contact is a **block**: the contact, their call
history and their conversation are deleted, and their DID goes on a blocked list. Calls and chat
sessions from a blocked DID get the same generic refusal as any other failure. The removal is a
tombstone that syncs to your other devices. Re-adding them by scanning *their* ticket lifts the
block everywhere.

## Safety numbers

Names are self-reported and not unique. To confirm the person, compare safety numbers through a
channel you trust, in person or on a known call.

For each party: `H = SHA-512("tinline-safety-v1" || signing_pk)`, then 5200 rounds of
`H = SHA-512(H || signing_pk)`. The first 30 bytes give six 5-byte groups, each read as a
big-endian integer mod 100000. The two 30-digit halves are joined in sorted order and shown as
12 groups of 5 digits.

Only the DID keys count, so the number does not change when someone adds a device. The
"verified" mark is stricter: it is tied to the device set it was given for and resets when a new
device appears.

## Limits worth knowing

- Until it is redeemed, a ticket is a bearer secret: whoever scans it first becomes the contact.
  Show it in person.
- Names from peers have control and bidirectional-override characters stripped and are cut to
  64 characters.
- An unauthenticated connection holds one of 24 slots (plus 8 reserved for contacts' devices)
  and has 15 seconds to deliver its hello.
