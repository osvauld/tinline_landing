---
title: "Sovereign software in your pocket"
date: 2026-10-16
author: osvauld
draft: true
summary: "Tinline lets you talk to the people you choose with nobody in between. Here is what that gives you, and the few things worth taking care of yourself."
---

Tinline is a personal communication app. Messages, calls and files go from your device to the devices of
the people you choose. You don't need a phone number or an account on a server. When a direct path can't
open, a public relay passes the encrypted traffic along without being able to read it.

Tinline runs quietly in the background, so the people you know can reach you. It is made for the phone you
already carry. If you'd like to get to know it first, a spare Android on Wi-Fi is a lovely place to try it.

## Software that answers to you

At osvauld we work on what we call *sovereign software*: your identity, your conversations and your devices
belong to you, and nobody stands in between. Tinline is how we show that idea in something everyday. It
is free and open source under GPL-3.0-or-later, and it doesn't track you in any way.

Here is what that looks like in practice:

- **Your identity is yours.** It is made on your device from 24 words, and it stays the same for as long as
  you keep it. A new phone is still you.
- **Your words carry your signature.** Each message is signed inside the conversation itself, so it arrives
  exactly as you wrote it.
- **Delivery can be shown.** When the other person's device stores or opens your message, it can sign a small
  receipt. Anyone with their identifier can check it, at any time later.
- **Nothing depends on us.** We don't run a server your account needs, and the code is open for anyone to
  read and run.

That is a lot of power to hold. Like any power, it comes with a little responsibility, and it is good to
know where it sits.

## What's yours to look after

With no company in between, a few things that a service would do quietly become yours. None of them are
hard. They are just good to know from the start.

### Your recovery words

Your 24 words are the way back into your account, on any device. Save a copy somewhere safe. Paper works
great. Keep it with the things you'd keep in a drawer at home, rather than in photos or chats.

### Every linked device is fully you

Linking another phone or a computer brings your whole account along to it. That is what lets it answer for
you. So link the devices you own and keep, give each one a screen lock, and set a passphrase. If a device
leaves your life for good, think of it as a key you've handed back: unlinking tidies it away, and a device
that kept your words can still act as you.

### Both ends on the line

Messages travel while both devices are online. Running in the background keeps your end of the line open,
so most of the time this just works. When someone is away for a while, your message waits on your device
and goes once you're both online again.

### What others can see

Your conversations are encrypted between your devices. Public relays and lookup services help devices find
each other, and they can see which devices connect and when. Devices talking directly learn each other's
network address. Tinline keeps what you say private; it doesn't hide that you're talking. If you need to
hide who you talk to, a tool built for anonymity will serve you better.

### Groups and their hosts

A group lives on members' devices that offer to host it. Every post and every change is signed, so a host
can't write in anyone's name or change who belongs. A host does carry the group's posts, and can read them.
Pick hosts the way you'd pick who keeps the group's notebook.

### Signed words stay signed

A signature protects your words from being changed or forged. It also means they stay yours. That's a
nice reason to write the way you'd be happy to be remembered.

### Receipts are for reassurance

A receipt shows that someone's device received or opened your message. It doesn't show that they've
read it closely, and a missing one usually just means they're offline. Receipts work best as a quiet
"it got there", for both of you.

### Deleting and blocking

You can delete your own messages, and Tinline asks the other side's app to remove them too. Tinline's apps
do; an app someone has changed might not, and something a person already saw may still live in their memory
or a screenshot. Blocking works the same gentle way. Your own devices stop answering the person you blocked,
and their app is sent a signed notice to respect.

### The people you talk to

The protocol is open, so anyone can write their own app for it. That's part of what makes it yours, and it
also means Tinline can't promise how someone else's app behaves. A simple way to hold it: whatever you send
someone, they can keep and show to others. Your signature proves the words are yours, and that cuts both ways.
Names are free text too, so anyone can call themselves by a name you know. When it matters, check by meeting
or calling them.

None of this is new with Tinline. Every messenger relies on the other person's app, and modified versions of
popular ones already keep deleted messages and hide read receipts. Tinline just says it out loud.

### Calls can be recorded

Anyone on a call can record it, and in a group call so can the device hosting it. When someone records with
Tinline, everyone on the call sees a notice; another app could record without one. That's true of a call on any app.
Talk on a call the way you would in a room where someone might be taking notes.

### For everyday calls

**Tinline is not for emergency calls.** Keep your phone's own dialler for reaching emergency services.

## A short list to keep

1. Save your 24 words somewhere safe. Paper works great.
2. Set a passphrase, and a screen lock on every linked device.
3. Link the devices you own and keep.
4. Keep Tinline and your devices up to date.
5. Share your contact code with the people you want to hear from.
6. Treat other people's signed words with the same care as your own.

## Why we built it this way

Each of these comes from one choice: to put the power with you. We'd rather write the limits down clearly
than hide them, so you'll find the same notes in the app, on this site, in the [security notes](/security)
and in more detail in the [whitepaper](/whitepaper).

Two tin cans and a string were never complicated. Each person holds their own can, and the line between
them belongs to the two of them. That's all Tinline hopes to be, with a little more mathematics.

Pick up your can whenever you're ready.
