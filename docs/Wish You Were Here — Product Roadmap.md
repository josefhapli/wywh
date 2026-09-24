# Wish You Were Here — Product Roadmap

> **Our operating principle:** Add a brick every session.
>
> Build the smallest shippable thing that moves Wish You Were Here closer to being a real product used by real people.

**Last updated:** September 22, 2026

---

## Product Vision

Wish You Were Here (WYWH) makes sending a real, physical postcard as easy as sending a photo from your phone.

The core experience is simple:

**Photo + message + recipient → paid order → physical postcard → mailbox.**

The MVP is focused on proving this experience end-to-end.

We will resist expanding the MVP while we do that. New ideas and adjacent use cases belong in **Beyond the MVP** until the core product has been proven with real users.

---

# Where We Are

## Current Mission — Prove the Transaction + Physical Postcard

**Status:** IN PROGRESS

WYWH can create a cloud-backed order, prepare the photo correctly, collect the information necessary to fulfill it, and handle the product's postcard layout and promotion logic.

The next mission is to prove that this software flow reliably becomes a **paid, printable, physical postcard**.

### Mission objective

Prove the complete chain:

**Create → Pay → Webhook → Paid → Queued → Printable → Print → Mail**

### Current work

* Configure and verify the Stripe sandbox webhook.
* Install the Stripe sandbox secrets in Firebase.
* Confirm email infrastructure required by the fulfillment flow.
* Deploy the current Functions, Firestore configuration, and Hosting.
* Complete a Stripe sandbox checkout.
* Verify successful and expired checkout webhook handling.
* Verify promotion reservation cleanup.
* Confirm a successful order becomes paid, queued, and printable.
* Verify the correct postcard image, message, recipient address, and return address reach fulfillment.

### September 22 software verification

Firebase beta deployment and sandbox payment rehearsal passed. A Stripe test
payment reached a paid, queued order with its return address; a fully discounted
order queued correctly; expired sessions released promotion reservations.
All 15 backend tests passed. See [launch results](launch-recommendations.md) for
order IDs and remaining checks. The physical print/mail and real-payment
criteria below remain open, so this mission remains in progress. The separate
EtherStudios website copy at https://etherstudios.net/projects/wywh/ was verified
on September 24: all 40 public files match the local release, the finalized logo
renders, and the checkout service accepts the EtherStudios origin.

### Mission completion criteria

This mission is complete when we have:

1. Successfully exercised the full payment flow.
2. Verified the order transitions correctly through fulfillment.
3. Generated the intended printable postcard.
4. Completed one real **$2.99** payment.
5. Printed the postcard.
6. Mailed the postcard.
7. Confirmed that the physical postcard matches the sender's preview.

**When this milestone is complete, WYWH will have used WYWH to send a real postcard.**

---

# Completed Milestones

## Milestone 1 — First Cloud-Backed Order

**Completed:** July 8, 2026

WYWH established its first complete vertical slice from the browser into the cloud.

### Achievements

* Firebase project configured.
* Firestore integrated.
* Checkout flow writes orders to Firestore.
* First successful end-to-end cloud-backed order.
* Core vertical slice established.

---

## Milestone 2 — Fulfillment-Ready Postcard

**Completed:** August 16, 2026

WYWH evolved from simply creating an order to creating an order containing the information and assets necessary to become the intended physical postcard.

### Automatic photo orientation

* Correct embedded camera-orientation metadata.
* Detect portrait and landscape photos.
* Rotate portrait photos into the landscape postcard format.
* Normalize the final JPEG pixels instead of depending on print-time CSS.
* Preserve orientation decisions throughout upload, preview, checkout, and fulfillment.
* Ensure the sender's preview matches the intended printed result.

### Postcard back and return address

* Collect sender identity separately from Stripe cardholder information.
* Use the Stripe-verified billing address as the default return address for paid orders.
* Support an alternate return mailing address.
* Require a return address for fully discounted orders where Stripe is skipped.
* Add a subtle sender `From` block.
* Add the WYWH URL sign-off beneath the message.
* Reserve the bottom 5/8-inch band for future USPS routing and Intelligent Mail barcode use.

### Promotion management

* Protected operator interface for managing promotion codes.
* Fixed and percentage discounts.
* Promotion start/end scheduling.
* Active/inactive status.
* Redemption limits.
* Server-side promotion validation.
* Atomic redemption accounting.

### Promotion redemption hardening

* Paid checkouts reserve limited promotions instead of immediately redeeming them.
* Successful Stripe payment converts a reservation into a redemption.
* Expired Stripe sessions release abandoned reservations.
* Scheduled cleanup releases stale reservations.
* Webhook replay is idempotent.
* Free promotional orders remain an immediate atomic redemption.

---

# Next Milestone — Private Beta

**Status:** UPCOMING

Once the transaction-to-mailbox loop has been proven, WYWH will move into a small private beta.

The private beta is intentionally a **learning phase**, not the final production architecture.

## Objective

Determine whether real people can successfully send a WYWH postcard **without coaching**.

## Beta strategy

Use the existing `wish-you-were-here-dev` Firebase project for a small group of trusted testers.

While real beta orders are active:

* Treat every deployment as customer-impacting.
* Keep test orders distinguishable from real beta orders.
* Avoid destructive experiments.
* Protect recipient and sender data.
* Monitor payment and fulfillment failures closely.

## Before invitations

* Harden the existing Firebase environment.
* Review and deploy Firestore and Storage security rules and indexes.
* Verify Authentication, Functions, Hosting, email, and payment infrastructure.
* Verify the custom domain.
* Add appropriate budget alerts and error monitoring.
* Establish a backup/recovery procedure.
* Clean unnecessary test data.
* Complete the real-payment, print, and mailing rehearsal.

## Beta learning loop

Invite a small group of known testers and observe:

* Can they understand WYWH without explanation?
* Can they complete a postcard without coaching?
* Where do they hesitate?
* What causes confusion?
* What breaks?
* Does the preview create the right expectation?
* Does the printed postcard match the preview?
* Does the delivered postcard feel like the product we intended to create?
* Would the sender use WYWH again?
* What do users ask for that we did not anticipate?

Record friction, confusion, failures, and product suggestions.

**Do not automatically build every requested feature.**

Use beta behavior to determine which problems actually matter.

---

# Beta Learnings → Public Launch Candidate

After the private beta, prioritize the lessons learned from actual users.

Fix the problems that materially affect the core experience:

**Photo → Message → Recipient → Payment → Postcard → Mailbox**

Avoid polishing or expanding parts of the product that beta users demonstrate they do not need.

When the core experience is ready, prepare the public-launch release candidate.

## Production environment

Before expanding beyond the trusted beta group:

* Create a separate production Firebase project.
* Configure Hosting, Firestore, Storage, Authentication, Functions, rules, indexes, and secrets.
* Establish explicit `dev` and `prod` Firebase CLI aliases.
* Configure production monitoring and operational safeguards.
* Configure the production custom domain.
* Migrate the verified configuration.
* Keep `wish-you-were-here-dev` as the development and experimentation environment.

---

# Public Launch

**Status:** FUTURE

Public launch means WYWH is ready to accept orders from people outside the trusted beta group.

The goal is not simply to put the website on the internet.

The goal is to operate a reliable product where a customer can trust that:

**What they create on their screen will become what someone receives in their mailbox.**

Public-launch readiness will be determined by the results of the private beta rather than by an arbitrary feature checklist.

---

# Beyond the MVP

These ideas are intentionally **not part of the current MVP**.

They are captured here so we do not lose them while remaining focused on proving the postcard experience first.

Private-beta behavior and customer feedback should help determine their eventual priority.

---

## Occasion-Based Sending

The core WYWH engine may ultimately extend beyond travel postcards.

At its heart, WYWH enables someone to turn a digital photo and message into a physical piece of communication without the traditional friction of buying a card, printing a photo, addressing an envelope, finding postage, and mailing it.

That creates opportunities for other occasions.

### Thank You Cards — Personalized 1→1

A sender could use a common photo or event as the starting point while writing personalized messages to individual recipients.

Example:

> Grandma,
>
> Charlie really loved the dinosaur you gave him for his fifth birthday. Thank you!

Potential occasions include:

* Birthdays
* Bridal showers
* Baby showers
* Weddings
* Graduations
* Gifts
* Parties and other events

The important product characteristic is:

**Shared occasion → individualized messages → individual recipients**

---

## Holiday Cards — 1→Many

A sender could select one photo, write one message, and send the same card to many recipients.

Example:

> Have a wonderful 2027!
>
> Love,
> The Smith Family

The important product characteristic is:

**One photo + one message → many recipients**

This introduces capabilities such as multi-recipient sending, batch fulfillment, and address-book management without changing the fundamental WYWH communication engine.

---

## Saved Addresses and Payments

The [customer accounts plan](accounts-plan.md) now defines past orders, saved
recipient addresses, a home/default return address, and card, Apple Pay, and
Google Pay checkout. Plan and build this alongside beta learning while keeping
guest checkout available. The finalized transparent logo is now used across the branded public pages;
see the plan for the approved asset.

Authenticated users could eventually opt into saving:

* A default return address.
* Multiple labeled mailing addresses.
* Consented recipient addresses.
* Frequently used recipients.

Stripe should remain responsible for saved payment methods and sensitive billing information.

WYWH should store only the Stripe customer reference and the mailing information required by the product.

Saved addresses become especially valuable if WYWH expands into repeat sending, Thank You cards, holiday cards, and other multi-recipient experiences.

---

## Other Future Enhancements

Possible enhancements should remain outside the MVP unless beta feedback demonstrates a compelling need.

Examples already identified include:

* Manual photo cropping.
* Manual photo positioning.
* Additional postcard customization.
* Address-book functionality.
* Multi-recipient workflows.
* Batch sending.

Future ideas should be captured here before being promoted into active roadmap milestones.

---

# Roadmap Rules

This document is the **canonical WYWH product roadmap**.

It should be reviewed at the beginning of development sessions involving the product owner, ChatGPT, or Codex.

### When starting a session

1. Identify the **Current Mission**.
2. Determine the smallest shippable piece that moves that mission forward.
3. Understand the reason for the change before implementing it.
4. Avoid unrelated scope expansion.

### When completing a mission

1. Verify that its completion criteria have actually been met.
2. Move the mission into **Completed Milestones**.
3. Record its completion date.
4. Promote the next milestone to **Current Mission**.
5. Update this document.
6. Commit the roadmap update with the corresponding project work when appropriate.

### When discovering a new idea

Do not automatically add it to the MVP.

Capture promising ideas under **Beyond the MVP** and allow product evidence to determine their priority.

---

# Supporting Documents

The roadmap describes **where WYWH is going and why**.

Detailed implementation and operational instructions should live in separate documents so this roadmap remains readable.

Supporting documentation includes:

* Launch and deployment runbook.
* Stripe sandbox and production configuration.
* Firebase private-beta hardening checklist.
* Postcard design specification.
* Security rules and infrastructure documentation.
* Fulfillment procedures.

---

# North Star

The immediate goal is not more features.

The immediate goal is not a perfect architecture.

The immediate goal is not a large launch.

**The goal is to make WYWH real.**

First:

**Send the postcard.**

Then:

**Watch real people send postcards.**

Then:

**Learn.**

Then:

**Build what matters.**

One brick at a time.
