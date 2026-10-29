---
title: Android and Linux
description: "The two Android editions and the Linux application: wake-ups and background reachability, several accounts on one device, platform key storage and media integration."
order: 9
---

# Android and Linux

Both applications use the same Rust core for protocol, identity, storage, chat, groups, receipts
and calls. Platform code owns rendering, lifecycle, notifications, key storage and audio/video
hardware integration.

## Android

The Android app is Kotlin and Jetpack Compose over UniFFI, with one hand-written JNI path for
video frames. It supports Android 9 (API 28) and later and targets API 36. Release APKs contain
`arm64-v8a` and `x86_64`; a local build defaults to `arm64-v8a` unless `-Pabis` asks for more.

### Two editions

| | Tinline (Play) | Tinline Liberum |
|---|---|---|
| Where | Google Play, GitHub Releases and this site | GitHub Releases and this site |
| Google code | Firebase Messaging only; no analytics, auto-init off | None; a release check fails if any Google class is present |
| Reachability | Rests until woken by a content-free push; “Stay connected all the time” keeps the always-on service instead | Always-on foreground service |
| Several accounts | Remembered accounts that are not open are woken for messages and calls | Only the open account is connected; the others catch up when selected |

Both editions share one Rust core and one signing key, and an update installs over the same
edition. The Liberum edition's UnifiedPush path is designed, not built.

### Background reachability

In always-on mode (Liberum, or Play with “Stay connected all the time”), `CoreService` is a
foreground service that keeps the open account's endpoint online. It starts with the app, after
boot and after updates, and requests restart when killed. Network changes are reported to the
core so endpoints can rebind. Wake/Wi-Fi locks are held for active calls rather than continuously.

In push mode, the Play default, no connection is kept open between exchanges. A wake push starts
the account's endpoint in the background, the exchange completes and the endpoint closes again
when quiet. If the phone cannot obtain a push token from Google, the app
carries on without wake-ups. Push is best effort: a message still needs the sender's device to be
running when the phone wakes, and group posts and group calls send no wake-ups yet.

Because the service continues while the screen or OS keyguard is locked, “locked device” does not
mean “offline account.” Explicitly locking Tinline closes every account; a wake cannot reopen one
until the app is unlocked.

### Several accounts on one phone

Every account with a remembered key is reachable on the Play edition. A message or call to an
account that is not open wakes the phone, opens that account in a background slot and posts a
notification naming the account; the account switcher shows an unread dot. Answering a call on
another account switches the app to it. There is one 1:1 call at a time across all accounts: a
call to another account during a call gets busy. A passphrase-only account with no remembered key
stays asleep until unlocked.

### Calls and notifications

Incoming calls use high-priority call notifications, full-screen intent where permitted, Answer,
Video and Decline actions as appropriate, ringtone and vibration. Video calls are registered with
Telecom's video call type; answering with Video enables the local camera while ordinary Answer does
not. Chat and contact requests use their own notification paths, and the Contacts tab shows how
many requests await an answer.

Android Telecom supplies system call routing and controls; video uses CameraX/MediaCodec paths
where available. Microphone permission is requested when a call needs it, including Android's
“Ask every time” flow, rather than being treated as a permanent background-readiness requirement.

### Remembered account keys

Each account's vault data key can be wrapped by Android Keystore and stored in an account-specific
blob. Startup reads and decrypts that blob before considering the account unlocked. A new
no-passphrase account is not committed until this save-and-readback succeeds. Background accounts
depend on this remembered key.

`allowBackup` is disabled. Android Keystore is not guaranteed to be hardware-backed on every
device. A rooted or already-unlocked device remains inside the threat boundary.

## Linux desktop

The desktop app is Rust/Iced and links the core directly. It uses cpal for audio with WebRTC echo
cancellation/noise processing, and lives in the system tray to remain reachable when its window
is closed. `--data DIR` creates a separate profile. Every account with a remembered key keeps its
endpoint connected while the app runs, so all of them receive messages and calls without being
selected; there are no wake-ups on desktop.

Remembering an account key is optional and depends on a secure OS keyring. If none is available,
the app requires a passphrase rather than writing a plaintext unlock key. Existing installations
with a legacy unlock file retain a migration path and are encouraged to add a passphrase.

The release workflow produces Linux x86-64 tarball, Debian package and AppImage candidates. It
does not produce or support Windows or macOS packages.

## iOS

A SwiftUI app over the same core exists in the repository and builds for the simulator. Push
(APNs and PushKit), CallKit and Keychain integration are not finished, and there is no iOS release.

## Linking and device UI

Both shipped apps expose account switching, linking and linked-device management. Approval asks
for the passphrase only when one is set. Device labels synchronize only within the account.
Desktop can show and accept pasted contact/link codes; camera QR scanning is not implemented
there.

## Validation limits

Automated Rust, Android/JVM and end-to-end harnesses cover core and platform paths, but they are
not substitutes for the diversity of physical phones, Bluetooth stacks, cameras, keyrings,
battery policies and Linux distributions. Published performance or device observations apply only
to the recorded setup.
