# Google sign-in

## Active configuration

- Google Cloud project: **BabyBookPlus**, ID `babybookplus`, number `153109903073`.
- Consent app: **BabyBook+**, External, **In production** (verified in Console).
- Support/developer contact: `arsadmariano789@gmail.com` (owner confirmed).
- Web client: `153109903073-p7nam8j0rjair17u5k1rcsun6eri0ch4.apps.googleusercontent.com`.
- Android client: `153109903073-9lev876khn1lt80h1pk5ppob4itlf8jp.apps.googleusercontent.com`.
- Android package: `com.babybookplus`; current debug/preview certificate SHA-1:
  `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`.
- Web origins: `http://localhost` and `http://localhost:8083`.
- Homepage: https://babybook-plus.expo.app
- Public policy: https://babybook-xi2w.onrender.com/privacy
- Both public-page domains were registered in Google Branding. No logo, sensitive
  scopes, client secret, new dependency, or signing-key change was added to the app.

The public Web ID is set in ignored `.env.local` and the EAS preview profile's build
variables. Restart Metro to reload it. Existing standalone APKs still require a new
JS bundle/build. A local x86_64 debug APK was subsequently built and installed on the
separate Google Play test emulator; no store release was produced. A future store
signing certificate requires its own Android registration.

The confirmed Render workspace **Babybookplus**, service **Babybook+**
(`srv-d9qcib942hec73e3bp80`), now has the Web ID in `GOOGLE_CLIENT_IDS`. The key was
verified absent before creation. Existing CORS origins were preserved and
`http://localhost:8083` appended. Render deployed the settings. No credentials or
other backend variables were replaced.

## Account behavior

The migrated Android and browser auth screens offer Google only. The reference
`../front-end` and shared backend Facebook compatibility remain unchanged.

- Linked Google identities restore the existing BabyBook+ account.
- An email match requires the BabyBook+ password before linking; no automatic merge.
- New users still confirm their name, backup password, relationship and privacy consent.
- Native SDK loading waits for a tap; duplicate taps are guarded through token exchange.
- Cancellation is silent; missing tokens and failures restore controls.
- Web uses the official GIS button; failed library loading offers Retry.

## Public privacy page

The owner authorized publishing the existing in-app privacy text, a short explanation
of the implemented Google identity flow, and the confirmed contact address. The static
page is served by `GET /privacy`, without authentication or database access.

Only the policy HTML and route were published to `Marianoarsad/Babybook-` main:
`3bbc5adce9e29cdc98f41ef3b7cab52fa64d3cd1` and
`6e79639125cb4bc7e13350aed4894dc4b4004ab6`. No unrelated local changes were pushed.

## Verification (8 November 2026)

- Focused native/web Google checks and backend verifier checks pass.
- TypeScript `--noEmit` passes. Existing broader `Auth.check.js` still fails at its
  pre-existing inset-shadow assertion, after social-flow assertions execute.
- Public privacy page and existing health HTTP checks pass locally. Hosted `/privacy`
  and `/api/health` return 200 and allow `http://localhost:8083`.
- The hosted verifier now rejects an invalid token with 401; its pre-setup result was
  503 (not configured). This checks availability, not real-token acceptance.
- Supabase metadata confirms `public.user_auth_identities` exists in the active
  BabyBook+ project. No migration, account query, or medical-record write was performed.
- Browser startup was blank because the bare RN entry registered components without
  mounting the web root. Expo's installed `registerRootComponent` now mounts web while
  retaining Android's `BabyBookPlus` registration. `scripts/web-entry.check.cjs` passes.
- Chrome on Windows rendered onboarding and registration, including one enabled GIS
  Google button and no Facebook option. Clicking it opened Google's sign-in window.
- Existing-account Google/linking verification is awaiting the owner's credential
  handoff. Exact 320/390px and native runtime sign-in checks are not yet certified.
- No iOS runtime check or app-store deployment was performed.

## Emulator installation follow-up

`BabyBook_Google_API_35` uses the already installed Android 15 Google Play image.
The original `Pixel_6_API_30` and its data were retained; it was stopped to free RAM.
The first x86_64 packaging attempt failed; an incremental packaging retry succeeded.
The debug APK was installed on emulator-5556 with `adb install -r`. Its onboarding
screen was visually confirmed after dismissing the first-run development menu.

The launcher waited for the hosted API health check and timed out. The app was
opened directly at the verified Metro server on localhost:8083 instead. Keep Metro
running for this development build. Startup logs still show some asset-download
failures, and native Google account sign-in remains unverified.
