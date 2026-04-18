
The user wants to:
1. Remove the separate `HighlightedTestBanner` from above the carousel — unify everything into the existing `BannerCarousel`.
2. Add a `prize_pool` integer column to `tests`, exposed in admin TestBuilder and shown on student cards.
3. Sunday Special / weekly / surprise_quiz tests already auto-create banner rows via `sync_test_banner` trigger — so they already appear in `BannerCarousel`. The duplication is purely the standalone `<HighlightedTestBanner />` above it.
4. Sort priority: Live test > Upcoming Sunday > Topper > Admin announcement.
5. Aspect ratio 16:3 (currently 16:7).
6. Show "Starts in Xd Yh" / "Attempt Now" / "View Result" CTA states on test banners.

Plan:
- **Migration:** Add `tests.prize_pool integer` + update `sync_test_banner` to embed prize/class/subject/duration/start in banner subtitle/description so the carousel can render rich content without re-querying tests.
- **`BannerCarousel.tsx`:** Detect `template='test_announcement'` banners → overlay test info (title, class · subject · duration, prize pool, countdown, dynamic CTA). Compute sort priority client-side: live test → upcoming test → other banners (already prioritised by `priority` field and start_time). Change aspect ratio to 16/3.
- **`StudentDashboard.tsx`:** Remove `<HighlightedTestBanner />`.
- **`TestBuilder.tsx`:** Add Prize Pool input (INR integer).
- **`TestsPage.tsx` (student):** Show prize pool badge on test cards.
- Skip deleting `HighlightedTestBanner.tsx` file (no other refs after StudentDashboard removes it) — but actually delete it to avoid dead code.

Aspect ratio 16:3 is very thin — confirm with user? No, just execute as specified.

Let me check current TestBuilder, TestsPage, HighlightedTestBanner usage.
