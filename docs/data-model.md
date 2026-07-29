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

The private address-request MVP may initially populate only the active draft.
Saving the confirmed address as a reusable Recipient is a v2 enhancement and
requires sender authentication plus clear recipient consent.

## Order

Represents the purchase and fulfillment of a Keepsake.

Key fields:

- `id`
- `ownerId`
- `keepsakeId`
- `recipientId`
- `recipientSnapshot`
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
