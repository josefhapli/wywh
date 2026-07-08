# Firestore Indexes

The production index file lives in `firebase/firestore.indexes.json`.

## Included Indexes

The first index set supports common app screens:

- Journeys by organization, newest first.
- Memories by journey, newest first.
- Media by memory, newest first.
- Albums by journey, newest first.
- Comments by parent item, oldest first.
- Notifications by user, newest first.
- Invitations by organization and status, newest first.

## Deployment

Deploy indexes with:

```bash
firebase deploy --only firestore:indexes
```

