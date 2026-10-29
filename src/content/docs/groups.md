---
title: Groups
description: "Signed group records, derived membership, member-hosted replication, invitations, receipts and removal behavior."
order: 6
---

# Groups

Groups are implemented as signed records replicated through member devices that volunteer as
hosts. There is no Osvauld group server. Every member derives membership, roles and visible posts
from the same record set.

## Hosts and endpoints

An installation has a separate group endpoint once it belongs to a group. Ordinary members dial
hosts; they do not expose their private account endpoint to all members. The same installation's
group endpoint is shared across its groups. A host records each member device's group endpoint
when it connects, to push host moves and call invitations; an ordinary member's group endpoint
never rotates, so a host keeps a lasting address for that device.

A device may host after an admin issues a host permit and the device records its acceptance. Hosts
keep history, relay accepted records to sessions and synchronize with other hosts. They are
trusted for availability and confidentiality: hosts can read, delay, withhold and record the
content they relay. They cannot forge another member's signed records.

The group endpoint carries `tinline/group/5`; hosted group calls use `tinline/gcall/1`.

## Signed record log

Record kinds include genesis, invite join, open join, leave, text/image/voice posts, role changes,
flags, host permits/acceptances, call-host permits/acceptances, public-group settings and member
encryption-key material. Each canonical record names the
group, author, author installation, time and the author's claimed causal frontier (`seen`). Its ID
is a hash of its canonical stored bytes.

Imports are staged and reject a batch unless every new operation inserts a canonical record under
its own ID, from the writer associated with its author/install, into the permitted metadata or UTC
day document.

Derived state is deterministic for the records held:

- the earliest valid genesis identifies the owner;
- only the owner grants or revokes admins;
- joins require an invite from an admin at the join's frontier, or happen while the group is open;
- three qualifying admin flags remove a member;
- a post is visible only when its author was a member at its frontier and was not removed there;
- records whose claimed dependencies are missing remain pending until those records arrive.

Removal is final in the current model; there is no readmission record.

## Invitations and chat requests

An admin can issue a seven-day signed bearer invite. A short link contains one host endpoint,
relay hint and 96-bit lookup code. The joiner exchanges that code for the full signed invite and
host list. Hosts rate-limit guessing and bound failed attempts.

Revoking the short code does not revoke a full invite already fetched. If the one host named in a
short link is offline, that link cannot be resolved. An invitation sent to a contact over the 1:1
channel wakes a sleeping phone since 0.2.5.

## Public groups

An admin can open a group. An open link admits anyone who dials a host while the group is open,
and the joiner's open-join record then makes it a member; hosts check the current open state when
admitting. Open groups can restrict posting to admins and show who is present now. They exchange
no member receipts.

A member can request direct chat with another member. Hosts hold a sealed letter for up to seven
days but cannot read it; acceptance reveals a one-time message-only contact ticket to the
requester.

## History and own-device sync

Metadata and recent day documents synchronize by version vector; older history is inventoried and
fetched newest first. Member devices retain group history, so a wiped host can refill from other
members. Own-device sync also carries group membership/content between an account's installations.

The core can rotate a host endpoint, sign its new address and retry announcements to current
members during an announcement window. That policy is disabled by default in 0.2.5 and has no app
control. When enabled, it does not change the group or author identity and is not triggered by
member removal.

## Removal behavior

A removed member keeps history already received in read-only form. During each host's two-day
grace window, that member may upload at most one batch per connection of its own posts whose
claimed frontier predates removal. After the host's window closes, uploads are refused.

A shared group endpoint means a removed member that shares another group with the same host may
still learn the endpoint address. Authorization remains per DID and group, so address knowledge is
not membership.

## Receipts

Member devices sign delivered and read statements for exact post versions and a signed view of
group state. Hosts relay original ledger operations without re-signing them. Both apps aggregate
evidence over members eligible for that post. See [Receipts](/docs/receipts).

## Current limits

- Hosts see plaintext posts and participant audio.
- Images and voice posts are implemented; group edits, deletion, reactions, general file
  attachments and video are not.
- Group posts and group calls do not wake a sleeping member.
- Invites are bearer capabilities until expiry.
- Some authority ties still use author timestamps, and a record's claimed causal frontier is not
  proven to be its actual causal past. These are acknowledged open design gates.
