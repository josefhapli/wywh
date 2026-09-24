# Launch recommendations

Saved July 30, 2026 for the next MVP launch session.

## Next steps — resume here

### September 24 EtherStudios deployment — verified complete

- Verified all 40 public files at https://etherstudios.net/projects/wywh/ against the local release. HTML comparisons exclude only the hosting provider's injected monitoring scripts and normalize line endings.
- Browser review of the ordinary homepage URL shows the finalized logo and current layout. The main EtherStudios root homepage was not replaced.
- Checkout service preflight returned 204 and allowed `https://etherstudios.net`.
- This resolves the interrupted FTP deployment described below. No additional upload was needed during final verification.
- Payments remain sandbox; the physical print rehearsal and live-payment setup/rehearsal remain open. Customer accounts remain planned, not implemented.

### September 23 EtherStudios upload — blocked by FTP connectivity

- Confirmed FileZilla's encrypted saved connection and remote `/projects/wywh` directory.
- Downloaded all 28 existing remote files before replacement. Backup: `/private/tmp/wywh-before-deploy-20260923.tar.gz`.
- Prepared 40 public files at `/private/tmp/wywh-publish-20260922`; verified they match the tested local public directory.
- Resumed the overwrite prompt after the earlier usage-limit block. FileZilla reported one successful new upload (`address-request.html`), then socket errors and connection timeouts.
- Paused the transfer queue with 37 files queued and 2 failed. The custom-domain deployment is incomplete; do not assume it matches Firebase.
- Independent reachability check: HTTPS responds, but FTP port 21 times out. Retry after FTP connectivity is restored; requeue the two failed uploads as well as the remaining queue, then verify the public site.
- The verified Firebase deployment remains available at https://wish-you-were-here-dev.web.app/.


### September 22, 2026 deployed sandbox rehearsal

**Software rehearsal passed; physical print/mail and live-payment rehearsal remain open.**

- Verified Firebase's installed Stripe key is a test key for `acct_1Tw3GSRULXg8cyf9`. Latest key/signing-secret versions matched the previously deployed versions; no credentials were changed or recorded here.
- Deployed Functions, Firestore rules/indexes, Storage rules, and Hosting to `wish-you-were-here-dev`. Review: https://wish-you-were-here-dev.web.app/
- Shipped finalized logo, checkout draft-persistence fix, promotion management, and scheduled reservation cleanup. The new composite index is READY; the cleanup job is ENABLED every 15 minutes and reports a successful last attempt.
- Added payment-webhook replay protection to preserve fulfillment state and original payment time. Promotion edits now preserve counters in a transaction. Cleanup queries reserved orders directly and checks Stripe expiration before releasing a reservation.
- All 15 backend tests passed; all 16 frontend scripts passed syntax checks; local HTML references resolved; deployment dry run and deployment succeeded.
- Stripe-hosted test-card checkout completed and returned to the hosted success page. `WYWH-E376F53B`: $1.99 test payment after a $1 discount, `paid`, fulfillment `queued`, promotion `redeemed`, return address present.
- `WYWH-EF129283`: fully discounted order, `comped`, fulfillment `queued`, return address present.
- `WYWH-9CD6027F`: explicitly expired test session; reservation released. Earlier session `WYWH-0D8B0B01` also naturally expired and released its reservation.
- Test promotion counters finished with one redemption and zero reservations. Both `QA-20260922` and `QA-20260922-FREE` were deactivated after testing.
- Real Stripe event delivery updated Firestore, verifying the deployed webhook's signing-secret compatibility. Replay behavior was regression-tested locally.
- All new rehearsal recipients are labeled **SANDBOX TEST — DO NOT MAIL**. Existing orders were not modified. Do not print or mail these synthetic test orders.
- Apple Pay appeared in this test browser; no wallet payment was exercised and Google Pay availability remains unverified.
- Fulfillment page loads at https://wish-you-were-here-dev.web.app/fulfillment.html and requires the approved Google operator login (`josef.hapli@gmail.com`). User will print an existing order at home.
- `etherstudios.net/projects/wywh/` is separately hosted and was not updated by Firebase deployment. Its publishing access must be established before using it for the campaign.
- Payments remain in sandbox mode. Live credentials/webhook setup and one real payment remain prerequisites for accepting real paid beta orders.

### Print rehearsal at home

1. Open the Firebase fulfillment page and sign in with the approved operator account.
2. Select an existing intended print order, excluding the synthetic orders listed above.
3. Check the photo, message, recipient, and return address. Older orders may predate collection of a sender return address; do not assume they contain one.
4. Use the fulfillment print controls and the layout guidance in `postcard-design.md`. Check physical size, orientation, front/back alignment, and the reserved postal barcode area.
5. Record the result before marking an order printed or mailed. A successful software rehearsal does not establish physical print quality.


### September 22, 2026 Stripe sandbox check

- Confirmed the Gmail login can access the original WishYouWereHere sandbox, account `acct_1Tw3GSRULXg8cyf9`.
- Verified active destination `WYWH Stripe Payment Confirmation` points to `https://us-central1-wish-you-were-here-dev.cloudfunctions.net/stripeWebhook`.
- Added `checkout.session.expired` alongside the existing `checkout.session.completed` subscription and verified the saved destination is active with two events. Preserved the URL, signing secret, and API version (`2026-06-24.dahlia`).
- Firebase's installed key/account match and signing-secret match remain unverified. No deployment or test order was performed in this check.


### September 21, 2026 readiness check

- Fixed the checkout `saveDraft` import locally and updated the checkout script version.
- Browser-verified that sender name, both address lines, city, state, ZIP, and return-address mode persist after refresh. Removed the local test values afterward.
- All 11 existing backend tests passed. These cover validation/access rejection; they do not establish successful Stripe payment or webhook fulfillment.
- Read-only Firebase inspection confirmed `createCheckout` and `stripeWebhook` are ACTIVE. They bind `STRIPE_SECRET_KEY` version 2; the webhook also binds `STRIPE_WEBHOOK_SECRET` version 1. Secret values and sandbox/live mode were not inspected or verified.
- Local exports missing from the deployed function inventory: `validatePromotion`, `listPromotions`, `savePromotion`, and `cleanupExpiredPromotionReservations`.
- Next: establish Stripe sandbox/live mode and matching webhook configuration, review/deploy the pending backend changes with rules/indexes and Hosting, then run paid/free order and expiration rehearsals. Do not assume the local promotion UI is supported by the currently deployed backend.
- No deployment, real payment, print, or mailing was performed in this check.

**Saved:** August 17, 2026
**Current position:** Stripe is open in a sandbox. Configure and verify the
sandbox integration before repeating the setup in live mode.

### Stripe sandbox webhook

- [ ] Open **Workbench → Webhooks** in the current Stripe sandbox.
- [ ] Select **Create destination**.
- [ ] Choose **Events on your account**, not connected accounts.
- [ ] Use the Stripe account's current/default API version.
- [ ] Subscribe to `checkout.session.completed`.
- [ ] Subscribe to `checkout.session.expired`.
- [ ] Choose **Webhook** as the destination type.
- [ ] Enter this endpoint exactly:
  `https://us-central1-wish-you-were-here-dev.cloudfunctions.net/stripeWebhook`
- [ ] Name it `WYWH Firebase webhook — sandbox`.
- [ ] Create the destination.
- [ ] Reveal and securely save its `whsec_` signing secret.
- [ ] Open **API keys** and securely save the sandbox `sk_test_` secret key.

Never paste either secret into chat, documentation, or source control. Store
them in a password manager until they are installed directly as Firebase
secrets.

### After the sandbox credentials are ready

1. Install the sandbox values as Firebase `STRIPE_SECRET_KEY` and
   `STRIPE_WEBHOOK_SECRET` secrets without exposing their values.
2. Confirm `RESEND_API_KEY` is ready and `mail.etherstudios.net` is verified.
3. Deploy Functions, Firestore rules/indexes, and Hosting to
   `wish-you-were-here-dev` after explicit approval.
4. Complete a sandbox checkout using a Stripe test card.
5. Verify both webhook event types and the scheduled promotion-reservation cleanup.
6. Confirm the order becomes paid, queued, and printable with the correct return address.
7. Repeat the Stripe destination and secret setup in live mode before inviting
   private-beta users or accepting real payments.

## Stripe production

- Complete Stripe account and business verification.
- Create or rotate a live secret key and store it in Firebase as `STRIPE_SECRET_KEY`.
- Register the deployed `stripeWebhook` function as a live Stripe webhook endpoint.
- Subscribe the live endpoint to `checkout.session.completed` and `checkout.session.expired`.
- Store that live endpoint's signing secret in Firebase as `STRIPE_WEBHOOK_SECRET`.
- Redeploy the affected Cloud Functions so they bind to the production secret versions.
- Place one real $2.99 order, confirm the order changes to paid and queued, then refund the test payment in Stripe.
- Keep sandbox keys and sandbox webhooks available for development testing.
- Confirm the scheduled promotion-reservation cleanup function is active.

## Firebase private beta

- Use the existing `wish-you-were-here-dev` project for the small, trusted beta group.
- Clean test data before invitations and clearly distinguish remaining test orders from real beta orders.
- Review and deploy Firestore and Storage security rules and indexes.
- Install the live beta secrets and verify Authentication, Functions, Hosting, email, and the custom domain.
- Add deletion protection, budget alerts, error monitoring, and a backup/recovery procedure.
- Treat every deployment during the beta as customer-impacting.
- Avoid destructive experiments while real beta orders or recipient data are present.

## Firebase public launch

- Create a separate production Firebase project after beta findings have been incorporated and before inviting a broader audience.
- Configure it with Hosting, Firestore, Storage, Authentication, Functions, rules, indexes, secrets, monitoring, and the custom domain.
- Add explicit `dev` and `prod` Firebase CLI aliases so deployments always target the intended project.
- Tag the new Firebase project as Production in the Firebase console.
- Retain `wish-you-were-here-dev` for development and future experiments.

## Private-beta learning loop

- Invite a small group of known testers.
- Observe whether they can complete a postcard without coaching.
- Record friction, confusion, failures, and design feedback.
- Confirm the printed and delivered postcard matches the sender's preview.
- Prioritize beta insights before preparing the public-launch release candidate.
