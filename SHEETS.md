# Expandable sheets

Only the migrated `BabyBookPlus` application is changed. Anchored selectors, picker dialogs, confirmation popovers and full-screen editors retain their existing presentation.

## Shared behavior

- `SheetGrabber` owns a 44dp double-line touch target and captures the gesture at touch start. Header action buttons and body scrolling are separate targets.
- Both `ActionSheet` and `RecordFormSheet` use `useBottomSheetMotion`. Pull up at least 64dp to expand to the safe-area ceiling; pull down to collapse, then pull down again to dismiss when permitted.
- First-child setup can resize while remaining non-dismissible. Busy/deleting/confirmation states lock resizing and retain existing submission/delete guards.
- Collapse reserves at least 64dp of expansion room when the available viewport exceeds 200dp. Safe areas, window/font changes and the keyboard constrain the available size. Form modals use native KeyboardAvoidingView (Android height/iOS padding) and a scrolling body.
- Screen-reader increment/decrement actions resize the grabber. Web Arrow Up/Down and Enter/Space also resize it. Reduced-motion preference bypasses animation.

## Coverage

The shared form covers 12 presentations: Add Child, first-child setup, Growth, Medicine, Medical Event (illness/hospital/condition variants), Memory/Milestone, Vaccination, Appointment, Mark Dose Given, Calendar Event, Milk/Solid Food Entry and Medication Completion. Add a record is the other actual bottom sheet.

Shared Button supplies header/footer actions. Nutrition milk type/method/reaction and first-child sex selectors reuse NeumorphicTabs with radio semantics. Existing settings selection tokens style sheet choices in Growth, Health, Nutrition, Calendar, Add Child, Medicine, Medical Event and Memory/Milestone. Quick-fill chips use the existing secondary surface. No dependencies, routes, persistence or API payloads were changed.

## Validation (5 November 2026)

- Completed: 8 Jest suites/34 tests, TypeScript, targeted ESLint (existing exhaustive-deps/globalThis overrides), ActionSheet, RecordFormSheet, NeumorphicTabs and global Add checks.
- Completed on Pixel 6 API 30: cold relaunch; Add a record expansion/collapse; Add Solid Food expansion; existing Mango slices editor expansion/collapse with saved name/date/time retained; keyboard-visible form resizing/expansion and scrolling Date, Time and Notes above the keyboard. Intermediate and settled drag states were inspected. No records were saved or deleted.
- Implemented, not fully device-verified: every other shared form caller, first-child setup, larger system fonts, device rotation, dark themes, native screen-reader gestures and reduced-motion settings. Automated checks cover sizing, reduced motion, gesture locks, non-dismissible expansion and accessibility callbacks.
- Blocked live checks: browser connector lacks its Chrome extension; no iOS simulator is available on Windows. No browser extension or new tooling was installed.
- No native build was needed for these JavaScript-only changes; the existing development client was reused. No frame-rate or precise animation-timing claim is made.

Run from `BabyBookPlus/`:

```text
npm test -- --runInBand
npm run typecheck
node src/components/ui/ActionSheet.check.js
node src/components/ui/RecordFormSheet.check.js
node src/components/ui/NeumorphicTabs.check.js
node src/components/globalAdd.check.js
```
