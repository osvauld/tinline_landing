---
title: Android and Linux
description: "The shipped Android and Linux applications, background reachability, platform key storage and media integration."
order: 9
---

# Android and Linux

Both applications use the same Rust core for protocol, identity, storage, chat, groups, receipts
and calls. Platform code owns rendering, lifecycle, notifications, key storage and audio/video
hardware integration.

## Android

The Android app is Kotlin and Jetpack Compose over UniFFI, with one hand-written JNI path for
video frames. It supports Android 9 (API 28) and later, targets API 36 and builds `arm64-v8a` and
`x86_64` APKs.

### Background reachability

`CoreService` is a foreground service that keeps the selected account's endpoint online. It starts
with the app, after boot and after updates, and requests restart when killed. Network changes are
reported to the core so endpoints can rebind. Wake/Wi-Fi locks are held for active calls rather
than continuously.

Because the service continues while the screen or OS keyguard is locked, “locked device” does not
mean “offline account.” Other accounts stored on the phone remain locked and do not ring until
selected.

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
no-passphrase account is not committed until this save-and-readback succeeds.

`allowBackup` is disabled. Android Keystore is not guaranteed to be hardware-backed on every
device. A rooted or already-unlocked device remains inside the threat boundary.

## Linux desktop

The desktop app is Rust/Iced and links the core directly. It uses cpal for audio with WebRTC echo
cancellation/noise processing, and lives in the system tray to remain reachable when its window
is closed. `--data DIR` creates a separate profile.

Remembering an account key is optional and depends on a secure OS keyring. If none is available,
the app requires a passphrase rather than writing a plaintext unlock key. Existing installations
with a legacy unlock file retain a migration path and are encouraged to add a passphrase.

The release workflow produces Linux x86-64 tarball, Debian package and AppImage candidates. It
does not produce or support Windows or macOS packages.

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
