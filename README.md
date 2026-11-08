# BabyBook+ native migration

The application lives independently in this project. React Native 0.88.1 / React 19.3.0 and the original native app identifier are retained. Expo SDK 58 supplies native modules and Metro bundling; Expo Go is not used. `src` contains the original UI, custom navigation, assets, business logic and focused checks. Do not edit the reference `../front-end` as part of this migration.

## Build a standalone APK with Expo EAS (Git Bash)

Run from the migrated app directory, using the existing EAS CLI/account:

```bash
cd '/c/Users/Arzad/Desktop/Capstone/BabyBook+/BabyBookPlus'
npm ci --ignore-scripts
EAS_NO_VCS=1 EAS_PROJECT_ROOT="$PWD" eas build --platform android --profile preview
```

The app is linked to the existing `@marianoarzad/babybook-plus` Expo project.
The explicit upload root isolates this app from the repository's original Expo
sources/backend and upload rules. Its `.easignore` excludes local configuration,
credentials and generated build caches, while retaining maintained native
projects and the existing standard debug keystore. EAS installs dependencies and
builds the saved working files; no Git push, local SDK or short-drive alias is
needed for the cloud build. Download the APK from the completed build page.

`npm ci --ignore-scripts` restores the dependencies recorded in the lockfile. EAS evaluates the app
configuration locally before upload, so config plugins such as `expo-dev-client`
must resolve locally even though the cloud builder installs its own dependencies.
If it reports `Failed to resolve plugin for module "expo-dev-client"`, finish
`npm ci --ignore-scripts` in this folder and retry. The Windows watcher uses its
prebuilt binding, so its optional rebuild script can stay blocked by npm's
install-script policy. Do not remove the plugin or change package
versions to work around an incomplete local installation. The root-level `expo`
warning about `name` and `displayName` is separate; those keys retain the native
entry-point registration.

`preview` embeds the app with the hosted API and runs without Metro. It uses the
existing native test signing configuration (`withoutCredentials` prevents EAS
from replacing it). This is a test APK, not store signing. Install with `adb
install -r` to retain data; do not uninstall to resolve signing mismatches. Cloud
builds consume the account's allowance; do not upgrade or enable paid overages
without approval. Keep the original `front-end/` build configuration unchanged.

## Local Android development

Keep the Expo reference server on localhost:8082; this migrated app uses localhost:8083. `npm run android` starts or reuses `Pixel_6_API_30` automatically. The migrated app uses the hosted API; no local backend, migration, reset or seed command is needed. Sign in with your hosted account; PC-only records remain in the local database.

On Windows, newly started emulators receive the host's existing IPv4 DNS resolvers explicitly. This avoids the emulator DNS failure that previously stalled account verification on the splash/Retry screen; it does not select a public DNS provider or change Windows settings. An already running emulator is reused unchanged. If it cannot resolve the API, close that emulator normally and run `npm run android:open` again after Metro is running. Keep its data intact; do not use Wipe Data or clear app storage.

```powershell
# Use an unused drive letter for Windows C++ path lengths. Verify existing mappings with subst first.
subst B: 'C:\Users\Arzad\Desktop\Capstone\BabyBook+'
Set-Location B:\BabyBookPlus
npm.cmd start
```

In a second terminal in the same folder, after the development APK is installed, use the checked launch command. It verifies Metro and the configured API, restores Metro forwarding after emulator restarts, and selects the migrated package explicitly. The hosted API may need up to a minute to wake:

```powershell
npm.cmd run android:open
```

For the initial build, in `B:\BabyBookPlus`:

```powershell
npm.cmd run android
```

Native Gradle commands:

```powershell
Set-Location B:\BabyBookPlus\android
.\gradlew.bat :app:assembleDebug -PreactNativeArchitectures=x86_64 --max-workers=2
.\gradlew.bat :app:assembleRelease --max-workers=2
```

Use a free drive letter; never remove an existing unrelated mapping. The temporary B: mapping created during migration points to the parent BabyBook+ folder. A short checkout path is another option. Long native build paths can fail in Ninja even when CMake object hashing is enabled. After changing a build root, regenerate only destination-generated CMake caches if Gradle reports stale paths. Never delete the source project or clear the migrated app storage.

Edit `src` and save to use Fast Refresh. Rebuild after native dependency/configuration changes. This project maintains native directories directly: do not use `expo prebuild --clean` to replace them. `app.json` config plugins alone do not update maintained native projects.

If both APKs remain on launch screens even though React has mounted, reboot the emulator without wiping its data (`adb -s emulator-5554 reboot`). This cleared a retained Android launch-window transition during verification. Wait for boot completion, then repeat the port forwarding commands above before launching the development client. Reinstalling or clearing app storage is unnecessary for that condition.

## Configuration

The default API URL is `https://babybook-xi2w.onrender.com`, shared with the public viewer at `https://babybook-plus.expo.app`. `.env.example` documents the public variable. Hosted authentication uses a separate token key, so the old local session is retained without being sent to the hosted API. No account or database transfer occurs.

For deliberate local-backend development only, set `EXPO_PUBLIC_API_BASE_URL=http://localhost:4000` in this project's `.env.local`, start `npm run dev` in `../back-end`, restart Metro and run `npm run android:open` again. The launcher forwards the configured loopback API port. Local-only consultation codes cannot open public records on an iPhone. Remove the override and restart Metro to return to hosted sharing.

Do not copy backend secrets or the reference .env. The migrated login and registration offer Google only. Google is configured for the migrated Android package and localhost:8083 browser preview. Existing standalone APKs need a new build to embed the public configuration. See [GOOGLE_SIGN_IN.md](GOOGLE_SIGN_IN.md) for setup, account behavior and verification limits. The public OAuth client IDs are documented; no client secret is stored in the app. See [QR_SHARING.md](QR_SHARING.md) for iPhone sharing and verification status.

The sole installed BabyBook+ package is the migrated `com.babybookplus`. The old `com.babybookplus.app` was removed with its data/cache retained; its original signed APK is archived privately in `.cache/original-apk/original-expo.apk`. App storage is separate; this was not a data transfer. The release build still uses the starter debug signing key and is for local verification only; store signing is outside this migration.

On macOS, run `bundle install`, install Pods in `ios`, then `npm run ios`. Expo Modules Core requires iOS 16.4. iOS changes cannot be build-verified on this Windows host.

## Verification

Photo-upload troubleshooting, Git Bash reload steps and verification limits are
in [PHOTO_UPLOADS.md](PHOTO_UPLOADS.md).

```powershell
npm.cmd run typecheck
npm.cmd test -- --runInBand --no-watchman --forceExit
npm.cmd run check:parity
npm.cmd run lint
```

The focused checks use fictional data and mocks. Two existing cross-project contract checks read backend source files without accessing its database. Production bundles do not import backend or reference frontend code.

See MIGRATION.md for the live checklist, dependency changes, evidence and limits. Passing JavaScript export is not proof of native runtime or visual parity.

## Startup recovery

The debug client defaults to localhost:8083. `npm run android` starts or reuses the installed `Pixel_6_API_30` AVD, waits for Android boot, restores forwarding for Metro 8083 (and a loopback API only when explicitly configured), then builds and installs on that exact device. Expo starts Metro when needed; the old `preandroid` running-device prerequisite has been removed. `npm run android:open` starts/reuses the same AVD and opens an already installed client without rebuilding; that command requires Metro to be running and the configured API to be reachable. An explicit ANDROID_SERIAL overrides the default with a connected device.

From Git Bash in VS Code:

```bash
cd '/c/Users/Arzad/Desktop/Capstone/BabyBook+/BabyBookPlus'
npm run android
```

If an old ANDROID_SERIAL points at a disconnected device, run `unset ANDROID_SERIAL` to return to the default Pixel AVD. Boot waits up to three minutes and reports a clear error if the AVD is missing or never becomes ready. Existing emulator data is retained; no wipe/reset flags are used.

Startup has a 20-second deadline. A stalled initialization exposes Retry, cancels outstanding startup network requests and starts a fresh initialization attempt without clearing tokens, preferences or records. Debug logs show only stage readiness flags. The normal branded splash and authenticated app flow remain. If Android itself retains a launch-window layer, reboot the emulator without wiping data, then run android:open again to recreate forwarding.


Launcher verification (31 October 2026): Pixel_6_API_30 opened from a stopped state; the corrected Windows ADB name parsing then resolved the booted device. npm run android built successfully for its x86 ABI, installed the debug APK, started Metro 8083 and reached BabyBook+ onboarding. The crash buffer was empty. The prepare-only connection path also passed in Git Bash. Ten focused device/startup tests passed. The first x86 native build took about six minutes; later builds can reuse these artifacts. API 30 authenticated flows were not tested.
