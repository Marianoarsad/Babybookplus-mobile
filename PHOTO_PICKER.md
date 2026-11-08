# Photo picker and edit entry points - 8 November 2026

The intermittent logo flash was not reproduced in the recorded pre-change
selection test: the editor and selected photo remained, the process ID stayed
the same, and startup did not rerun. Earlier Android 11 SystemUI graphics
crashes are separate evidence, not proof of the flash's cause.

The confirmed unnecessary transition was the shared helper's permission request
on every Android picker launch. The installed Expo system picker grants access
to the selected image without broad library permission. Android now opens it
directly; iOS/web retain their existing permission behavior. A finally-released
guard prevents overlapping launches. Quality, URI results, cancellation and
failure handling remain unchanged. The normal startup splash was not modified.

Home and Baby Profile photos are display-only, with no camera badge or photo
change callback. View Profile and the glossy Edit header action remain. The
unused automatic picker launch during navigation was removed. Existing baby
photos are editable in Edit Baby Profile; initial selection when adding a new
baby and parent-account settings remain available. No dependencies/backend/native
configuration changes were required.

Focused checks: imagePicker, BabyProfileCard (six palettes, narrow/wide layouts,
large text, image failure fallbacks), BabyProfileNavigation and photoUpload.
These cover picker overlap/cancel/error retry, platform permission behavior,
display-only photo contracts, navigation, save retry and session isolation.
TypeScript, all 58 Jest tests/13 suites, the focused checks above and
HeaderNavigation passed. Android/Hermes and web production exports passed.
Picker/helper lint has no errors (one pre-existing unused-disable warning).
Broader affected-file lint reports five pre-existing hook errors in App/Dashboard
plus existing warnings; those unrelated hooks were not rewritten.

Pixel_6_API_30 / Android 11 development client verification:
- Home and Baby Profile show photos without camera badges. View Profile and
  the glossy header Edit action navigate successfully to the editor.
- After relaunch, selection returned directly to the editor. The recorded return
  contains no logo-splash frames; the selected preview loads and fields remain.
- A second picker launch/cancel retained the selected preview and editor fields.
- Activity logs show two OPEN_DOCUMENT launches, no REQUEST_PERMISSIONS activity,
  no startup rerun, a stable process (22553) across both picker returns and no
  crash-buffer entries during this interval. No Save action was performed.
- Fast Refresh initially left a blocking loading overlay on the display-only
  Baby Profile screen. A normal client relaunch recovered it, retaining saved
  data. This is distinct from a confirmed picker-triggered restart.

No claim that the intermittent logo flash is conclusively eliminated: neither
the recorded pre-change nor post-change selection reproduced it. The confirmed
extra permission handoff is removed. Long-duration repetition, iOS and physical
devices remain unverified. Live browser verification was blocked by the missing
Playwright Chrome extension; no extension/dependency was installed. Temporary
recordings were removed. Graphify refreshed with existing SQL-parser and Gradle
extraction warnings.
