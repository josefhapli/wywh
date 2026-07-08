# Firestore Rules

The production rules live in `firebase/firestore.rules`.

## Access Model

- Users can read and update their own user profile.
- Organization members can read organization-scoped data.
- Organization owners can update organization records.
- Authenticated organization members can create journeys, memories, media, albums, and comments.
- Users can read their own notifications.
- Invitations are restricted to organization members for now.

## Notes

The first version uses `memberIds` arrays on organizations for simple membership checks. This is easy to understand and works for small MVP workspaces. If organizations grow large, move membership into a subcollection such as:

```text
organizations/{organizationId}/members/{userId}
```

That change will require updated rules and service methods.

## Deployment

Deploy rules with:

```bash
firebase deploy --only firestore:rules
```

