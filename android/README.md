# Expense Tracker Android Companion

This is a separate Android Studio project for Phase 7. It uses Kotlin and the existing authenticated MERN API; it does not modify the web app or backend.

## Open and run

Open this `android/` directory in Android Studio, allow Gradle sync, and run the `app` configuration on an Android 8.0+ device or emulator. Configure an HTTPS API origin reachable from the device. The Android client rejects HTTP and HTTPS redirects; for a local backend, use a trusted TLS-terminating development proxy rather than sending credentials over cleartext.

Log in with your Expense Tracker account and configure the matching API base URL. The password is sent only to the existing `/api/user/login` endpoint over HTTPS and is not stored; the returned JWT is encrypted locally. No banking password or other banking credential is requested.

After login, use **Parse mock payment notification** on the Dashboard to exercise the parser, normalizer, and local queue first. Parsed notifications are queued locally and WorkManager waits for a connected network before uploading; each item remains pending until insert/duplicate acknowledgment. Sync Status also provides an immediate retry action. To try real notifications after mock testing, open Notification Access Setup and explicitly enable Expense Tracker in Android's settings. Android only delivers posted notifications after that user-granted access. Revoke access from system settings at any time.

## Data and privacy

Notification text is inspected locally and is never persisted or included in an API request. The local queue contains only normalized transaction fields. The existing account bearer token is encrypted using an Android Keystore AES-GCM key. Each sync request sends one normalized transaction to `/api/mobile/transactions`; the token is sent only in the standard Authorization header, with generated device ID/name in headers. The authenticated backend assigns `userId` and records `lastSyncAt`. No production URL is preconfigured or contacted automatically.

The parser rejects messages containing OTP, PIN, password, passcode, or CVV terms. It does not open, scrape, or inspect banking applications. Notification Access is broad Android access, so grant it only if you are comfortable with local notification inspection.

## Parser coverage

PhonePe, Google Pay, Paytm, BHIM, and a limited set of bank package identifiers have separate parser registrations. Notification wording and package IDs vary by app version, bank, locale, and device. Recognition is best-effort and is not universal; unknown formats are ignored. Update each parser independently and add mock-based tests when adding formats. Do not use live bank messages as the first parser test.

Run local parser tests from Android Studio or with `gradlew.bat :app:testDebugUnitTest` from this directory. The test suite uses mock notifications; it does not need real payment-app alerts. Cleartext traffic is disabled in the Android manifest. The repository setup and deployment guide is in the root `README.md`.