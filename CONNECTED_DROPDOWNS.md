# Connected option-list dropdowns — 7 November 2026

The Home Growth / Last 30 Days metric selector is the visual reference. Only ordinary option-list inputs were changed. Text/password/numeric/multiline fields remain recessed. Wheel controls, the profile switcher, filter checklists, date filters, action menus and navigation retain their specialized designs.

## Implementation

- `SelectTrigger` shares the glossy 22dp face, wrapping text, chevrons, labels/errors, focus restoration and anchor refresh on viewport/font changes, page scrolling, web resize and keyboard dismissal. Existing selectors already using the Growth treatment retain their proven trigger code and shared material.
- `OptionSheet` uses the existing connected AnchoredMenu surface/header and illuminated option rows, preserving key types, notes, optional clearing, disabled choices and selection callbacks.
- Applied to Blood Type, signup relationship, vaccine, medicine-condition linking, allergy type, memory/milestone development category and Gallery sorting. Gallery sorting has a bounded minimum width so the control wraps as a unit instead of collapsing its text column.
- Connected menus now expand upward when needed without shifting the expanded header off its trigger. Large lists scroll within available bounds. Existing menu animation duration and reduced-motion paths remain.
- Vaccine and medicine forms expose their existing blur capture to sibling menus through the optional internal RecordFormSheet `blurTargetRef` prop. Auth supplies a local capture. Menus close with their owning forms. No new dependencies, backend/schema, navigation or persistence changes.

## Verification checklist

- **Completed and verified:** TypeScript; focused lint using the existing globalThis/exhaustive-deps overrides; 45 Jest tests / 11 suites; AnchoredMenu, RecordFormSheet, GrowthChart and DevelopmentChecklistCard checks; optimized web export.
- **Additional checks:** MemoriesMilestonesCard.check.js passes, including Gallery category/sort callbacks and responsive palettes. Auth.check.js passes its revised relationship-dropdown flow, then fails its older FieldShell assertion expecting a directly rendered inset Gradient. Field.js was not changed in this task; the shared recessed-input Jest coverage passes. This legacy check is not reported as passing.
- **Completed and verified on Pixel 6 API 30 debug client:** Blood Type closed/open geometry, upward expansion, illuminated selected option, local selection and draft discard/reopen with original saved value; vaccine glossy trigger, aligned frosted long list and retained Something Else free-text path; Home Growth reference dropdown and Android Back dismissal; Gallery sort wrapping and connected menu. No Save/Delete or record submission occurred. Emulator returned to Home.
- **Implemented, not fully live verified:** signup relationship, medicine-condition selector, allergy selector, memory/milestone category; final decorative leading-icon additions; all themes/large-font/native keyboard and expansion matrices. Shared material/option behavior has automated coverage, which does not establish complete native visual parity.
- **Blocked:** browser rendering inspection (CUA browser host unavailable); iOS runtime (Windows environment). Web export passed; that does not replace browser inspection.
- **Pending:** physical-device/release-runtime validation and timed intermediate/reduced-motion playback. Settled native screenshots establish appearance, not animation smoothness.

## Native stability limitation

Shared-module Fast Refresh again left Home blank until a data-preserving cold relaunch. One relaunch hit an Android HWUI/JankTracker abort, `Impossible totalDuration 0`; the app reopened successfully on retry. The same abort and another invalid dequeue-duration abort predate this change, including an Android System UI process failure. No ReactNativeJS error was observed in the sampled error output. The prior no-focused-window ANR timestamp remained unchanged at 03:17 during this task. These observations do not establish a root cause or a full stability pass; no emulator data/settings were reset.

The original `front-end/` project remains a read-only reference. Existing uncommitted work was preserved.
