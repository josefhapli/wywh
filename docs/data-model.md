# Data Model

Users & Collaboration
---------------------
User
Organization
Invitation
Notification

Content
-------
Journey
Memory
Media
Album
Comment

Commerce
--------
Keepsake
Order
Product
Template
Promotion
Recipient

## User

Represents a Firebase Auth user profile.

Key fields:

- `id`
- `email`
- `displayName`
- `photoURL`
- `defaultOrganizationId`
- `createdAt`
- `updatedAt`

## Organization

Represents a shared workspace.

Key fields:

- `id`
- `name`
- `slug`
- `ownerId`
- `memberIds`
- `createdAt`
- `updatedAt`

## Journey

Represents a trip, campaign, event, or memory collection.

Key fields:

- `id`
- `organizationId`
- `title`
- `description`
- `coverMediaId`
- `createdBy`
- `visibility`
- `createdAt`
- `updatedAt`

## Memory

Represents a meaningful moment captured by a user.

A Memory is the canonical source of content within WYWH.
It may be transformed into one or more Keepsakes but is never tied to a
specific product or order.

Key fields:

- `id`
- `organizationId`
- `journeyId`
- `authorId`
- `title`
- `message`
- `location`
- `mediaIds`
- `status`
- `createdAt`
- `updatedAt`

## Keepsake

Represents a designed presentation of a Memory.

A Keepsake references a Memory and stores all product-specific
layout and design information.

A single Memory may have multiple Keepsakes.

Key fields:

- `id`
- `memoryId`
- `ownerId`
- `productId`
- `templateId`
- `layoutData`
- `cropData`
- `imageOrientation` (`landscape` or `portrait-clockwise`)
- `imageSourceWidth`
- `imageSourceHeight`
- `status`
- `createdAt`
- `updatedAt`

## Recipient

Represents a person who can receive one or more Keepsakes.

Each recipient belongs to one authenticated sender. An order stores an address
snapshot so a later address-book edit cannot change an order already placed.

Key fields:

- `id`
- `ownerId`
- `displayName`
- `email`
- `phone`
- `address.line1`
- `address.line2`
- `address.city`
- `address.region`
- `address.postalCode`
- `address.country`
- `addressSource` (`manual`, `request`, or `contact-picker`)
- `addressVerifiedAt`
- `favorite`
- `createdAt`
- `updatedAt`

The private address-request MVP restores a short-lived cloud draft into the
sender's browser after the recipient replies. Saving
the confirmed address as a reusable Recipient is a v2 enhancement and requires
sender authentication plus clear recipient consent.

## AddressRequest

Represents a short-lived, single-use request for a recipient to provide the
mailing address for the sender's active postcard draft.

Key fields:

- `id` (random request identifier)
- `status` (`pending`, `completed`, or `claimed`)
- `recipientName`
- `recipientEmail`
- `senderName`
- `senderEmail` (verified by Google or a one-time email code)
- `recognitionNote` (optional)
- `draft` (temporary photo, message, and recipient name)
- `appUrl` (the sender surface to resume)
- `submitTokenHash` (removed when the recipient submits)
- `claimTokenHash` (removed when the sender claims)
- `address` (present only between submission and claim)
- `createdAt`
- `updatedAt`
- `expiresAt`
- `completedAt`
- `claimedAt`

WYWH emails the recipient a request ID plus submission secret. After submission,
WYWH emails the verified sender a separate one-time claim secret. Raw secrets
are never stored in Firestore. Browser access to the collection is denied; Cloud
Functions validate the secrets and enforce one-time transitions. After the
sender claims the completed request, the function returns the resumable draft
and address, then deletes both private payloads and the remaining claim hash.

## SenderEmailVerification

Represents a short-lived email-code challenge for a sender who does not use
Google sign-in. The document ID is a hash of the normalized email. It contains
only hashed codes and proof tokens, enforces a resend delay and attempt limit,
and can authorize one address request before expiring.

## Order

Represents the purchase and fulfillment of a Keepsake.

Key fields:

- `id`
- `ownerId`
- `keepsakeId`
- `recipientId`
- `recipientSnapshot`
- `sender.name`
- `sender.returnAddress`
- `sender.returnAddressSource` (`billing` or `separate`)
- `promotionId`
- `subtotal`
- `shipping`
- `tax`
- `total`
- `paymentStatus`
- `fulfillmentStatus`
- `trackingNumber`
- `createdAt`
- `updatedAt`

The sender and recipient snapshots are immutable fulfillment records. For a
paid order that uses the billing address as its return address, the Stripe
webhook writes the verified billing address into `sender.returnAddress`
before the order enters the fulfillment queue. Fully discounted orders must
provide a separate return address because they do not visit Stripe Checkout.

## Promotion

Represents an operator-managed discount that is always evaluated by Cloud
Functions. The normalized code is also the Firestore document ID.

Key fields:

- `code`
- `discountType` (`fixed` or `percentage`)
- `discountValue` (cents for fixed discounts; whole percent otherwise)
- `startsAt`
- `endsAt` (optional)
- `redemptionLimit` (optional)
- `redemptionCount`
- `reservationCount`
- `active`
- `createdAt`
- `updatedAt`

Paid promotional checkouts temporarily increment `reservationCount`. Successful
payment atomically moves that slot to `redemptionCount`; Stripe expiration or
scheduled cleanup releases it. Fully discounted orders increment
`redemptionCount` immediately in the same transaction that creates the order.

## Media

Represents an uploaded file.

Key fields:

- `id`
- `organizationId`
- `journeyId`
- `memoryId`
- `uploadedBy`
- `storagePath`
- `downloadURL`
- `contentType`
- `width`
- `height`
- `createdAt`

## Album

Represents a curated group of memories and media.

Key fields:

- `id`
- `organizationId`
- `journeyId`
- `title`
- `description`
- `memoryIds`
- `mediaIds`
- `createdBy`
- `createdAt`
- `updatedAt`

## Comment

Represents discussion on memories or albums.

Key fields:

- `id`
- `organizationId`
- `parentType`
- `parentId`
- `authorId`
- `body`
- `createdAt`
- `updatedAt`

## Notification

Represents an app-visible event for a user.

Key fields:

- `id`
- `userId`
- `type`
- `title`
- `body`
- `readAt`
- `createdAt`
- `data`

## Invitation

Represents a pending invite.

Key fields:

- `id`
- `organizationId`
- `journeyId`
- `email`
- `role`
- `invitedBy`
- `status`
- `token`
- `expiresAt`
- `createdAt`
