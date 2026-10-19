---
title: Accounts and keys
description: "The 24-word phrase, did:key identities, per-install device keys, accounts, the Argon2id vault and the sealed stores."
order: 2
---

# Accounts and keys

## Person and device

Tinline separates **who you are** from **which device you are using**.

- **Identity.** A BIP39 24-word recovery phrase derives an Ed25519 signing key. Its public
  half is written as a `did:key:z…` DID. The DID is the person, and it is what your contacts
  store. The same phrase gives the same DID on every device.
- **Device key.** Each install generates a random Ed25519 key for each account it holds. Its
  public half is that account's iroh `EndpointId` on this device, so the QUIC/TLS handshake
  itself proves which device is on the other end. The device key is how people *reach* you;
  the identity is who they reach. Restoring or linking on a new device always creates a new
  device key.
- **Attestation.** The DID signs `{v, did, device, iat}`: "this device is mine". A device
  presents its attestation in every handshake, and the receiver checks that the attested
  device equals the device that actually connected.

### Signed blobs

Everything signed in the protocol is a `SignedBlob { payload, signature }`, with the signature
over `DOMAIN || payload`. Domains are `osvauld/p2p/{attest,invite,grant,bind,devices}/v1\0` and
`osvauld/p2p/invite/v2\0`, so a signature for one kind of object can never be replayed as
another. The verifying key is always recovered from the DID named inside the payload, and the
caller then compares that DID with the one it expected.

## Accounts

One install can hold several accounts (identities):

```text
<root>/accounts/<id>/account.json   readable: version, name, DID, device public key, vault
<root>/accounts/<id>/account.redb   sealed: contacts, grants, call history, device label, sync doc
<root>/accounts/<id>/chat.redb      sealed: conversations, outbox, blob keys
<root>/accounts/<id>/blobs/         ciphertext: attachments, voice messages, closed days
<root>/current                      which account is selected
```

`<id>` is the DID after `did:key:`. **Only the selected account is unlocked and online on a
device.** Switching stops the endpoint, forgets the previous account's secrets and state, and
starts the next one; switching is refused during a call. Other accounts on the device do not
ring there. Keeping every account online would mean one always-on endpoint per account, which
costs battery; making a new identity, or linking an account to another device, is cheap.

Background work (call tasks, history writes, device updates) carries the session it started
under and is refused once a different account is open, so it can never write into the wrong
account.

## The vault

`account.json` holds the identity. Its secrets are in `vault`:

```json
{
  "version": 2,
  "name": "alice",
  "did": "did:key:...",
  "device_public": [32 numbers],
  "vault": { "salt": "b64", "m": 65536, "t": 3, "p": 4, "wrapped_dek": "b64", "sealed": "b64" }
}
```

- `sealed` is AES-256-GCM of `{"mnemonic", "device_secret"}` under a random 32-byte **data key**
  (DEK).
- `wrapped_dek` is the DEK under a key derived as `Argon2id(passphrase, salt, m = 64 MiB, t = 3,
  p = 4)`. Parameters outside m 64–256 MiB, t 3–10, p 1–8 or a salt outside 16–64 bytes are
  refused, so a tampered file cannot downgrade them.
- Changing the passphrase re-wraps the same DEK with a new salt.

`name`, `did` and `device_public` stay readable so the lock screen and account switcher can show
them while the account is locked.

The passphrase is **optional**. Without one, only the platform's remembered copy of the DEK
opens the vault: one Android Keystore-wrapped blob per account, or one OS keyring entry per
account on desktop. A desktop with no secure keyring requires a passphrase.

### Nothing is written until the key is safe

With no passphrase, the DEK exists only in the platform's key store, so an account written to
disk before that key was saved could be lost for good. Creating or restoring a no-passphrase
account therefore writes nothing: the identity lives in memory until the app has saved the key
and calls `commit_identity()`. If the save fails, onboarding offers Retry or "Add a passphrase
instead", and process death simply starts onboarding again with nothing on disk.

## Sealed stores

`account.redb` and `chat.redb` are redb stores where every value is sealed with AES-256-GCM and
bound to its key path, so a record cannot be moved to another key. Their keys are derived from
the **recovery phrase**:

```text
BLAKE3-derive-key("tinline/account-store/v2", normalised phrase)
BLAKE3-derive-key("tinline/chat-store/v2",    normalised phrase)
```

The phrase itself exists on disk only inside the vault, so the stores are still protected by
the passphrase. But forgetting the passphrase no longer loses data: restoring the 24 words on the
same device **restores in place**, reopening contacts, call history and chats with a new
passphrase and a new device key.

Stores written by older versions under the DEK are re-sealed under the phrase key on first
unlock, every row in one redb transaction: a crash leaves either the old file or the new one.

| what | where | readable without unlocking? |
|---|---|---|
| Recovery phrase, device secret | `account.json` vault | no |
| Account name, DID, device public key | `account.json` | **yes**, for the lock screen |
| Contacts, grants, blocks, spent ticket nonces, the current ticket | `account.redb` | no |
| Call history, availability, device label, own-device sync doc | `account.redb` | no |
| Conversations, outbox, read cursors, attachment keys | `chat.redb` | no |
| Attachments, voice messages, closed chat days | `blobs/` | no, random key per file |
| Which records exist (`state`, `calls`…) and how many accounts | file and record names | yes |

Directories are `0700`, files `0600`, and secrets in memory are zeroized on drop. Encrypted
files do not prove that older plaintext was securely deleted from flash storage.

## What a passphrase buys

With a passphrase, and without an accessible remembered key, someone who copies the app's files
or a backup gets ciphertext that is only as strong as the passphrase; Argon2id slows guessing.
With a platform-remembered key, a stolen phone that unlocks itself can still place and receive
calls, but cannot show the recovery phrase or change the passphrase without the passphrase. None
of this protects against malware running as the app or a rooted, unlocked device.
