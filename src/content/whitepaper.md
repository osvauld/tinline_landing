# Tinline Whitepaper (draft)

19 Oct 2026 · @osvauld

## Abstract

Tinline is a messenger and call app with no server: every message carries a proof of who wrote it, and every delivery can carry a proof of who received it. Devices talk directly over QUIC (iroh), with public relays only as a fallback path that sees ciphertext and addresses, never content. An account is a stable identifier derived from a root secret; each installed device holds its own replaceable key, so a lost phone is replaced without changing who you are. Conversations are per-day CRDT documents in which each message is signed by the author's account key, and group history is a host-replicated log of signed records from which membership and roles are derived, so any member can verify the group's history without trusting the host. The core is one Rust library shared by the Android and desktop apps, published as open source under GPL-3.0-or-later, with no tracking or analytics of any kind.

## 1. Problem and goals

Tinline exists so that people can message, call and keep a shared history with no operator between them, and still be able to show who said what and who received it.

A messenger with a server offers two things a peer-to-peer design has to earn: delivery while the other side is offline, and a trusted party that vouches for identity and delivery. Tinline gives up the first for 1:1 chat, because an always-on service on the phone makes "both online" the common case, and replaces the second with signatures: the account key signs content and the recipient key signs receipts, so no vouching party is needed.

The goals, in order:

1. **Author proof on every message.** Every version of every message carries the author's signature inside the replicated document, verified on every path it travels.
2. **Recipient proof on delivery.** A recipient's device can sign that it holds or has read an exact message version, and that statement is verifiable offline by anyone with the recipient's DID.
3. **Stable identity, replaceable devices.** The identifier never changes; a lost phone is replaced from the root secret without telling anyone.
4. **No operator.** No server we run is needed for any feature; public relays carry only ciphertext.
5. **Works on a phone.** Group calls are forwarded without decoding so a phone can host; replication backs off on metered networks and low battery.
6. **No tracking.** No analytics, crash reporting or advertising; open source under GPL-3.0-or-later.

Two things are explicitly not promised: anonymity, since relays and peers see addresses and timing; and protection against a device that holds the root secret, since the root secret is the identity.

## 2. Threat model and non-goals

The design defends content integrity and authorship against everyone and confidentiality against outsiders and relays. It places some resource bounds on strangers but does not claim denial-of-service resistance; it also does not defend against a party that holds the root secret or hide who talks to whom.

**Malicious actor.** A malicious actor is anyone who speaks the protocol without following its rules. The protocol is open, so any party can run a modified client, and a device cannot tell a modified client from Tinline's own. The model therefore assumes that every party other than you and your own devices may be malicious: contacts, group members, group and call hosts, call participants, strangers, relays and network operators. A malicious actor holds its own keys legitimately, so everything it signs is valid; it can do anything its own keys and the data it has received allow, and nothing that needs another party's key. Three kinds are distinguished below: outsiders, with no relationship to you (strangers, relays, network observers), bounded by encryption and by your acceptance; insiders (contacts, group members, call participants), who see what is sent to them and are bounded only by signatures; and privileged insiders (group and call hosts, admins, the owner), who see or control more and are still bounded by signatures. A device that holds your root secret is not a malicious actor in this sense: it is you.

**The working rule.** Anything sent or said to another party can be kept indefinitely and shown to anyone; what was signed can be proved to be yours, and any call can be recorded. Features that depend on the other side's software, such as deleting, editing, blocking on their side, receipts and recording notices, are courtesies between unmodified clients and are marked *cooperative* where they appear. None of this is particular to Tinline: every messenger depends on the recipient's client for deletion, receipts and recording, and modified clients of widely used messengers already keep deleted messages and suppress read receipts. A messenger with a server can ban such clients from its service; Tinline has no server to do that, and in exchange no operator to trust.

| Adversary | Can | Cannot |
|---|---|---|
| Stranger who knows a device address | open connections, send signed notices, fill pending slots until bounds apply, and keep dialing that address | read anything, forge a message, become a contact without your acceptance |
| Blocked former contact | keep what it already holds, see that it was blocked, and keep dialing addresses it learned | authenticate for chat, calls or blobs; use tokens you issued |
| Removed group member | keep history it already holds; upload its own pre-removal posts, one batch per connection during each host's two-day acceptance window | be welcomed by a host, read anything newer, forge another member's post |
| Hostile group host | read, withhold or delay group posts and calls it relays; record group calls it hosts | forge a post, change membership, alter the record log |
| Hostile 1:1 contact | withhold messages, forge unsigned acks, send bad batches; keep and publish what it received, provably for what you signed; ignore deletes, edits and block notices on its side; withhold receipts or sign "read" for something unread; date its own messages anywhere in the allowed window | put words in your mouth, replay a message into another day or chat, sign for another party |
| Call participant | record audio and video without notice; keep voice messages | join a call without a grant or a signed join |
| Anyone making identities | choose any display name, including one you know; make new identities at no cost | become your contact without your acceptance |
| Relay or DNS operator | see endpoint ids, relay use, timing and sizes | read content, impersonate a device |
| Network observer on a direct path | see IP addresses and traffic shape | read content |
| Thief with an OS-locked device | observe whatever the platform exposes on the lock screen; the background service may remain online | open the app or sealed stores without passing the platform lock |
| Thief with an unlocked device | use the app as you, read stored data | reveal the root secret or change the passphrase when one is set |
| Device that holds the root secret | everything the owner can do, indefinitely | be revoked, until identity succession ships |

**Non-goals.** Anonymity and metadata privacy from relays. Deniability: signatures are the point. Protection from copying or recording by the people you talk to. Forward secrecy for stored data. Denial-of-service resistance beyond the stated bounds. Erasure guarantees for content a contact already holds. These are stated so that nobody relies on them.

## 3. Identity

An account is a 256-bit root secret. Its identifier, a DID, is derived from that secret and stays the same as installed devices come and go; each install holds its own random device key.

**Derivation.** The root secret can be exported as a BIP39 recovery phrase. The phrase's seed goes through HKDF-SHA256 with the context `osv/identity/signing/v1` to an Ed25519 key pair, and the DID is `did:key:z` followed by the base58 encoding of the Ed25519 multicodec prefix and public key. A DID is therefore self-authenticating: anyone can extract the key from it, and there is no registry or resolver to consult. Signatures use strict Ed25519 verification, which rejects malleable encodings. The same root secret gives the same DID on any device. A one-line recovery key (`tlkey-…`) encodes the same entropy with a checksum as an alternative export format.

**Devices.** Every install generates 32 random bytes as its current device key. That key is the private QUIC endpoint identity, so possessing it is proven by the transport handshake on every connection. The account key signs an attestation, "this device is mine", which the device presents when it connects. The core can rotate the key without changing the install id; the old key signs a succession link to the new one. This policy is disabled by default in 0.1.38. A contact's app keeps a signed list of your current devices (up to 8) and dials all of them when calling you. Content is never signed by a device key: a device key authenticates a connection or a transport batch, and the account key signs what you say.

**Verified-DID policy.** A peer is admitted only when its attestation verifies under the DID it claims, the attested device equals the device the QUIC handshake proved, that DID is a contact, and it presents a capability you issued to that DID. Version 0.1.38 removed the apps' safety-number comparison, Verify action and “Verified” badge. For a high-stakes identity check, compare the DID through a separate trusted channel.

**Linking a device.** Linking transfers the root secret to the new device. The existing device shows a QR with a 16-byte secret valid for 300 s; the new device dials it over the link protocol; both derive a key from the secret bound to both device keys and prove it to each other; a six-digit code shown on both screens guards against a second scanner racing in; and the existing device's owner must approve the transfer, entering the account passphrase when one is set. The root secret travels encrypted under that key. The new device then has the same DID, its own device key, and starts own-device sync. This was chosen over delegated device keys because every verifier would otherwise have to learn a new key format; the cost is stated in the next paragraph.

**What unlinking can and cannot do.** Unlinking a device marks its device key removed, pushes a new signed device list to every contact, and tells the device to lock. It is housekeeping, not revocation: a device that still holds the root secret can derive the account key, mint a new device key and attestation, and sign anything as the account. There is no revocation list, and attestations do not expire. The root secret is the account the way a seed is a wallet: whoever holds it is the owner. The escape is the same as sweeping a wallet, an identity succession: the old account key signs a succession statement naming the new DID, contacts and groups accept that forwarding statement, and the original keys and device attestations are kept as historical evidence. Succession is designed on top of the existing delegation model and is not built yet; until it ships, the app's copy says plainly that unlinking does not revoke.

| Property | Status |
|---|---|
| Stable DID from the root secret; same DID on every device | shipped |
| Optional per-install device-key rotation, account-signed attestation and succession links | shipped in core; disabled by default and no app control |
| Device linking by root-secret transfer with QR, proofs and confirm code | shipped |
| Signed device list pushed to contacts | shipped |
| Recovery key | shipped |
| Revocation of a linked device that holds the root secret | by identity succession, designed, not built |

## 4. Transport

Devices connect to each other directly over QUIC using iroh 1.3; public relays and a DNS lookup service run by iroh's maintainers (n0) help two devices find each other and carry traffic when a direct path cannot be opened. We operate no server.

**Endpoints.** A device's private iroh endpoint is keyed by its current device key. The QUIC/TLS handshake proves possession of that key and exposes its endpoint id before application authentication; the app then requires an account-signed attestation naming the same key. Both private and group endpoints send QUIC keep-alives every 5 s and use a 20 s maximum idle timeout for transport silence (chat and own-device sessions have a separate 60 s application-idle rule). Each install also has a separate random group endpoint once it belongs to a group. Members dial only hosts, so group traffic does not reveal the private endpoint, and an ordinary member learns only hosts' group endpoints. When optional rotation is enabled, the private key changes underneath the stable account DID and install id. Succession links signed by each old key let contacts recognize continuity; each install retains the latest four links.

**Relays and discovery.** Both endpoints use iroh's default preset: four regional relays and the n0 DNS service, where a device publishes its relay URL (not its IP) under its endpoint id. A contact ticket names the issuer's relay with a 3-bit code; a custom relay URL can be carried as a hint. There is no user setting for relays yet. Relays see ciphertext, addresses, timing and sizes; devices on a direct path learn each other's IP. This is the metadata exposure of the design, and it is stated in the Limitations section.

> Content is encrypted end to end between the two device keys on either path; what a relay or the lookup service learns is who connects to whom and when.

**Protocols.** Each kind of traffic has its own ALPN, so a connection declares what it is for before any byte: contacts and calls; 1:1 chat (which also carries receipts and profiles); own-device sync; device linking; groups; group calls; and encrypted blobs. Old protocol versions are listed only to be closed with an "update the app" reason, so mixed versions fail cleanly instead of decoding garbage. All frames are length-prefixed and capped.

**Dialling.** A call dials every device of the contact in parallel with one call id; the first device to accept wins and the others receive a cancel. Dials time out after 30 s per device and 45 s in total; control exchanges (notices, device lists, tokens) retry with a 2, 5, 15, 30, 60 s backoff and again at every app start.

**Finding a moved peer.** A contact whose device set changed pushes a new signed device list to every contact in good standing. A device whose relay changed is found through the DNS lookup or the next hello. In groups, each host publishes a signed host address record, and a host that moved dials the current member devices it knows with a signed `Moved` message throughout the announcement window.

**Endpoint rotation.** Rotation is implemented and crash-safe, but its default interval is **disabled** in 0.1.38. The apps expose neither an enable switch nor a `lost_touch` recovery screen. If a caller explicitly configures the core policy, the schedule is seven days plus up to one day of persisted jitter, with a seven-day announcement window. Every install then rotates its private endpoint; a device rotates its group endpoint only while it hosts group chat or calls. Blocking, removal and host revocation never enable, trigger or reschedule rotation.

An enabled rotation changes only an endpoint key: the DID, install id, chat writer id, author proofs, grants and conversations stay. After a private rotation, the old endpoint overlaps for one day and the new DID-signed device list is retried only to contacts in good standing. Succession links signed by the old key preserve continuity across ordinary rotations. If no announcement reaches a contact within seven days, the core records `lost_touch`; recovery is a fresh ticket exchange. A rotated group host closes the old endpoint after promotion and retries `Moved` to current members for seven days. A group endpoint is shared across that install's groups, so a removed member who shares another group with the same host can still learn its address; authorization remains per DID and still refuses it.

| Mechanism | Status |
|---|---|
| Direct QUIC with relay fallback (iroh) | shipped |
| Separate group endpoint per install | shipped |
| Signed device-list push on device change | shipped |
| Signed host address and persisted `Moved` campaign for groups | shipped |
| Configurable private and hosting-group endpoint rotation | shipped in core; disabled by default, settings and lost-touch UI not built |
| User-configurable relay | not built |

## 5. Conversations

A conversation is a series of per-day CRDT documents in which every message version is signed by its author's account key, so any device holding the document can check who wrote each message without trusting whoever delivered it.

**Day documents.** Each conversation has one Loro document per UTC day. A message is a set of immutable fields (id, author, time, reply target, file record) plus one version slot per writer holding the text and edit or delete flags. The version shown is the highest ranked: a deletion beats an edit, a later edit beats an earlier one. Days older than 8 are compacted into one sealed snapshot. Text is capped at 20,000 characters.

**Author proof.** Every writer in a document is identified by a hash of the author's DID and the install's device id, and every version is signed by the author's account key over the document name, the message fields, the full file record, the install id, and the exact span of CRDT operations that wrote it. Binding the document name means a message cannot be replayed into another day or another conversation; binding the operation span means an old version cannot be re-submitted as new operations. A receiving device imports a batch on a scratch copy and checks that every new operation lies in a signed span whose writer matches the signature; immutable fields must not change, a writer's version must not go backwards, and nothing may disappear. One failure rejects the whole batch. The verdict depends only on the batch, the document and the session, so every device reaches the same one. The proof lives inside the document, so it survives relay through the user's other devices, history snapshots, a reinstall and a device change: a relay cannot alter or forge a message, it can only withhold.

**Delivery.** There is no store-and-forward: a 1:1 message moves when both devices are online. On every connection each side lists the recent days it holds with a version vector, the other side returns only the operations beyond that vector, and acknowledges. Unsent messages sit in the local document with an outbox marker and the app redials on write, on network change and on a backoff. Connections are sender-driven rather than permanently open: opening a conversation does not connect, typing wakes the link locally ahead of a send, and an idle chat or own-device session closes after 60 s unless this side has recent activity, a live call or pending work. Presence is an unsigned, unstored heartbeat sent only while the user is active with that contact; "Online" means active with you now, while no indicator means unknown, not offline. Message marks in both apps come from the signed receipts in section 8, not the transport acknowledgement.

> Nothing is rewritten: a version vector names how far each writer's operations are held, so each side computes exactly what the other lacks.

**Own devices.** A user's devices sync over their own protocol, authenticated by the account's attestation: conversations (validated operation by operation, exactly as a contact's batch is), the account registry, the call log, the profile and read cursors. A "You" conversation holds saved items and is only ever offered to own devices. A contact does not join this own-device sync, but it does receive the signed list of callable device keys and can infer how many devices are currently listed.

**Attachments, search and history.** A file travels as a reference inside the signed message, with its own key; the ciphertext is served by content hash only to a device whose conversation names it (section 10). Search runs locally over a sealed index whose tokens are keyed hashes, so the file reveals neither words nor text; it indexes message and post text and names, with word prefixes up to 8 characters and bigrams for scripts without spaces. Older days can be fetched from the peer as vouched snapshots, which is also how a reinstalled device recovers.

**Limits.** The time on a message is the author's clock, bounded only to the day plus or minus an hour (24 h for live pushes). A conversation is never deleted, because the CRDT must never reuse an operation identity. Anyone holding the root secret can sign as the account.

| Property | Status |
|---|---|
| Per-day CRDT documents, convergent in any order | shipped |
| Account-key signature on every version, checked on every import path | shipped |
| Delivery only when both online; outbox and retry | shipped |
| Own-device sync with per-operation validation of chat content | shipped |
| Sealed local search | shipped |
| Store-and-forward through a third party | not built by design |

## 6. Groups

A group is a grow-only set of records, each signed by its author, replicated by member devices that volunteer as hosts; membership, roles and which posts may show are derived from the records, so every member computes the same state from the same records in any order.

**Hosts.** There is no group server. A device hosts a group when an admin has issued it a host permit and the device has recorded its own acceptance; the creator's device is the first host. Each install runs a second endpoint with its own random key for group traffic, so hosting never exposes the private endpoint. Members dial only hosts; hosts relay every accepted record live to every other session, hold the full history, and dial each other. Two members on different hosts converge. Hosts are trusted with content and availability: group posts are not encrypted per member, so a host reads what it relays and can withhold or delay it. It cannot forge a post or change membership, because every record is signed.

> Hosts carry and relay the records; they never decide what the records mean. Every device derives membership and roles from the same signed log.

**Records.** The record kinds are genesis, join (carrying the invite), leave, post, admin grant or revoke (owner only), flag, host permit and acceptance, call-host permit and acceptance, and the member's encryption key. A record carries its author, the author's install, a timestamp, and `seen`, the author's version vector at signing. The group id is a hash of the owner's DID and a nonce, so only the owner can claim it. A record's id is a hash of its stored bytes, and the decoder requires canonical encoding, so one record has exactly one id. Records live in one meta document per group plus one document per UTC day for posts; a batch is accepted only if every new operation inserts a canonical record of this group under its own id, from the writer matching its author and install, into the document its kind and date allow.

**Derived state.** Roles are pure functions of the record set. The owner is the author of the earliest valid genesis and cannot be removed. Admins are granted by the owner only. A member is any DID whose latest join or leave is a join, where the join's invite verifies and its issuer was an admin as of the join's `seen`. Three counted flags remove a member; a flag counts if its author was an admin as of the flag's `seen`. A post shows if its author was a member as of its `seen` and fewer than three counted flags against the author lie inside it; a post whose `seen` names records the device does not yet hold is kept pending and re-judged when they arrive. Removal is final; there is no readmission record.

**Invites.** An admin issues a signed invite with a 7-day lifetime. The short link names one host endpoint, a 96-bit code and a relay hint; the joiner dials that host, exchanges the code for the full token (invite, group name, all hosts' signed addresses), and checks that the dialled endpoint is in the signed host list. Hosts slow guesses to one per 300 ms, close after 3 wrong codes, and refuse everyone for a minute after 30. Invites are bearer tokens: anyone holding one before it expires can join, and revoking a code forgets the code, not an invite already fetched. A contact can also be invited directly over the 1:1 channel.

**History.** Every member device holds the full history. On each session both sides exchange a day inventory and fetch the days they lack, newest first, one every 200 ms and then every 5 min, paused on metered networks or low battery; each day is imported with the same per-record checks. A wiped host is refilled from members.

**Member receipts.** Each member device signs delivered and read statements over exact post records and its signed view of the group metadata. Hosts relay the original ledger operations without re-signing them. For the author's posts, both apps show how many currently eligible members have delivered or read; eligibility is membership at the post's frontier and still-current membership. A late joiner does not count for older posts, and a member who later leaves or is removed stops blocking the aggregate while its already accepted evidence remains inspectable. The account-level read-receipts switch disables new read statements, not delivered statements.

**Removal in practice.** A removed member's hellos are answered with the removal proof; it keeps its local history read-only and may upload one batch per connection of its own posts whose `seen` predates the removal. Each host accepts those uploads for two days from when that host first derived the removal, then refuses them. Removal does not enable or trigger endpoint rotation.

**Chat requests.** A member can ask another member for a 1:1 chat with a sealed letter that hosts store for 7 days but cannot read; accepting reveals a one-time private contact ticket to the requester only.

**Open points, stated plainly.** Ties between an admin's grant and revoke, a member's join and leave, and host permits are ordered by the author's own timestamp, and `seen` is asserted by the signer and not checked against the record's real causal past; both are acknowledged open gates and are on the simplification plan. Groups have no edits, deletes, reactions, files or voice yet. A link names one host, so an offline host means a dead link.

| Property | Status |
|---|---|
| Signed record log; canonical ids; writer binding | shipped |
| Membership, roles and post visibility derived from records | shipped |
| Member-hosted replication with live relay and full history | shipped |
| Signed 7-day bearer invites with guess limits | shipped |
| Sealed chat requests between members | shipped |
| Signed per-member delivered/read receipts, relayed by hosts and shown in both apps | shipped |
| Authority ordering by causal position rather than author clock | designed, open |
| Edits, files, reactions in groups | not built |

## 7. Calls

Calls use no Tinline-operated calling server: a 1:1 call is one QUIC connection between the two devices (direct when possible, otherwise through an encrypted public relay), and a group call is a star in which one member's device acts as host and forwards audio without decoding it.

**1:1 audio.** Opus at 48 kHz mono, 20 ms frames, 48 kbps VBR, with in-band FEC and 300 ms of DRED redundancy so a burst of lost packets is reconstructed rather than concealed. The receiver runs an adaptive jitter buffer between 40 and 200 ms. Audio travels as QUIC datagrams on the call connection, so its confidentiality is the connection's TLS between the two device keys. A "direct" flag in the call stats tells the user whether the path is peer-to-peer or through a relay.

**Who may call you.** Calling is gated by a capability you issue: when you add a contact, your device signs a grant for that contact naming the capability (message, or message and call) with a one-year lifetime. An incoming call must present a grant you issued, held by the DID the QUIC connection attests, and the caller must be a contact. "Disallow calls" is a local cut-off on your side; no revocation message has to reach anyone. Contacts added by QR or link get message and call; contacts who arrived through a group chat request get message only until you allow calls.

**Group audio.** One host, up to 12 participants, 32 kbps per participant. Each participant sends Opus datagrams with an RFC 6464 audio level; the host forwards the loudest speakers' packets unchanged and tells clients which slots are live, and each client mixes locally. The forwarding path does not decode or mix packets; the host's local client still decodes the audio its user hears, as any participant does. This is what lets a phone host a call: in the recorded moto g52 benchmark with 8 participants, hosting used at most 42% of one core on average and added 11–22 ms of median mouth-to-ear latency over the direct baseline on a LAN. The trade-off is stated plainly: group audio is encrypted hop by hop, so the host hears every participant.

**Recording (designed).** In-app recording and its participant notice are designed but not implemented. The proposed notice is cooperative: another app may record without telling anyone. Under the threat model in section 2, any participant, and in a group call the host device, can record without notice, and call audio carries no signatures, so a recording can be neither proved nor disproved to come from a call.

**Choosing the host.** The starter ranks candidate devices by tier (desktop on power first, then charging phones, then phones on battery), excludes busy, hot or low-battery devices, and breaks ties with a hash of the call id and candidate, so two starters compute the same order. A host must hold a host permit issued by a group admin and its own acceptance record. Every control message (start, join, roster, leave, end) is signed by its author; rosters carry each member's signed join, so a client can check that everyone listed really joined this call and generation. The start names up to two backups; after three missed 1 s heartbeats clients redial the next backup, which takes over with an incremented generation that stale hosts cannot reuse.

**Video (1:1 only).** Every device supports AV1, encoded with libaom 3.15.2 and decoded with memory-safe rav1d 1.1.0. Calls negotiate each direction separately and prefer VP8 when it puts hardware on either end: Android uses MediaCodec for hardware VP8 encode/decode, while Linux uses libvpx for software VP8 and sends VP8 only to a hardware decoder. Two Linux desktops therefore stay on AV1. Each group of pictures is one QUIC unidirectional stream, newest group first, so a stalled group is abandoned rather than queued behind. Delay-based control moves across both resolution (320×180 to 1280×720) and 15/24/30 fps, using receiver display/decode/thermal/battery hints and measured encoder cost; the overall cap is 3 Mbps. A video call warms the caller's selected camera while ringing; **Video** answers with the callee's camera on, while ordinary **Answer** leaves it off. If video negotiation fails, the early camera stops and the call continues as audio. Frames above 1 MiB are refused and a keyframe is requested.

Default 0.1.38 builds expose **Stats for nerds** and live per-call controls. The readout reports each direction's codec/library, hardware status, measured size/rate/timing, active limit and direct-LAN/direct-internet/relay path class without displaying the peer's address. Controls can pin size, frame rate and bitrate, choose available encoders or decoders and switch VP8/AV1 at a keyframe when both peers advertise support. Overrides last only for the call and can exceed a device's comfortable thermal or performance envelope.

**Platform integration.** On Android, calls register with the system through core-telecom 1.0.1, so Bluetooth, car and watch controls work. Incoming video calls have separate **Video** and ordinary answer actions. Microphone permission is requested when a call needs it, including Android's “Ask every time” flow, rather than being a permanent background-readiness requirement. The desktop app has no Telecom equivalent.

| Capability | Status |
|---|---|
| 1:1 audio, capability-gated | shipped |
| Group audio, host forwarding, failover | shipped |
| 1:1 video (AV1 plus negotiated VP8) | shipped; Android hardware VP8, Linux software codecs |
| Group video | not built |
| Per-call quality stats and live video controls | shipped for 1:1; group calls expose events, not counters |
| Call recording, with a notice to every participant | designed; the notice is cooperative |

## 8. Receipts and auditability

A receipt is a statement signed by the recipient's account key that names the exact version of a message or group post it delivered or read. The core issues, exchanges and stores these statements, and both apps use them for message marks and expose signer/device provenance. Group-call participation receipts exist in the core but are not connected to live calls.

**What a receipt says.** A receipt names the conversation, the UTC day, the kind (delivered or read), the recipient DID, the recipient's install id, and up to 256 message digests. Each digest is a hash over the message id, its author, the author's device and the author's own signature on that version. So a receipt binds to one signed version: an edit or deletion produces a new version, and the old receipt does not carry over. The recipient's account key signs the whole statement under a fixed domain tag. Anyone holding the bytes and the recipient's DID can verify it offline.

**When it is issued.** A delivered receipt is queued in the same storage transaction that durably stores the message, and signed shortly after. A read receipt is issued in the transaction that moves the local read cursor, for incoming versions the cursor passed. Read receipts are enabled by default and can be disabled per account in Privacy on both apps; disabling them does not suppress delivered receipts or hide receipts received from others, and reads made while off are not confirmed later.

**How it travels.** Direct-message receipts travel on the chat connection itself: after the hello, each side lists the days it holds receipts for with a version vector, exchanges the missing ledger ops (bounded to 256 KiB and 64 ops per frame), and acknowledges. New receipts are pushed live to open sessions. Group receipts use the analogous group protocol between members and hosts; hosts relay original statements byte for byte. The sender's app reads a per-message status: unconfirmed, delivered or read, with the proofs behind it.

**How it is stored.** Each conversation-day has an append-only ledger inside the sealed store, keyed by content hash. On open, the ledger re-verifies every entry's hash, signature and writer binding and refuses to open at all if the row sequence, version vector or index disagree. Imports stage on a fork and commit atomically or not at all. Accepted evidence is never deleted or re-judged when a contact is later removed or blocked; removal stops new receipts only.

**What a receipt proves, and what it does not.** It proves that some install holding the recipient's account key signed, at issuance, that it durably held or marked read that exact version. It does not prove that a person saw the message, that every device of the recipient has it, when it was issued (there is no trusted timestamp), or that the signing install was the owner rather than a linked device holding the same root secret. A missing receipt is indistinguishable from the recipient being offline. Unsigned transport acknowledgements are used for synchronization and retry bookkeeping but are not displayed as delivery proof.

**Beyond 1:1 messages.** Group message receipts are issued after durable acceptance/read, admitted against the member's signed causal frontier, relayed over the group protocol, and displayed in both apps. Group-call "joined" receipts are implemented as a statement signed by the joining member over three originals (the host-signed start, its own signed join, and the host-signed roster listing that join), stored atomically with the receipt; the live hook that captures them is not installed. Direct-call receipts and shard summaries that supersede fine-grained receipts remain designs. Receipt ledgers have no retention or quota yet.

| Receipt | Status |
|---|---|
| 1:1 delivered and read, signed by recipient | shipped in core and both apps |
| Own-device replication of receipts | partial |
| Group message delivered and read | shipped in core, wire and both apps |
| Group-call joined receipts | code complete, not wired |
| 1:1 call receipts | designed only |
| Shard summaries and compaction | designed only |

## 9. Blocking and abuse resistance

Blocking is a notice signed by the blocker's account key; the blocker's own devices enforce it, and Tinline's apps on the other side honour it cooperatively; it is visible to the blocked person and changes nothing else, neither endpoints nor group membership.

**Becoming contacts.** You hand someone a contact ticket: a QR or link signed by your account, naming your device and relay, valid for 7 days and reusable until then. The other person's app dials you with their attestation, a signature binding their device to yours, and the capabilities they grant you. Your app holds the request until you accept it (up to 64 pending), counts pending requests on the Contacts tab and, on Android, uses a high-priority request notification while the app is not foregrounded. On acceptance both sides hold tokens for what the other may do: message, or message and call.

**Blocking.** A block notice `{from, to, blocked, at}` is signed by the account key, so any of the blocker's devices can hand it out and the timestamp only moves forward. It is delivered to every device of the blocked contact and acknowledged. From then on the blocker's devices answer that person's hellos, chat auth, blob requests and calls with the notice, and the tokens the blocker issued stop working through a local cut-off, with no revocation message needed. A block is also a request that the other app delete the blocker's contact entry; that is honoured by our app and cannot be enforced against a modified one. Unblocking means re-adding each other. A silent "not now" exists separately and is indistinguishable from being busy.

**What a blocked person can still do.** With an address learned before the block, they can still open a connection; the app answers with the notice and closes, so what remains is a bounded use of connection slots and relay capacity, and the knowledge that the device is online. The hardening pass bounds the slots and timeouts on our side; a public relay's share is not under our control. Before the app's own authentication runs, iroh's hole punching may already have shown the dialer the device's current IP address. They cannot read anything, send anything that a device will accept, or sign as anyone. Because rotation is disabled by default in 0.1.38, blocking does not put a default lifetime on address knowledge. If an owner explicitly enables rotation, the blocked person is not sent the new address.

**Bounds on strangers.** Anyone who knows one of your device addresses (endpoint ids) can open a connection. Tinline itself never maps a DID to an address, but the protocol is open and clients can be anything: a contact running another client could publish the addresses it was sent, or a third party could build a DID-to-address directory. The design therefore assumes an address can leak and does not claim a default expiry for that knowledge. What limits strangers today: 24 general and 8 contact-only pending connection slots, 15 s to deliver a hello, a 64 KiB cap on control frames, rate limits on group-code lookups, at most two concurrent calls, and names stripped of control characters and capped at 64 characters. A stranger's signed block notices are stored up to a cap of 256 with the oldest evicted. Several unauthenticated paths still need tighter bounds: the connection slot is released before some first-message handlers run, the 64-entry pending-request inbox can be filled with throwaway identities, and a chat peer may send a frame of up to 16 MiB before authentication. The paper does not claim denial-of-service resistance.

| Policy | Status |
|---|---|
| Signed contact tickets, held requests, per-capability tokens | shipped |
| Signed block notices honoured by every device of both sides | shipped |
| Block is a deletion request to the other app | shipped, cooperative |
| Blocking independent of rotation and groups | shipped |
| Bounds on every unauthenticated path | partial; hardening in progress |

## 10. Storage and vault

The app seals account content under keys derived from the root secret, so that secret can reopen the account's sealed data on a device that still holds the stores. A limited set of account and storage metadata remains visible and is listed below.

**Vault.** The root secret and the device key are sealed with AES-256-GCM under a random data key. With a passphrase, that data key is wrapped under a key stretched by Argon2id (64 MiB, 3 passes, 4 lanes); a file whose parameters fall outside the accepted band is refused rather than hashed. A passphrase is optional. Android wraps the data key with the Android Keystore so its background service can reopen the account. Desktop stores the key in the system keyring when no passphrase is set and offers an opt-in “Remember on this computer” setting when one is set; without a secure keyring it requires the passphrase at startup. Revealing the root secret or changing the passphrase still requires the passphrase when one is set.

**Sealed stores.** Account state, conversations, groups and the search index each live in their own embedded database (redb 4). Every record is encrypted with AES-256-GCM together with its own key path, so a record cannot be moved under another key, and each store's key is derived from the root secret with a per-store context. The root secret is on disk only inside the vault.

**Attachments.** Each file gets its own random AES-256-GCM key and is encrypted in 64 KiB chunks with a truncation flag, up to 2 GiB. The key travels inside the signed message that references the file, and the ciphertext is stored and served by content hash only to an authenticated contact device whose shared conversation names it or to one of the owner's own devices. Over-the-air, attachments are fetched with the auto-download limit at 10 MiB by default.

**Signed envelopes.** Security-sensitive signed statements use a shared postcard codec with size limits, canonical decoding and rejection of trailing bytes. Every signed statement also has a fixed domain tag, so a valid signature for one kind of statement cannot be replayed as another. Other data uses formats suited to its role: Loro's native binary format for CRDT updates, and JSON for some encrypted local records and control structures.

**Visible for convenience.** The account's display name, DID and device public key are deliberately not encrypted so the lock screen and account switcher can identify accounts without opening their vaults. Some additional metadata remains visible because of the storage layout: directory names; record key paths, which reveal conversation identifiers as hashes and which days have activity; and file sizes and blob hashes. Logs and platform notification content are outside the sealed stores. Malware running as the app, or a rooted device while unlocked, can read what the app can read.

**Limits.** Stores use one long-lived key per store with random nonces rather than a ratchet, so there is no forward secrecy for data at rest. Deleting a file zeroes it before removal, which flash and copy-on-write filesystems may defeat; the app does not promise secure deletion.

## 11. Implementation status

This paper describes Tinline 0.1.38 at app commit `dc0fb7c3`: an Android app and a Linux desktop app on one Rust core. That implementation is newer than the currently published public release.

**One core.** The crate `p2pcore` holds identity, contacts, transport, chat, groups, calls and codecs. Android reaches it through UniFFI 0.32 bindings generated at build time and loaded over JNA; the desktop app (Iced 0.14) links it directly. The rule is that logic lives in Rust once and the two apps are rendering and platform glue. The only hand-written JNI is the zero-copy video frame path.

**Platforms.** Android minSdk 28, targetSdk 36, arm64 and x86_64. Linux x86_64 as a tarball, Debian package and AppImage. No Windows or macOS package is currently produced or supported.

**Licence and telemetry.** GPL-3.0-or-later. The app contains no analytics, crash reporting or advertising SDK, and makes no network connection other than to peers, relays and the DNS lookup service.

**Release path.** A version tag builds a Linux tarball, Debian package, AppImage and signed Android APK into a draft GitHub release; publishing it pushes to an APT repository. Play Store and AUR publication are manual and have not happened. Version 0.1.38 remains pre-release software and has not had an independent security audit.

| Area | Shipped | Designed, not shipped |
|---|---|---|
| Identity, linking, recovery | all | identity move (revoke a root-secret holder) |
| 1:1 chat with author proofs, attachments, search | all | — |
| Own-device sync | chats, account, calls, profile | receipt ledgers |
| Groups | signed record log, derived membership, invites, hosts, history, optional host rotation in core, local removal cut-off | edits, files and reactions |
| Calls | 1:1 audio and adaptive AV1/VP8 video with live controls/stats, group audio with failover, Android Telecom | group video, group quality stats |
| Receipts | 1:1 and group delivered/read in core and both apps | call receipts; compaction; fuller own-device replication |
| Hardening | connection, frame and pending-request bounds | tighter bounds on remaining unauthenticated paths (in progress) |

## 12. Limitations

The limits below follow from design choices or from what is not yet built; each is either accepted or on the plan.

1. **The root secret is the identity.** Linking copies it, so a hostile or lost linked device cannot be revoked; unlinking is housekeeping. Identity succession (the old DID attests to a new one) is designed and not yet built; like a wallet seed, whoever acts first wins.
2. **No anonymity.** Public relays and the DNS lookup service see who connects to whom and when; devices on a direct path learn each other's IP; a contact ticket exposes the private endpoint key to whoever sees it.
3. **1:1 needs both devices online.** There is no third party to hold a message. The always-on service narrows the gap; it does not close it.
4. **Group hosts read plaintext.** Posts and group audio are encrypted hop by hop, not end to end between members. Content a member saw before removal stays with them.
5. **Authority ordering by author clocks.** In groups, ties between an admin's grant and revoke, a join and a leave, or host permits are broken by the author's own timestamp, and the causal frontier a record claims is not verified. A rogue admin or a skewed clock can make a revoke lose. This is an open gate on the plan.
6. **Invites are bearer tokens** for 7 days; revoking a code does not revoke an invite already fetched.
7. **Rotation is off by default.** The crash-safe rotation mechanism is not a discovery service and 0.1.38 exposes no app control or `lost_touch` recovery state. If explicitly enabled, a contact that misses the private announcement window needs a fresh ticket exchange; an offline group member that misses a host's group-endpoint announcement needs a fresh invite or own-device sync.
8. **No forward secrecy at rest.** Each store sits under one long-lived key derived from the root secret; a copied store plus the root secret opens everything, forever.
9. **Metadata at rest.** Names, DID, device key, record paths and activity timing are readable from the account directory without the root secret.
10. **Receipts are incomplete.** Direct-message and group delivered/read receipts are visible, but own-device replication remains partial, call receipts are not connected to live calls, and ledgers have no retention or compaction policy yet.
11. **Some unauthenticated paths need tighter bounds** (listed in section 9). Existing limits do not establish denial-of-service resistance.
12. **Video is 1:1 only.** Android can use hardware VP8 and Linux uses software AV1/VP8; live controls do not add group video, a Linux hardware codec path or characterised battery cost for long calls.
13. **Platforms.** Android and Linux only; no Windows or macOS build.

## 13. Building blocks

Tinline combines three published building blocks: a key-derived identifier, a hole-punching QUIC transport and a CRDT. No claim of novelty is made for any one of them.

**iroh.** Each endpoint identifier is a public key. iroh reaches a peer through its home relay and attempts to open a direct path; relays forward encrypted traffic, while a DNS record publishes the endpoint's relay URL.

**Loro.** Each CRDT operation has a peer id and counter. Peers synchronize by exporting the updates beyond a version vector, which is the mechanism behind section 5.

**did:key.** The identifier contains the account public key itself and has no registry that can update or deactivate it. Tinline can rotate device endpoint keys underneath that stable DID, although 0.1.38 disables this policy by default. Its planned account-identity succession mechanism lets the old account key sign a statement naming a new DID; contacts and groups can follow that statement and reject later use of the old DID even though its signatures remain mathematically valid. This policy is not shipped yet, and a party holding the old root secret could sign a competing succession, so conflict ordering matters.
