# Tinline Whitepaper (draft)

29 Oct 2026 · @osvauld

## Abstract

Tinline is an experiment in messaging with minimal shared infrastructure. Accounts are created locally without a phone number, email or account registry, and several identities can coexist in one app. Devices exchange messages and calls over QUIC (iroh), directly when possible and through public relays otherwise. A small Osvauld-operated wake service uses Firebase Cloud Messaging (FCM) to wake supported Android phones, including for accounts that are not currently selected; the service carries no conversation content. Every message version carries its author's signature, and delivery and read receipts can carry the recipient's signature. Conversations are per-day CRDT documents; groups use a member-hosted log of signed records. One Rust core serves the Android and Linux apps. The code is GPL-3.0-or-later, with no analytics, crash reporting or advertising SDKs.

## 1. Problem and goals

Good messengers already exist. Tinline started with a particular question: can a useful messaging app run with very little shared infrastructure?

It does not require a phone number or email. People can create several identities in the same app for different circles, projects or communities, without another SIM or a service account registration. Devices hold conversations and exchange them directly when possible; member devices host groups. The aim is to make that practical for everyday communication while reducing what an operator must maintain.

Phone operating systems make incoming communication difficult for a sleeping app. Rather than requiring every phone to keep an endpoint connected all day, Tinline now uses a small wake service. It asks the platform to wake the app, then the normal peer protocol transfers messages or establishes a call. This is an intentional infrastructure dependency, not a hosted message mailbox. A message still needs a reachable device holding it when the recipient wakes. Identity and receipt verification remain local cryptographic checks rather than statements vouched for by that service.

The goals are:

1. **Locally created identities.** No phone number, email or account registry; multiple identities within one installation.
2. **Minimal shared infrastructure.** Keep conversation storage and exchange on devices; use discovery, encrypted relay paths and content-free wake pushes where needed. Minimal does not mean zero infrastructure or zero cost: public relays and member hosts still supply bandwidth and storage.
3. **Practical phone reachability.** Let supported Android phones sleep between exchanges, and let remembered accounts receive direct messages and calls without being selected on screen.
4. **Author proof on every message.** Every version carries the author's signature inside the replicated document, verified on every import path.
5. **Recipient proof on delivery.** A recipient can sign that it holds or has marked read an exact message version, verifiable offline with the recipient's DID.
6. **Stable identity, replaceable devices.** Restore the same account from its root secret and replace device endpoints without changing the account DID.
7. **No tracking.** No analytics, crash reporting or advertising SDKs; open source under GPL-3.0-or-later. Network metadata exposure is stated separately.

Two things are explicitly not promised: anonymity, since relays and peers see addresses and timing; and protection against a device that holds the root secret, since the root secret is the identity.

## 2. Threat model and non-goals

The design defends content integrity and authorship against everyone and confidentiality against outsiders and relays. It places some resource bounds on strangers but does not claim denial-of-service resistance; it also does not defend against a party that holds the root secret or hide who talks to whom.

**Malicious actor.** A malicious actor is anyone who speaks the protocol without following its rules. The protocol is open, so any party can run a modified client, and a device cannot tell a modified client from Tinline's own. The model therefore assumes that every party other than you and your own devices may be malicious: contacts, group members, group and call hosts, call participants, strangers, relays and network operators. A malicious actor holds its own keys legitimately, so everything it signs is valid; it can do anything its own keys and the data it has received allow, and nothing that needs another party's key. Three kinds are distinguished below: outsiders, with no relationship to you (strangers, relays, network observers), bounded by encryption and by your acceptance; insiders (contacts, group members, call participants), who see what is sent to them and are bounded only by signatures; and privileged insiders (group and call hosts, admins, the owner), who see or control more and are still bounded by signatures. A device that holds your root secret is not a malicious actor in this sense: it is you.

**The working rule.** Anything sent or said to another party can be kept indefinitely and shown to anyone; what was signed can be proved to be yours, and any call can be recorded. Features that depend on the other side's software, such as deleting, editing, blocking on their side, receipts and recording notices, are courtesies between unmodified clients and are marked *cooperative* where they appear. None of this is particular to Tinline: every messenger depends on the recipient's client for deletion, receipts and recording, and modified clients of widely used messengers already keep deleted messages and suppress read receipts. A centrally operated messenger can restrict access to its service. Tinline has no central admission authority for peer communication: devices enforce their own contact and capability policies. The wake operator can refuse wake requests, but cannot revoke an identity or vouch for message authorship.

| Adversary | Can | Cannot |
|---|---|---|
| Stranger who knows a device address | open connections, send signed notices, fill pending slots until bounds apply, and keep dialing that address; at an IP address and port it can reach directly, complete the transport handshake, which tells it that the device is online and which endpoint key it uses now, including a key chosen by rotation | read anything, forge a message, become a contact without your acceptance |
| Blocked former contact | keep what it already holds, see that it was blocked, and keep dialing addresses it learned; in 0.2.5 its devices still counted as contact devices for the 8 reserved connection slots (fixed in 0.2.6, section 9); if it hosts a group you share, keep a lasting address for your group endpoint | authenticate for chat, calls or blobs; use tokens you issued |
| Removed group member | keep history it already holds; upload its own pre-removal posts, one batch per connection during each host's two-day acceptance window | be welcomed by a host, read anything newer, forge another member's post |
| Hostile group host | read, withhold or delay group posts and calls it relays; record group calls it hosts | forge a post, change membership, alter the record log |
| Hostile 1:1 contact | withhold messages, forge unsigned acks, send bad batches; keep and publish what it received, provably for what you signed; ignore deletes, edits and block notices on its side; withhold receipts or sign "read" for something unread; date its own messages anywhere in the allowed window; pass your signed device list, including a rotated address, to anyone; wake your phone within the wake limits and learn that it is online before anyone answers | put words in your mouth, replay a message into another day or chat, sign for another party |
| Call participant | record audio and video without notice; keep voice messages | join a call without a grant or a signed join |
| Anyone making identities | choose any display name, including one you know; make new identities at no cost | become your contact without your acceptance |
| Relay or DNS operator | see endpoint ids, relay use, timing and sizes | read content, impersonate a device |
| Wake-service operator or its hosting provider | observe push addresses, random tags, request IPs and timing; correlate requests; delay, suppress or fabricate wake hints | read conversation content from a wake request, forge author proofs or recipient receipts |
| Push provider (Google for the Play edition) | observe the destination app/device and push timing; correlate deliveries; delay or suppress them | decrypt the sealed hint or read conversation content from it |
| Network observer on a direct path | see IP addresses and traffic shape | read content |
| Thief with an OS-locked device | observe whatever the platform exposes on the lock screen; remembered accounts may remain reachable while the OS screen is locked; explicitly locking Tinline closes all accounts | open the app or sealed stores without passing the platform lock |
| Thief with an unlocked device | use the app as you, read stored data | reveal the root secret or change the passphrase when one is set |
| Device that holds the root secret | everything the owner can do, indefinitely | be revoked, until identity succession ships |

**Non-goals.** Anonymity, unlinkability between identities, and metadata privacy from relays, the wake service or push providers. Deniability: signatures are the point. Protection from copying or recording by the people you talk to. Forward secrecy for stored data. Denial-of-service resistance beyond the stated bounds. Erasure guarantees for content a contact already holds. These are stated so that nobody relies on them.

## 3. Identity

An account is a 256-bit root secret. Its identifier, a DID, is derived from that secret and stays the same as installed devices come and go; each install holds its own random device key.

**Several identities in one app.** Each account has its own root secret, DID, contacts and stores. Creating another account does not require another phone number or email address. Linking devices copies one account's identity to another device; creating another account creates a different identity. These are separate operations. Separate identities are not a promise of anonymity or unlinkability: the same device and push address, network metadata, shared contacts or information the user reveals can connect them.

**Reachability across accounts.** The selected account supplies the app's current screens, but selection no longer determines which identity can receive a direct message or call. In the Play edition's push mode, a wake hint can open another remembered account in a background slot, start its endpoint, complete the exchange and close it after 60 seconds without a session, ring, dial-back or call. Notifications identify the destination account; its switcher entry shows unread activity. Answering a background account's call selects that account before answering. Calls share a busy policy across accounts, so a second account does not create an independent simultaneous call line.

| Mode | Other accounts on the same installation |
|---|---|
| Android Play, push mode | Remembered accounts wake for incoming direct communication without being selected |
| Android always-on mode, including Liberum | Only the selected account stays connected; other accounts catch up when selected |
| Linux desktop | Accounts with remembered keys keep their endpoints connected while the app runs |

Background access requires a remembered vault key that the platform can supply. A passphrase-only account without a remembered key must be unlocked before it can participate. **Explicitly locking Tinline closes every account and prevents wakes or account switching from opening another until the app is unlocked.** An OS-locked screen is different from explicitly locking the app.

**Derivation.** The root secret can be exported as a BIP39 recovery phrase. The phrase's seed goes through HKDF-SHA256 with the context `osv/identity/signing/v1` to an Ed25519 key pair, and the DID is `did:key:z` followed by the base58 encoding of the Ed25519 multicodec prefix and public key. A DID is therefore self-authenticating: anyone can extract the key from it, and there is no registry or resolver to consult. Signatures use strict Ed25519 verification, which rejects malleable encodings. The same root secret gives the same DID on any device. A one-line recovery key (`tlkey-…`) encodes the same entropy with a checksum as an alternative export format.

**Devices.** Every install generates 32 random bytes as its current device key. That key is the private QUIC endpoint identity, so possessing it is proven by the transport handshake on every connection. The account key signs an attestation, "this device is mine", which the device presents when it connects. The core can rotate the key without changing the install id; the old key signs a succession link to the new one. This policy is disabled by default in this snapshot. A contact's app keeps a signed list of your current devices (up to 8) and dials all of them when calling you. Content is never signed by a device key: a device key authenticates a connection or a transport batch, and the account key signs what you say.

**Verified-DID policy.** A peer is admitted only when its attestation verifies under the DID it claims, the attested device equals the device the QUIC handshake proved, that DID is a contact, and it presents a capability you issued to that DID. Since 0.1.38 the apps have had no safety-number comparison, Verify action or “Verified” badge. A contact ticket is a bearer code, and the one attack that handing it to a trusted person does not cover is a code altered on its way: a swapped code names the attacker's keys, both apps then complete a valid exchange with the wrong party, and nothing in the current apps would show it. For a high-stakes identity check, compare the DID through a separate channel the other side cannot alter.

**Linking a device.** Linking transfers the root secret to the new device. The existing device shows a QR with a 16-byte secret valid for 300 s; the new device dials it over the link protocol; both derive a key from the secret bound to both device keys and prove it to each other; a six-digit code shown on both screens guards against a second scanner racing in; and the existing device's owner must approve the transfer, entering the account passphrase when one is set. The root secret travels encrypted under that key. The new device then has the same DID, its own device key, and starts own-device sync. This was chosen over delegated device keys because every verifier would otherwise have to learn a new key format; the cost is stated in the next paragraph.

**What unlinking can and cannot do.** Unlinking a device marks its device key removed, pushes a new signed device list to every contact, and tells the device to lock. It is housekeeping, not revocation: a device that still holds the root secret can derive the account key, mint a new device key and attestation, and sign anything as the account. There is no revocation list, and attestations do not expire. The root secret is the account the way a seed is a wallet: whoever holds it is the owner. The escape is the same as sweeping a wallet, an identity succession: the old account key signs a succession statement naming the new DID, contacts and groups accept that forwarding statement, and the original keys and device attestations are kept as historical evidence. Succession is designed on top of the existing delegation model and is not built yet; until it ships, the app's copy says plainly that unlinking does not revoke.

| Property | Status |
|---|---|
| Stable DID from the root secret; same DID on every device | shipped |
| Multiple locally created identities without phone numbers or email | shipped |
| Incoming direct messages/calls for background remembered accounts | shipped in Play push mode and on desktop |
| Optional per-install device-key rotation, account-signed attestation and succession links | shipped in core; disabled by default and no app control |
| Device linking by root-secret transfer with QR, proofs and confirm code | shipped |
| Signed device list pushed to contacts | shipped |
| Recovery key | shipped |
| Revocation of a linked device that holds the root secret | by identity succession, designed, not built |

## 4. Transport

Devices connect over QUIC using iroh 1.3. Public relays and a DNS lookup service run by iroh's maintainers (n0) help devices find each other and carry encrypted traffic when a direct path cannot be opened. Osvauld also operates the wake service at `https://push.osvauld.com`, implemented as a Cloudflare Worker. It requests platform pushes; it does not carry messages, attachments or call media.

**Endpoints.** A device's private iroh endpoint is keyed by its current device key. The QUIC/TLS handshake proves possession of that key and exposes its endpoint id before application authentication; the app then requires an account-signed attestation naming the same key. iroh's accepting side completes that handshake with any dialer, so whoever can reach the device's current IP address and port learns the key it is using now, whether or not the dialer goes on to speak a Tinline protocol. Phones behind carrier NAT are rarely reachable that way; a device with a public address, port forwarding or IPv6 usually is. There is no relay-only setting yet, so a rotated key stays hidden only from parties that cannot reach the device's address directly. Both private and group endpoints send QUIC keep-alives every 5 s and use a 20 s maximum idle timeout for transport silence (chat and own-device sessions have a separate 60 s application-idle rule). Each install also has a separate random group endpoint once it belongs to a group. Members dial only hosts, so group traffic does not reveal the private endpoint, and an ordinary member learns only hosts' group endpoints. A host, in turn, records each member device's group endpoint when it connects, so that it can push host moves and call invitations; an ordinary member's group endpoint never rotates, so a host keeps a lasting address for that device for as long as the install exists. When optional rotation is enabled, the private key changes underneath the stable account DID and install id. Succession links signed by each old key let contacts recognize continuity; each install retains the latest four links.

**Relays and discovery.** Both endpoints use iroh's default preset: four regional relays and the n0 DNS service, where a device publishes its relay URL (not its IP) under its endpoint id. A contact ticket names the issuer's relay with a 3-bit code; a custom relay URL can be carried as a hint. There is no user setting for relays yet, and no relay-only mode that would withhold a device's IP address from peers; the core has only a test switch for that. Relays see ciphertext, addresses, timing and sizes; devices on a direct path learn each other's IP. This is the metadata exposure of the design, and it is stated in the Limitations section.

> Content is encrypted end to end between the two device keys on either path; what a relay or the lookup service learns is who connects to whom and when.

**Protocols.** Each kind of traffic has its own ALPN, so a connection declares what it is for before any byte: contacts and calls; 1:1 chat (which also carries receipts and profiles); own-device sync; device linking; groups; group calls; and encrypted blobs. Old protocol versions are listed only to be closed with an "update the app" reason, so mixed versions fail cleanly instead of decoding garbage. All frames are length-prefixed and capped.

**Dialling.** A call dials the contact's known devices in parallel with one call id; the first device to accept wins and the others receive a cancel. For a device with a wake token, the caller requests a wake while an unanswered dial is still running (currently after about 2 s) and retries while the call is pending. Since 0.2.5 a phone woken for a call also dials the caller back and sends a signed `CallReady`; the caller's leg answers with its `CallHello` on whichever connection arrives first, so the call connects even when the caller's own path to the woken phone fails. The dial-back reaches the caller before anyone answers, so a contact who holds a call grant learns that the device is online. A pending message can request a wake after about 3 s of an unanswered dial. These are retry parameters, not delivery-time guarantees. Control exchanges (notices, device lists, tokens) use persisted retry outboxes and are retried at startup.

**Finding a moved peer.** A contact whose device set changed pushes a new signed device list to every contact in good standing. A device whose relay changed is found through the DNS lookup or the next hello. In groups, each host publishes a signed host address record, and a host that moved dials the current member devices it knows with a signed `Moved` message throughout the announcement window.

**Endpoint rotation.** Rotation is implemented and crash-safe, but its default interval is **disabled** in this snapshot. The apps expose neither an enable switch nor a `lost_touch` recovery screen. If a caller explicitly configures the core policy, the schedule is seven days plus up to one day of persisted jitter, with a seven-day announcement window. Every install then rotates its private endpoint; a device rotates its group endpoint only while it hosts group chat or calls. Blocking, removal and host revocation never enable, trigger or reschedule rotation.

An enabled rotation changes only an endpoint key: the DID, install id, chat writer id, author proofs, grants and conversations stay. After a private rotation, the old endpoint overlaps for one day and the new DID-signed device list is retried only to contacts in good standing. Succession links signed by the old key preserve continuity across ordinary rotations. If no announcement reaches a contact within seven days, the core records `lost_touch`; recovery is a fresh ticket exchange. A rotated group host closes the old endpoint after promotion and retries `Moved` to current members for seven days. A group endpoint is shared across that install's groups, so a removed member who shares another group with the same host can still learn its address; authorization remains per DID and still refuses it. Rotation changes the endpoint key only: not the IP address (a rebind picks a fresh port), the DID, wake tokens already issued, or the group endpoints through which a shared group's host still reaches the device, and a mutual contact can forward the new signed device list. It ends a former contact's reach once trust ends; it does not hide a device from someone who can still reach its address directly.

| Mechanism | Status |
|---|---|
| Direct QUIC with relay fallback (iroh) | shipped |
| Separate group endpoint per install | shipped |
| Content-free wake service and Android Play FCM integration | shipped |
| Woken callee dials the caller back (`CallReady`) | shipped in 0.2.5 |
| Background account wake routing; desktop keeps remembered accounts connected | shipped |
| Signed device-list push on device change | shipped |
| Signed host address and persisted `Moved` campaign for groups | shipped |
| Configurable private and hosting-group endpoint rotation | shipped in core; disabled by default, settings and lost-touch UI not built |
| User-configurable relay; relay-only mode | not built |

### Wake service

**Why it exists.** FCM accepts pushes using the application's provider credentials, which cannot safely be embedded in a distributed app or given to every contact. The wake service holds those credentials. A receiving account registers its device push target and receives opaque tokens to hand to contacts. A sender can ask the service to wake a device without learning its underlying FCM address.

```text
Sender                 Wake service / FCM            Receiving phone
  |-- peer dial ------------------------------------->| asleep
  |-- wake token ------->|-- sealed wake hint -------->|
  |                                                   | starts the account endpoint
  |<================ authenticated peer exchange =====>|
```

**Tokens and hints.** A normal wake token is issued per receiving account/device and contact. It is AES-256-GCM sealed under a relay key and contains the push target, a receiving account's hint key, a random tag, permitted wake kinds and expiry. Normal tokens last 30 days and renew near expiry. The contact holds the opaque token; the receiving account maps the random tag to that contact locally. The service checks expiry, revocation, permitted kind and rate limits, then sends a freshly sealed hint containing the tag, kind and time. Message text, contact names, DIDs, attachment keys and call media are not included. Because the service knows the hint key, the hint is **not** proof of a caller's identity or of a message's existence: normal peer authentication and signatures are still required.

**After a wake.** For a message, the receiving account starts and dials its contact back while the sender also retries. Either direction can establish the normal bidirectional chat synchronization. For a call, the phone can ring from the hint while starting its endpoint; the caller continues dialling, the woken phone dials back with `CallReady` (0.2.5), and whichever connection arrives first carries the ordinary authenticated call. A dial-back from a device the caller does not hold for that contact is refused. Answering early waits for that connection. Repeated wakes are bounded, stale call hints are refused, and an unmatched ring times out. Push is best effort; it does not guarantee an immediate ring or delivery.

**What the service knows and stores.** The service and Cloudflare process push addresses, random tags, wake kind, request IPs and timing; registration also supplies the hint key. They receive no account DID or contact name in this API, but can correlate requests and accounts sharing a push address. Google sees the target app/device, delivery timing and opaque hint. The Worker is configured without stored request observability logs. It uses expiring revocation entries, rate-limit state and cached provider credentials; it is not literally stateless. No message queue or conversation history is stored there. Provider metadata processing is distinct from the app's absence of analytics.

**Revocation and availability.** Blocking, removing a contact or changing call permission updates local wake policy and queues revocation of affected tokens at the service. Until that request reaches the service and its state propagates, the receiving app must enforce the local policy itself. The service can deny or delay wakes, and a leaked valid bearer token can trigger wakes within its allowed scope and limits. Neither event grants permission to read messages or establish a call. Direct communication between already reachable devices does not need the wake service.

**Android editions.** The Play edition includes Firebase Messaging and defaults to push mode when the provider is available. “Stay connected all the time” selects the always-on mode instead. Liberum includes no Google SDK and currently uses the always-on service; its UnifiedPush provider is not implemented. APNs and UnifiedPush request support exists in the shared relay code, but that does not establish a released iOS app or a working Liberum push integration.

## 5. Conversations

A conversation is a series of per-day CRDT documents in which every message version is signed by its author's account key, so any device holding the document can check who wrote each message without trusting whoever delivered it.

**Day documents.** Each conversation has one Loro document per UTC day. A message is a set of immutable fields (id, author, time, reply target, file record) plus one version slot per writer holding the text and edit or delete flags. The version shown is the highest ranked: a deletion beats an edit, a later edit beats an earlier one. Days older than 8 are compacted into one sealed snapshot. Text is capped at 20,000 characters.

**Author proof.** Every writer in a document is identified by a hash of the author's DID and the install's device id, and every version is signed by the author's account key over the document name, the message fields, the full file record, the install id, and the exact span of CRDT operations that wrote it. Binding the document name means a message cannot be replayed into another day or another conversation; binding the operation span means an old version cannot be re-submitted as new operations. A receiving device imports a batch on a scratch copy and checks that every new operation lies in a signed span whose writer matches the signature; immutable fields must not change, a writer's version must not go backwards, and nothing may disappear. One failure rejects the whole batch. The verdict depends only on the batch, the document and the session, so every device reaches the same one. The proof lives inside the document, so it survives relay through the user's other devices, history snapshots, a reinstall and a device change: a relay cannot alter or forge a message, it can only withhold.

**Delivery.** There is no operator-hosted store-and-forward mailbox. A message moves when a device holding it and a receiving account are reachable together. In push mode the recipient need not already have the app open or a persistent endpoint connection: a wake brings the account online for the exchange. If the sender becomes unavailable before the recipient connects, the message remains on the sending side until a reachable copy and the recipient can synchronize. The wake service does not hold or deliver it. On every connection each side lists the recent days it holds with a version vector, the other side returns only the operations beyond that vector, and acknowledges. Unsent messages sit in the local document with an outbox marker and the app redials on write, on network change and on a backoff. Connections are sender-driven rather than permanently open: opening a conversation does not connect, typing wakes the link locally ahead of a send, and an idle chat or own-device session closes after 60 s unless this side has recent activity, a live call or pending work. Presence is an unsigned, unstored heartbeat sent only while the user is active with that contact; "Online" means active with you now, while no indicator means unknown, not offline. Message marks in both apps come from the signed receipts in section 8, not the transport acknowledgement.

> Nothing is rewritten: a version vector names how far each writer's operations are held, so each side computes exactly what the other lacks.

**Own devices.** A user's devices sync over their own protocol, authenticated by the account's attestation: conversations (validated operation by operation, exactly as a contact's batch is), the account registry, the call log, the profile and read cursors. A "You" conversation holds saved items and is only ever offered to own devices. A contact does not join this own-device sync, but it does receive the signed list of callable device keys and can infer how many devices are currently listed.

**Desktop-assisted mobile routing (planned).** Multi-device use is part of the intended architecture, not just a recovery feature: a linked desktop should be able to handle peer messaging and synchronization while the phone exchanges updates with that desktop, rather than maintaining its own connections to every peer. Original author proofs must survive this forwarding, and a desktop's acknowledgement must not be shown as proof of delivery to the recipient. This routing mode is not shipped: current devices dial contacts and linked devices independently as needed. The plan includes direct fallback when the desktop is unavailable; it does not require every account to have a desktop. Calls remain separate connections to the answering device, not media forwarded through the user's desktop.

**Attachments, search and history.** A file travels as a reference inside the signed message, with its own key; the ciphertext is served by content hash only to a device whose conversation names it (section 10). Search runs locally over a sealed index whose tokens are keyed hashes, so the file reveals neither words nor text; it indexes message and post text and names, with word prefixes up to 8 characters and bigrams for scripts without spaces. Older days can be fetched from the peer as vouched snapshots, which is also how a reinstalled device recovers.

**Limits.** The time on a message is the author's clock, bounded only to the day plus or minus an hour (24 h for live pushes). A conversation is never deleted, because the CRDT must never reuse an operation identity. Anyone holding the root secret can sign as the account.

| Property | Status |
|---|---|
| Per-day CRDT documents, convergent in any order | shipped |
| Account-key signature on every version, checked on every import path | shipped |
| Peer delivery with local outbox and retries; wake sleeping Play phones | shipped |
| Own-device sync with per-operation validation of chat content | shipped |
| On-demand chat connections and 60 s application-idle closure | shipped |
| Desktop-assisted mobile messaging with direct fallback | planned; not shipped |
| Sealed local search | shipped |
| Store-and-forward through a third party | not built by design |

## 6. Groups

A group is a grow-only set of records, each signed by its author, replicated by member devices that volunteer as hosts; membership, roles and which posts may show are derived from the records, so every member computes the same state from the same records in any order.

**Hosts.** There is no Osvauld-operated group-history service; participating devices act as servers for their groups. A device hosts a group when an admin has issued it a host permit and the device has recorded its own acceptance; the creator's device is the first host. Each install runs a second endpoint with its own random key for group traffic, so hosting never exposes the private endpoint. Members dial only hosts; hosts relay every accepted record live to every other session, hold the full history, and dial each other. Two members on different hosts converge. Hosts are trusted with content and availability: group posts are not encrypted per member, so a host reads what it relays and can withhold or delay it. It cannot forge a post or change membership, because every record is signed.

> Hosts carry and relay the records; they never decide what the records mean. Every device derives membership and roles from the same signed log.

**Records.** The record kinds include genesis, invite join, open join, leave, text/image/voice posts, admin grant or revoke (owner only), flag, host permit and acceptance, call-host permit and acceptance, public-group settings, and the member's encryption key. A record carries its author, the author's install, a timestamp, and `seen`, the author's version vector at signing. The group id is a hash of the owner's DID and a nonce, so only the owner can claim it. A record's id is a hash of its stored bytes, and the decoder requires canonical encoding, so one record has exactly one id. Records live in one meta document per group plus one document per UTC day for posts; a batch is accepted only if every new operation inserts a canonical record of this group under its own id, from the writer matching its author and install, into the document its kind and date allow.

**Derived state.** Roles are pure functions of the record set. The owner is the author of the earliest valid genesis and cannot be removed. Admins are granted by the owner only. A member is a DID whose latest join/leave is a valid join: either an invite join whose issuer was an admin as of its `seen`, or an open join made while the group was open as of its frontier. Hosts also check the current open state when admitting a member's open join. Three counted flags remove a member; a flag counts if its author was an admin as of the flag's `seen`. A post shows if its author was a member as of its `seen` and fewer than three counted flags against the author lie inside it; a post whose `seen` names records the device does not yet hold is kept pending and re-judged when they arrive. Removal is final; there is no readmission record.

**Invites.** An admin issues a signed invite with a 7-day lifetime. The short link names one host endpoint, a 96-bit code and a relay hint; the joiner dials that host, exchanges the code for the full token (invite, group name, all hosts' signed addresses), and checks that the dialled endpoint is in the signed host list. Hosts slow guesses to one per 300 ms, close after 3 wrong codes, and refuse everyone for a minute after 30. Invites are bearer tokens: anyone holding one before it expires can join, and revoking a code forgets the code, not an invite already fetched. A contact can also be invited directly over the 1:1 channel; since 0.2.5 that invitation wakes a sleeping phone.

**History.** Every member device holds the full history. On each session both sides exchange a day inventory and fetch the days they lack, newest first, one every 200 ms and then every 5 min, paused on metered networks or low battery; each day is imported with the same per-record checks. A wiped host is refilled from members.

**Member receipts.** In groups that are not open, each member device signs delivered and read statements over exact post records and its signed view of the group metadata. Hosts relay the original ledger operations without re-signing them. For the author's posts, both apps show how many currently eligible members have delivered or read; eligibility is membership at the post's frontier and still-current membership. A late joiner does not count for older posts, and a member who later leaves or is removed stops blocking the aggregate while its already accepted evidence remains inspectable. The account-level read-receipts switch disables new read statements, not delivered statements.

**Removal in practice.** A removed member's hellos are answered with the removal proof; it keeps its local history read-only and may upload one batch per connection of its own posts whose `seen` predates the removal. Each host accepts those uploads for two days from when that host first derived the removal, then refuses them. Removal does not enable or trigger endpoint rotation.

**Chat requests.** A member can ask another member for a 1:1 chat with a sealed letter that hosts store for 7 days but cannot read; accepting reveals a one-time private contact ticket to the requester only.

**Authority ordering and current scope.** Owner admin grants, host and call-host permits, and public-group settings use causal ordering: a record whose signed `seen` includes another supersedes it; concurrent candidates use `(at, id)` as a tie-breaker. Join/leave and host acceptance still use author timestamps. A signed `seen` remains the author's assertion, not proof of the record's real causal past; hosts add current-state admission checks for open joins and admins-only posting. These checks do not turn the frontier into a trusted history. Images and voice posts are implemented, as are public open links, admins-only posting and presence. Open groups do not exchange member receipts. Group edits, deletion, reactions and general file attachments are not implemented. An invite or open link still needs a reachable host to resolve it.

| Property | Status |
|---|---|
| Signed record log; canonical ids; writer binding | shipped |
| Membership, roles and post visibility derived from records | shipped |
| Member-hosted replication with live relay and full history | shipped |
| Signed 7-day bearer invites with guess limits | shipped |
| Sealed chat requests between members | shipped |
| Signed per-member delivered/read receipts, relayed by hosts and shown in both apps | shipped |
| Causal ordering for admin grants, permits and public settings | shipped; concurrent ties still use author clocks |
| Public open links, admins-only posting, presence, images and voice posts | shipped |
| Edits, deletion, general files and reactions in groups | not built |

## 7. Calls

Call media uses no Tinline-operated media server: a 1:1 call is a QUIC connection between the answering devices, directly when possible and through an encrypted public relay otherwise. A group call uses a member device as host to forward audio without decoding it. For a sleeping Play phone, the Osvauld wake service and FCM help start the receiving account; they do not establish the authenticated call or carry its audio or video.

**1:1 audio.** Opus at 48 kHz mono, 20 ms frames, 48 kbps VBR, with in-band FEC and 300 ms of DRED redundancy so a burst of lost packets is reconstructed rather than concealed. The receiver runs an adaptive jitter buffer between 40 and 200 ms. Audio travels as QUIC datagrams on the call connection, so its confidentiality is the connection's TLS between the two device keys. A "direct" flag in the call stats tells the user whether the path is peer-to-peer or through a relay.

**Who may call you.** Calling is gated by a capability you issue: when you add a contact, your device signs a grant for that contact naming the capability (message, or message and call) with a one-year lifetime. An incoming call must present a grant you issued, held by the DID the QUIC connection attests, and the caller must be a contact. "Disallow calls" is a local cut-off on your side; no revocation message has to reach anyone. Contacts added by QR or link get message and call; contacts who arrived through a group chat request get message only until you allow calls.

**Group audio.** One host, up to 12 participants, 32 kbps per participant. Each participant sends Opus datagrams with an RFC 6464 audio level; the host forwards the loudest speakers' packets unchanged and tells clients which slots are live, and each client mixes locally. The forwarding path does not decode or mix packets; the host's local client still decodes the audio its user hears, as any participant does. This is what lets a phone host a call: in the recorded moto g52 benchmark with 8 participants, hosting used at most 42% of one core on average and added 11–22 ms of median mouth-to-ear latency over the direct baseline on a LAN. The trade-off is stated plainly: group audio is encrypted hop by hop, so the host hears every participant.

**Recording (designed).** In-app recording and its participant notice are designed but not implemented. The proposed notice is cooperative: another app may record without telling anyone. Under the threat model in section 2, any participant, and in a group call the host device, can record without notice, and call audio carries no signatures, so a recording can be neither proved nor disproved to come from a call.

**Choosing the host.** The starter ranks candidate devices by tier (desktop on power first, then charging phones, then phones on battery), excludes busy, hot or low-battery devices, and breaks ties with a hash of the call id and candidate, so two starters compute the same order. A host must hold a host permit issued by a group admin and its own acceptance record. Every control message (start, join, roster, leave, end) is signed by its author; rosters carry each member's signed join, so a client can check that everyone listed really joined this call and generation. The start names up to two backups; after three missed 1 s heartbeats clients redial the next backup, which takes over with an incremented generation that stale hosts cannot reuse.

**Video (1:1 only).** Every device supports AV1, encoded with libaom 3.15.2 and decoded with memory-safe rav1d 1.1.0. Calls negotiate each direction separately and prefer VP8 when it puts hardware on either end: Android uses MediaCodec for hardware VP8 encode/decode, while Linux uses libvpx for software VP8 and sends VP8 only to a hardware decoder. Two Linux desktops therefore stay on AV1. Each group of pictures is one QUIC unidirectional stream, newest group first, so a stalled group is abandoned rather than queued behind. Delay-based control moves across both resolution (320×180 to 1280×720) and 15/24/30 fps, using receiver display/decode/thermal/battery hints and measured encoder cost; the overall cap is 3 Mbps. A video call warms the caller's selected camera while ringing; **Video** answers with the callee's camera on, while ordinary **Answer** leaves it off. If video negotiation fails, the early camera stops and the call continues as audio. Frames above 1 MiB are refused and a keyframe is requested.

The apps expose **Stats for nerds** and live per-call controls. The readout reports each direction's codec/library, hardware status, measured size/rate/timing, active limit and direct-LAN/direct-internet/relay path class without displaying the peer's address. Controls can pin size, frame rate and bitrate, choose available encoders or decoders and switch VP8/AV1 at a keyframe when both peers advertise support. Overrides last only for the call and can exceed a device's comfortable thermal or performance envelope.

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

**Becoming contacts.** You hand someone a contact ticket: a QR or link signed by your account, naming your device and relay, valid for 7 days and reusable until then. When this account has a push target, the ticket also carries a message-only wake token so its holder can wake the phone to deliver a contact request; it does not allow a call. The request still needs local acceptance before the sender becomes a contact. Contact codes from v0.2.4 onwards replace the older format; codes made by v0.2.3 or earlier must be regenerated. Handing out a code is an act of trust: whoever holds it can request contact and, once accepted, reach your devices. Blocking, and rotation where enabled, cover the case where that trust ends; a code altered on its way to the recipient is the one case neither covers (section 3). The other person's app dials with its attestation, a signature binding the two device keys and the capabilities it grants. Your app holds the request until accepted (up to 64 pending), and both sides exchange wake material so the new relationship can immediately reach sleeping devices. On acceptance both sides hold tokens for what the other may do: message, or message and call. Contact-request wake retries back off over time.

**Blocking.** A block notice `{from, to, blocked, at}` is signed by the account key, so any of the blocker's devices can hand it out and the timestamp only moves forward. It is delivered to every device of the blocked contact and acknowledged. From then on the blocker's devices answer that person's hellos, chat auth, blob requests and calls with the notice, and the peer-protocol tokens the blocker issued stop working through a local cut-off, with no remote acknowledgement needed for local enforcement. Wake-token revocations are separately queued to the service; they reduce unwanted pushes but are not the authority for the block. A block is also a request that the other app delete the blocker's contact entry; that is honoured by our app and cannot be enforced against a modified one. Unblocking means re-adding each other. A silent "not now" exists separately and is indistinguishable from being busy.

**What a blocked person can still do.** With an address learned before the block, they can still open a connection; the app answers with the notice and closes, so what remains is a bounded use of connection slots and relay capacity, and the knowledge that the device is online. The hardening pass bounds the slots and timeouts on our side; a public relay's share is not under our control. Before the app's own authentication runs, iroh's hole punching may already have shown the dialer the device's current IP address. They cannot read anything, send anything that a device will accept, or sign as anyone. Because rotation is disabled by default in this snapshot, blocking does not put a default lifetime on address knowledge. If an owner explicitly enables rotation, the blocked person is not sent the new address. This snapshot had two gaps. A blocked contact's devices still counted as contact devices for the 8 reserved connection slots, so they were not confined to the 24 general slots; version 0.2.6 fixed that. And if the blocked person hosts a group you both belong to, it keeps your group endpoint, which never rotates for a non-hosting member; that gap remains.

**Bounds on strangers.** Anyone who knows one of your device addresses (endpoint ids) can open a connection. Tinline itself never maps a DID to an address, but the protocol is open and clients can be anything: a contact running another client could publish the addresses it was sent, or a third party could build a DID-to-address directory. The design therefore assumes an address can leak and does not claim a default expiry for that knowledge. What limits strangers today: 24 general and 8 contact-only pending connection slots, 15 s to deliver a hello, a 64 KiB cap on control frames, rate limits on group-code lookups, at most two concurrent calls, and names stripped of control characters and capped at 64 characters. A stranger's signed block notices are stored up to a cap of 256 with the oldest evicted. Several unauthenticated paths still need tighter bounds: the connection slot is released before some first-message handlers run, the 64-entry pending-request inbox can be filled with throwaway identities, and in this snapshot a chat, own-device or group peer may send a frame of up to 16 MiB before authentication. Version 0.2.6 caps that first frame at 64 KiB (1 MiB for a group hello) and bounds unidentified connections on the group endpoint to 32. The paper does not claim denial-of-service resistance.

| Policy | Status |
|---|---|
| Signed contact tickets, held requests, per-capability tokens | shipped |
| Signed block notices honoured by every device of both sides | shipped |
| Block is a deletion request to the other app | shipped, cooperative |
| Blocking independent of rotation and groups | shipped |
| Bounds on every unauthenticated path | partial; hardening in progress |

## 10. Storage and vault

The app seals account content under keys derived from the root secret, so that secret can reopen the account's sealed data on a device that still holds the stores. A limited set of account and storage metadata remains visible and is listed below.

**Vault.** The root secret and the device key are sealed with AES-256-GCM under a random data key. With a passphrase, that data key is wrapped under a key stretched by Argon2id (64 MiB, 3 passes, 4 lanes); a file whose parameters fall outside the accepted band is refused rather than hashed. A passphrase is optional. Android wraps the data key with Android Keystore so background exchanges, including wake-ups for another account, can reopen remembered accounts subject to the app-lock policy. Desktop stores the key in the system keyring when no passphrase is set and offers an opt-in “Remember on this computer” setting when one is set; without a secure keyring it requires the passphrase at startup. Revealing the root secret or changing the passphrase still requires the passphrase when one is set.

**Sealed stores.** Account state, conversations, groups and the search index each live in their own embedded database (redb 4). Every record is encrypted with AES-256-GCM together with its own key path, so a record cannot be moved under another key, and each store's key is derived from the root secret with a per-store context. The root secret is on disk only inside the vault.

**Attachments.** Each file gets its own random AES-256-GCM key and is encrypted in 64 KiB chunks with a truncation flag, up to 2 GiB. The key travels inside the signed message that references the file, and the ciphertext is stored and served by content hash only to an authenticated contact device whose shared conversation names it or to one of the owner's own devices. Over-the-air, attachments are fetched with the auto-download limit at 10 MiB by default.

**Signed envelopes.** Security-sensitive signed statements use a shared postcard codec with size limits, canonical decoding and rejection of trailing bytes. Every signed statement also has a fixed domain tag, so a valid signature for one kind of statement cannot be replayed as another. Other data uses formats suited to its role: Loro's native binary format for CRDT updates, and JSON for some encrypted local records and control structures.

**Visible for convenience.** The account's display name, DID and device public key are deliberately not encrypted so the lock screen and account switcher can identify accounts without opening their vaults. Some additional metadata remains visible because of the storage layout: directory names; record key paths, which reveal conversation identifiers as hashes and which days have activity; and file sizes and blob hashes. A background account's unread total may also be stored as a clear number for the account switcher. Logs and platform notification content are outside the sealed stores. Malware running as the app, or a rooted device while unlocked, can read what the app can read.

**Limits.** Stores use one long-lived key per store with random nonces rather than a ratchet, so there is no forward secrecy for data at rest. Deleting a file zeroes it before removal, which flash and copy-on-write filesystems may defeat; the app does not promise secure deletion.

## 11. Implementation status

This paper describes the Tinline 0.2.5 implementation at app commit `656ebf84913fc2cbdc159467300398cd1b6d08c6`, reviewed on 29 October 2026. This is a source snapshot, not a claim that every installation or published package already contains it. Android and Linux are the released app targets; iOS remains development work without a release.

**One core.** The Rust workspace separates protocol and pure state from runtime I/O: identity and cryptography, chat and group cores, receipt storage, node/chat/group/sync runtimes, media, and wake logic. The `p2pcore` crate composes these behind the app API. Android uses generated UniFFI 0.32 bindings over JNA; the Iced 0.14 desktop app links the core directly. Platform code handles rendering, lifecycle, remembered keys, push delivery and media hardware. The Cloudflare Worker is a separate deployment built on the shared `wake-relay-core` crate. The only hand-written JNI is the zero-copy video frame path.

**Platforms.** Android minSdk 28, targetSdk 36, arm64 and x86_64. Linux x86_64 as a tarball, Debian package and AppImage. No Windows or macOS package is currently produced or supported.

**Licence and telemetry.** GPL-3.0-or-later. The app contains no analytics, crash reporting or advertising SDKs. The Play edition includes Firebase Messaging for wake delivery; Liberum excludes Google SDKs. Network dependencies now include the wake service and platform push provider in addition to peers, public relays and discovery. Their metadata exposure is part of the threat model, not erased by the absence of analytics.

**Release path.** The production-branch workflow builds candidate Linux tarball, Debian and AppImage packages on Ubuntu 24.04, signed Play and Liberum Android APKs, and a Play app bundle into a draft GitHub release. Distribution or store availability must be checked against the published release rather than inferred from source version. Tinline remains alpha software and has not had an independent security audit.

| Area | Shipped | Designed, not shipped |
|---|---|---|
| Identity, linking, recovery | all | identity move (revoke a root-secret holder) |
| 1:1 chat with author proofs, attachments, search | all | — |
| Own-device sync | chats, account, calls, profile | fuller receipt replication; desktop-assisted mobile routing |
| Reachability | Play FCM wake service; background remembered accounts; desktop keeps remembered accounts connected; wake-enabled contact codes; callee dial-back after a call wake | Liberum UnifiedPush integration; iOS release |
| Groups | signed log, membership, invites, public links, hosts/history, images/voice, optional host rotation in core, local removal cut-off | edits, deletion, general files and reactions |
| Calls | 1:1 audio and adaptive AV1/VP8 video with live controls/stats, group audio with failover, Android Telecom | group video, group quality stats |
| Receipts | 1:1 and group delivered/read in core and both apps | call receipts; compaction; fuller own-device replication |
| Hardening | connection, frame and pending-request bounds | tighter bounds on remaining unauthenticated paths (first-frame caps and blocked devices out of the reserved slots shipped in 0.2.6); a relay-only setting (in progress) |

## 12. Limitations

The limits below follow from design choices or from what is not yet built; each is either accepted or on the plan.

1. **The root secret is the identity.** Linking copies it, so a hostile or lost linked device cannot be revoked; unlinking is housekeeping. Identity succession (the old DID attests to a new one) is designed and not yet built; like a wallet seed, whoever acts first wins.
2. **No anonymity or identity unlinkability.** Public relays and discovery reveal connection metadata; direct peers learn IP addresses. Wake infrastructure processes push addresses, IPs and timing, and can correlate identities sharing a device push address. A contact ticket exposes a private endpoint public key, not its secret key.
3. **Wake-ups do not replace a mailbox.** A recipient can sleep until pushed, but delivery still needs a reachable device holding the message. Push delivery is best effort and depends on the wake service, FCM and platform policy. Without a remembered account key, background access must wait for an unlock. Explicit app locking closes all accounts.
4. **Group hosts read plaintext.** Posts and group audio are encrypted hop by hop, not end to end between members. Content a member saw before removal stays with them.
5. **Causal-frontier claims and clock ties.** Admin grants, permits and public settings follow causal ordering, but concurrent ties and some self-authored records still use author timestamps. A signed frontier does not prove the author's actual causal past; current-state host admission checks address particular cases, not the general problem.
6. **Invites are bearer tokens** for 7 days; revoking a code does not revoke an invite already fetched.
7. **Rotation is off by default.** The crash-safe rotation mechanism is not a discovery service and the apps expose no control or `lost_touch` recovery state. If explicitly enabled, a contact that misses the private announcement window needs a fresh ticket exchange; an offline group member that misses a host's group-endpoint announcement needs a fresh invite or own-device sync. Rotation changes only the endpoint key: not the IP address, the DID, wake tokens or shared-group reach, and a directly reachable device discloses its new key to anyone who completes a handshake at its address (section 4).
8. **No forward secrecy at rest.** Each store sits under one long-lived key derived from the root secret; a copied store plus the root secret opens everything, forever.
9. **Metadata at rest.** Names, DID, device key, record paths and activity timing are readable from the account directory without the root secret.
10. **Receipts are incomplete.** Direct-message and group delivered/read receipts are visible, but own-device replication remains partial, call receipts are not connected to live calls, and ledgers have no retention or compaction policy yet.
11. **Some unauthenticated paths need tighter bounds** (listed in section 9). Existing limits do not establish denial-of-service resistance.
12. **Video is 1:1 only.** Android can use hardware VP8 and Linux uses software AV1/VP8; live controls do not add group video, a Linux hardware codec path or characterised battery cost for long calls.
13. **Platforms and modes.** Android and Linux are released targets; no iOS release or supported Windows/macOS package. Liberum and Android always-on mode keep only the selected account connected; desktop keeps remembered accounts connected while running.

## 13. Building blocks

Tinline combines three published building blocks: a key-derived identifier, a hole-punching QUIC transport and a CRDT. No claim of novelty is made for any one of them.

**iroh.** Each endpoint identifier is a public key. iroh reaches a peer through its home relay and attempts to open a direct path; relays forward encrypted traffic, while a DNS record publishes the endpoint's relay URL.

**Loro.** Each CRDT operation has a peer id and counter. Peers synchronize by exporting the updates beyond a version vector, which is the mechanism behind section 5.

**did:key.** The identifier contains the account public key itself and has no registry that can update or deactivate it. Tinline can rotate device endpoint keys underneath that stable DID, although this snapshot disables the policy by default. Its planned account-identity succession mechanism lets the old account key sign a statement naming a new DID; contacts and groups can follow that statement and reject later use of the old DID even though its signatures remain mathematically valid. This policy is not shipped yet, and a party holding the old root secret could sign a competing succession, so conflict ordering matters.
