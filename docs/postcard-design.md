# Postcard Design Decisions

Recorded August 16, 2026 for the private-beta postcard.

## Design hierarchy

The sender-recipient relationship remains the focus. WYWH should feel like the
quiet mechanism that makes the exchange possible, not a competing message.

## Front

- Use the sender-approved automatic photo orientation.
- Normalize embedded camera-orientation metadata during upload. Portrait source
  pixels rotate clockwise into the landscape frame before the draft is saved.
- Keep the WYWH QR code as the primary invitation for the recipient to respond.
- The QR code continues to open the public WYWH redirect; it must not encode
  private order, sender, or recipient data.

## Address side

- Place a subtle `From` block in the upper-left with the sender's name and return
  mailing address.
- Keep the return address visually secondary, using small type and the existing
  secondary text color.
- Place the sender's message in the left-middle area.
- Put a quiet WYWH sign-off directly beneath the message, including the public
  WYWH URL.
- Keep the postage area in the upper-right and the recipient address as the
  strongest element on the address side after the message.
- Reserve a visually empty white band along the bottom for postal barcoding.
  Do not place branding, rules, decorative elements, or message text there.

The USPS barcode clear zone for a postcard occupies the lower-right portion of
the address side, extending 4 3/4 inches from the right edge and 5/8 inch from
the bottom. WYWH reserves the full 5/8-inch bottom band for a cleaner and more
forgiving layout. See the [USPS Domestic Mail Manual](https://pe.usps.com/cpim/ftp/manuals/dmm300/full/mailingStandards.pdf).

## Intelligent Mail barcode readiness

The beta reserves compliant space but does not print a placeholder barcode. A
real Intelligent Mail barcode must be generated from valid USPS mailing data,
including the service type, Mailer ID, serial number, and delivery-point routing
code. Generation will be added when WYWH enrolls with USPS or integrates with a
print-and-mail partner. See [USPS Intelligent Mail barcode resources](https://postalpro.usps.com/mailing/intelligent-mail-barcode).

Until that integration exists, the reserved postal band remains blank so USPS
equipment has a clean area in which to apply routing marks.

## Checkout and return-address behavior

Return addresses are included by default; this is not a separate creation step.

- Checkout always collects the sender's display name independently from the
  cardholder name.
- The page explains that the return address will be printed on the postcard.
- Stripe Checkout collects the billing address for paid orders.
- Checkout shows an unchecked option: `Is your return mailing address different
  from your billing address?`
- When checked, WYWH reveals and requires a separate return-address form.
- When unchecked, the verified Stripe billing address becomes the return address
  after successful payment.
- A fully discounted order does not visit Stripe, so WYWH automatically reveals
  and requires the return-address form.
- Every order stores an immutable sender/return-address snapshot so fulfillment
  reproduces the address-side preview consistently.

The browser must not be trusted to replace a return address with billing data.
For paid orders, the Stripe webhook performs that final server-side assignment.

## Post-beta account experience

Authenticated users may opt into saving mailing information after the private
beta. The planned experience includes:

- A sender profile with a preferred display name and default return address.
- Multiple labeled mailing addresses, such as Home or Work.
- A consent-based recipient address book.
- An option to update saved information when checkout details change.
- Stripe-managed saved payment methods and billing details.

WYWH does not store card details. It stores only the Stripe customer reference
and the mailing information needed to create and fulfill postcards. Each order
continues to retain its own immutable address snapshot so later profile edits
cannot alter an order already placed.
