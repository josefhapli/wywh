# Data Model

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

Represents a story, moment, or postcard source.

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

