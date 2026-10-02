# goodform backend setup (Supabase)

The app now uses Supabase Auth and syncs profiles, food entries, movement entries, and meal plans. The included SQL creates those tables and owner-only Row Level Security (RLS) policies. Social features, invitations, messaging, moderation, and food-photo analysis are still local or not connected. Use test data until you have checked the access policies.

## 1. Create the project

1. Create a Supabase project in a region appropriate for your users (for a UK launch, consider a UK/EU region).
2. Keep the database password and service_role key in a password manager. Never put the service-role key or an AI provider key in the app.
3. In Authentication, enable email/password or email magic links. Configure email confirmation, password recovery, rate limits, and production redirect URLs.
4. In project API settings, copy the project URL and publishable/anon key. These can be used by the mobile app only when Row Level Security (RLS) is enabled on every exposed table.

### Configure email confirmation to return to the phone

The app sends a confirmation redirect to its `auth/callback` deep link and exchanges the returned code for a session. Without a matching Supabase redirect setting, Auth falls back to the **Site URL**; a default such as `http://localhost:3000` cannot be opened from a phone, which can look like a server connection failure.

1. In Supabase Dashboard, open **Authentication → URL Configuration**.
2. Under **Redirect URLs**, add `exp://**` for Expo Go development and `goodform://auth/callback` for an installed development/production build. The app's `goodform` scheme is set in `app.json`.
3. Keep the Site URL set to a real web page you control if you have one. The app passes its own redirect for signups; the Site URL is only the fallback.
4. After changing the setting, request a fresh signup confirmation email. Links already sent still contain the previous redirect.

The Expo Go redirect can vary with the local development session. Supabase supports wildcard redirect patterns for development; keep broad patterns such as `exp://**` for development only. For a shipped app, use the exact app callback URL and test it in a development build.

## 2. Create this app’s tables and privacy rules

1. In Supabase Dashboard, open **SQL Editor** for your project.
2. Open `supabase/schema.sql` in this repository, copy the whole file into a new SQL query, and run it once.
3. This creates the four tables the app currently uses: `profiles`, `food_entries`, `movement_entries`, and `meal_plans`. It also enables RLS and adds policies that limit each signed-in user to rows they own.
4. Do not run the file repeatedly: it is an initial schema, not a repeatable migration. If SQL reports an error, fix the reported issue before signing up or saving personal data.

RLS is the database-side privacy boundary. The app also filters queries by the signed-in account, but those filters alone are not security. Do not disable RLS or add a public `using (true)` policy.

## 3. Initial data model

Use UUIDs, timestamps, and an owner field on personal records. Keep weight and nutrition logs private; sharing should be a separate, explicit action.

Suggested tables:

- profiles: id (primary key references auth.users.id), display_name, height_cm, current_weight_kg, goal_weight_kg, calorie_goal, protein_goal_g, carbs_goal_g, fat_goal_g, focus, created_at, updated_at.
- food_entries: id, user_id, eaten_at, food_name, calories, protein_g, carbs_g, fat_g, source (manual / ai_estimate), created_at. Store any uploaded photo in private object storage with short-lived access and a deletion policy; do not make meal photos public.
- meal_plans: id, user_id, planned_for, meal_name, notes, created_at, updated_at. These are personal and should use the same owner-only RLS policy as food entries.
- movement_entries: id, user_id, moved_at, activity, feeling, created_at.
- circles: id, name, created_by, created_at.
- circle_members: circle_id, user_id, role, joined_at; unique (circle_id,user_id).
- circle_posts: id, circle_id, author_id, body, created_at.
- post_reactions: post_id, user_id, created_at; unique (post_id,user_id).
- messages: id, circle_id, sender_id, body, created_at.
- reports: id, reporter_id, post_id (nullable for users/messages), reported_user_id, reason, details, status, created_at.

Never copy weight, calories, or private profile details into circle posts automatically. Consider whether direct messages are needed in the first release; a circle-only feed is simpler and safer.

## 4. Access control

Enable RLS on all tables. Personal tables should enforce auth.uid() = user_id for select, insert, update, and delete. A profile should allow a user to select/update only their own row. Membership should only be exposed to members of that same circle. Posts and messages should be readable only by circle members; inserts must require author_id/sender_id = auth.uid() and membership. Reports may be inserted by an authenticated reporter, but only a trusted moderation role should read or resolve all reports.

Example pattern for a personal table (repeat with the correct owner column):

    alter table public.food_entries enable row level security;
    create policy "owner reads food" on public.food_entries
      for select to authenticated using (user_id = (select auth.uid()));
    create policy "owner adds food" on public.food_entries
      for insert to authenticated with check (user_id = (select auth.uid()));
    create policy "owner edits food" on public.food_entries
      for update to authenticated
      using (user_id = (select auth.uid()))
      with check (user_id = (select auth.uid()));
    create policy "owner deletes food" on public.food_entries
      for delete to authenticated using (user_id = (select auth.uid()));

This sample is not a complete policy set. Add foreign keys, constraints (non-negative nutrient values, valid enum values), indexes for owner/time and circle/time, and test cross-account access with two separate test users before launch. Avoid broad policies such as using (true).

## 5. Connect and use the app

1. The Supabase client and AsyncStorage session persistence are already configured in `src/lib/supabase.ts`. The app reads `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from the project-root `.env.local`.
2. The sign-up/sign-in UI and session restore are implemented. Enable email/password in Supabase Authentication and configure the confirmation redirect above. The app handles the returned link and establishes the session.
3. Profiles and personal food, movement, and meal-plan records use the authenticated user's ID. The four corresponding tables are covered by the supplied RLS policies.
4. Existing prototype data in the former shared AsyncStorage key is intentionally not copied into user accounts. The signed-in app keeps a local per-account cache; circle posts and reports remain device-local.
5. Password recovery, account deletion, invitations, shared social features, messaging, and server-side moderation still need to be built. Do not tell users those features are private or cloud-synced until implemented and protected.

## 6. AI calorie estimates and suggested goals

Call AI from a server-side Edge Function, never directly from the app with a provider secret. Ask for structured output (calories, protein_g, carbs_g, fat_g) and keep estimates editable with uncertainty clearly visible. The current app only selects/takes a photo and permits manual nutrition entry; it does not upload the image or return AI estimates. For a future analysis flow, obtain clear consent before uploading meal photos, store them privately, and set retention/deletion rules. For goal suggestions, only collect data a qualified product/clinical reviewer says is necessary; an LLM should not present guesses as medical advice. Add safeguards for under-18 users, pregnancy, eating disorder history, and medical conditions, and provide a way to skip suggestions and enter personal goals.

## 7. Before real-user launch

- Publish an accurate privacy policy and retention/deletion schedule.
- Complete the App Store privacy labels and Google Play health-app/data-safety declarations.
- Test RLS with multiple users and attempt unauthorized reads/writes.
- Verify email, password recovery, account deletion, data export, reporting, blocking, and moderation.
- Add crash reporting only with appropriate privacy review.
- Use TestFlight and Google Play internal testing before public release.
- Have a qualified privacy/security reviewer assess final data flows and UK GDPR basis for processing health-related information.

Current app state: profile and personal tracking rows sync to Supabase under owner-only RLS policies; the on-device cache and social records are stored in AsyncStorage. Account deletion, password recovery, and social moderation are not implemented yet. Do not launch with real sensitive health data until you have reviewed the complete data flow, deletion process, access rules, and applicable privacy obligations.
