---
title: Build and test
description: "Building Tinline 0.1.38, running targeted Rust and end-to-end tests, and producing Android and Linux release candidates."
order: 11
---

# Build and test

The app source is [github.com/osvauld/tinline](https://github.com/osvauld/tinline), licensed
GPL-3.0-or-later. Version 0.1.38 at app commit `dc0fb7c3` is the implementation snapshot described
by these pages; it is newer than the currently published public release.

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

Android builds need the SDK, NDK and cargo-ndk. The repository helper builds the pinned native
video dependency and delegates to Gradle:

```sh
python3 scripts/build_android.py --install --abis x86_64  # emulator
python3 scripts/build_android.py --install                # x86_64 + arm64-v8a
```

Installation changes a device and should only be done on an explicitly selected test device. The
release workflow uses an owner-controlled signing keystore; local debug signing is not a release
artifact.

## Rust tests

CI runs the locked workspace suite. During development, prefer the smallest package and named test
target that covers a change rather than compiling every integration binary:

```sh
cargo test --locked -j 2 -p proto --lib
cargo test --locked -j 2 -p p2pcore --test private_rotation
cargo test --locked -j 2 -p p2pcore --test message_receipts
cargo test --locked -j 2 -p p2pcore --test group_g3
```

At the 0.1.38 snapshot, the three named core integration targets pass together (17 tests). The
`video_call` library filter also passes (56 tests), covering codec controls, statistics, path
classification and adaptation policy. These targeted runs do not replace the full workspace,
platform or device suites.

Integration tests create real local nodes and some use public iroh infrastructure, so distinguish
deterministic offline failures from network-dependent validation.

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

- a Linux x86-64 tarball;
- a Debian package;
- an AppImage;
- a signed universal Android APK for `arm64-v8a` and `x86_64`;
- checksums and package inspection output.

A tag creates a **draft** GitHub release. Publishing and repository upload are separate authorized
steps. Windows and macOS artifacts are not produced or supported.

## Security interpretation

A successful build or test run is not an independent security audit. Release readiness also
requires dependency/licence review, signing verification, package inspection, protocol-focused
review and device/network validation appropriate to the artifact being published.
