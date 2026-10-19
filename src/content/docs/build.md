---
title: Build and test
description: "Building Tinline from source, the Rust and end-to-end test suites, and how releases are packaged."
order: 9
---

# Build and test

The source is at [github.com/osvauld/tinline](https://github.com/osvauld/tinline), licensed
GPL-3.0-or-later. The workspace needs a recent Rust toolchain; Android builds also need the
Android SDK and NDK (cargo-ndk is driven by the build script). Scripts are Python 3.

## Build

```sh
cargo build --release -p desktop -p peer           # desktop app + headless test peer
./target/release/p2p-desktop                       # tray app; --data DIR for a separate profile
python3 scripts/build_android.py --install --abis x86_64   # emulator build
python3 scripts/build_android.py --install                 # adds arm64 for phones
```

End-to-end tests use a desktop build with test hooks. Never ship it:

```sh
cargo build --release -p desktop --features test-hooks
```

## Rust tests

`cargo test --workspace` runs 247 tests, and CI runs them on every push and pull request. The
integration tests in `crates/core/tests/` start real nodes and use n0's public relays.

| suite | tests | covers |
|---|---|---|
| `proto` | 46 | Every handshake check with a negative test: tickets, grants, bindings, device lists, link QR and proofs, frames |
| `identity`, `cryptography` | 35 | Mnemonic → DID, signing, AEAD, ECIES, HKDF and Argon2id |
| `core` unit | 45 | Sealed stores, re-keying, chat batch validation and signatures, blob encryption and gating, the hardened voice-message parser |
| `core/tests/fanout.rs` | 13 | Ringing all devices, first answer wins, simultaneous answers, global decline, cancel |
| `core/tests/link*.rs` | 20 | Linking, expiry, own-device sync of contacts, history and chats, read state, unlink |
| `core/tests/calls.rs` | 11 | Glare, cancel, decline, call waiting, unavailable, history |
| `core/tests/accounts.rs`, `restore.rs`, `vault.rs` | 25 | Account switching and isolation, migration, commit after key save, restore in place |
| `core/tests/tickets.rs`, `devices.rs` | 5 | Dead tickets, removed contacts, unfamiliar devices reset "verified" |
| `audio` | 11 | Codec and jitter buffer under loss, bursts, clock drift, peer restart, DRED |
| `desktop` | 32 | Per-account keyring, onboarding flow, media safety, migration |
| `storage` | 4 | Sealed records, wrong keys, moved records |

## End-to-end scripts

| command | what it proves |
|---|---|
| `scripts/e2e_desktop.py` | Two peers add each other and call both ways, direct **and** relay-only |
| `scripts/desktop_e2e.py tone\|mic` | Desktop app against a peer; `mic` uses the real capture path |
| `scripts/e2e_callwait.py` | Call waiting: decline, end-and-answer, ignore |
| `scripts/e2e_chat.py` | Chat sync, a 50 MB attachment, a non-party refused, restart and offline catch-up |
| `scripts/e2e_link.py` | Linking a device; contacts and history arrive; calls ring both; unlink |
| `scripts/e2e_android.py --fresh` | Emulator app against a desktop peer, both directions |
| `scripts/e2e_android_link.py` | The Android app as existing and as new device in a link |
| `scripts/audio_compare.py` | Speech in vs speech out: delay and envelope correlation |

Also checked by hand on an emulator: screen off, forced doze, `kill -9` of the service, and a
reboot followed by an incoming call ringing over the lock screen.

## Releases

CI builds a signed universal Android APK (arm64-v8a and x86_64), a Linux x86_64 tarball and a
Debian package. A tagged build creates a draft GitHub release; publishing it uploads the files
and a signed APT repository to `repo.osvauld.com`, with a `SHA256SUMS` file per release.

```sh
sudo curl -fsSLo /usr/share/keyrings/tinline.gpg https://repo.osvauld.com/tinline.gpg
echo "deb [signed-by=/usr/share/keyrings/tinline.gpg] https://repo.osvauld.com/apt stable main" \
  | sudo tee /etc/apt/sources.list.d/tinline.list
sudo apt update && sudo apt install tinline
```

These commands work once the first release is published. APT handles desktop updates; a
directly installed APK does not update itself.

## Contributing and reporting

Issues and pull requests are welcome on GitHub. Report security problems privately, as described
on the [Security](/security) page, not in a public issue.
