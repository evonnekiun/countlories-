# goodform mobile MVP

A mobile-first Expo / React Native app for iOS and Android.

## Run on a phone

1. Install Expo Go on a development phone.
2. From this folder, run npm run start.
3. Scan Expo's QR code with your phone.

A web preview can be started with npx expo start --web.

## Current MVP

- First-run onboarding requires name, height, current weight, goal weight, and editable calorie, protein, carbohydrate, and fat guides.
- Calorie tracking is always displayed; users can edit the goal.
- On-device food logs track calories, protein, carbs, and fat, with progress bars and a seven-day check-in view.
- Weekly meal planner for flexible meal ideas.
- Add a meal photo from the camera or photo library, then enter/edit its nutrition values.
- Private on-device food and movement logs.
- Local circle posts and reactions, with a report action that saves a local report record.
- Settings tab for goals, local data reset, safety/privacy notes, and report count.
- AsyncStorage persistence (not app-encrypted; use sample data only).
- Expo Router bottom-tab navigation.

## Not connected yet

AI-generated calorie/protein recommendations, account signup/login, cloud sync, online invitations, shared feed, direct messaging, server-side reports/moderation, photo nutrition estimates, and account deletion are not implemented. The photo flow attaches an image and lets the user enter or edit nutrition values; it does not analyse food yet. AI features require a secure server-side service; the UI explains this rather than inventing an AI result. Backend setup steps and a starting schema are in BACKEND_SETUP.md.

Before inviting real users, configure authenticated storage, access control, deletion, block/report and moderation flows, privacy policy, and app-store health/data declarations. Use sample data until storage is encrypted and privacy/security review is complete.
