# Migration verification — 31 October 2026

This report supersedes the earlier form/settings verification block in MIGRATION.md. It records a read-only walkthrough, not proof of complete feature or pixel parity.

## Environment and comparison

- Reference: signed-in original Expo app at http://localhost:8082 in Chrome. Compared Profile, Appearance/light and dark, Search, feeding form structure and Conditions artwork. Chrome was set to 411 × 891 CSS pixels when maximized; its smaller window clamped the viewport, including during the final Conditions artwork comparison. Do not interpret those smaller captures as pixel comparisons at 411 px.
- Destination: existing development client `com.babybookplus`, Metro 8083, API 4000; Pixel 6 Pro API 36 x86_64, approximately 411 × 891 dp including Android system bars.
- Selected the same child for comparison. Automatic/Light preferences were restored in both apps. Blue light/dark and pink dark were also observed on Android; this is not every screen in every palette.
- Browser and emulator clocks differ. Daily feeding values/date defaults and per-installation shortcut history are not reliable visual-parity comparisons without synchronizing those states.
- Original Expo source remains unchanged: all 387 recorded SHA-256 hashes match.

## Repair verified in this pass

Android showed empty decorative circles where Expo displayed the allergy and settings raster artwork. The files were present and the allergy asset returned HTTP 200 from migrated Metro. Explicit `position: relative` and `zIndex: 1` now keep these images above their decorative surfaces in `RecordIcon.js` and `ProfileSettingsIcon.js`.

Verified after a data-preserving cold relaunch: green allergy artwork in Conditions summary/rows and Baby Profile; phone, location, appearance, language, person, lock, privacy, help and book artwork in Profile. Existing artwork, sizes, theme colors and callbacks are preserved. Regression assertions cover raster ordering in the existing six-palette icon harnesses. No dependency, native configuration, backend or schema changes.

## Current checklist

| Area | Status | What was actually checked |
| --- | --- | --- |
| Home and child selection | Completed and verified | Selected matching child; Home loaded; profile navigation and return |
| Growth filters | Completed and verified | Date popover open/close; chart popover opening/settled states; Height off/on restored |
| Milk | Completed and verified | Form open/cancel, date picker open/cancel, input focus; no save |
| Solid food | Completed and verified | Form, category/recent-food controls, scroll to reaction/date/time/notes; cancel |
| Growth entry | Completed and verified | Form, measurement wheels, cancel leaves value unset; form cancel |
| Vaccination entry | Completed and verified | Form, required due-date field, long vaccine selector open/close; cancel |
| Checkup | Completed and verified | Form and time wheels; cancel retains unset time; form cancel |
| Medication | Completed and verified | Form and scrolling through scheduling/lower controls to photo; cancel; no dose action |
| Conditions | Completed and verified | Illness, Allergy and Hereditary unsaved variants; cancel; restored artwork |
| Hospital stay | Completed and verified | Form and scroll to final photo control; cancel |
| Gallery | Completed and verified | Photo/Milestone unsaved variants; category selector open/close; read-only memory detail and Back |
| Calendar | Completed and verified | Legend open/close; month/year picker open/Back; selected day; Upcoming tab; read-only plan detail/Back |
| Parent settings | Completed and verified | Profile, Appearance, Language, Help/FAQ expansion, About; Edit Profile load/leave unchanged; Privacy page viewed without activating controls |
| Baby profile | Completed and verified | Profile, action menu, Edit Baby Profile, blood-type selector open/close retaining value, Back through profile to Home |
| Search | Completed and verified | Empty/categories, no matches, matching result/count, clear query; no history submitted |
| Notifications list | Completed and verified | Needs Attention and All/Unread list filter; no notification opened or marked read |
| Raster image repair | Completed and verified | Current code rendered after cold relaunch; focused icon checks pass |
| Native startup after patch | Completed and verified | Cold relaunch reached Home/Health; subsequent navigation worked; no crash-buffer entries |
| TypeScript / Jest | Completed and verified | TypeScript; 3 Jest suites / 8 tests; focused icons, menus and 11-sheet harness |
| All focused parity checks | Implemented but not fully verified | Nine pre-existing reference failures remain; see MIGRATION.md and .cache/parity-source-comparison.json |
| Record saves, edits, deletes and persistence after writes | Pending | Live medical/account data was preserved; opening/cancelling forms does not verify writes |
| QR sharing and professional viewer live flows | Pending | ShareRecords marks access logs seen on load; not opened during read-only QA; no code generated, shared or revoked |
| Photo/camera/scanning, exports, reminders delivery | Pending | Device picker/permission, external sharing and notification-delivery flows not exercised |
| Authentication, password changes, consent/account actions | Pending | Saved session retained; no logout, credential entry, consent renewal or deletion |
| Exact animation timing / reduced motion / all-screen theme matrix | Pending | Menu start/intermediate/settled states and mocked reduced-motion paths checked; no frame-timing or live reduced-motion certification |
| Full software keyboard layout | Pending | Emulator exposed hardware-keyboard input/compact Gboard controls rather than the full soft keyboard |
| Fast Refresh interruption | Pending | One refresh after changing the shared icon modules left Health content blank without a logged crash. A cold relaunch recovered it. Cause not isolated; ordinary navigation subsequently passed |
| iOS | Blocked | Windows host has no macOS/Xcode environment |
| Physical Android / ARM64 | Pending | Live verification used x86_64 emulator only |
| Knowledge graph refresh | Blocked | `graphify update .` fails: `uv trampoline failed to canonicalize script path`; no new tooling installed |

The table's completed entries apply to the specific read-only scenarios listed. They do not certify complete CRUD behavior or exact visual identity across every device/state. Existing source lint and stale focused checks remain separate from migration-specific defects.

## Automated results after the repair

- `npm run typecheck`: passed.
- `npm test -- --runInBand`: 3 suites, 8 tests passed.
- `RecordIcon.check.js`, `ProfileSettingsIcon.check.js`, `AnchoredMenu.check.js`, `RecordFormSheet.check.js`: passed, including raster ordering, six-palette icon cases, connected-menu interruption/reduced-motion mocks and the 11-sheet form harness.
- `npm run check:parity`: 93/102 passed. Comparing the failing file set with `.cache/parity-source-comparison.json` found no new failures. The nine retained failures are recordActions, EntriesButton, FeedingTodayCard, GlassDateRangeFilterModal, IllnessesConditionsCard, NeedsAttentionCard, apiActivity, cacheNavigation and pickers checks. They are not reported as passes or silently removed.
- Original source hashes: 387/387 unchanged. Crash buffer empty; only `com.babybookplus` installed. Both ADB reverse rules were present.
- Full lint is not clean; its previously recorded source baseline remains unresolved. This pass did not rewrite the reference application's style or architecture to clear unrelated lint.

Logs: `.cache/verification-parity-final.log`, `.cache/parity-results.json`, `.cache/verification-jest-final.log`. Screenshots were inspected through the connected UI tools in the conversation; no screenshot archive is claimed.

## Development and artifact state

For the later hosted-API/iPhone QR repair and its separate verification checklist, see [QR_SHARING.md](QR_SHARING.md). The previous retained-local-session result below is historical: this repair intentionally requires a fresh hosted-account sign-in without deleting the local session. New hosted share creation and the physical iPhone/Safari flow remain pending.

The current JavaScript fix runs through the existing development client and Metro; a new native client was not required. Previously assembled standalone release APKs predate this patch and must be rebuilt to include it. Use README.md for normal startup and build commands. For a retained blank development view, use the documented Reload/cold-launch flow without clearing data.

No medical record, dose, account value, consent or sharing permission was saved, changed or deleted by this walkthrough. Opening Add actions can update the app's local most-used shortcuts as designed. No external messages, exports, uploads or deployments were performed.


## Get Started glass redesign ? 31 October 2026

| Status | Verification |
| --- | --- |
| Completed and verified | Pixel_6_API_30: production checklist markup/styles inspected in a temporary read-only 3/4 fixture, in light and dark themes and at a narrow 280dp card width. Soft rim, translucent surface, dividers, green checks and alignment rendered correctly. |
| Completed and verified | TypeScript; 17 Jest tests; focused setup logic, Home, six-palette and record-form checks pass. New setup checks evaluate actual production expressions/callbacks for progress, navigation, dismissal, completion persistence and blur selection. |
| Completed and verified | Temporary fixture/entry override removed; real first-run flags and medical/account records untouched. Normal app cold-launch checked separately. |
| Implemented but not fully verified | iOS/Android 31+ native blur uses the installed module and a separate background-only target. Only API 30 was available for live visual QA. |
| Pending | Browser preview: browser connector reports unavailable; desktop Chrome preview could not be controlled reliably (minimized window/profile picker and geometry error). No browser visual pass is claimed. |
| Pending | Live large accessibility text, image-background matrix, frame timing and physical-device/iOS verification. Narrow-card layout was checked; it does not certify large-font behavior. |

No dependencies or native configuration changes; the reference Expo source is unchanged. Existing completed onboarding remains hidden by its original logic. Reopening it by resetting real preferences is deliberately excluded. Fast Refresh during the temporary entry switch produced duplicate native-view registration errors; cold launch recovered it. Do not interpret that hot-reload result as a native blur failure.

Final redesign verification: broader parity run passed 94/103 (the same nine existing baseline failures); the updated nested-target form check passes. All 387 original Expo hashes remain unchanged. Restored normal Home after cold launch and confirmed an empty native crash buffer. Graphify refresh attempted but blocked by `uv trampoline failed to canonicalize script path`. Logs: `.cache/setup-jest.log`, `.cache/setup-parity-final.log`.


## Global detail surfaces ? 31 October 2026

See [NEUMORPHIC_DETAILS.md](NEUMORPHIC_DETAILS.md) for the updated screen inventory, shared component, test results and native/browser/platform limits. This changes only migrated detail content surfaces and preserves dashboard/glass styling.

Entry Back labels (31 October 2026): PlanDetail always shows Back, with the record date retained in the content. Memory/milestone detail adds Back beside its arrow. TypeScript, targeted lint and memory/detail-confirmation checks pass. Pixel_6_API_30 cold relaunch and read-only Mango slices detail inspection confirmed BACK with its original date/time below the title. iOS/browser were not checked for this small label change; Graphify refresh still fails through the uv launcher.


## Add a record handle expansion ? verified 4 November 2026

The migrated Add menu now captures a single header touch immediately through `grabberPan`, before the pointer can leave the handle region. Dominant vertical movement over 12dp starts resizing; upward travel of 64dp expands to the existing 80% height. Taps/horizontal pulls do not resize, and short/interrupted pulls recover. The original delayed responder remains available to record-form toolbars. Double grabbers, sizes, action order, navigation and usage-counter behavior are retained. The header is a non-collapsible native touch target with decorative children excluded from hit testing.

| Status | Evidence |
| --- | --- |
| Completed and verified | Pixel_6_API_30: upper-line upward expansion, content scrolling through Photo or milestone, downward dismissal and reopening collapsed checked during the original repair on 31 October. |
| Completed and verified | Follow-up on 4 November: open the saved repair, swipe upward directly from the lower grabber, observe expansion from the collapsed position to the 80% position, then Cancel back to Gallery. No record action selected or medical data saved. |
| Completed and verified | Fresh bottom-sheet, record-form, global Add and record-icon checks pass. TypeScript and targeted ActionSheet/motion-hook lint pass. A stable dismiss callback reference resolves the lint dependency warning. |
| Completed and verified | Jest: 5 suites / 19 tests pass. Log: `.cache/sheet-gesture-jest-final.log`. Mocked checks include early single-touch acquisition, multi-touch rejection, no-op taps/horizontal pulls, upward movement, interruption, downward close, reopen, locked forms and reduced motion. |
| Pending | iOS, physical devices, live reduced-motion settings and frame timing. Native screenshots establish collapsed/expanded/closed states; they do not certify intermediate-frame smoothness. |
| Blocked | Browser gesture verification: the browser access host remains unavailable. |

No dependencies or native build changes. The original Expo application remains a read-only reference.

Knowledge graph refresh succeeded on 4 November: the AST graph now contains 8,933 nodes. Earlier uv-launcher failures documented above are historical.

Crash-log limitation for the 4 November follow-up: the buffer contained an entry at 14:15, before this live walkthrough. The process-classification read stalled and its own adb client was stopped; the emulator and adb server were retained. This follow-up does not claim an empty crash buffer. The sheet expansion and Cancel scenarios completed successfully in the live app.


## Performance follow-up (6 November 2026)

Preserved glass, SVG filters, shadows and animation settings. Equivalent overlapping non-cancellable record reads now share their network request, scoped by session epoch and cache revision. Confirmed-only reads remain independent. Home retains cached sections while refreshing and guards initial feeding/checklist states. Search uses a single Animated.FlatList with stable keys and the existing scroll controller; no nested vertical list. GlassLighting memoizes its static SVG subtree without changing artwork or animated hosts.

Verified: TypeScript, 34 Jest tests, record-store checks, new readDedup.check.js, and targeted API/Search/GlassLighting lint. Existing Dashboard/ScrollContext exhaustive-deps errors remain. Updated cached-navigation mocks understand GlossyEditIcon and FlatList headers/rows; that suite reaches a later existing sharing-action fixture mismatch. The loading suite stops at its Growth skeleton assertion.

Browser verification is blocked by the missing Playwright extension. Native screenshot output was rejected by automatic approval review because the captured desktop included unrelated private content. No visual-parity, animation-timing or release-performance improvement is certified. No APK was rebuilt/installed, no app storage cleared, and no records changed. Matching release-build frame/memory measurements and native/browser interaction verification remain required before claiming a measured speedup.
