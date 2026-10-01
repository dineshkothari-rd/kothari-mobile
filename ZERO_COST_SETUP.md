# Zero-cost production setup

This project intentionally stays on Firebase's no-cost Spark plan. Do not enable billing for the items below.

## Required free console settings

1. Firebase Authentication → Settings → Password policy:
   - minimum 12 characters
   - require uppercase, lowercase, number, and symbol
2. Firebase Authentication → Settings → User actions:
   - enable email enumeration protection
3. Firebase Authentication → Settings → Authorized domains:
   - keep only domains actually used by the app
   - remove `localhost` from the production project
4. Create a separate free Firebase project for development. Never point local builds at production.
5. Deploy and verify the checked-in Firestore rules before releasing:

   ```sh
   firebase deploy --only firestore:rules
   ```

## Business configuration

Set these in `.env` to match the property:

```sh
EXPO_PUBLIC_ROOM_START=101
EXPO_PUBLIC_ROOM_COUNT=14
EXPO_PUBLIC_PG_ROOM_CAPACITY=2
```

Rebuild the native app after changing them.

## Deliberately not enabled

- Cloud Storage: Firebase requires the Blaze billing plan. Photos remain compressed and size-limited in Firestore.
- Cloud Functions: production deployment requires billing, so account provisioning remains client-side and Firestore profiles remain the authorization boundary.
- SMS MFA: SMS verification requires the paid plan.
- Firestore PITR/scheduled backups: billed features.
- App Check/Crashlytics: the current Firebase JavaScript SDK cannot provide native attestation or Crashlytics. Adding them safely requires a React Native Firebase migration and native Firebase configuration files.

Never enable App Check enforcement before a compatible client build is installed on every active device; doing so would lock legitimate users out.
