# Onboarding and glass picker repair - 7 November 2026

## Changes
- Circular onboarding buttons explicitly clear inherited horizontal/vertical padding; decorative arrows use a centered 32dp box without accessibility font scaling. Next/Back/swipe behavior and labels remain intact.
- Date, time and measurement modals use one internal WheelPickerModal in DateField.js, preserving exports, value formats, draft commits and bounds. MeasurementField also accepts an optional blurTarget.
- Shared geometry centers each viewport and derives content padding, snap interval, row height and selection band together. Normal row sizes remain 64dp/44dp, with room for enlarged text. Decimal and unit labels align with the selection center. Inline duration uses the same geometry.
- New internal GlassTargetContext supplies existing page and nearest record-form blur captures. Explicit picker targets override inherited targets. Existing RecordFormContext retains its boolean interface.
- Neutral overlayGlass tokens are merged only at glass overlay rendering sites: picker shells, confirmations, anchored glass/action/connected/profile menus, glass date/chart filters, and profile-picker rows. Azure active actions remain. Dashboard setupGlass, navbar/header buttons, closed controls and neumorphic form sheets retain their existing materials.
- No dependencies, native configuration, backend, reference Expo source or records changed.

## Validation
- TypeScript: passed. Jest: 9 suites / 36 tests passed.
- Focused ESLint: passed with existing globalThis/exhaustive-deps settings.
- Onboarding checks include explicit circular padding bounds; existing artwork/navigation/reduced-motion checks pass.
- Actual date-wheel handlers, bounds/restrictions/leap dates, drafts, cancellation, initial/snap positioning, inherited target, six theme variants, blur/fallback and reduced transparency checks pass. Geometry is checked at font scales 1, 1.3 and 2.
- Picker pure helpers and current GrowthMeasurementsCard -> NutritionDateFilter -> DateWheelPicker composition pass. Stale source-structure assertions were updated to the current composition and shared shell. Existing date-filter and confirmation safety/contrast checks pass, including palette and dismissal/duplicate-write behavior.
- Anchored glass/action/connected/profile-menu checks, Field and RecordFormSheet checks pass.

## Live verification
Windows Computer Use inspected the existing Pixel_6_API_30 Android 11 emulator. Birth Head Circumference in Edit Baby Profile visibly uses neutral translucent glass, with the selected whole number, decimal, fraction and unit centered in the band. It was opened without saving changes.

A temporary preview rendered the real onboarding component without resetting stored onboarding flags or authenticating another account. Both first and second slide arrows were fully visible; pressing Next advanced to slide two. The preview and temporary app entry were removed/restored. A Fast Refresh duplicate native-view registration during preview setup was cleared with a data-preserving cold app restart. The normal app was restored and visually confirmed on signed-in Home.

## Limits
The browser access host was unavailable, so no fresh browser visual check was possible. Live large-font, time/date modal, Android 31+ true blur and iOS rendering remain unverified; mocks/geometry checks cover these paths. API 30 uses the existing navbar-compatible translucent fallback, not native backdrop blur. No animation smoothness or performance claim is made from settled screenshots. No native rebuild was needed for these JavaScript-only changes.


## Strong frosting follow-up

The user selected actual blur on Android 11 rather than an opacity-only fallback. Glass picker/menu/confirmation paths now use the existing legacy dimezisBlurView implementation below API 31 and the SDK31+ method on newer Android, with intensity 100 and reduction factor 4 (effective radius 25). Shared web blur is 28px. Neutral panels/popovers use 90%-88% light opacity and 96%-94% dark opacity; missing-target/unsupported/reduced-transparency fallback is solid neutral. Azure actions and the navbar remain unchanged.

AppModal keeps its loading/close guards and explicit acceleration overrides, provides a capture for nested modal descendants, and enables hardware acceleration for transparent windows by default. Picker explicit targets still override inherited targets. The date-filter's old viewport blur moved into its panel, so enabling legacy blur does not create a full-screen blur pass.

Verified on Pixel_6_API_30: Add Measurement -> Date Measured, numeric Weight picker, Add Milk -> Time, and baby-profile popup. Background labels/inputs are no longer readable through the settled panels. All forms were cancelled; no record, profile, session or onboarding data was changed. The development client is back on Home with Metro 8083 running. A stalled SDK ADB process and sandboxed Metro manifest error were resolved by restarting only ADB/Metro; no emulator wipe occurred.

Validation: TypeScript, focused lint and 37 Jest tests (10 suites) pass, including nested modal capture isolation, acceleration override and busy-close guards. Picker, menu, confirmation and date-filter behavior checks pass. One isolated modal test timed out during compilation and passed its retry without changing the timeout. Local x86 release assembly succeeded in 4m29s; this is an emulator build, not a store/phone distribution artifact. The broader apiActivity.check.js still fails its pre-existing Growth skeleton assertion, unrelated to modal rendering.

### Rendering cost
Same debug profile-popup open/close sequence, three repeats, one-second pauses:

| Metric | Before | After |
| --- | --- | --- |
| Frames | 75 | 69 |
| Median frame duration | 26ms | 40ms |
| 90th percentile | 81ms | 125ms |
| 95th percentile | 109ms | 150ms |
| Janky frames | 63 (84.00%) | 68 (98.55%) |
| PSS | 496574KB | 451255KB |

These are exploratory debug emulator samples, not a controlled release benchmark. The app was relaunched between samples and the baseline was an older in-memory bundle; memory values do not establish an improvement. The frame samples indicate added cost consistent with legacy blur. Actual blur remains enabled as explicitly requested. Raw counters are in .cache/frost-popup-before.txt and .cache/frost-popup-after.txt. Physical-device profiling is still needed.

Browser verification was attempted through both available browser hosts: CUA reported its browser host unavailable; Playwright reported its Chrome extension missing. No extension was installed. iOS, Android31+ and release-runtime visual/performance checks remain unverified. Earlier API30 fallback notes above describe the superseded first pass.
