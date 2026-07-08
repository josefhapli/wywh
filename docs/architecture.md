# Wish You Were Here Architecture

## Product Shape

Wish You Were Here is a memory-sharing and postcard app. The near-term product lets a user upload a photo, write a message, enter a recipient address, pay, and create a print-ready order. The broader architecture also supports organizations, journeys, memories, albums, comments, notifications, and invitations.

## Frontend

The current app is a static HTML/CSS/JavaScript prototype. The next step is to connect the UI to Firebase services through the modules in `src/services`.

Recommended frontend flow:

1. User signs in.
2. User creates or joins an organization.
3. User creates a journey.
4. User adds memories and media.
5. User groups memories into albums.
6. User shares albums or creates postcard orders.
7. User receives notifications as work moves through the flow.

## Firebase Services

Use Firebase for the first production version:

- Firebase Authentication for accounts.
- Cloud Firestore for structured app data.
- Firebase Storage for photos and generated assets.
- Cloud Functions later for Stripe checkout, printable PDFs, email, and print queue automation.
- Firebase Hosting or another static host for the frontend.

## Main Domains

- User: authenticated person using the app.
- Organization: shared workspace for families, teams, or customers.
- Journey: trip, event, campaign, or memory collection.
- Memory: narrative post or postcard source content.
- Media: uploaded photo or related file.
- Album: curated collection of memories or media.
- Comment: discussion attached to memories or albums.
- Notification: app-visible status update.
- Invitation: pending invite into an organization or journey.

## Client Data Access

The frontend should not talk to Firestore directly from page scripts. Use service modules:

- `authService.js` handles sign-in, sign-out, and current-user state.
- `firestoreService.js` handles CRUD operations for app collections.
- `storageService.js` handles file upload and download URLs.

This keeps page code small and makes future migration to React, Vue, or another framework easier.

## Suggested Build Order

1. Connect Firebase Auth.
2. Save user profiles in `users`.
3. Save uploaded postcard photos in Storage and `media`.
4. Save drafts/orders as `memories` or a future `postcardOrders` collection.
5. Add organization and journey membership.
6. Add Firestore rules and indexes from `/firebase`.
7. Add Stripe and print-ready PDF generation through Cloud Functions.

