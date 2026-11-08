# Combined Gallery filter — 7 November 2026

Growth → Gallery → Memories & Milestones now places the former All/Milestones/Memories toolbar buttons inside the existing sort popover.

- One connected glass popover contains **Record type** (All, Milestones, Memories) and **Sort order** (Newest first, Oldest first), separated by a subtle divider.
- The closed trigger displays only the selected sort label. Its accessible name includes both selections. The existing sort icon, category artwork, selected-row glass and local blur capture are retained.
- Each selection applies immediately and closes the popover. Reopening retains one selected row per group. The list starts at the top; existing connected-menu flipping, bounded scrolling, anchor refresh and dismissal behavior remain.
- The separate developmental-category dropdown and search field remain. Updates still use category/sort patches through the existing Growth callback, resetting visible records to ten while retaining the other filters. Counts retain their original full-collection meaning. Record sorting, date groups, empty/loading states, Show More and child reset behavior are unchanged.
- Implementation is local to MemoriesMilestonesCollection.js. No shared menu API, dependencies, backend/storage, record updates or original Expo files changed.

## Verification

- TypeScript, focused lint and all 58 Jest tests (13 suites) pass.
- MemoriesMilestonesCard.check.js passes its original gallery/category cases plus all six type/order combinations across six themes. It verifies independent updates, close/reopen, selected states, order-only closed label, retained query/development category, pagination reset and absence of the old toolbar buttons.
- memoryGallery.check.js passes immutable-data search/filter/sort/count/pagination checks.
- Pixel_6_API_30, Android 11 development client: verified simplified toolbar, both sections and selected highlights, upward anchored expansion, Milestones selection closing immediately, Oldest first preserving Milestones and changing displayed chronology, reopening with both selections retained, and restoration to All/Newest first. The currently selected Elias child and saved records were preserved. The emulator remains on Gallery.
- Browser rendering is blocked by the unavailable browser access host. iOS runtime, physical devices, live dark/large-font matrices, very short-screen scrolling and exact animation timing are not verified; source/mocked checks do not replace these.
- Android, iOS and web production bundle exports pass (`.cache/gallery-filter-export`); this is not a native APK rebuild or iOS runtime verification. The shared AnchoredMenu checks also pass across platform/theme mocks.
