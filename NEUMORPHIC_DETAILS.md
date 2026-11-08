# Neumorphic detail containers ? 31 October 2026

## Shared implementation

`src/components/ui/NeumorphicCard.js` uses `colors.detailSurface` tokens with a restrained diagonal white/blue gradient, top-left edge lighting and bottom-right diffuse shadows. The shadow wrapper remains unclipped. View props/ref and children pass through; padding/radius/material overrides, reduced/no elevation and pressed/inset variants are supported. Android <28 uses layered shading plus modest elevation; inset shadows below API29 use the tonal fallback. No native blur or new dependency is required.

`PlanDetail` applies the shared surface to metadata, notes and attachment cards. Its existing grouping, handlers, dates, safe areas and deletion guards remain. Detail values optionally accept `valueColor`; the pre-existing `color` dot remains separate. Section containers opt in with `appearance="detail"`; normal containers are unchanged. Access entries inside the QR detail use `appearance="detailRow"` to retain their action without nested raised cards.

## Updated screen coverage

- Share QR Item: QR frame, status, expiry, selected-record section and access history; QR access-entry details.
- Growth measurements.
- Vaccinations; medication records and their dose section; illnesses, allergies and hereditary conditions; hospital stays; consultations/checkups.
- Milk and solid-food records; nutrition chart/history inspections and existing read-only viewer nutrition details.
- Calendar/custom plans and notification details through the shared detail shell.
- Memories and milestones: information, metrics and action trays use the shared component; photo controls use the same material tokens while preserving their zoom/disabled behavior.

Dashboard cards, list defaults, headers, navigation, settings, forms and glass overlays were not rethemed. No record regrouping or new category navigation was introduced.

## Verification

| Status | Evidence |
| --- | --- |
| Completed and verified | TypeScript passes; 19 Jest tests pass, including independent decoding of complete HTTPS QR fixtures at 208/256/326dp bounds. Payload, encoding, dark-on-white paper and four-module quiet zone remain unchanged. |
| Completed and verified | New shared-surface check covers six palettes, children/props/ref, overrides, press/inset states, pointer safety and old/new platform paths. Memory-detail, share-builder, date-layout and confirmation checks pass. |
| Completed and verified | Broad parity run: 95/104 pass; the same nine pre-existing failures remain. New component import mocks and presentation expectations were updated without removing behavioral checks. |
| Completed and verified | Targeted lint on shared card, PlanDetail, MemoryDetail and ShareRecords has zero errors; inline-style warnings remain. |
| Completed and verified | Pixel_6_API_30: temporary fixture uses actual QR hero markup/styles, actual detail shell and section components with fictional values. Light/dark surfaces, all eight category rows, quiet-zone containment, status/expiry alignment, lower access empty state and scrolling inspected. Fixture removed and normal app restored. No real share generation/revocation, access-log marking or medical writes performed. |
| Implemented but not fully verified | Every listed detail path is integrated; each real record type was not individually walked through after this change. Full CRUD, export and attachment permissions were not exercised. |
| Blocked | Browser connector reports the browser access host is unavailable. No browser visual pass is claimed. |
| Pending | iOS/macOS build, physical iPhone scanning, Android API24/28 rendering, large accessibility text, exact shadow appearance on physical devices and frame timing. Windows/API30 verification does not certify those platforms. |

The original Expo source remains unchanged (387/387 baseline hashes). No backend, database, encryption-key or API payload changes. Temporary fictional QR links grant no real records. Earlier standalone APKs need rebuilding to include the JavaScript changes; the development client loads them from Metro.

Knowledge graph refresh was attempted and remains blocked by the broken uv trampoline launcher. No new tooling was installed.
