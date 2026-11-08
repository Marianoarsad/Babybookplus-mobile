# Performance implementation and evidence - 6 November 2026

## Current status

The focused optimization pass and available Android validation are finished. The startup network blocker is resolved, and the debug client is restored on Home with Metro 8083. This is not a claim of production readiness or stable 60 FPS: controlled release traces still show substantial emulator jank. Earlier failed-startup observations below are historical; the final native results supersede their pending status.

## Changes

Only the migrated app changed. No dependencies, original Expo source, backend, database, hosting settings, signing keys or visual materials were changed.

- Ordinary full-resource reads reuse confirmed session/child/resource data for 30 seconds, including empty results. Existing concurrent-request deduplication remains. Signalled, confirmed-only, no-store and explicitly forced reads bypass reuse. Sharing, access logs, account/authentication and notification endpoints remain outside the reuse policy.
- Manual refresh and foreground resume invalidate the child's read freshness. Record mutations invalidate related child reads and reject pre-mutation responses while keeping confirmed/optimistic rows visible. Session reset clears the cache as before.
- Gallery validates calendar dates without formatting every record's month name. Visible group labels and date-only/timezone semantics remain unchanged.
- Feeding count charts parse each feed's calendar date once per computation, preserving daily/weekly/monthly buckets and totals.
- Milk/Solid Food analytics retain merged theme objects between renders. Root growth updates retain the profile array when measurements have not changed.
- Startup icon/asset loading runs independently of account verification. Debug-only startup operation timings contain stage names and elapsed milliseconds, never tokens, identifiers or records.

## Reproducible CPU comparison

Run from BabyBookPlus: `node scripts/performance-check.cjs .cache/eas-preview-archive`.
The optional argument is an untouched pre-optimization source archive. Without it, the script benchmarks current code only. It uses synthetic records, warms each function, reports five-sample medians and asserts identical Gallery results before comparing.

| Gallery calculation (ten displayed rows) | Before median | After median |
| --- | --- | --- |
| 1,000 records | 43.37 ms | 1.31 ms |
| 15,000 records | 1,081.66 ms | 21.59 ms |
| 50,000 records | 3,426.35 ms | 64.05 ms |

These final samples are Windows Node CPU timings, not Android frame timings. Output equality is asserted against the untouched source archive. Host/emulator activity and GC cause variability (one optimized 15,000-record sample reached 570.73 ms); the medians support a large calculation improvement, not equivalent FPS gains. Raw final samples are in `.cache/performance-cpu-final.jsonl`.

## Initial native investigation (before DNS repair)

Existing emulator: Pixel_6_API_30, Android 11/x86, four virtual cores, 6144 MB RAM, host GPU, 1080x2400 at 420 dpi and 60 Hz. Existing installation is debug. Reboot retained all app data.

Proper development-client deep-link cold activity launches measured 1798/1908/4454 ms before changes. These measure native activity startup, not application readiness. Account verification did not complete before the existing 20-second watchdog. The app consequently reached Retry. Initial direct MainActivity trials opened Expo's launcher and were discarded.

After changes, debug markers show token lookup finishing around 38 ms and independent assets becoming ready; account verification remains pending. Neither the watchdog nor authentication was bypassed. Public API health samples were a 15-second timeout, 8102 ms and 85 ms; this suggests variable network/hosting delay but does not identify the server/database cause. Android reports validated connectivity. Native inspector sampling returned HTTP 401 and was not bypassed.

Accumulated gfxinfo statistics mixed old interactions and startup/retry frames and are not a controlled navigation/FPS baseline. Individual memory samples likewise do not establish a leak or improvement. Reliable before/after native navigation, startup-to-interactive, frame and memory comparisons remain pending until authenticated startup is available.

## Validation

Existing date/time checks, all 86 feeding-statistics cases, Gallery selector, Milk chart, mutation/session/cache tests and sheet checks pass. Cache coverage includes expiry, confirmed empty results, child separation, forced refresh, write invalidation, in-flight deduplication, retained data on failure and QR/access exclusions. The cached-navigation harness also passes: its fixture now invokes the real anchored Revoke callback, uses a valid synthetic consultation-code format and follows the current QR wrapper/padding. Confirmation, cancellation, revocation, authorization-related exclusions and confirmed-export assertions remain intact. No sharing runtime code was changed.

Targeted lint uses the existing globalThis/exhaustive-deps overrides and ECMAScript 2022 parsing for CJS sources. A full Jest run during heavy native compilation had a startup-test timeout; its isolated rerun passed all five cases without changing the test timeout. Final full-suite and native build results are recorded below.

## Deliberate limits

No blanket memoization, compiler enablement, keep-alive navigation, list-library replacement, removal of visual effects or speculative SQL indexes. Existing lists already disclose bounded pages or use FlatList. Further virtualization, thumbnail processing, backend pagination and query changes need native traces and verified server measurements first. Full-data calculations must not be replaced with a truncated history.

No hosted medical records were created/edited/deleted; no new live QR grants were generated. iOS and physical-device performance, camera, notification delivery, account switching and complete authenticated write/visual regressions remain unverified.

## Final check record

- TypeScript: passed.
- Jest: 9 suites / 36 tests passed on the final run, including the Windows launcher DNS case; the startup timeout under compilation load did not recur.
- Targeted ESLint: passed with the documented parser/options.
- Existing Node checks: record-store/cache, Gallery, dates, Milk chart, all 86 feeding-statistics cases, ActionSheet and RecordFormSheet passed.
- Cached-navigation check: passed after correcting the stale fixture as described above.
- First local x86 release assembly: BUILD SUCCESSFUL (14m 35s, 768 tasks). A final incremental build includes the last cache edge-case changes.
- During native compilation the 16 GB host had approximately 623 MB free RAM. Do not interpret simultaneous emulator frame rates as an uncontended app benchmark.
- Read-only Render investigation completed after the user confirmed Babybookplus. No production settings were changed.

### Initial release device check (before DNS repair)

Final incremental x86 release build: BUILD SUCCESSFUL (1m 14s; 17 tasks executed, 751 up-to-date). APK: `android/app/build/outputs/apk/release/app-release.apk`. SHA-256: `30733c245100dc60cbc8445762fc25cd25cf44022343f4488bfe97c1c0c7189e`.

Installed with `adb install -r` successfully, preserving data. Cold activity launch reported a native wait timeout (10218 ms), and visual inspection confirmed the app's startup Retry screen. The process remained alive; the crash-buffer check produced no new app crash entry. Aggregate PSS at that failed-startup screen was 95,203 KB; it is not comparable to the earlier fully populated debug Home screen and is not claimed as a memory improvement.

The account-verification blocker persists in release, so authenticated navigation, charts, forms, QR flows, five-tab frame traces and paired startup-to-interactive benchmarks are still blocked. This pass is not a completed production-readiness certification. The existing debug client was restored successfully with a data-preserving update and Metro forwarding for the normal editing workflow. No production changes were performed.

## Read-only Render investigation - 6 November 2026, approximately 15:16 UTC

Workspace explicitly confirmed by the user: Babybookplus. Inspected only the existing Babybook+ API service; no production configuration, credentials, database data or deployments changed.

- Render application logs show successful health checks around 0.1?0.25 ms server processing time. No matching account-request completion/error entries were found during the earlier 14:25?15:15 UTC investigation window. Morgan writes completion logs, so absence alone cannot prove that a request never arrived.
- A fresh PC probe returned health HTTP 200 in 418 ms and unauthenticated account HTTP 401 in 131 ms. Render recorded that account probe at 15:16:37 UTC with 1.503 ms processing time. No token or account data was used.
- Android system logs show repeated UnknownHostException DNS failures for public connectivity-check hosts during the affected session. A direct emulator probe of the API hostname produced no resolved address before an eight-second timeout. This is evidence of emulator name-resolution/network trouble; validated-network status alone was misleading.
- Working diagnosis: the app cannot reliably resolve/reach the API from the emulator. There is no demonstrated slow database query or Render processing bottleneck from these observations. Authenticated server/database behavior remains untested.
- Next repair target is emulator DNS/networking, followed by authenticated startup and the remaining native performance matrix. Do not deploy backend changes or alter authentication to work around this environmental problem.

## Completed network repair and final native verification

Cold-booted the same Pixel_6_API_30 AVD with its existing Windows active-adapter resolver, without wiping data. The API hostname then resolved and responded to the emulator probe. Debug startup completed account verification at 1,197 ms and child loading at 2,149 ms from its marker start. A later normal-launcher restart completed those stages at 2,188 ms and 2,709 ms. Assets, authentication and the 20-second watchdog remain unchanged in behavior.

`scripts/android-dev.cjs` now passes the host's existing IPv4 resolvers when starting an emulator on Windows. It does not select a new provider, edit Windows/AVD settings, restart a running device automatically or wipe data. Verified a normal stop followed by `node scripts/android-dev.cjs --prepare-only`, successful API resolution, then `npm run android:open`. The same signed-in Home returned; Metro forwarding and existing records were retained. The launcher test covers Windows IPv4 selection and non-Windows/IPv6-only fallback. Android documents the [DNS startup option and cold-boot behavior](https://developer.android.com/studio/run/emulator-commandline).

The final x86 release assembled successfully in 44 seconds and installed with `adb install -r`. Its SHA-256 remains `30733c245100dc60cbc8445762fc25cd25cf44022343f4488bfe97c1c0c7189e`. No new app crash entry was found after the regression flows. The development APK was restored afterward, and Home was visually confirmed using Windows Computer Use.

### Native measurements and experiment

Release, same AVD, 60 Hz, no native compilation during frame collection. Scenario: Health -> Growth -> Nutrition -> Calendar -> Home, 1.5-second pauses, repeated three times. Counters reset before each trace. Host free RAM was approximately 950 MB out of 16 GB; timings include emulator/host limitations.

| Metric | Final code, run 1 | Final code, run 2 | Full-screen hardware texture experiment |
| --- | --- | --- | --- |
| Frames rendered | 503 | 512 | 138 |
| Median frame duration | 42 ms | 38 ms | 125 ms |
| 90th percentile | 125 ms | 113 ms | 600 ms |
| Android janky frames | 501 (99.60%) | 498 (97.27%) | 133 (96.38%) |
| Frame deadline misses | 192 | 183 | 85 |
| End PSS | 230,841 KB | 241,085 KB | 258,363 KB |

These first two columns are repeatability runs, not pre/post optimization results. The lower frame count in the experiment makes its jank percentage misleading; its duration percentiles and memory were worse. The experiment was reverted completely. It also showed transient missing visual content, so it was unsuitable for the preserved design. No permanent full-screen rasterization remains. See React Native's [hardware texture guidance and memory tradeoff](https://reactnative.dev/docs/view#rendertohardwaretextureandroid).

Run 1 started at 229,940 KB PSS. The small first-loop change and higher later sample do not establish either a leak or a memory improvement. A longer physical-device allocation/GC trace remains necessary. Raw frame traces: `.cache/performance-tabs-release-1.txt`, `.cache/performance-tabs-release-2.txt`, `.cache/performance-tabs-raster-1.txt`.

Final release cold activity samples after reinstall: 3,165 / 2,868 / 2,720 ms. In the latter two, main navigation was present in the first hierarchy observation at 5,595 / 5,449 ms from command start. Those are upper bounds including ADB/hierarchy-dump overhead, not exact first-frame or time-to-interactive measurements. A verified HOT return took 312 ms. A previous immediate resume sample did not reliably establish a fresh warm measurement and was discarded. No trustworthy matched pre-change native startup/FPS baseline exists because startup was network-blocked; no native speedup percentage is claimed.

### Verification checklist

**Completed and verified**

- Migrated record reuse, expiry, request deduplication, manual/foreground refresh, write invalidation, rollback, child/session isolation and QR/access freshness exclusions using isolated fixtures.
- Gallery calculation output parity and synthetic CPU comparison; feeding/date/chart and sheet checks.
- TypeScript; 9 Jest suites / 36 tests; focused ESLint; cached-navigation check. Lint uses existing exhaustive-deps/globalThis overrides, ECMAScript 2022, and the Node AbortSignal global.
- Final Android x86 release build, data-preserving install, authenticated cold launch, hot return and crash-buffer inspection.
- Live release Home, all five primary tabs, medication detail and Android back, vaccine Completed filter, appointments, conditions, Gallery thumbnail loading/scrolling, sharing-screen entry, Add Record expansion and Solid Food form expansion/cancel. Existing synthetic demo account was used. No records were saved/deleted and no QR grant was issued.
- Normal automatic AVD launch with repaired DNS, restored Metro 8083/debug client and visible signed-in Home.

**Implemented but not fully verified**

- Runtime cache/calculation improvements beyond the tested demo volume on physical devices. Automated request-count tests confirm avoided reads; an authenticated live request-latency trace has not been correlated end-to-end with server/database timing.
- iOS and web compatibility retained in source; no iOS build or fresh browser regression pass was performed in this native verification stage.

**Pending / environment-limited**

- Physical-device frame/CPU/allocation profiling, stable 60 FPS validation and a matched pre/post native baseline. Emulator traces still confirm a rendering concern; the constrained Windows host is a material confounder, not proof that all jank is environmental.
- Camera/iPhone scan, a newly issued live QR grant, notification delivery, login/logout/account switching and hosted create/edit/delete regression. These were not exercised because this pass preserved the existing session and hosted records. Unit fixtures cover mutation/sharing safety without external writes.
- Database EXPLAIN/query profiling and hosting changes require evidence and the relevant access/approval; no speculative indexes, migrations or deployment were performed.

No dependencies were added. Original Expo source, backend, production configuration and real records were left intact. Development commands remain `npm start` in one BabyBookPlus terminal and `npm run android:open` in a second; `npm run android` builds when needed. This finishes the available optimization/verification pass, with the above production/device limits explicitly open.
