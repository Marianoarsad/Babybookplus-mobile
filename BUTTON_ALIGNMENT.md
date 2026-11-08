# Action-button alignment — 7 November 2026

## Rules and implementation

Action-button labels center horizontally and vertically. Where an icon accompanies a label, their **combined inline group** is centered, preserving left/right icon order. Dropdown options, input values, navigation/settings rows and attachment/content rows keep their existing alignment. Footer buttons keep their current positions.

- DateField's shared PrimaryButton and TextButton now center their children and label text, including wrapping. The styled date-wheel labels inherit the base alignment. The same renderers serve date, time, measurement and date-filter wheel dialogs. Android labels omit extra native font padding and use centered vertical alignment; existing fonts, sizes and line heights remain.
- Button applies centered wrapping text to all nine variants. Its shrinkable content row centers inline icons and labels; right-side glossy icons no longer use absolute edge positioning or asymmetric reserved padding. Icon-only, busy/disabled, haptics, colors, dimensions, callbacks and loading behavior remain.
- Missing action-label text alignment was corrected in Services call, scanner Cancel, Growth View Detail, detail Delete, choose-photo, sharing Retry, Nutrition filter footer, Health action and Profile Retry styles where applicable. Glass date-filter action labels are centered conditionally, preserving its field-value alignment.
- EntriesButton/ShowMore, confirmation buttons, onboarding/auth button families and clinical dose actions were reviewed against their existing centered containers/labels. Their approved centered layouts remain. No universal button-role override, dependency, backend or record changes.

## Validation

| Check | Result |
| --- | --- |
| TypeScript and focused lint for changed renderers | Pass |
| Jest | 58 tests / 13 suites pass |
| Shared Button regression | Nine variants, six palettes, plain/left/right icon groups, multiline labels, loading, disabled and icon-only behavior pass |
| DateWheelPicker checks | Base/styled action alignment at scales 1/1.3/2 on web/iOS/Android mocks; six palettes, existing date bounds/drafts/cancel/commit/reduced-motion checks pass |
| GlassDateRangeFilterModal and dateLayout checks | Pass |
| EntriesButton.check.js | Existing inventory mismatch: 12 definitions versus expected 13, after its earlier component assertions; EntriesButton was not modified |
| Android/iOS/web production bundle export | Pass, .cache/button-alignment-export; this is not a rebuilt native binary |
| Pixel_6_API_30 / Android 11, debug client | Date, measurement and time Done/Cancel visibly centered; profile Save Changes/Delete Profile visibly centered. Pickers cancelled, no Save/Delete/record submission occurred; returned to Home |
| Browser preview | Blocked: current browser access host unavailable |
| iOS runtime, physical device, full dark/large-font/language matrix | Not live verified; platform/theme/style mocks and exports do not establish native visual coverage |

Shared-module Fast Refresh left the editor blank during code updates and recovered through a data-preserving cold relaunch. Sampled final crash/ANR buffers retained pre-existing 04:39 HWUI timing-abort and 03:17 focus-ANR timestamps; no new failure timestamp appeared during the inspected sequence. This task does not certify that earlier instability is fixed.

The broader full-screen visual audit remains separately tracked in UI_CONSISTENCY_AUDIT.md. This report covers action-button alignment and its verified limits.
