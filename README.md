# Converational Voice Capture app

### Create spaces for real-time audio conversations. Record data. Includes web app and admin interface.

This app relies on the following third-party services:

- Firebase Realtime Database
- Firebase Cloud Functions
- Firebase Auth 
- A Daily.co for API access allows for generating meeting rooms
- S3 bucket for deploying the webapp + admin interface to. By default we support S3 however you can use any static webhost.

(Note: you can use the [Firebase Local Emulator Suite](https://firebase.google.com/docs/emulator-suite/install_and_configure) as well to test locally)

If you'd like to store down recorded audio tracks, you'll also need:

- The Daily.co account to be updated to the pay-as-you-go plan
- An S3 bucket to deliver downloaded tracks to. [See setup instructions here](https://docs.daily.co/guides/products/live-streaming-recording/storing-recordings-in-a-custom-s3-bucket).

See the **Prereqs** section below for information on how to configure these services.

## Wayfinding

- `/webapp/src` - contains the user-facing Vite React app
- `/admin/src` - contains a Vite React app for an admin dashboard to monitor overall app state
- `/admin/functions` - contains serverless backend code using Firebase Cloud Functions that facilitates user lobbies and matching. See `admin/functions/src/index.ts` for full code.

## Local Development

The app can be run using either an actual Firebase account setup or the Local Emulator Suite.

For local development, the Firebase Local Emulator Suite suite is ideal. You will save a lot of time here, as deploying cloud functions takes a while.

### Prereqs:

The [Firebase CLI](https://firebase.google.com/docs/cli) is needed to deploy Firebase Functions and run the local emulator. Run `firebase login`.

_Note that the emulator suite [requires](https://firebase.google.com/docs/emulator-suite/install_and_configure): Node.js version 8.0 or higher and Java JDK version 11 or higher._

A Daily.co API key is also required for WebRTC room creation. Create a file at `/admin/functions/.env` file with `DAILY_API_KEY=<KEY>`.

Your Firebase configuration information should be added to `webapp/src/firebase.tx`, `admin/src/firebase.tsx`, and `admin/.firebaserc`.

### Configure the web interfaces to use the local endpoint

By default, when running locally using `npm run dev`, the app will always use the Local Emulator Suite. There may be cases where you'd like to change this behavior to use a hosted environment instead.

**Option 1:**
Use the provided `npm run dev:remote` script (note the `:remote` part) when launching either the admin interface or user-facing app.

**Option 2:**
Use the `VITE_USE_REMOTE=true` flag, e.g. `VITE_USE_REMOTE=true npm run dev` when running the front-end build.

**Option 3:**
Set the `USE_LOCAL_EMULATOR` flag manually in:

- `/admin/src/firebase.tsx` for the admin interface
- `/webapp/src/firebase.tsx` for the user-facing interface

### Run the Local Emulator Suite

```
cd admin/functions
npm install
npm run em
```

### Launch the admin interface for monitoring

```
cd admin/src
npm install
npm run dev
```

### Launch the user-facing webapp

```
cd webapp
npm install
npm run dev
```

---

## Deploying

Firebase Cloud Functions

_Requires the [env var](https://firebase.google.com/docs/functions/config-env) `DAILY_API_KEY` to be set (e.g. via `admin/functions/.env`)_

```
cd admin/functions
npm install
echo "DAILY_API_KEY=$SECRET_KEY" >> .env
npm run deploy
```

The webapp interface can be deployed via the [Deploy to AWS GH Action](https://github.com/fairinternal/openvox/actions/workflows/deploy.yml).

Select `Run workflow` and the branch you'd like to deploy.

## TODO:

- Figure out a strategy for deploying the admin interface. What security model should we use here?
- Do we need to secure the Firebase Realtime Database with certain rules. Should the rules be checked into this repo?
- Decouple front-end components so that they are testable without access to a backend
- Integration with scheduling/calendar tool?

