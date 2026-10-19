---
title: Accounts and devices
description: "The root secret, did:key identity, rotating per-install endpoint keys, the vault and sealed local stores."
order: 2
---

# Accounts and devices

## Root secret and DID

A Tinline account starts with 256 random bits called the **root secret**. It can be exported as a
BIP39 recovery phrase or as a one-line checksummed `tlkey-…` recovery key. These are two
representations of the same account secret, not separate credentials.

The BIP39 seed is passed through HKDF-SHA256 with context `osv/identity/signing/v1` to derive an
Ed25519 account key. The public key is represented as `did:key:z…`, including the Ed25519
multicodec prefix before base58 encoding. The DID is self-authenticating: verification needs no
account registry or resolver.

The root secret is the identity. Anyone retaining it can sign as the account. Tinline therefore
does not claim cryptographic revocation of a hostile linked device.

## Account key, install and endpoint key

Tinline separates three identifiers:

- **DID/account key:** stable identity and author of application statements.
- **Install ID:** stable identifier for one installation of the account.
- **Device endpoint key:** random Ed25519 key used as the private iroh endpoint identity. The
  QUIC/TLS connection proves possession of it.

The account signs an attestation binding its DID to the current device key. Application admission
checks that attestation, confirms the attested key is the QUIC peer, checks the expected DID and
requires the appropriate token or relationship.

Content authorship is signed by the account key. Device keys authenticate connections and
transport batches; they are not the long-term author identity.

## Endpoint rotation

Private and hosting-group endpoint rotation is implemented and crash-safe, but the default policy
in version 0.1.38 is **disabled**. The apps expose neither an enable switch nor a lost-touch screen.
When a caller explicitly enables the core policy, its standard schedule is seven days plus up to
one day of persisted jitter, with a seven-day announcement period. A host can then rotate its
group endpoint too; an ordinary group member does not.

The old endpoint key signs a succession link to the new one. A contact can preserve verification
when a valid chain reaches a key it already knew. An installation retains its latest four links;
a device-set change that cannot be connected through those links is treated as an unlinked change
and resets verification.

An enabled rotation changes neither the DID nor the install ID, writer identity, grants or
conversations. Blocking, contact removal, group removal and host revocation do not trigger or
reschedule it. If a contact misses an enabled announcement window, the core records `lost_touch`;
app controls and recovery UI for that state are not built.

## Accounts on one installation

One installation may hold several accounts, but only the selected account is unlocked and online.
Switching accounts closes its endpoints, drops unlocked secrets and opens the selected account;
switching is refused during a call. Other accounts do not ring on that device.

The account directory contains a readable profile and sealed databases. The exact rows evolve,
but the security boundary is:

| data | readable while locked? |
|---|---|
| Display name, DID and device public key | **yes**, deliberately, for account selection and lock UI |
| Root secret and device private key | no; sealed in the vault |
| Contacts, tokens, blocks, call log and sync state | no; sealed records |
| Chats, groups, receipts and local search data | no; sealed records |
| Attachment and history contents | no; independently encrypted blobs |
| Directory names, record paths, activity days, sizes and blob hashes | **yes**, as storage-layout metadata |

## Vault

The root secret and current device private key are sealed with AES-256-GCM under a random data key
(DEK). When a passphrase is set, Argon2id derives a wrapping key using stored parameters (normally
64 MiB, three iterations and four lanes), and the DEK is wrapped under it. Parameters outside the
accepted safety range are rejected rather than silently weakened.

A passphrase is optional. Android can remember the DEK using Android Keystore. Desktop remembering
is optional and requires an available secure OS keyring; otherwise a passphrase is required.
Creating or restoring a no-passphrase account is not committed to disk until the platform has
successfully saved and read back its remembered key.

Revealing the root secret or changing the passphrase requires the passphrase when one is set.
A device that is already unlocked can still act as the account.

## Sealed stores and blobs

Account, chat, group and search stores use separate keys derived from the root secret and their
store context. Values are AES-256-GCM sealed and bound to their record paths, so a ciphertext row
cannot be moved to a different key and remain valid. Loro documents, postcard records and JSON
profile values all exist inside this storage model; there is not one universal encoding.

Files use fresh random AES-256-GCM keys and 64 KiB encryption chunks. Ciphertext is addressed by
its BLAKE3 hash and transferred through iroh-blobs, whose own 16 KiB chunks support resumable
transfer. Encryption chunking and transfer resumption are separate layers.

Stores use long-lived per-store keys with random nonces rather than a ratchet. There is no forward
secrecy for copied local data. Filesystems and flash translation layers also prevent a reliable
secure-deletion promise.

## Linking versus succession

Linking copies the root secret to another device. Unlinking removes that installation from normal
sync and dialing, but cannot stop a device that retained the secret from creating a fresh key and
signing as the account.

A separate account-identity succession design would let the old account key name a replacement
DID and let contacts follow it operationally. That is **not implemented**. Old signatures would
remain mathematically valid, and competing succession statements still require a conflict policy.
