---
title: Calls
description: "Ringing every device of a contact, the Opus audio pipeline, the jitter buffer, call waiting and end reasons."
order: 4
---

# Calls

## Ringing every device

A call has one `call_id` and one coordinator: the caller. It dials **every device** in the
contact's device list at once on ALPN `osvauld/p2p/0`, using each device's relay hint and iroh's
DNS discovery. Each connection is a separate *leg* that runs the normal handshake:

1. The caller sends `CallHello { call_id, attestation, grant, devices }`, presenting the grant the
   contact issued and its own current device list.
2. The callee accepts only if the attestation is valid and names the connected device, the grant
   was issued by the callee to the attested DID, is unexpired and not revoked, and the DID is
   still a contact.
3. The callee answers `Ringing`, then `Accept { renewed_grant, devices }`, `Decline` or `Busy`.

How the legs resolve:

| event | result |
|---|---|
| First `Accept` | That leg becomes the call; media flows on it only. Every other leg gets `Cancel{answered_elsewhere}` and is closed. A second `Accept` racing in gets the same `Cancel`, so exactly one device ends up active. |
| `Decline` from any device | The call ends `declined`; the other legs get `Cancel{declined_elsewhere}`. |
| `Busy`, `Reject` or a dead connection | Only that device drops out. With none left the call ends `no_answer`, `busy` or `unreachable`. |
| Caller hangs up while ringing | Every leg gets `Cancel{caller_hangup}` (an old peer that predates device lists gets `Hangup`). |

Limits: 30 s per dial, 45 s overall, 60 s of ringing. A `Cancel` is honoured only from the
connection of that call. Control messages are framed as a 32-bit big-endian length plus JSON, at
most 64 KiB; an oversized length is rejected from the header alone.

When two people call each other at the same moment, the call from the lower device key wins,
decided per device pair; the other call ends `superseded` and is not logged.

## Audio pipeline

Voice travels as **QUIC datagrams** on the answering leg, one 20 ms frame per datagram:

```text
[seq: u32 BE][level: u8][Opus payload]       48 kHz mono, 960 samples per frame
```

`level` is the RFC 6464 audio level in −dBov. The encoder (`crates/audio`) is Opus 1.6:

| setting | value |
|---|---|
| bitrate | 48 kbps VBR, `OPUS_SIGNAL_VOICE`, complexity 6 |
| in-band FEC | on, tuned for 30% expected loss |
| DRED | 300 ms of deep redundancy per packet |
| DTX | off |
| decoder | complexity 5: deep packet-loss concealment on, OSCE enhancement off |

OSCE is off because it is tuned for 6–12 kbps speech and reshaped other signals at 48 kbps.

The app's audio threads call the core directly: the mic thread encodes and sends each frame
itself, and the speaker thread pulls from the jitter buffer, so a frame never waits for a task to
be scheduled.

### Jitter buffer

The receiver keeps a 64-frame ring (1.28 s) and plays out every 20 ms.

- The target delay adapts between **40 and 200 ms**, starting at 60 ms.
- Above target + 40 ms it compresses with a cross-faded frame skip; above target + 120 ms it
  discards without decoding.
- A missing frame is rebuilt from the next packet's FEC or DRED when possible, otherwise by
  PLC. After 5 concealed frames in a row it plays silence.
- A packet 50 frames ahead, or 8 late packets in a row, triggers a resync.

On the desktop test path, speech sent over iroh arrived with 66 ms delay and an envelope
correlation of 0.97 with the original.

### Platform audio

| | capture and playback |
|---|---|
| Android | `AudioRecord` with `VOICE_COMMUNICATION` and the platform echo canceller, noise suppressor and gain control; `AudioTrack` in low-latency voice mode. Earpiece by default; speaker and available communication devices selectable. |
| Desktop | cpal, with WebRTC audio processing: full echo cancellation, noise suppression, high-pass filter. |

## During a call

- After 1.5 s without media the call reports **reconnecting**. After 30 s without media it ends
  with `connection_lost`.
- There is no hold. A second incoming call waits beside the active one with a banner and a quiet
  tone. The callee can decline it (the caller hears `busy`), or end the current call and answer.
  Ignored, it ends after 30 s as a missed call. A third call gets `Busy` at once.
- While "not now" is set, calls are refused the same way as any other refusal; the caller sees
  `unreachable` and cannot tell away from offline or blocked.

## End reasons

Every ended call carries exactly one reason token:

| reason | meaning |
|---|---|
| `hangup_local` / `hangup_remote` | An active call ended by us / by them |
| `declined` | Caller's view: one of the callee's devices declined |
| `declined_local` | Callee's view: we declined (not a missed call) |
| `answered_elsewhere` | Callee's view: another of our devices took the call (not missed) |
| `declined_elsewhere` | Callee's view: another of our devices declined (not missed) |
| `cancelled` | The caller gave up before an answer (missed, on the callee) |
| `no_answer` | Rang 60 s (30 s for a waiting call) without an answer |
| `unreachable` | Could not connect, or refused: offline, blocked or unavailable |
| `connection_lost` | No media for 30 s |
| `busy` | Every device reached was in another call or already had two |
| `unavailable` | Callee history only: turned away while unavailable |
| `superseded` | Our outgoing call yielded to their simultaneous call; not logged |

Call history keeps the newest 500 calls, sealed in `account.redb` and synced between your own
devices: one record per call, with an answered record winning over an "elsewhere" one.

## Encryption

Media rides the peer-authenticated QUIC connection (TLS 1.3 under iroh), including when it
passes through a relay; a relay sees only ciphertext. There is no separate application-level
media cipher or ratchet.
