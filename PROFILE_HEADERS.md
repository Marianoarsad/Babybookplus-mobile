# Profile forms and secondary headers

Implemented in the migrated application only, 5 November 2026.

## Official pattern

The five primary tabs retain child switching and global navigation icons. Every named secondary destination uses Back/title/context actions only, through `src/components/ui/ScreenHeader.js`. Baby Profile has the existing glossy Edit icon directly in the header; its old options menu is removed. Existing bottom-tab visibility is preserved.

The shared PlanDetail header covers health, feeding, growth, appointments, calendar, shared QR and access details, including read-only viewer inspections. Memory/milestone details use the same presentation. Detail overlays keep local animated scroll values and measured content clearance, independent of the page beneath. All Back controls now display only the arrow, including scanner fallback, calendar picker and professional-view navigation. Authentication, onboarding, sheets, image viewers, and picker/confirmation overlays retain their specialized controls.

## Form and deletion

Edit Baby Profile reuses settings-style Field/FieldShell surfaces, rounded date/time/measurement triggers and the glossy shared Save Changes button. Existing bindings, validation, image selection/upload and payloads remain. Delete Profile follows Save Changes and uses the existing owner-only DELETE endpoint after an anchored confirmation. No account or other-child data is deleted.

On successful deletion the frontend retires that child in recordStore, discards only its cached records/operations and rejects delayed responses; it clears obsolete profile navigation and selects the first remaining child. With none remaining, the existing EmptyChild gate renders. Session changes prevent applying stale success. Failures preserve the form/profile and allow retry; simultaneous duplicate submissions are guarded.

## Verification

- TypeScript passes. All six Jest suites pass: 33 tests, including new actual delete-handler tests with mocked requests for child isolation/late responses, failure, duplicate confirmation, last-child deletion and stale sessions.
- Existing HeaderNavigation, RecordFormSheet and recordStore checks pass. The form check was updated to recognize the deliberate settings appearance on the blood-type field.
- Targeted integration lint passes with the existing globalThis override and pre-existing exhaustive-deps findings excluded. Unmodified picker dependency arrays and the legacy .cjs parser configuration still prevent claiming a clean default whole-repository lint run.
- Pixel 6 API 30: cold launch restored populated Home after shared-module Fast Refresh left it blank; Baby Profile shows Back/title/glossy Edit with no global icons; Edit Baby Profile shows recessed fields and scrolling to Save Changes/Delete Profile above the existing bottom navigation. No Save or final Delete was submitted.
- Browser verification is blocked by the missing Playwright Chrome extension. iOS, dark-theme/font-scale/keyboard matrices, exact animation timing and a full live detail-overlay matrix remain unverified. Real deletion was deliberately tested with mocked requests, preserving the existing profiles and medical records.
- No dependencies, schema changes, backend deployment, or native rebuild were needed. Graphify AST update completed with the existing SQL extractor dependency warning and Gradle parse warning.

The corrected anchored Delete Profile dialog was visibly inspected on Android and Cancel was exercised; the form remained available without saving or deleting.


## Global material and icon follow-up

Field and FieldShell now default to the approved inset material, using the native View-backed NeumorphicInsetSurface rather than a gradient painted over its shadow. Raw record inputs retain their handlers but have transparent backgrounds; the compound scoops control and custom medicine frequency input also use shared shells. Global, Gallery, parent/viewer vaccination and solid-food searches retain their existing layout, icons, clear actions and search logic while sharing the recessed surface. Date/time/measurement controls share the same shell. Authentication retains its fixed material colors. No shadows/gradients were added to unrelated cards.

Back text was removed from page/detail headers, scanner fallbacks, the calendar month picker and professional-view navigation; accessible names remain. The destructive account dialog uses Cancel instead of Go back. All editor-opening actions use the original glossy pencil artwork, including the icon-only memory-menu and parent-profile settings actions. Save/Update buttons that submit a form retain their labels. No edit actions were added to read-only record viewers.

Verified on the existing Pixel 6 API 30 emulator: clean relaunch; Baby Profile header transparent over the blue page at the top, white after scrolling down, and transparent again after scrolling back; direct glossy Edit action; visible inset shadows on profile text, date and blood-type fields. The seven Jest suites (33 tests), TypeScript, Field, RecordFormSheet and HeaderNavigation checks pass. New material tests cover all six palettes, auth colors, multiline shape, custom input surface, numeric filtering, focus/disabled states and arrow-only header naming. Targeted lint passes with the same existing globalThis/exhaustive-deps overrides documented above. Native screenshot inspection establishes the actual API 30 effect, not merely a style mock. No saved changes or deletion was submitted.

Browser inspection remains blocked by the missing Playwright extension. iOS, physical devices, native dark/font-scaling/reduced-motion and the complete form/menu/scanner visual matrix remain unverified. The graph was refreshed with the existing SQL extractor and Gradle parser warnings. No dependencies or native rebuild were required.

Native custom-search follow-up: Global Search rendered the shared recessed search box and opened its existing keyboard focus normally, with the arrow-only header visible. No query was entered or history saved.

## Health/Growth callout spacing

Their TipStrip bottom margin is now 14.4dp before the local tabs, a 50% increase over the previous 9.6dp. Horizontal margins are zero so both callouts match the width and alignment of the content cards. Other tips retain their existing spacing, and dismissal/storage behavior is unchanged. TypeScript and parsing checks pass. Both Growth and Health were inspected on Pixel 6 API 30 after a data-preserving relaunch. Browser verification is blocked by the missing Playwright extension.

## Edit Baby Profile parent surface and Blood Type popup (7 November 2026)

The editor replaces its flat RecordFormGroup with the existing SettingsCard parent surface (hidden empty header), retaining the form's inner spacing and sunken fields. Its Blood Type AnchoredMenu now opts into the shared glass appearance and page blur target; the closed selector remains recessed. No dependencies, native configuration, field handlers, submission/deletion logic or reference-app files changed.

Verified on the existing Pixel 6 API 30 debug client after a cold relaunch: raised top/bottom card edges, scrolling to Save Changes/Delete Profile, all eight frosted menu options, draft selection, Android Back dismissal of the open menu, header Back and reopening with the saved value. The draft was discarded, no Save/Delete was submitted, and the app was returned to Home. A single Android window-focus ANR occurred during rapid menu-close/Back/reopen; Wait recovered it, subsequent checks did not repeat it, and dumpsys confirmed MainActivity regained focus. Its cause is unconfirmed; this is not a full stability or animation-performance pass.

TypeScript, focused integration lint, RecordFormSheet/AnchoredMenu checks and all 37 Jest tests (10 suites) pass. SettingsControls.check.js has a pre-existing unmocked NeumorphicInsetSurface fixture failure. Browser inspection remains blocked by the unavailable browser host/missing Playwright extension. iOS, dark theme, large fonts, release-runtime rendering and full save/delete flows are unverified.
