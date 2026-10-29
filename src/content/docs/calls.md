---
title: Calls and media
description: "Capability-gated 1:1 audio/video, multi-device ringing, hosted group audio and media security limits."
order: 8
---

# Calls and media

## Admission and multi-device ringing

A direct call requires a current call token issued by the callee to the caller's DID. The incoming
connection must also present a valid account attestation for the QUIC-authenticated endpoint, and
the DID must still be an accepted contact with calls allowed.

The caller uses one call ID and dials every endpoint in the contact's signed device list. The first
accepted leg becomes the call and the others are cancelled as answered elsewhere. A decline from
one device ends the attempt globally; busy, refusal and connection failure remove only that leg.
A `Cancel` is honored only on the connection belonging to that call.

Per-device dialing is bounded to 30 seconds, the overall dial phase to 45 seconds and ordinary
ringing to 60 seconds. Simultaneous outgoing calls use a deterministic endpoint-key tie-break so
one survives.

## Waking a sleeping phone

If a callee device has given the caller a wake token and does not answer the dial within about
2 s, the caller's device asks the wake service for a content-free call push and keeps redialling
about once a second; the caller's screen says “Waking their phone…”. The woken phone rings from
the hint while its endpoint starts and, since 0.2.5, dials the caller back with a signed
`CallReady`; the caller's leg answers with its `CallHello` on whichever connection comes first,
and the call then runs as if the caller had dialled. A dial-back from a device the caller does
not hold for that contact is refused. The dial-back reaches the caller before anyone answers, so
a contact with a call grant learns that the phone is online. If no `CallHello` arrives within
15 s of the ring, the ring ends; answering before the connection exists shows “Connecting…” until
it does. Call wakes are sent at most every 10 s per device. Group calls send no wake-ups yet.

## Direct audio

Audio is 48 kHz mono Opus in 20 ms QUIC datagrams. The encoder uses VBR, in-band FEC and DRED; the
receiver uses an adaptive jitter buffer, reconstruction and concealment. Media does not wait on an
application task queue: platform audio threads push and pull through the core.

After 1.5 seconds without media the UI reports reconnecting; after 30 seconds the call ends as a
lost connection. Call waiting supports one waiting call beside an active call; further calls are
busy.

## Direct video

One-to-one calls negotiate each direction separately:

- AV1 uses libaom encoding and rav1d decoding;
- VP8 is preferred when it enables hardware acceleration on Android;
- Linux currently uses software codecs and sends VP8 only where negotiation makes it useful.

Video uses one QUIC unidirectional stream per group of pictures so obsolete frames can be
abandoned rather than building an ever-later queue. Delay-based adaptation selects resolution
from 320×180 through 1280×720 and 15/24/30 fps using receiver display/decode/thermal hints,
encoder cost and measured network behavior. The overall send cap is 3 Mbps.

A call placed with the video action turns the caller's camera on while ringing so capture can warm
before negotiation completes. On an incoming video call, **Video** answers with the callee's camera
on; plain **Answer** keeps it off. If video cannot be negotiated, the early camera is turned off and
the call continues as audio.

Current default Android and desktop builds include **Stats for nerds** in About this call. The
fixed-height readout reports each direction's codec/library, hardware status, actual size/frame
rate, payload, encode/decode timing, active limit and direct-LAN/direct-internet/relay path class
without displaying the peer's address. Live controls can pin size, frame rate and bitrate for this
call, choose available encoders/decoders and—when both offers support it—switch VP8 and AV1 at a
new keyframe. Overrides are not saved; “ignore limits” can stutter or heat a device and still may
not exceed the peer's offer.

Group video is not implemented.

## Group audio

A group call is a star around one permitted member device acting as call host, with up to 12
participants. Participants send Opus packets and audio levels; the host forwards selected packets
without decoding them, and clients decode/mix locally. The host's own local participant still
decodes what that participant hears.

The start, join and roster control statements are signed. A participant verifies that roster
entries include original member joins for this call generation. The starter ranks permitted hosts
and names backups; clients move to a backup generation after missed host heartbeats.

A moto g52 benchmark measured 11–22 ms of added median forwarding latency under the tested group
loads. This is a device/lab result, not a universal latency or battery guarantee.

## Encryption and trust boundary

Direct media is encrypted by the peer-authenticated QUIC/TLS connection, including through an
iroh relay. There is no separate application media ratchet.

Group media is hop-by-hop through the host. Network relays cannot read it, but the group-call host
receives every participant's encrypted-to-host stream and is trusted for confidentiality and
availability. It can record or selectively forward media.

Any participant can record a call outside Tinline. A cooperative in-app recording notice has been
designed but is not shipped, and no software notice can detect another recorder.

## Platform integration

Android uses the platform communication audio path and Telecom integration for system call,
Bluetooth, car and watch controls. Linux uses cpal plus WebRTC echo cancellation, noise
suppression and high-pass filtering. Physical device/routing behavior depends on OS and hardware.
