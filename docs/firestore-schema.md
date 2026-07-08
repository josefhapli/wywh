# Firestore Schema

## Collections

```text
users/{userId}
organizations/{organizationId}
journeys/{journeyId}
memories/{memoryId}
media/{mediaId}
albums/{albumId}
comments/{commentId}
notifications/{notificationId}
invitations/{invitationId}
```

## users

```js
{
  email: "person@example.com",
  displayName: "Person Name",
  photoURL: "https://...",
  defaultOrganizationId: "org_123",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

## organizations

```js
{
  name: "Hapli Family",
  slug: "hapli-family",
  ownerId: "user_123",
  memberIds: ["user_123", "user_456"],
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

## journeys

```js
{
  organizationId: "org_123",
  title: "Summer in Italy",
  description: "A shared travel journal.",
  coverMediaId: "media_123",
  createdBy: "user_123",
  visibility: "organization",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

## memories

```js
{
  organizationId: "org_123",
  journeyId: "journey_123",
  authorId: "user_123",
  title: "Golden hour in Amalfi",
  message: "Wish you were here.",
  location: {
    label: "Amalfi Coast",
    lat: 40.634,
    lng: 14.602
  },
  mediaIds: ["media_123"],
  status: "draft",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

## media

```js
{
  organizationId: "org_123",
  journeyId: "journey_123",
  memoryId: "memory_123",
  uploadedBy: "user_123",
  storagePath: "organizations/org_123/media/media_123.jpg",
  downloadURL: "https://...",
  contentType: "image/jpeg",
  width: 1600,
  height: 1067,
  createdAt: Timestamp
}
```

## albums

```js
{
  organizationId: "org_123",
  journeyId: "journey_123",
  title: "Best Postcards",
  description: "Favorite moments from the trip.",
  memoryIds: ["memory_123"],
  mediaIds: ["media_123"],
  createdBy: "user_123",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

## comments

```js
{
  organizationId: "org_123",
  parentType: "memory",
  parentId: "memory_123",
  authorId: "user_456",
  body: "This one is perfect.",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

## notifications

```js
{
  userId: "user_123",
  type: "order_status",
  title: "Postcard queued",
  body: "Your postcard is queued for printing.",
  readAt: null,
  createdAt: Timestamp,
  data: {
    memoryId: "memory_123"
  }
}
```

## invitations

```js
{
  organizationId: "org_123",
  journeyId: "journey_123",
  email: "guest@example.com",
  role: "member",
  invitedBy: "user_123",
  status: "pending",
  token: "secure-token",
  expiresAt: Timestamp,
  createdAt: Timestamp
}
```

