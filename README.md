# Expense Tracker

MERN expense tracker with a separate Kotlin Android companion. The Android app does not replace the React website.

## Architecture

- `frontend/`: React 19 + Vite dashboard. It reads the Express API and polls the dashboard and transaction list every 15 seconds while the tab is visible.
- `backend/`: Express API, JWT authentication, Mongoose validation/normalization, merchant categorization, deduplication, and MongoDB persistence.
- `android/`: Android Studio/Kotlin app using Compose and a ViewModel. Android's user-granted `NotificationListenerService` routes supported package notifications to provider parsers, then a normalizer writes only transaction fields to a local queue. WorkManager waits for network connectivity and retries HTTPS uploads.
- Android uploads one transaction at a time to authenticated `POST /api/mobile/transactions`. The backend assigns the owner from the JWT, processes validation/categorization/deduplication, saves the record, and returns its transaction ID. Device ID/name are sent in headers; the backend records `userId` and `lastSyncAt`.

```text
Android notification -> parser -> normalized local queue -> WorkManager (connected network)
  -> HTTPS POST /api/mobile/transactions -> auth -> normalize/category/dedupe -> MongoDB
  -> React dashboard polling
```

## Prerequisites

- Node.js and npm versions compatible with the installed Vite 8 toolchain.
- MongoDB, either local or a managed deployment.
- JDK 17, Android Studio, and Android SDK Platform 35 for the companion app.
- A TLS endpoint for the API when connecting from Android. The Express process listens on HTTP; deploy it behind a trusted HTTPS reverse proxy/load balancer. The Android app rejects HTTP and redirects.

## Environment

Copy `backend/.env.example` to `backend/.env` and set:

- `MONGO_URI`: MongoDB connection string. There is no code fallback.
- `JWT_SECRET`: random secret of at least 32 characters. There is no code fallback.
- `CORS_ORIGIN`: comma-separated frontend origin allowlist. Required when `NODE_ENV=production`.
- `PORT`: optional Express port; defaults to `4000`.

Copy `frontend/.env.example` to `frontend/.env.local` as needed:

- `VITE_API_BASE_URL`: API base including `/api`. Local browser development defaults to `http://localhost:4000/api`; production must use the HTTPS API origin.

Do not commit `.env` files, credentials, JWTs, or production connection strings. Android asks for the API URL and Expense Tracker account login at runtime; it does not contain backend credentials or a production URL.

## Backend Setup

From the repository root:

```powershell
npm install --prefix backend
if (!(Test-Path backend/.env)) { Copy-Item backend/.env.example backend/.env }
npm --prefix backend start
```

Set `MONGO_URI` and `JWT_SECRET` in `backend/.env` before starting. The API is mounted under `/api`; Android uses `/api/user/login` and `/api/mobile/transactions`. Run the database-backed API test suite with `npm --prefix backend test` after configuring a test MongoDB database.

## Frontend Setup

```powershell
npm ci --prefix frontend
npm --prefix frontend run dev
npm --prefix frontend run lint
npm --prefix frontend run build
```

The dashboard refreshes account summary and transactions every 15 seconds while visible, and refreshes when the tab becomes visible again.

## Android Setup

Open `android/` in Android Studio, sync Gradle, select an Android 8.0+ device/emulator, and run the `app` configuration. Set an HTTPS API base URL and sign in with an Expense Tracker account. The password is sent only to `/api/user/login`; the returned JWT is encrypted using Android Keystore. It is never stored as a hard-coded secret.

To run parser tests:

```powershell
android\gradlew.bat :app:testDebugUnitTest
```

To test offline behavior, use a test backend and mock notification, disable network, verify the transaction remains queued, then restore connectivity. WorkManager retries after the network constraint is met. An item is removed only after the backend acknowledges insert or duplicate. Retries reuse the same `sourceTransactionId`; notification fingerprints without a reference ID use transaction fields and the notification minute.

## Notification Access

The user must open the app's Notification Access Setup screen and explicitly enable its listener in Android system settings. Android exposes notification events only after that grant. The app does not open, scrape, or inspect banking-app screens. Notification text is parsed in memory and is not stored or sent; only normalized transaction fields are queued and uploaded. Notification Access is broad system permission, so grant it only if comfortable with that scope.

PhonePe, Google Pay, Paytm, BHIM, and selected bank package identifiers have independent best-effort parser rules. Notification formats vary by issuer, locale, and app version; unrecognized or ambiguous messages are ignored. These are notification parsers, not bank integrations, and not every app/format is supported.

## Testing

- Android mock parser tests: `android\gradlew.bat :app:testDebugUnitTest` (requires Android SDK Platform 35).
- Backend API tests: `npm --prefix backend test` (requires `MONGO_URI`; the suite is skipped when it is unset).
- Frontend checks: `npm --prefix frontend run lint` and `npm --prefix frontend run build`.
- The backend integration suite covers authenticated ownership, duplicate uploads, device registration, merchant categorization, and existing manual, CSV, refund, and transfer transaction flows.
- For end-to-end verification, submit a mock PhonePe payment, confirm the backend returns an insert result and `Food` category, submit the same notification again and confirm it returns `duplicate: true`, then verify only one record and that the React dashboard shows the merchant, category/payment method, and amount.

Use mock accounts and mock notification data for testing. Do not use bank logins, UPI PINs, OTPs, card PINs, CVVs, or other financial credentials.

## Deployment

1. Configure production `MONGO_URI`, a unique random `JWT_SECRET`, and `PORT` in the deployment secret manager.
2. Put Express behind HTTPS termination and set `CORS_ORIGIN` to the exact deployed frontend origin(s); production startup fails without it.
3. Build the frontend with `VITE_API_BASE_URL` set to the HTTPS API base.
4. Configure the Android app with the HTTPS API origin. Cleartext traffic is disabled; do not weaken it to connect to a production API.
5. Create required MongoDB indexes and verify API tests against a dedicated test database before release.

## Security and Privacy

- JWT authentication is required for mobile uploads. MongoDB ownership always comes from the authenticated request, not Android JSON.
- Device registration uses the authenticated user ID and Android device headers; transaction uploads update `lastSyncAt`.
- The backend requires environment-provided MongoDB and JWT secrets. Never commit real `.env` values.
- Android uses platform TLS validation, rejects HTTP and redirects, stores the JWT encrypted with Android Keystore, and sends no complete notification text.
- Notification access is optional and user-granted. Supported parsers reject sensitive credential-related messages; banking credentials are never requested.