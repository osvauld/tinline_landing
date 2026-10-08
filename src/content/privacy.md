# Tinline privacy policy

_Last updated: 8 October 2026_

Tinline is a calling and one-to-one messaging app made by Osvauld ("we"). It connects your
device to the devices of your contacts. This policy explains what that means for your data.
We do not receive a copy of your contacts, messages, attachments or call content, and the app contains no ads,
analytics or tracking SDKs. Network metadata is processed by peers and third-party infrastructure
as explained below.

## What stays on your device

- **Your account.** Tinline creates a cryptographic identity on your device. The recovery phrase
  and device secret key are stored in an encrypted vault. An optional passphrase protects the
  vault key using Argon2id. Android remembers the vault key using Android Keystore so calls can
  work in the background; hardware protection depends on the device. Desktop uses the system
  keyring when no passphrase is set, but currently falls back to a private plaintext key file
  if the keyring is unavailable. Someone who copies that file and the vault can read the secrets.
- **Your name, contacts, call history and settings.** These are local files, not encrypted by
  Tinline's vault. Your operating system's app sandbox, permissions and device encryption
  provide their protection. We do not receive a copy.
- **Your recovery phrase.** It is stored inside the encrypted vault and can be shown again in
  Settings. Anyone who has it can restore your identity, so keep it private.

## What you share with people you add

When you add a contact, the two devices exchange your display names and public keys (device
identifiers). Your contact sees the name you chose. Your contact ticket also contains your display name and public identifiers; anyone you share
it with can read those fields and try to redeem it.

## Calls

- Calls are end-to-end encrypted between the two devices. Nobody in between, including us, can hear
  them.
- Tinline tries to connect the two devices directly. When a direct connection is not possible
  (for example behind some routers or mobile networks), the encrypted call is passed through a
  **relay server**. Today Tinline uses the public relays run by number 0, Inc. (the makers of the
  open-source iroh networking library). A relay can see the IP addresses of the two devices, a
  per-install device identifier, and the timing and amount of encrypted traffic. It cannot
  decrypt call content, but this metadata can allow correlation of devices and connections.
  Direct connections also reveal network addresses to the other device; Tinline is not an
  anonymity service.
- To let your contacts find your device, Tinline publishes your device identifier with its current
  relay address and network addresses to a discovery service, also run by number 0, Inc. This
  record contains no name, phone number or contact list.

## Messages and attachments

- Text messages, replies, edits, files, photos and voice messages are shared with the contact
  you choose over authenticated, encrypted peer connections. We do not hold a server-side copy.
- Chat record values are encrypted locally using a key derived from the vault key. Database
  paths and structural metadata are not hidden. Stored attachment blobs are encrypted with
  separate random keys; those keys are kept in encrypted chat records.
- Messages wait locally when a contact is offline and synchronize when both devices are
  online together. A delivered indicator means the other device acknowledged the message,
  not that the person read it.
- Showing, playing, recording, saving or sharing media can create unencrypted local copies
  in app-private caches or in a destination you select. Files exported to Downloads, a photo
  library or another app are outside the encrypted blob store. Operating-system permissions
  and device encryption protect local caches; vault encryption does not protect every copy.
- Notifications can show a sender and message preview depending on your notification and
  lock-screen settings. Recipients can retain or copy content you share.

## Permissions

- **Microphone:** to send your voice during a call and record a voice message you initiate.
- **Camera:** to scan a contact's QR code or take a photo attachment you choose to send.
- **Files and photos you select:** to attach them to a conversation or save received files.
- **Notifications and full-screen notifications:** for incoming messages and calls; incoming
  calls can ring over the lock screen.
- **Run in the background, start at boot, ignore battery optimisation:** so the app can keep
  its connection open and receive calls and messages when it is not on screen.

## What we do not do

- No account registration, phone number or email is required.
- No ads, analytics, crash reporting or tracking SDKs.
- We do not sell your app data. Your device shares contact information with people you add
  and network metadata with infrastructure providers as described above.

## Children

Tinline is not directed at children under 13.

## Deleting your data

Uninstalling removes Android's private app data. On desktop, removing the program may leave
its data directory and keyring entry; remove those separately to delete local data. Removing
a contact deletes that conversation locally and blocks subsequent communication from that
identity. Edits or deletions synchronize when devices reconnect, but cannot guarantee that a
recipient has erased copies. Exported files and information already held by another device
are not erased by uninstalling. Because we
hold no app-data copy, there is nothing for us to delete on our side. If you keep your recovery
phrase, you can restore your identity later.

## Changes

We will update this page when Tinline changes how it handles data and change the date above.

## This website

This website has no analytics scripts, advertising or tracking cookies. Its hosting provider,
Netlify, may process technical request information such as IP addresses and server logs to
serve and secure the site. If you email us, we receive the information you include and use it
to respond. Third-party sites linked from this page have their own privacy practices.

## Contact

Osvauld — osvauld@gmail.com — https://tinline.osvauld.com
