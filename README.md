# PetCircle

PetCircle is an Expo React Native app for Android and iOS. Families, walkers and sitters can check the last meal, log care and see what needs attention. A web preview runs the same app.

## Run the app

Install Node.js 22.13 or newer and run these commands in the project directory.

```sh
npm ci
npm run web
```

The app opens with Milo’s example circle. Choose **Start my circle** to create a private circle stored on this device, or use the pet picker to switch between circles. Local and demo circles use separate data. Shared circles start empty so sample records and private device data are never uploaded automatically.

## Share a circle across devices

1. Create a Supabase project and apply `supabase/migrations/20261113020801_petcircle.sql` using the SQL editor or the linked Supabase CLI. Use a dedicated project or a test project you control.
2. Copy `.env.example` to `.env`. Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` using the project's Connect settings. Use the publishable key.
3. In Supabase Auth, set the Site URL to a valid HTTPS page and configure confirmation email delivery. A new user can confirm their email in a browser, then return to PetCircle to sign in with their password.
4. Restart Expo with `npm start -- --clear` after editing `.env`. In the app, open **Settings**, create an account or sign in, and create a shared circle. Add a pet, then open **Circle** to create an invite. The recipient signs in and joins with the code.

Family access lasts until the owner revokes it. A sitter invite is single use and expires at the end of its selected access window. It grants care access for one pet, and withholds the pet’s insurance, microchip and health history. The owner can revoke a code or remove a carer. Shared changes use Supabase Realtime and periodic refresh. Shared records need a connection to write. The device-only circle supports offline care.

## Care and emergencies

- **Today** shows the latest feeding log, recurring routines and tasks that pass their grace period. UK time defines the care day.
- **Care log** records meals, walks, medication and general notes with the carer and timestamp.
- **Health** stores weight and symptom history, vet visits and vaccination reminders.
- **Circle** prepares a shareable and printable sitter handover with upcoming routines, recent care and relevant contacts.
- **Kit** stores vet, insurance and microchip details. The lost-pet poster can include identifying details, a pet photo and an explicitly selected public contact.

Android and iOS can schedule device notifications for vet reminders and overdue routines in the device-only circle. Shared routines escalate inside the app after their grace period. Device routine notifications are scheduled up to five days ahead when the app syncs its notification schedule. Cross-device push escalation is outside this build.

## Android and iOS builds

`dist/PetCircle-0.1.0-android-arm64.apk` is a test build for ARM64 Android devices. It opens in demo mode and supports a private circle stored on the device.

`npm start` runs Metro. Use an SDK 57-compatible Expo Go or a matching development build. To create signed preview builds, authenticate with Expo and link the project using EAS, then run:

```sh
npx eas-cli build:configure
npx eas-cli build --platform android --profile preview
npx eas-cli build --platform ios --profile preview
```

The preview profile produces an Android APK and an iOS internal build. The iOS build requires Apple Developer signing and registered test devices. Replace the development package identifiers in `app.json` with identifiers you own before distributing a release. To use live shared circles in an EAS build, set the two `EXPO_PUBLIC_SUPABASE_*` variables in that build environment.

## Verify

```sh
npm test
npm run typecheck
npm run export:web
npx expo export --platform android --platform ios
```

`supabase/tests/circle_access.sql` checks the database access rules. Run it with `psql` against a test database containing the migration and the Supabase auth schema. It wraps test data in a transaction and rolls it back.
