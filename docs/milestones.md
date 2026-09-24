# WYWH Milestones

## Milestone 1 — First Cloud-Backed Order
**Completed:** July 8, 2026

### Achievements
- Firebase project configured
- Firestore integrated
- Checkout flow writes orders to Firestore
- First successful end-to-end cloud-backed order
- Vertical slice established

## Active Roadmap — Private Beta

**Beta strategy:** Launch quickly to a small, trusted group using the existing
`wish-you-were-here-dev` Firebase project. Gather real-user observations and
return to product development with those insights before the public launch.

The private beta is intentionally a learning phase, not the final production
architecture. While beta orders are active, every deployment must be treated as
customer-impacting and test data must be kept separate from real orders.

### Beta release sequence

1. **Completed:** Guarantee automatic photo orientation from upload through preview and print.
2. **Completed:** Add the sender return-address checkout flow and update the print layout with
   the reserved postal barcode band described in `docs/postcard-design.md`.
3. **Completed:** Finalize promotion redemption only after successful payment, while preventing
   limited promotions from being oversubscribed.
4. **Next:** Harden and deploy the existing Firebase project for private-beta use.
5. Complete one real payment, print, and mailing rehearsal.
6. Invite a small trusted tester group and collect structured feedback.
7. Apply beta insights before creating the public-launch release candidate.

### Full-launch transition

Before expanding beyond the trusted beta group, create a separate production
Firebase project and migrate the verified configuration. Keep the current
project as the development environment after the transition.

## Promotion Management

**Activated:** August 16, 2026

Build a protected operator interface for managing promo codes without code
deployments. Promotions should support a code, fixed or percentage discount,
start and end dates, redemption limits, and active/inactive status. Checkout
must continue to validate every promotion server-side; the browser is never the
source of truth for pricing.

### Mission scope

- Protected Google-authenticated operator interface
- Fixed and percentage discounts
- Start/end scheduling, activation status, and redemption limits
- Atomic server-side validation and redemption accounting during checkout

### Redemption hardening

**Implemented:** August 16, 2026

- Paid checkouts reserve rather than redeem a limited promotion.
- Stripe payment completion atomically converts the reservation to a redemption.
- Stripe expiration and scheduled cleanup release abandoned reservations.
- Webhook replay is idempotent and cannot redeem the same order twice.
- Free promotional orders remain an immediate atomic redemption.

## Next Mission — Automatic Photo Orientation

**Implemented:** August 16, 2026

Correct embedded image-orientation metadata, detect portrait and landscape
photos, and automatically prepare them for the 6 × 4 postcard frame. Landscape
photos retain the standard treatment. Portrait photos rotate 90 degrees for an
intentional full-bleed front, and the sender sees that exact result in preview.

Store the selected orientation with the postcard so upload, preview, checkout,
and fulfillment all render identically. Manual crop and position controls are a
post-beta enhancement unless tester feedback demonstrates a clear need.

### Implementation

- Browser image decoding corrects embedded camera orientation before export.
- Portrait sources rotate clockwise into a landscape postcard image.
- The normalized JPEG contains the final pixels instead of depending on print-time CSS.
- The original dimensions and orientation decision travel through address requests,
  checkout orders, previews, and fulfillment.
- Legacy drafts and orders default safely to landscape rendering.

## Beta Postcard Back

**Implemented:** August 16, 2026

Add a subtle sender return address by default, keep the QR code on the front,
and place a quiet WYWH URL sign-off beneath the message. Reserve the full bottom
5/8-inch band for future Intelligent Mail barcodes and USPS routing marks. The
complete visual and checkout decisions are recorded in `docs/postcard-design.md`.

### Implementation

- Checkout collects the sender name independently from Stripe cardholder details.
- Paid orders use the Stripe-verified billing address by default.
- A conditional form captures a different return mailing address when needed.
- Fully discounted orders require the return-address form because Stripe is skipped.
- The payment webhook assigns billing addresses before orders enter fulfillment.
- Preview and print layouts include the subtle `From` block, WYWH URL sign-off,
  and a blank 5/8-inch postal barcode band.

## Post-Beta — Saved Addresses and Payments

Let authenticated users opt into saving a default return address, multiple
labeled mailing addresses, and consented recipient addresses. Stripe remains
the system responsible for saved payment methods and sensitive billing data;
WYWH stores only the Stripe customer reference and product-required mailing
information.
