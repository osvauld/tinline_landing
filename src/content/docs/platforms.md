---
title: Android and desktop
description: "How the Android and desktop apps stay reachable, remember keys per account, switch accounts and handle audio."
order: 7
---

# Android and desktop

Both apps are thin shells over the same Rust core. The core owns identity, accounts, contacts,
the iroh endpoint, the call, chat and sync protocols and the codec. Each app owns its UI, its
audio devices, the platform key store and staying alive.

## Android

Native Kotlin and Jetpack Compose (Material 3) over `p2pcore`, through UniFFI bindings built
with cargo-ndk. Release APKs ship `arm64-v8a` and `x86_64`; the minimum is Android 9 (API 28).

### Staying reachable

A phone can only ring if its endpoint is up. `CoreService` is a foreground service that:

- starts when the app opens, on boot and after an app update, and is restarted by the system if
  killed (`START_STICKY`; on an emulator it came back in about one second after `kill -9`);
- runs as `specialUse` ("peer-to-peer call listener") with a quiet "Ready for calls"
  notification, switching to `specialUse|microphone` during a call;
- tells the core about network changes so the endpoint re-binds;
- holds a partial wake lock and a low-latency Wi-Fi lock **only during a call**.

It keeps the **selected account** online. Other accounts on the phone show as "Locked · not
ringing here" in the account sheet.

First run asks for notifications, the microphone, an exemption from battery optimisation (so
doze does not stop it) and, on Android 14+, full-screen intents.

### Incoming calls and messages

An incoming call posts a high-importance `CATEGORY_CALL` notification with a full-screen intent,
Answer and Decline actions (`CallStyle` on Android 12+), ringtone and vibration. The incoming
call screen shows over the lock screen and turns the screen on. When another of your devices
answers or declines, the ringing stops and no missed call is recorded. Chat messages arrive
through the same service as `MessagingStyle` notifications.

### Remembered keys and accounts

- Each account's data key is wrapped by one AES-256-GCM key in Android Keystore (alias
  `p2p_unlock_v1`, no user-authentication requirement) and stored as its own blob,
  `filesDir/unlock/<did>.bin`. A save is read back and decrypted before it counts as done.
- On every process start, including boot, the service unlocks the selected account with its
  blob. A blob that fails for good is deleted, the node stays locked, and an "Unlock to receive
  calls" notification opens the app.
- A new no-passphrase account is committed to disk only after its key is saved; if that fails,
  onboarding shows "Couldn't save your account" with Retry and "Add a passphrase instead".
- Settings › account › Switch lists the accounts. Switching is refused during a call ("Finish
  your call first"). "Forgot passphrase" restores the current account in place from its 24 words
  after checking the phrase belongs to it.
- Onboarding asks you to name the device (Personal phone, Work phone, Tablet); the label is shown
  only to your own devices.
- Linking: "Link a device" shows or scans a link QR; a fresh install can choose "Link to an
  existing account" during onboarding. Settings › Devices lists linked devices with rename and
  unlink.

`allowBackup` is off. The Keystore wrapping key is not guaranteed to be hardware-backed on every
device.

## Desktop

A Rust app built with iced, sharing the core directly. Linux x86_64 is built and packaged as a
tarball and a Debian package; Windows builds are not verified.

- **Audio:** cpal capture and playback, with WebRTC audio processing (echo cancellation, noise
  suppression, high-pass filter) on 10 ms frames.
- **Tray:** the app lives in the system tray so it can keep receiving calls with the window
  closed. `--data DIR` runs a separate profile.
- **Remembered keys:** without a passphrase, each account's data key goes into the OS keyring
  (Secret Service, Keychain, Credential Manager) as its own entry. **If no secure keyring is
  available, a passphrase is required**; nothing is written in plaintext. Installs from before
  this rule that still use an old `unlock.key` file keep working, and Settings recommends adding
  a passphrase, which deletes the file.
- **Accounts and linking:** an account switcher, "Link this computer" and "Link a device"
  screens, a linked-devices list with unlink, and an "unlinked" screen when another device
  removes this one.
- QR scanning is not implemented on desktop: it shows link and contact QRs, and takes pasted
  codes.

## Known gaps

- Linking has been tested app ↔ headless peer on both platforms, not yet desktop app ↔ Android
  app, and not on physical phones.
- A real Keystore or keyring failure has not been exercised on a device.
- Bluetooth routing and real phone microphone and speaker content still need verification on
  physical devices.
