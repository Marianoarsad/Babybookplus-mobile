# Hosted demo data transfer

The migrated app uses `https://babybook-xi2w.onrender.com`, shared with the public web demo. This transfer adds copies of the local `demo.parent@babybookplus.app` children; it does not replace the three original hosted children or change account credentials.

## Commands

From `back-end/`, with the existing local PostgreSQL environment loaded:

```powershell
node src/db/importLocalDemo.check.js
node src/db/importLocalDemo.js
# Supply DEMO_IMPORT_PASSWORD securely in this process before the next command.
node src/db/importLocalDemo.js --apply
node src/db/importLocalDemo.js --verify
```

The first command uses synthetic requests only. The second validates and fingerprints the local snapshot without hosted writes. `--apply` imports/resumes; `--verify` checks existing imported rows without creating records. The password must belong to the existing hosted demo account; it is never reset or logged. Do not run concurrent importer processes. Do not run `db:seed:demo` against hosting: that seed deletes and recreates the account.

## Data and recovery

- Source: Elias (local child 106) and Sofia (107), 17,375 records. Destination nicknames: `Elias (Local demo)` and `Sofia (Local demo)`.
- Copies include profiles, vaccinations, appointments, medical history, doses, growth, milestones, feeding, memories, calendar events/statuses and reminders. Source record dates, photo URLs and favorites are retained; new IDs/system creation timestamps are expected.
- Approved compatibility corrections: Mild Egg Sensitivity = Food; No known drug allergies = Non-food. Original wording and local records are preserved.
- QR credentials/shares/access history, sessions, notifications and account settings are not copied. Generate fresh QR access normally. The source has no record attachments; the importer stops if attachments are subsequently added.
- Local decryption happens in memory; hosted writes use the owner's normal API and hosted encryption. No encryption keys or plaintext medical export files are transferred.
- The ignored root `.demo-import/checkpoint.json` contains source fingerprints, target IDs, mapping and baseline hashes. Keep it to resume without duplicates; it contains no medical payloads or passwords. A changed source fingerprint stops the import.
- Record POSTs use stable receipt keys. Profile creation is not retried blindly: an uncertain result is reconciled by its dedicated nickname. Ambiguity stops the job. Four workers use bounded retries, and in-flight work is settled before failure exits.
- Birth dates are finalized after the original vaccinations are copied, preventing automatic EPI schedule duplication. A partial profile can therefore temporarily lack its birth date.
- No automatic rollback/deletion occurs. Resolve the reported error and rerun with the same source/checkpoint. Never remove the checkpoint to recover a partial import.

## Verification status

Completed on 5 November 2026 at 04:21 UTC. Focused importer checks, syntax checks, local preflight and the final read-only API verification passed:

| Copy | Hosted ID | Imported records |
| --- | --- | --- |
| Elias (Local demo) | 14 | 8,458 |
| Sofia (Local demo) | 15 | 8,917 |

All 17,375 imported records matched source editable fields and remapped relationships; profile fields, emergency contact details, dates, favorites and photo URLs passed. There are five hosted children. The three original profiles remain: IDs 5, 6 and 9. IDs 5/6 matched their original response hashes exactly. ID 9's expiring signed avatar URL made its initial raw checksum unsuitable; independent read-only SQL confirmed original counts and modification times predating the import, and its local baseline was corrected to ignore that temporary token. The old checksum and review explanation are retained in the checkpoint. Subsequent verification passed. No hosted data was changed to resolve this checksum issue.

A transient Windows checkpoint rename lock was repaired with bounded retries. Resuming the transfer recovered pending record receipts without duplicates; final counts confirm that recovery. No destructive backend tests ran and no cloud deployment/schema change was required.

The existing Pixel 6 API 30 emulator reloaded the migrated app and showed all five profiles in the picker. The copied Elias profile renders its Home vaccination summary, feeding entries, populated Growth chart, Gallery entries/thumbnails and Nutrition breakdown (7 feeds on 5 November 2026). The original Metro server was stopped; Metro 8083 was restarted in the background and emulator forwarding restored through the existing launcher, without resetting app storage.

Browser automation is unavailable in this session: Playwright's Chrome extension is missing and the in-app browser access host is unavailable. No extensions or dependencies were installed. iOS and physical-device checks are unavailable. Graphify refresh was attempted but its uv launcher cannot canonicalize the script path.

Sofia's imported copy also loaded its native Nutrition breakdown: 7 feeds, 4 milk feeds, 3 solid meals and 580 mL on 5 November 2026. The emulator is left on that copy. The existing picker displays original full names; the two imported copies are its final two child rows, and the active header/profile nickname includes `Local demo`. No UI redesign was introduced for the transfer. Calendar-specific live inspection and QR scanning were not replayed; their imported data/relationships passed API comparisons, and access credentials were intentionally excluded.
