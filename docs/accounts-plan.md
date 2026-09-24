# Customer accounts and finalized logo

Planned September 21, 2026. This is a product and implementation plan; accounts are not implemented by this document. Keep beta checkout available to guests. Build accounts alongside beta learning without making them an invitation prerequisite.

## Finalized logo

Approved asset: `public/images/WYWH-logo-color-transparent.png`. Updated all 12 branded public pages to use this supplied artwork without modifying the image. Existing header sizing crops the surrounding canvas while keeping the stamp and wordmark visible. Existing accessible home-link labels are preserved.

## My account

| Area | First release behavior |
| --- | --- |
| Past orders | Newest first, postcard thumbnail, recipient, date, amount, payment status, fulfillment status, and order details. Use actual server records with an honest empty state. |
| Saved addresses | Add, edit, delete, and select labeled recipient addresses. Saving is explicit, including addresses received through an address request. |
| My home address | Save a personal mailing address and optionally use it as the default return address. Allow an override for each postcard. Keep it separate from payment billing details. |
| Payments | Pay by credit/debit card, Apple Pay, or Google Pay when available. Opt into saving cards through Stripe and allow their removal. |
| Profile | Name, verified email, sign-in/sign-out, recovery, and account deletion entry point. |

Recommend email/password plus Google sign-in using Firebase Authentication, with verification and password recovery. Preserve the postcard draft through sign-in. Offer account creation after sending as well as through navigation; do not require it to send a postcard.

Apple Pay and Google Pay are checkout wallet actions, not wallet credentials stored in WYWH. Use the label Google Pay at checkout for the requested Google Wallet payment option. Do not show a nonfunctional wallet button on unsupported devices.

## Current implementation gaps

- `public/js/auth.js` only redirects after form submission. Firebase Auth is exported in `public/js/firebase.js`, and a separate service exists under `src`, but customer pages are not wired to real authentication.
- `public/js/orders.js` reads browser-local history. `getOrders()` supplies sample orders when empty; these must not appear as a customer's purchases.
- `createCheckout` creates server orders without assigning an authenticated customer owner. Stripe Checkout currently requests card payments and does not pass a persistent Stripe Customer.
- Firestore rules deny direct order access. Add authenticated server endpoints rather than exposing the full order collection to customers.
- Existing return addresses support billing or a separate address. A saved home address should populate the separate-address path, including fully discounted orders.
- Pre-beta issue resolved locally September 21: imported `saveDraft` in `public/js/checkout.js` and refreshed its script version. Browser verification confirmed sender name, both address lines, city, state, ZIP, and separate/billing address selection survive refresh. All 11 existing backend tests passed; payment-to-print rehearsal remains outstanding.

## Data and access design

- `users/{uid}`: display name, timestamps, `homeAddressId`, and `defaultReturnAddressId`. Home and default return address can be the same but need not be.
- `users/{uid}/addresses/{addressId}`: label, recipient/sender name, address lines, city, state, ZIP, country, and timestamps. Start with the current US mailing scope.
- Server-only customer mapping: Firebase UID to Stripe Customer ID. Never accept customer ownership or a Stripe Customer ID supplied by the browser as authority.
- Orders: add immutable `ownerUid` from verified callable authentication for signed-in orders; leave it null for guests. Store the recipient and return-address snapshots on the order, so editing/deleting a saved address does not change a postcard already purchased.
- Keep card numbers, security codes, and wallet credentials out of Firestore, browser storage, and logs. Fetch only masked payment summaries from Stripe when needed.
- Customer order-list/detail endpoints must enforce ownership, return only customer-visible fields, and paginate by creation time with a stable cursor. Add the owner/date query index. Keep operator access separate.
- Address/profile endpoints must validate allowed fields and ownership. Client changes must never alter order payment or fulfillment state, ownership, or Stripe mappings.
- Sign-out/account changes clear private cached history and addresses. Decide retention and deletion handling before account release, including how paid-order records remain available for fulfillment while saved profile information is removed.

## Existing beta orders

Do not claim historical orders using a typed email, local browser history, or an order number alone. Initially show only orders securely associated with the signed-in UID. If historical linking is needed, implement a separate expiring, single-use ownership-verification flow backed by trusted server evidence. Orders with insufficient ownership evidence require operator review. Do not promise automatic recovery of all past guest orders.

## Delivery sequence

1. **Brand and beta readiness:** identify/swap the logo; verify the existing guest card flow and sender-address persistence. Check actual wallet availability in the configured Stripe environment on compatible devices. Accounts remain planned.
2. **Authentication and past orders:** implement sign-in, recovery, verification, protected account pages, server-owned order association for paid and free orders, paginated history/detail, and removal of sample history. Continue using webhook-confirmed payment and server fulfillment states.
3. **Address book and home:** add address management, default return selection, and checkout autofill. Review the chosen address before submitting; edits affect future orders only. Saving recipient addresses remains optional.
4. **Saved cards:** create/reuse a Stripe Customer safely under concurrent requests, collect explicit consent through Stripe, and support reuse/removal. Keep wallet authorization in each eligible checkout. Adding a card outside a purchase can follow using Stripe-hosted setup.

## Payments implementation notes

Continue Stripe-hosted Checkout. The current `card` configuration does not itself prove wallets are unavailable: Stripe can display eligible Apple Pay and Google Pay options in hosted Checkout. Confirm dashboard configuration and device/browser eligibility before changing the integration or advertising availability. Always retain a card fallback.

For saved cards, associate the authenticated Stripe Customer with each new session and use Stripe's saving/redisplay controls with consent. Recheck the supported parameters against the installed SDK during implementation. Wallet payments do not appear as reusable saved options in Checkout; authorize them through the wallet UI each time. A wallet or card billing address must not silently overwrite the user's home address.

References checked September 21, 2026:

- [Stripe Checkout payment options](https://stripe.com/payments/checkout)
- [Stripe existing-customer payments and wallet limitations](https://docs.stripe.com/payments/existing-customers?platform=web&ui=stripe-hosted)
- [Stripe Checkout payment-method configuration](https://docs.stripe.com/payments/checkout/payment-methods)

## Release acceptance

- A new user sees an empty history; a returning user sees the same real orders on another device.
- Two users cannot read or modify each other's orders, addresses, or saved-payment settings, including by changing request identifiers.
- Guest checkout and fully discounted orders continue working. Signed-in paid and free orders attach to the correct owner.
- An abandoned payment never appears as paid; webhook replay never duplicates an order or promotion redemption.
- Updating/deleting home or recipient addresses never changes purchased order snapshots. Free orders have a complete return address without requiring payment.
- Saved-card consent, reuse, removal, declined payment, cancellation, expired sessions, and concurrent customer creation are exercised in Stripe test mode.
- Eligible Apple Pay and Google Pay checkouts succeed; ineligible devices retain working card checkout. No unsupported wallet promise appears in the account UI.
- Sign-in, verification, recovery, sign-out, and changing accounts preserve the intended draft without exposing another customer's saved information.
- Final logo renders without clipping at mobile and desktop sizes across public pages.
