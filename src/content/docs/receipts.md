---
title: Receipts
description: "Recipient-signed delivered/read evidence for direct and group messages, its storage, transport and limits."
order: 7
---

# Receipts

Tinline distinguishes transport synchronization from **receipt evidence**. Transport ACKs are
unsigned retry bookkeeping. A displayed delivered or read mark requires a statement signed by the
recipient account.

## What is signed

A direct-message receipt names:

- the conversation and UTC day;
- delivered or read;
- recipient DID and installation;
- up to 256 digests of exact signed message versions.

Each digest includes the message identity, author, author installation and author signature. An
edit or deletion creates a new version, so evidence for an older version does not automatically
apply to the new one. The recipient account key signs the statement under a receipt-specific
domain. Anyone with the statement and DID can verify it offline.

Group receipts use the analogous model for exact post records plus the member's signed group-state
frontier, allowing eligibility to be checked against membership.

## Issuance

A delivered intent is committed atomically with durable acceptance of the message or post. A read
intent is committed when the local read position advances across an incoming version. Signing and
network delivery follow from those durable intents, so a restart does not silently reissue or lose
them.

Read receipts default on and can be disabled per account in both apps. Disabling them stops new
read statements; it does not disable delivered statements, remove evidence already accepted or
hide receipts received from others. Reads made while disabled are not confirmed later.

## Transport and storage

Direct receipts travel over `tinline/chat/7`; group receipts travel between members and hosts over
`tinline/group/4`. Sessions compare ledger version vectors, send bounded batches of missing
operations and acknowledge them. Group hosts relay the original member statements byte for byte.

Ledgers are append-only records in sealed stores, keyed by content hash. Opening and importing
re-check hashes, signatures, writers, ordering and indexes. Imports stage on a fork and commit
atomically. Removing or blocking a contact stops new exchange but does not delete accepted
evidence.

## User-visible status

For a direct message, both apps derive waiting, delivered or read from verified receipt proofs and
can show which account installation signed them. An unsigned transport acknowledgement never
upgrades that visible status.

For an author's group post, both apps count currently eligible members with delivered/read
evidence. A late joiner is not required for an earlier post. A member who later leaves or is
removed stops blocking the current aggregate, while already accepted evidence remains available.

## What a receipt proves

A valid receipt proves that an installation holding the recipient's account root secret signed a
claim that it durably held, or marked read, one exact version.

It does **not** prove:

- that a human saw or understood the content;
- that every device of the recipient holds it;
- a trustworthy wall-clock time (there is no trusted timestamp authority);
- that the signer was one particular physical owner rather than another linked device;
- anything when evidence is absent, since a recipient can be offline or withhold it.

A modified client holding its own root secret can sign “read” without displaying content or can
withhold receipts. Receipts provide attributable evidence, not remote behavior enforcement.

## Other receipt work

Group-call joined-receipt structures and storage exist in the core, but the live group-call hook is
not connected. Direct-call receipts, compacted receipt summaries, retention policy and complete
direct-receipt replication across all own devices remain incomplete or design work.
