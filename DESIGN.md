# Migrated BabyBook+ visual standards

The migrated runtime (`src/theme.js` and its shared controls) is authoritative. The root October Expo design guide is historical context; do not change `front-end/` to implement migrated-app repairs.

| Element | Established implementation |
| --- | --- |
| Main navigation | Existing glass TabBar, shared child/header controls and assets |
| Secondary headers | ScreenHeader/PlanDetail; arrow-only Back, glossy Edit icon, existing scroll-fading ground |
| Text/search inputs | Field/FieldShell or SunkenInputSurface; theme-aware recessed material |
| Units/accessories | Field `trailing` slot; vertically centered with the surface, excluding label/helper/error text |
| Segmented tabs/radio choices | NeumorphicTabs; Milk Type is the visual reference; Gender uses the same component |
| Ordinary dropdowns | SelectTrigger/OptionSheet and connected AnchoredMenu; Home Growth selector is the reference |
| Parent/detail cards | Existing SettingsCard, NeumorphicCard and scoped family surfaces; preserve intentional category palettes |
| Buttons | Existing glossy settings/settingsSecondary families for main actions; retain semantic danger, text and compact actions |
| Sheets | RecordFormSheet and SheetGrabber; retain expansion, safe-area, keyboard and busy guards |
| Global creation Back | RecordCreationContext identifies the originating action; eligible new forms show arrow Back and return to the collapsed chooser after exiting |
| Other overlays | Existing strong neutral glass picker/confirmation materials; preserve specialized profile, checklist, date and action menus |
| Text/icons/spacing | `type`, `space`, `radius`, semantic tokens and existing artwork registries; preserve responsive wrapping and touch targets |

`Field` and `FieldShell` accept optional React content in `trailing`; callers must supply unit-aware accessible labels and retain numeric/validation handlers. Fields without this prop keep their existing surface layout.

`RecordFormSheet` accepts optional `creationKey` and `onBack`. Only a matching new-record origin enables Back-to-Add automatically; editing records and independent forms retain Close. Header Back, Android/accessibility Back, backdrop and completed drag dismissal share the existing motion close path. Inner pickers/confirmations handle Back first. Success closes normally and clears the origin; draft cancellation returns to Add without saving. Scope changes clear the origin; no flow state is persisted.

Do not treat every local number, compact action, spaced choice chip or chart control as a defect. Match semantics and the relevant approved family before changing it. Preserve glass/shadows, animation durations, clinical status colors, data bindings, privacy and navigation. Never use a static import inventory as proof of rendered consistency.

See UI_CONSISTENCY_AUDIT.md and UI_INVENTORY.csv for evidence and remaining coverage.

Action-button labels and their optional inline icons are centered as a group; wrapping labels use centered text. Wheel action labels inherit alignment from the base picker styles. Do not center dropdown/content-row text as a side effect. See BUTTON_ALIGNMENT.md for implementation and actual verification coverage.

Gallery combines Record type and Sort order in one connected glass popover. Keep the closed label as the sort order alone; apply and close after each selection, preserving the other group. Search and developmental-category selection remain separate. See GALLERY_FILTER.md.
