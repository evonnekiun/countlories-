# goodform backend setup (Supabase)

This app currently stores data on one device. Accounts, sync, invitations, messaging, and moderation are not connected. This guide is a practical route to a hosted MVP. Do not put production health data in until access policies have been checked.

## 1. Create the project

1. Create a Supabase project in a region appropriate for your users (for a UK launch, consider a UK/EU region).
2. Keep the database password and service_role key in a password manager. Never put the service-role key or an AI provider key in the app.
3. In Authentication, enable email/password or email magic links. Configure email confirmation, password recovery, rate limits, and production redirect URLs.
4. In project API settings, copy the project URL and publishable/anon key. These can be used by the mobile app only when Row Level Security (RLS) is enabled on every exposed table.

## 2. Initial data model

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

## 3. Turn on access control before adding real data

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

## 4. Connect the React Native app

1. Install the Supabase React Native client and secure session storage using SDK-compatible Expo package versions (run npx expo install for packages).
2. Add the Supabase URL and publishable key as public app configuration. The publishable key is not a secret; RLS is the security boundary. Do not bundle a service-role key.
3. Implement sign up, email confirmation, sign in, sign out, password recovery, session restore, and account deletion. Add an in-app delete-account flow plus a server-side deletion function that removes associated profile, log, membership, post, and message data according to the published retention policy.
4. Replace the local AsyncStorage data provider with repositories that read/write under the authenticated user's ID. Migrate local prototype data only after sign-in and explicit user agreement.
5. For real-time messages/posts, use Supabase Realtime only after database policies and membership checks work. Add block/report, mute, content removal, and moderation processes before allowing strangers into a feed.
6. Keep account/profile settings, data export, deletion, and privacy policy easy to find.

## 5. AI calorie estimates and suggested goals

Call AI from a server-side Edge Function, never directly from the app with a provider secret. Ask for structured output (calories, protein_g, carbs_g, fat_g) and keep estimates editable with uncertainty clearly visible. The current app only selects/takes a photo and permits manual nutrition entry; it does not upload the image or return AI estimates. For a future analysis flow, obtain clear consent before uploading meal photos, store them privately, and set retention/deletion rules. For goal suggestions, only collect data a qualified product/clinical reviewer says is necessary; an LLM should not present guesses as medical advice. Add safeguards for under-18 users, pregnancy, eating disorder history, and medical conditions, and provide a way to skip suggestions and enter personal goals.

## 6. Before real-user launch

- Publish an accurate privacy policy and retention/deletion schedule.
- Complete the App Store privacy labels and Google Play health-app/data-safety declarations.
- Test RLS with multiple users and attempt unauthorized reads/writes.
- Verify email, password recovery, account deletion, data export, reporting, blocking, and moderation.
- Add crash reporting only with appropriate privacy review.
- Use TestFlight and Google Play internal testing before public release.
- Have a qualified privacy/security reviewer assess final data flows and UK GDPR basis for processing health-related information.

Current app state: personal data is local to the device and not encrypted by this app; do not use real sensitive health information until secure storage and account/data deletion are implemented.
