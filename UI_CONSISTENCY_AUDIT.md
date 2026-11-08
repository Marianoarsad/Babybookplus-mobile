# Migrated UI consistency audit — 7 November 2026

## Coverage and method

`node scripts/design-system-audit.cjs` parses the migrated App, components and contexts using installed Babel tooling, maps imports and shared controls, and inventories 21 explicit navigation states, 154 modules and 271 JSX-bearing components. UI_INVENTORY.csv contains every inventoried module/component with its controls, material references and an explicit **not visually verified** baseline. Nested form/auth/viewer states are additionally grouped below; import reachability is not runtime reachability.

This is a source-wide inventory plus targeted source/design review and native repair verification. It is **not a completed screenshot audit of every screen/state**. The older Expo audit is not counted as current migrated coverage.

## Findings and repairs

| Finding | Scope/repair | Status |
| --- | --- | --- |
| Duration unit centered against label/input stack, with obsolete bottom margin | Field/FieldShell trailing slot; Nutrition Duration unit, Amount unit choices and Mixed Breastmilk Amount suffix now align structurally to the surface | Implemented; Duration native verified; other amounts source/test reviewed |
| Gender duplicated older segmented styling | Add and Edit Baby Profile reuse Milk Type's NeumorphicTabs; removed old Gender styles | Edit native verified; Add source reviewed |
| Add Baby Profile still used free-text Blood Type | Reused connected selector, option keys and local form capture used by Edit; legacy stored values are not rewritten | Implemented, native Add flow not fully verified |
| Secondary creation sheets discarded their chooser origin | Scoped RecordCreationContext + nine creation keys; arrow Back, local cancellation and chooser return through shared dismissal path | Nine-key hook regression tests; Milk native verified |
| Creation origin could leak into later editors | Clear on completion/view/child/session change; editing and unmatched forms remain Close | Hook regression tests cover matching, editing, unrelated forms, success and independent forms; full live matrix pending |

## Visual family review matrix

| Family/areas | Source reference and retained distinctions | Current live coverage |
| --- | --- | --- |
| Home/Health/Growth/Nutrition/Calendar navigation | TabBar and header assets; keep glass navigation and family-specific dashboard surfaces | Home and Nutrition during creation; full five-tab matrix pending |
| Profiles and settings | ScreenHeader, SettingsCard, Field, shared buttons; raised parents and recessed text fields | Edit Baby Profile Gender/fields; Profile hub/Home navigation observed |
| Record creation/editing | RecordFormSheet, FieldShell, SheetGrabber, NeumorphicTabs; preserve independent editors and validation | Milk Add header/units and return to chooser; other eight creation branches hook-tested |
| Record details | PlanDetail/NeumorphicCard; glossy Edit and arrow-only Back remain | Source inventory; fresh per-category visual pass pending |
| Dropdowns and wheels | Connected OptionSheet vs specialized date/time/measurement wheels; strong neutral frosting retained | Source review; prior dropdown evidence remains in CONNECTED_DROPDOWNS.md, not recounted as this task's live pass |
| Cards/charts/metrics | Scoped Growth/Nutrition/Profile surfaces, semantic statuses and existing artwork; charts and filter chips are intentional variants | Source inventory; full fresh rendered matrix pending |
| Search/Notifications/All Activity | Existing search surface, category icon registries, selected filters and shared headers | Source inventory; current live states pending |
| QR sharing/scanner/professional viewer | Existing access controls, readonly snapshot presentation, privacy and specialized overlays retained | Source inventory; existing session not created or changed for QA |
| Auth/onboarding/splash | Existing fixed azure material, shared inputs/buttons and artwork; keep distinct pre-auth identity | Source inventory; signed-in session retained |
| Loading/empty/error/busy/disabled states | Preserve state-driven messages/guards and shared Skeleton/EmptyState/Button behavior | Automated component coverage only; full rendered matrix pending |

The review did not flatten semantic category cards, force standalone choice chips into navigation tabs, replace meaningful artwork or impose a single surface on specialized overlays. No further visual differences are certified as defects from literal-style counts alone.

## Validation and limitations

- TypeScript, focused lint, Jest (56 tests/12 suites), RecordFormSheet and NeumorphicTabs checks pass. New tests cover unit row structure and every global creation key, edit isolation and successful close without chooser reopening.
- Android, iOS and web production bundle exports pass (`.cache/ui-consistency-export`). The first attempt could not write Hermes temporary files under sandbox permissions; the authorized retry succeeded. These are JavaScript/asset exports, not a rebuilt APK, an iOS native build or browser rendering verification. Graphify was refreshed with its existing SQL/Gradle extraction limitations.
- Existing Pixel_6_API_30 / Android 11 emulator, debug development client, Metro 8083: inspected Milk Type reference, aligned Duration unit, arrow Back and return to collapsed chooser, Edit Baby Profile Gender, and final Home. No Save/Delete, clinical record write, logout or theme preference change occurred.
- Sampled crash/ANR buffers retained prior 03:43 renderer and 03:17 focus failures; no new timestamp appeared during this 04:29–04:32 sequence. This is not a stability/performance certification.
- Browser rendering is blocked by the previously unavailable browser host. iOS cannot run in this Windows environment. Full dark/large-font/language/native keyboard, save/error, all-action dismissal and timed animation matrices remain pending. No additional tooling was installed.
- The configured tests and targeted checks are distinct from the legacy Auth/SettingsControls source fixtures and broader known pre-existing failures documented in earlier task reports. No whole-repository clean-check claim is made.

Completed: reported repairs, source inventory, shared standards, targeted verification. Implemented but not fully live verified: additional amount rows, Add Profile equivalence, eight other creation routes. Pending: complete per-screen rendered audit and state/theme matrix. Blocked: browser/iOS live coverage as described above.
