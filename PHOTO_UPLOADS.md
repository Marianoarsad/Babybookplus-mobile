# Photo upload repair - 7 November 2026

## Cause and scope

Profile fields and the picture save in separate requests. The fields succeeded;
the native picture was passed as the legacy React Native `{ uri, name, type }`
multipart part. The installed Expo 58 fetch converter rejects that part with
`Unsupported FormDataPart implementation` before sending it. The old API catch
hid this behind a generic backend/network error. This serializer failure was
reproduced against the installed SDK; it is not evidence that Render was down.
The hosted `/api/health` returned HTTP 200 during investigation.

The shared `src/utils/api.js` helper now reads the selected URI through the
installed `expo-file-system` File API and provides its bytes to Expo multipart
encoding. It also retains a URI for React Native fetch compatibility. Browser
uploads retain real Blob parts. JPEG, PNG, GIF, WebP and HEIC metadata, unreadable
files, the existing 8 MB limit and safe preparation/network messages are covered.
Raw causes are retained for debugging, without putting file paths in user errors.
Fetch still supplies the boundary and authentication/session checks are unchanged.
The fix reaches avatars, health attachments, memories and milestone photos.

Existing profile partial-save behavior remains: a failed photo keeps the editor
and selected image available for retry. Retrying first-child creation reuses the
created profile rather than adding another child. No UI redesign or dependency
change was necessary. The original `front-end/` was not changed.

## Apply the app change in development (Git Bash)

Stop the migrated Metro terminal with Ctrl+C, then run:

```bash
cd '/c/Users/Arzad/Desktop/Capstone/BabyBook+/BabyBookPlus'
npm start -- --clear
```

In a second Git Bash terminal:

```bash
cd '/c/Users/Arzad/Desktop/Capstone/BabyBook+/BabyBookPlus'
npm run android:open
```

Open Edit Baby Profile, select the photo again, and tap Save Changes once.
Internet access is needed for the configured hosted API. No local backend,
database reset, app-data clearing or account recreation is needed. A standalone
APK must be rebuilt/reinstalled to include this JavaScript repair; starting
Metro does not update an old standalone APK.

## Backend safety patch (local, not deployed)

`back-end/src/routes/children.routes.js` previously deleted the old avatar before
uploading its replacement. It now validates input, stores the new object, commits
the database reference, then cleans up the previous object. Upload/DB failure
preserves the old picture; a failed DB update cleans up only the newly uploaded
object. Reusing the same reference does not delete it. Auth, ownership and private
storage remain in place. No schema change is required.

This backend patch needs review and an approved deployment before that protection
exists on Render. The client encoding repair works independently. No hosted
configuration, bucket permissions, secrets or stored records were changed.

## Verification

- Passed `node src/utils/photoUpload.check.js`: actual installed Expo FormData
  patch/converter, original-failure reproduction, four upload callers, MIME and
  filenames, synthetic content URI, size/readability checks, safe errors, browser
  Blob encoding, real extracted profile retry handlers and stale-session guard.
- Passed `node src/utils/recordStore.check.js`.
- Passed `node tests/avatarReplacement.check.js` and
  `node tests/storageEnvironment.check.js` from `back-end/`: mocked DB/storage,
  real route/auth/ownership/multipart middleware; no live DB or storage access.
- Passed TypeScript and all 58 Jest tests across 13 suites.
- Focused API ESLint: no errors; existing Authorization dot-notation warning.
- Android/Hermes and web production bundle exports passed; no native dependency
  change or development-client rebuild was required.
- Existing Pixel_6_API_30 / Android 11 development client: all four actual API
  upload callers successfully sent a synthetic 68-byte PNG through native File,
  patched FormData and Expo fetch to a temporary local multipart receiver. Exact
  bytes, `photo.png` and `image/png` matched for every request. Hosted calls were
  intercepted only for a synthetic child sentinel, with no auth forwarded to the
  receiver. Fetch was restored, the synthetic cache file deleted, and the local
  receiver/ADB forwarding closed afterwards. No hosted record was written.
- Live native Home -> Baby Profile -> Edit Baby Profile navigation and existing
  avatar rendering checked; no Save action or real photo selection performed.
- Full process-stop/relaunch restored the signed-in Home screen; all four
  synthetic native uploads passed again after relaunch. The recent crash buffer
  was empty. User data was retained.
- Broader existing checks still fail outside this change: `partialSaves.check.js`
  lacks its AppState import mock, `readDedup.check.js` expects uncached repeat reads,
  and `apiActivity.check.js` reaches an outdated Growth skeleton assertion. Its
  photo-preparation assertion was updated for the new safe message/cause contract.

Not verified: a real user's save to hosted storage, native content-provider URI,
HEIC decoding on devices, live browser photo selection, iOS, or a newly built APK.
The native synthetic transport test does not prove production storage credentials.
The connected Playwright browser check was blocked by its missing Chrome extension;
no extension was installed. Browser Blob serialization is covered by the focused check.

Graphify AST refresh completed (9,161 nodes/18,204 edges). Existing extraction
limits remain: SQL parser dependency unavailable and partial Gradle parsing;
community names were refreshed by hub where saved labels no longer matched.
