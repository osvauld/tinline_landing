---
title: Linked devices
description: "Root-secret transfer by QR, account synchronization, endpoint succession and the limits of unlinking."
order: 4
---

# Linked devices

A linked phone or computer holds the same account root secret and creates its own installation and
endpoint key. It can sign as the account, ring for incoming calls and synchronize account data.

## Link protocol

Either device may display a link QR. The QR contains an endpoint key, a fresh 16-byte bearer
secret, a relay hint and a five-minute expiry. The first connection consumes it.

The existing device and new device:

1. connect over `tinline/link/1` and bind proofs to the QR secret, both endpoint keys and each
   side's role;
2. display the same six-digit confirmation code so the person can detect a racing scanner;
3. wait for approval on the existing device;
4. transfer the root secret, account name and device registry in an AEAD-sealed grant inside the
   already encrypted QUIC connection;
5. have the new device create a fresh local endpoint key and attest it to the account;
6. register that installation and begin own-device synchronization.

Approval requires the passphrase **when the account has one**. Platform authentication may protect
a remembered key on Android when there is no passphrase. Locking the existing device cancels an
in-progress link.

The root secret never appears in the QR and the QR secret is not sent over the connection.

## Own-device sync

Devices authenticate `tinline/self/5` by presenting an account-signed attestation for the
QUIC-authenticated endpoint. A contact token cannot open this protocol. A removed device is
refused after proving it belongs to the account and is told to unlink.

Signed, version-vector-based sync carries several documents and ledgers:

- device registry, contact state, token cut-offs and signed block notices;
- call history;
- account profile and cached contact profiles;
- direct-message and “You” day documents, read cursors and peer acknowledgements;
- group membership/content needed by the account's other devices;
- group receipt evidence; direct-message receipt replication is not yet complete.

Incoming chat and group content is validated using the same author-proof rules as content received
from a contact or host. An own device can relay an author's original proof; it cannot replace it
with its own signature.

Sessions are change-driven rather than permanent. Devices connect on local changes, startup,
network change and linking (and after endpoint rotation if explicitly enabled), then close after
60 seconds without application traffic. Backoff limits repeated failed dialing.

Never synchronized: endpoint private keys, the vault data key, passphrase and live call state.

## Device lists and rotation

Contacts receive a DID-signed list of current callable endpoint keys. If the optional core rotation
policy is enabled, rotation replaces a key beneath the stable installation and DID. The old key
signs a succession link, allowing a contact with enough recent links to recognize continuity. The
policy is disabled by default in 0.1.38, and the apps provide no rotation switch or separate
user-facing verification badge.

A list contains at most eight current devices. Contacts can infer that count, though labels remain
private to the account's own devices.

## Unlinking

Unlinking marks an installation removed, stops normal own-device sync and removes it from future
device lists. When contacted, the removed installation locks and deletes that local account.

This is operational removal, **not cryptographic revocation**. A device that copied or retained the
root secret can recreate an endpoint and sign new account statements. Strong revocation requires
moving to a new account identity; that succession mechanism is designed but not built.

Unlinking also does not erase copies already made by the device, and it is separate from personal
blocking and group membership policy.
