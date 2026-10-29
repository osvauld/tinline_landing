---
title: Build and test
description: "Building Tinline 0.2.5, running targeted Rust tests, and producing the Android editions and Linux release candidates."
order: 11
---

# Build and test

The app source is [github.com/osvauld/tinline](https://github.com/osvauld/tinline), licensed
GPL-3.0-or-later. Version 0.2.5 at app commit `656ebf84` is the implementation snapshot described
by these pages; the release notes say what a given download contains.

## Desktop and peer tools

A recent stable Rust toolchain plus Linux audio/windowing build dependencies is required.

```sh
cargo build --locked --release -p desktop -p peer
./target/release/p2p-desktop
```

`--data DIR` starts the desktop app with a separate profile. Test hooks are for controlled test
builds only and must not ship:

```sh
cargo build --locked --release -p desktop --features test-hooks
```

## Android

Android builds need the SDK, the NDK, `cargo-ndk`, the Android Rust targets and a prebuilt static
libaom per ABI. Build libaom once, then let Gradle build the core and package an edition:

```sh
rustup target add aarch64-linux-android x86_64-linux-android
python3 scripts/build_libaom.py --target aarch64-linux-android   # once per ABI; x86_64-linux-android for emulators
./android/gradlew -p android :app:assembleLiberumDebug           # no Google code; arm64-v8a by default
./android/gradlew -p android :app:assemblePlayDebug -Pabis=x86_64,arm64-v8a
```

Gradle expects libaom under `~/build-cache/p2p_chat/libaom` or `-PaomRoot=DIR`. The Play flavour
takes its Firebase settings from the environment; without them it builds, but wake-ups are off.
Installation changes a device and should only be done on an explicitly selected test device.
Release signing uses an owner-controlled keystore on CI; local debug signing is not a release
artifact.

## Rust tests

CI runs the locked workspace suite under the `fasttest` profile:

```sh
cargo test --workspace --profile fasttest --locked --no-fail-fast --features p2pcore/dev-tools
```

During development, prefer the smallest package and named test target that covers a change. The
core's integration tests are one binary, `it`, with a module per area, so name the binary and
filter by module:

```sh
cargo test --locked -p proto --lib
cargo test --locked -p p2pcore --test it private_rotation
cargo test --locked -p p2pcore --test it message_receipts
cargo test --locked -p p2pcore --test it group_g3
cargo test --locked -p video --lib
```

A bare filter without `--lib` or `--test` builds every test binary of the package. Integration
tests create real local nodes and some use public iroh infrastructure, so distinguish deterministic
offline failures from network-dependent validation. The wake relay's logic is tested in
`crates/wake-relay-core`; the Worker itself lives in `crates/wake-relay-worker` as a separate
Cargo project deployed with `wrangler`.

## End-to-end tools

The repository includes focused Python harnesses for, among other paths:

- direct and relay-only desktop calls;
- desktop/app audio paths and speech comparison;
- chat, attachment and offline catch-up;
- device linking and desktop↔phone synchronization;
- Android calls, presence and video;
- call waiting, group calls and capacity/latency experiments.

Read each script's header before use: several need prebuilt binaries, test hooks, emulators,
physical devices or network access. Model and simulation scripts demonstrate stated properties of
their model; they do not prove production integration.

## Release candidates

The release workflow validates a stable `X.Y.Z` tag and builds:

- a Linux x86-64 tarball, Debian package and AppImage, on Ubuntu 24.04;
- a signed Liberum APK, checked to contain no Google code;
- a signed Play APK and a Play app bundle, with the Firebase settings from CI secrets;
- checksums, signature verification and package inspection output.

Both APKs carry `arm64-v8a` and `x86_64` and are signed with the same key. A tag creates a
**draft** GitHub release. Publishing and repository upload are separate authorized steps. Windows
and macOS artifacts are not produced or supported.

## Security interpretation

A successful build or test run is not an independent security audit. Release readiness also
requires dependency/licence review, signing verification, package inspection, protocol-focused
review and device/network validation appropriate to the artifact being published.
