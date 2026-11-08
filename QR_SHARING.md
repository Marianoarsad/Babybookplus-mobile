# Scan BabyBook+ with iPhone Camera

The photographed QR decoded successfully to the legacy `BABYBOOK+CONSULT:` format. That format works in BabyBook+'s scanner/manual consultation entry, but iPhone Camera cannot open it as a website. Improving image resolution does not change the payload.

The migrated app now defaults to `https://babybook-xi2w.onrender.com`, the same API used by `https://babybook-plus.expo.app`. Your local PostgreSQL database remains separate and unchanged. Use an existing hosted account; the app deliberately does not reuse the old local session token.

## Development startup

1. Open a terminal in `C:\Users\Arzad\Desktop\Capstone\BabyBook+\BabyBookPlus` (or the existing short `B:\BabyBookPlus` mapping).
2. Run `npm start` and leave that terminal running (Metro 8083).
3. In another terminal in the same folder, run `npm run android:open` for the installed client. Use `npm run android` when a native build/install is necessary. The launcher starts/reuses Pixel_6_API_30 and verifies the public API; allow up to a minute for a sleeping hosted service.
4. Sign in using your account for the hosted website. No local backend process is needed. If a local `.env.local` explicitly overrides `EXPO_PUBLIC_API_BASE_URL`, remove that override and restart Metro to use public sharing.

These are JavaScript changes; the installed development client can load them through Metro. Previously exported standalone APKs require rebuilding to contain them.

## Share and scan

1. Select the intended baby in the migrated app. Only records already saved in the hosted account will be available; this change does not transfer PC-only records.
2. Open Share Records, select only the records you intend to share, set the access duration, review consent and generate a **new** QR. Existing images cannot be upgraded.
3. A supported hosted link shows “Ready to scan with iPhone Camera.” An app-only code shows a warning instead; do not expect iPhone Camera to open that older code.
4. Point iPhone Camera at the new QR and tap the detected website link. The iPhone may use Wi-Fi or cellular; it need not connect to the development computer.
5. In Safari, complete the existing viewer-name prompt and confirm that only the intended records are visible. Keep the full QR/link private: it grants the selected temporary access. Do not paste it into logs or chat.
6. Access remains read-only, server-expiring and revocable. A saved PDF is not remotely revocable. The existing access log is retained.

If a **new hosted** code still shows the app-only warning, check the existing Render service's `QR_WEB_LINKS_ENABLED=true` and `CONSULT_VIEWER_URL=https://babybook-plus.expo.app`. Do not substitute a localhost URL or fabricate a link without the server-issued token. No cloud environment settings were changed during this repair.

## Verification checklist — 31 October 2026

| Status | Evidence / remaining check |
| --- | --- |
| Completed and verified | User photo decoded offline to the legacy format; independent ZXing decoding of the existing generator's full HTTPS fixture passes. |
| Completed and verified | Trusted origin/token/code binding, legacy classification, hosted/local launcher behavior and local-session separation covered by focused tests. |
| Completed and verified | Public viewer and hosted API respond; viewer-origin CORS preflight succeeds. |
| Completed and verified | Pixel_6_API_30 cold launch reaches hosted sign-in, launcher connects to hosted API and the native crash buffer is empty. |
| Completed and verified | TypeScript and all 17 Jest tests pass; share builder, consultation-sharing and mocked backend access checks pass. All 387 Expo reference hashes remain unchanged. |
| Pending (existing baseline) | Broad parity suite passes 93/102 checks; the same nine unrelated source-baseline failures remain. Full lint is not certified clean. |
| Implemented but not fully verified | New hosted share creation and its selected records/expiry/revocation have mock coverage; authenticated live flow awaits hosted sign-in and a user-selected share. |
| Pending | Physical iPhone Camera detection, Safari viewer-name flow, correct selected records and live expiry/revocation confirmation. No device result is claimed from decoder tests. |
| Blocked | iOS native build unavailable on this Windows host; not required for the Safari viewer. |
| Blocked | Knowledge graph refresh still fails with `uv trampoline failed to canonicalize script path`; no tooling was installed. |

Focused commands from this directory: `npm test -- --runInBand`, `npm run typecheck`, `node src/components/ShareRecords.check.js`, `node src/utils/consultationSharing.check.cjs`. From the repository root: `node back-end/tests/sharingAccess.check.js` (mocked handlers, no database writes). Do not run the destructive backend integration suite against either real database.
