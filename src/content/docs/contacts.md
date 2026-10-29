---
title: Contacts and capabilities
description: "Reusable contact tickets, held requests, message and call tokens, device-list continuity and blocking."
order: 3
---

# Contacts and capabilities

Tinline has no account directory or phone-number lookup. People exchange signed tickets out of
band. A ticket lets someone submit a contact request; it does not silently make them a contact.

## Contact tickets

The current ticket text is `OSVC2:` followed by case-insensitive unpadded base32. Its signed body
contains the issuer's account public key, one current device endpoint, a nonce, expiry, display
name, relay hint and, when the issuer's device has a push target, a message-only wake token. Codes
from 0.2.4 onwards are therefore longer; codes made by 0.2.3 or earlier are not accepted. The
account key signs the canonical body under the contact-ticket domain.
`osvc1` is not accepted.

A ticket is a bearer capability:

- it is normally valid for seven days;
- it can be used by multiple people while valid;
- resetting it retires the code for new requests;
- anyone who obtains it can submit a request, so it should be shared intentionally.

Handing out a code is an act of trust: whoever holds it can request contact and, once accepted,
reach your devices. Blocking, and rotation where enabled, cover the end of that trust. A code
altered on its way to the recipient is the one case neither covers: the altered code names the
attacker's keys, and both apps complete a valid exchange with the wrong party.

Visible names, addresses and hints are accepted only when they match the signed body.

## Request and acceptance

The scanner dials the ticket's device and sends:

- its account-signed device attestation;
- its display name;
- the signed ticket;
- a signature binding the ticket nonce and both connected devices;
- a message token for the ticket owner and, when allowed, a separate call token.

The owner verifies the ticket, expiry, connected device, attestation, binding and tokens before
persisting a **pending request**. Requests are keyed by requester DID and bounded to 64 entries;
throwaway identities can fill that inbox, so the bound is resource control rather than spam
prevention.

If the ticket carries a wake token and the owner's phone is asleep, the requester's device asks the
wake service to nudge it; the request waits for that wake before it goes (0.2.5), and wakes for an
unanswered request slow down over time, about 30 s, 2 min, 10 min and 30 min after the first, then
hourly. A code's wake tag is shared by everyone holding the code, and the phone acts on at most
four such wakes per ten minutes. Both sides exchange their own wake tokens during the request and
the welcome, so a new relationship can wake either phone at once.

The app then offers Accept or Not now. Pending requests are counted on the Contacts tab, and
Android uses a high-priority contact-request notification when the app is not in the foreground.
Acceptance revalidates the request at the current time and atomically stores the contact,
redemption marker and welcome outbox entry. The welcome is retried to the requesting device. Not
now sends no decline signal.

## Message and call tokens

A relationship uses separate account-signed capabilities:

- a **message token** admits direct chat and related history/blob operations;
- a **call token** admits calls.

Both name issuer, holder, issue and expiry times, nonce and capability. They are checked alongside
the QUIC-authenticated device and account attestation. Contacts added by direct ticket normally
exchange both. A contact introduced through a group chat request starts message-only until calls
are enabled.

Disabling calls raises a local cut-off for that DID without ending chat. Blocking raises both
message and call cut-offs. Tokens near expiry are renewed on authenticated protocol paths.

## Signed device lists

A contact's account signs its current callable devices, relay hints and recent endpoint succession
links. Lists contain one to eight devices. Higher sequence wins; the signature bytes break an
equal-sequence tie deterministically.

Lists travel during calls and are pushed after linking, unlinking and restore, and after endpoint
rotation when that optional core policy is enabled. Contacts can therefore infer the number of
devices listed as callable. They do not receive private device labels.

Succession links let the core recognize an enabled endpoint rotation as continuity with a known
installation. Since 0.1.38 the apps have had no safety-number comparison, Verify action or
“Verified” badge; there is no user-facing verification workflow to preserve or reset.

Display names are self-asserted and non-unique. They are sanitized and bounded, but they are not
identity evidence. For a high-stakes identity check, compare the DID through a separate trusted
channel.

## Blocking

Blocking is represented by an account-signed notice and enforced by the blocker's own devices.
Tinline's unmodified app on the other side cooperatively removes the contact entry, but remote
deletion cannot be forced against a modified client.

A blocked DID cannot use the message/call tokens previously issued by the blocker, and the wake
tokens it held are revoked at the wake service and refused locally. It can still retain content
and endpoint addresses it already learned and can continue attempting connections to them. Because
rotation is disabled by default, version 0.2.5 does not put a default lifetime on that address
knowledge. Two gaps remain: a blocked contact's devices still count as contact devices for the 8
reserved connection slots, and if the blocked person hosts a group you share, it keeps your group
endpoint, which never rotates for a non-hosting member. Blocking does not enable rotation and does
not alter shared group membership.

Unblocking requires a new contact exchange; cut-offs never move backwards.
