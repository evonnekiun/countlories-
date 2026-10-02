# goodform mobile MVP

A mobile-first Expo / React Native app for iOS and Android, with Supabase email accounts and private cloud sync for personal tracking.

## Run on a phone

1. Install Expo Go on your development phone.
2. From this folder, run `npm run start`.
3. Scan Expo's QR code with your phone.

A web preview can be started with `npx expo start --web`.

## Supabase setup

1. Create a Supabase project and add its project URL and publishable key to `mobile-app/.env.local` as `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
2. In Supabase Dashboard, open **SQL Editor**, paste and run [`supabase/schema.sql`](supabase/schema.sql) once. This creates the app's tables and account-only Row Level Security policies.
3. Enable email/password sign-in in Supabase Authentication. If email confirmation is enabled, confirm the signup email, then return to the app and sign in.
4. Run the app. Create an account, then complete your profile.

More detailed instructions and boundaries are in [`BACKEND_SETUP.md`](BACKEND_SETUP.md). Never put a service-role key or AI provider key in the app. The `.env.local` file is ignored by Git; Expo public variables are included in the app bundle, so use only the project URL and publishable key there.

## Current MVP

- Email/password sign up and sign in through Supabase Auth; sessions persist on the device.
- Profile, food entries, movement entries, and meal plans sync to Supabase and are protected by owner-only RLS policies.
- The app keeps a per-account local cache for convenience. Existing prototype data in the old shared local store is not imported into an account automatically.
- Local circle posts and reports stay on this device. They are not shared with other users or synced between devices.
- Food photos can be attached for manual entry; the app does not upload or analyse them.

## Still to build before a public launch

Password recovery and account deletion flows, social/circle sync and moderation, friend invitations and messaging, food photo analysis, and AI goal suggestions are not connected. See the backend guide for setup and launch considerations. Use test data until privacy, deletion, and access controls have been reviewed.
