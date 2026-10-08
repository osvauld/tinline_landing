# Tinline privacy policy

_Last updated: 8 October 2026_

Tinline is a calling app made by Osvauld ("we"). It connects your device directly to the device of
the person you call. This policy explains what that means for your data. We do not receive a copy of your contacts or call content, and the app contains no ads,
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

## Permissions

- **Microphone:** to send your voice during a call.
- **Camera:** to scan a contact's QR code. Images are not saved or sent.
- **Notifications and full-screen notifications:** to ring when someone calls, including on the
  lock screen.
- **Run in the background, start at boot, ignore battery optimisation:** so the app can keep its
  connection open and receive calls when it is not on screen, like a phone line.

## What we do not do

- No account registration, phone number or email is required.
- No ads, analytics, crash reporting or tracking SDKs.
- We do not sell your app data. Your device shares contact information with people you add
  and network metadata with infrastructure providers as described above.

## Children

Tinline is not directed at children under 13.

## Deleting your data

Uninstalling removes Android's private app data. On desktop, removing the program may leave
its data directory and keyring entry; remove those separately to delete local data. Copies you
made or information already held by another device are not erased by uninstalling. Because we
hold no app-data copy, there is nothing for us to delete on our side. If you keep your recovery
phrase, you can restore your identity later.

## Changes

We will update this page when Tinline changes what it does, for example when chat is added, and
change the date above.

## This website

This website has no analytics scripts, advertising or tracking cookies. Its hosting provider,
Netlify, may process technical request information such as IP addresses and server logs to
serve and secure the site. If you email us, we receive the information you include and use it
to respond. Third-party sites linked from this page have their own privacy practices.

## Contact

Osvauld — osvauld@gmail.com — https://tinline.osvauld.com
