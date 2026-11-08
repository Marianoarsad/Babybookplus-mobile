# Migration checklist

## Implemented source mapping

All production screens and shared components are copied into `src` with their original relative paths, custom navigation, theme tokens, fonts, semantic artwork, animations, validation, data adapters and API client. Root App.tsx loads src/App.js. Assets are copied unchanged. Source hash comparison currently confirms all 387 recorded reference files unchanged.

| Area | Status | Evidence / remaining work |
| --- | --- | --- |
| Independent source, assets and custom navigation | Implemented but not fully verified | Android and web exports pass; every screen has been ported, not every interaction observed |
| Onboarding, auth and app shell | Implemented but not fully verified | Focused checks; native live inspection pending |
| Dashboard, baby profiles, activity, search, notifications | Implemented but not fully verified | Copied implementation and focused checks |
| Health: medicines/doses, vaccines, appointments, conditions, hereditary details, hospital stays | Implemented but not fully verified | Copied implementation; real record changes excluded |
| Growth, milestone checklist, gallery and memory details | Implemented but not fully verified | Original charts/calculations, artwork and forms preserved |
| Nutrition: milk, foods, reactions, charts and filters | Implemented but not fully verified | Existing analytics and checks preserved; retired milk-period UI is not reintroduced |
| Calendar plans and reminders | Implemented but not fully verified | Existing scheduling/cancellation logic; delivery not verified |
| QR sharing, PDF and professional viewer | Implemented but not fully verified | Professional viewer check passes; real share resolution/access logging excluded |
| Settings and Services | Implemented but not fully verified | Existing preferences and bundled clinic/update content preserved |
| Android native integrations | Implemented but not fully verified | SDK 58 autolinking/lifecycle integration, permissions, branded resources, local debug network; debug x86_64 build passed and installed in place; native rendering remains blocked after startup |
| iOS native integrations | Blocked | CocoaPods, lifecycle, permission strings, resources and bundling adapted; macOS/Xcode unavailable |
| Read-only live visual parity and Fast Refresh | Blocked | Expo APK Home, Health, Growth, Nutrition and Calendar inspected on Pixel 6 Pro API 36; migrated Home rendered once, then repeated cold launches stalled on splash or showed a blank surface; further paired screen checks await a native rendering fix |
| Real CRUD, uploads and consultation resolution | Pending | Excluded by user's read-only testing choice; mocked checks only |

## Deliberate adaptations

- React Native 0.88.1 and React 19.3 retained; SDK 58 modules replace SDK 56 versions in this destination only.
- Metro/Babel and native release bundling use Expo tooling; no Expo Router or navigation rewrite.
- Unsupported StatusBar backgroundColor prop removed in the copied App; surrounding theme surfaces retained.
- Native lifecycle integration, Android camera/notification permissions, branded launcher/splash and iOS usage strings added. iOS minimum raised to 16.4.
- Android backup remains disabled, preserving the destination's stricter existing setting.
- Existing Google/Facebook lazy initialization remains; missing provider configuration does not initialize native authentication at startup.
- Starter new-app-screen dependency removed. Assets/font, blur, camera, filesystem, haptics, image picker, gradients, notifications, PDF printing/sharing, capture protection, secure storage and dev-client modules added. SVG, calendars, AsyncStorage, fonts and provider modules retained. Web dependencies support preview verification; no remote push, Expo Updates, store release or hosted deployment was added.
- Destination check paths that read backend contract source were adjusted; checks were not weakened to hide source failures.

## Checks and evidence

- Android/Hermes JS export: passed, `.cache/android-export.log`.
- Web export: passed, `.cache/web-export.log`.
- TypeScript: passed for TypeScript entry/tests; ported JavaScript remains unchecked by TypeScript.
- Jest configuration/registry check: 1 passed, `.cache/jest-scoped.log`. It does not prove native startup.
- Focused checks: latest run passed 93/102; failures are in copied feature checks and need separate triage. Details are in `.cache/parity-results.json`.
- Full lint: 283 errors and 771 warnings in the copied source/test code; not a clean lint pass. Integration-only lint passes. Formatting in copied source is retained.
- npm audit: 16 reported vulnerabilities (3 high, 13 low); `.cache/npm-audit.json`. No unrelated force-upgrade was applied.
- Native debug build: passed for x86_64; final APK installed with `adb install -r`, preserving data. The original branded native splash is retained. Home renders after cold launch; the floating development gear is absent and Profile opens normally.

## Testing boundaries

No real record write, account creation, consultation resolve/revoke, upload, message or deployment was performed. Share Records can mark access logs seen, so opening it against real data is excluded from read-only verification. Live OAuth requires developer provider setup; camera/notifications/physical-device testing and iOS runtime remain unverified. Fixture/mocked evidence is not labelled production end-to-end success.

### Installation and startup diagnostics

On 30 October the Android window manager retained launch/splash animation layers while React readiness gates completed and the native content received pre-draw. The original Expo APK subsequently showed the same launch failure. Rebooting the emulator without wiping data cleared the condition. A temporary custom splash module and React-only Android handoff were removed; the original Expo native splash was restored, rebuilt, installed and successfully cold launched. This establishes an emulator window-state failure; the underlying Android/emulator defect causing that state is not isolated. Animation settings were restored to their original values and ADB reverse ports 4000/8082 re-established.

### Visual parity repair against localhost:8082 (latest)

The signed-in Chrome web build at localhost:8082 is the current reference. Inspection confirmed the installed native React Native no longer exports StyleSheet.absoluteFillObject, while React Native Web still does. Replaced all 111 runtime uses across 43 files with StyleSheet.absoluteFill, including 33 object spreads. Updated the affected test mocks to expose the supported API. This restores absolute positioning instead of letting decorative SVG/gradient layers consume layout space or disappear.

Removed the earlier native solid-fill Calendar/plan workarounds and restored reference gradients, selection layers and shadows. Retained unique SVG stop keys. The shared AnchoredMenu connected-select ScrollView received Animated.Value opacity directly and crashed on Android; it now uses Animated.ScrollView. Its regression harness requires the animated scroll host and passes the existing cross-platform geometry/transition checks.

The migrated app now uses Metro port 8083 (scripts, Android default and README launch/forwarding commands), leaving the user's Expo source server on 8082. Android debug x86_64 assembly and data-preserving install passed. No dependency, source/reference, backend, schema or medical-record change was made.

Live observed on Pixel 6 Pro API 36: cold launch; restored Home header glass, Add FAB, profile measurement card and tab surfaces; Growth; Milestones age selector/progress/checklist; connected age menu opening/closing without a record change; Gallery category/search/filter/sort controls and saved content; Calendar gradient month/day/plan selection and raised cells; Add action sheet. Compared with signed-in Chrome Home/Milestones/Gallery at 411 CSS px width. Hint visibility differs because dismissal preferences are separate. Start/intermediate/settled menu and tab frames were observed, but animation timing/smoothness and reduced-motion playback were not measured.

Automatic approval review subsequently hit the account usage limit while opening the Milk form. That action was not executed. Full forms, remaining screens/themes, final post-interaction crash check and further live browser/emulator actions remain unverified for this patch. Previously inspected Health/Nutrition/Profile are not a substitute for repeating the full matrix after this shared repair.

TypeScript and Jest (2 suites, 3 tests) pass. Full focused checks: 93/102; all nine failures also fail in the unchanged reference source, recorded in .cache/parity-source-comparison.json. AnchoredMenu checks pass after the additional native opacity repair. Existing full-lint failures are not presented as a clean lint pass.

Dependency compatibility check reports up to date using the installed SDK matrix in offline mode; online validation was blocked by network access. The retained font, calendars, Facebook and Nitro package versions were compared with the reference installation and match exactly. The graph refresh completed with a Gradle-parser limitation and an unavailable SQL parser; native compilation is the stronger evidence for Gradle validity.

## Declared runtime dependency inventory

| Package | Destination version range |
| --- | --- |
| @expo-google-fonts/archivo | ^0.4.2 |
| @expo-google-fonts/public-sans | ^0.4.2 |
| @expo/metro-runtime | ~58.0.15 |
| @expo/vector-icons | ^15.0.2 |
| @react-native-async-storage/async-storage | 2.2.0 |
| expo | ~58.0.21 |
| expo-asset | ~58.0.19 |
| expo-blur | ~58.0.5 |
| expo-camera | ~58.0.14 |
| expo-dev-client | ~58.0.17 |
| expo-file-system | ~58.0.13 |
| expo-font | ~58.0.11 |
| expo-haptics | ~58.0.7 |
| expo-image-picker | ~58.0.10 |
| expo-linear-gradient | ~58.0.3 |
| expo-notifications | ~58.1.7 |
| expo-print | ~58.0.8 |
| expo-screen-capture | ~58.0.6 |
| expo-secure-store | ~58.0.2 |
| expo-sharing | ~58.0.21 |
| expo-splash-screen | ~58.0.12 |
| react | 19.3.0 |
| react-dom | 19.3.0 |
| react-native | 0.88.1 |
| react-native-calendars | ^1.1314.0 |
| react-native-fbsdk-next | ^13.4.3 |
| react-native-nitro-google-signin | ^2.1.0 |
| react-native-nitro-modules | ^0.37.1 |
| react-native-safe-area-context | ~5.10.1 |
| react-native-svg | 15.16.0 |
| react-native-web | ^0.21.4 |

The unused starter @react-native/new-app-screen was removed. The reference datetimepicker package is not copied because the implemented date UI uses the custom DateWheelPicker; no source runtime import required it. React DOM/Web and Metro Runtime support browser parity previews. Babel 7-compatible JSX/CommonJS plugins are declared for the existing focused test harnesses. Existing TypeScript/RN CLI tooling is retained.

## Final verified build milestones

| Milestone | Status | Evidence |
| --- | --- | --- |
| Original 387 recorded reference files unchanged | Completed and verified | SHA-256 baseline comparison at end of migration |
| Android x86_64 debug assembly | Completed and verified | BUILD SUCCESSFUL; .cache/android-build-short.log |
| Android x86_64 release assembly | Completed and verified | BUILD SUCCESSFUL; .cache/android-release.log |
| Debug installation as update | Completed and verified | adb install -r: Success; separate package identities checked |
| TypeScript and integration lint | Completed and verified | TypeScript entry coverage; lint-integration.log clean |
| Jest native identity and layout API checks | Completed and verified | 2 suites / 3 tests pass, including installed StyleSheet positioning and obsolete API guard |
| Focused source behavior checks | Implemented but not fully verified | 93/102; all nine remaining failures also reproduce in the reference source; .cache/parity-source-comparison.json |
| Full lint | Pending | 283 errors and 771 warnings; retained source code not rewritten |
| Main Android screens and Profile, read-only navigation | Completed and verified | Pixel 6 Pro API 36; Home, Health sub-tabs, Growth, Nutrition, Calendar, Profile |
| Complete native visual parity and animation timing | Pending | Missing layers/Milestones/Gallery repaired; full form/theme/animation matrix awaits live checks |
| Signed-in localhost:8082 reference comparison | Completed and verified | Chrome phone-width Home, Milestones and Gallery compared with Pixel 6 Pro API 36; same child and pink palette |
| Remaining live forms/settings/animation checks | Blocked | Automatic approval review hit account usage limit; feeding-form opening was not executed |
| iOS compilation/runtime | Blocked | No macOS/Xcode host |
| ARM64/physical Android device validation | Pending | Only x86_64 emulator ABI built in this session |

Release uses the existing starter debug signing key and is a local validation artifact, not a store-ready release. Kotlin incremental compilation reported cache/drive-root errors and successfully fell back to non-daemon compilation. Do not run concurrent builds against this checkout; prefer the same short build path consistently.


Knowledge-graph refresh for this follow-up was attempted but blocked: the graphify launcher reports `uv trampoline failed to canonicalize script path`, its recorded Python interpreter is absent, and the active Python has no graphify module. No tooling was installed to work around this. Both localhost:8082 and localhost:8083 respond with packager-status:running.


## Startup and duplicate-app repair (latest)

Confirmed package identity: migrated com.babybookplus; original Expo APK com.babybookplus.app. Archived the original APK to private .cache/original-apk/original-expo.apk, then removed the original from Android user 0 with pm uninstall -k. Its data/cache was retained; only com.babybookplus remains installed. No source/reference project was deleted.

The emulator had only Metro forwarding (8083), with API forwarding (4000) missing. Both PC services were healthy. A direct development launch started JavaScript while Android retained splash/transition layers. A data-preserving reboot cleared the retained window state. The new android:open command checks both services, selects the intended emulator (or ANDROID_SERIAL), restores both forwards, and launches the migrated URL. preandroid performs the same preparation. Debug-only metadata supplies a default 8083 launch URL; release configuration is unchanged.

StartupGuard adds a 20-second deadline and a recoverable Retry screen with a visible retry loading state. Debug logs contain only six readiness flags. Startup account/child requests accept cancellation; Retry unmounts the old attempt and cancels those requests. It never deletes a saved session because of a network error, and does not admit an unauthenticated user into Home.

Android debug x86_64 assembly and data-preserving installation passed. Home rendered after recovery and on launcher cold starts with signed-in data intact. Final test and launch evidence is reported in the task result. The deeper Android/emulator transition defect is not isolated; a JS deadline cannot dismiss a broken system compositor before JavaScript runs.

Final live verification for the startup repair: the rebuilt debug client reached Home on three consecutive cold starts through the MAIN/LAUNCHER intent after the recovery reboot. Current startup log shows fonts/assets/preferences/language/session/onboarding all true; crash buffer empty. pm list packages babybook reports only com.babybookplus. Both reverse rules are present. Automated startup tests cover missing Metro/API, ambiguous/offline device selection, the 20-second deadline, splash dismissal, Retry callback, readiness cancellation and timer cleanup. Graphify refresh was attempted and remains blocked by the previously documented broken uv launcher.

Final automated result: TypeScript passed; Jest 3 suites / 8 tests passed; branding startup checks passed; android-dev.cjs syntax and healthy live preflight passed. Live timeout-error appearance and iOS were not verified.


## Read-only verification follow-up ? 31 October 2026

The subsequent public QR repair is documented in [QR_SHARING.md](QR_SHARING.md). It supersedes the local-API default and forwarding instructions above: the migrated app now uses the existing hosted API, separates hosted authentication from the retained local session, and labels legacy app-only QR codes. TypeScript and 17 Jest tests pass; the broad suite remains at 93/102. The emulator reached hosted sign-in with an empty crash buffer. Authenticated new-share creation and physical iPhone/Safari verification await the user; they are not certified complete. No dependency, original Expo source, backend, database or cloud setting change.

See [VERIFICATION.md](VERIFICATION.md) for the superseding screen/interaction checklist and explicit remaining limits. Chrome localhost:8082 was accessible again. The walkthrough covered record forms and cancellation, date/time/measurement wheels, Growth filters, Gallery details, Calendar popovers/details, parent/baby profiles and settings, Search and Notifications filters. Native raster artwork was hidden below decorative surfaces; explicit image ordering restored Allergy and Profile settings icons, confirmed after cold relaunch with focused regression checks. No dependencies, native configuration, backend/schema or medical-record writes. A Fast Refresh interruption required a data-preserving cold relaunch and remains a development reliability risk; do not mark exact parity complete.
