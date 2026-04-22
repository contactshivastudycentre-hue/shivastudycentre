

## Goal
Confirm that the teacher's described winner-selection flow (Top 1/2/3 dropdowns + N random Lucky Winners with prizes, auto-picked after the test ends, then published with banner + visible winners list) works end-to-end. Fix the gaps that are still missing from the current implementation.

## Current state (verified)
- `AdminTestResultsPage` already has Top 1/2/3 dropdowns, prize fields, lucky count input, "Auto-pick lucky winners" button, exclusion of toppers from lucky pool, and a `publish_test_winners` RPC call.
- `test_winners` table has `category` (`top` | `lucky`) and nullable `rank`.
- `LeaderboardPage` and `TestResultPage` already render 🏆 Top + 🎁 Lucky sections.
- `WinnersSlider` on the dashboard already shows lucky vs top.

## Gaps to fix

### 1. Auto-trigger when the test ends
Currently the admin has to remember to open the page and click Auto-pick. Add an automatic "test ended" signal:
- New DB function `auto_finalize_ended_tests()` that, for every test where `end_time < now()` and `results_published_at IS NULL`, marks a server-side flag `tests.ended_at = end_time` (new nullable column).
- When admin opens `AdminTestResultsPage`, if `end_time` has passed and no winners exist yet, **auto-run the lucky pick suggestion** (default 3 lucky winners) and pre-fill Top 1/2/3 from the leaderboard so the admin only needs to confirm prizes and click Publish.
- Show a clear banner at top: "✅ Test ended — winners suggested. Review prizes and publish."

### 2. Force prize entry before publish (already partially done — verify)
- Block Publish if any selected winner is missing `prize_text`. Show inline red errors per row. (Already implemented — keep as is.)

### 3. Banner auto-creation on publish
On successful publish, insert/update a banner row:
- `template = 'results_announcement'`
- `title = "🏆 {test.title} — Winners Announced!"`
- `cta_link = /dashboard/tests/{id}/leaderboard`
- `eligible_classes = test_eligible_classes` for the test
- `is_active = true`, `end_date = now() + 7 days`
This makes the "results banner" appear on student dashboards instantly.

### 4. Realtime push of winners
- Ensure `test_winners` and `tests` tables are in `supabase_realtime` publication so `LeaderboardPage` / `TestResultPage` / `WinnersSlider` update without refresh.

### 5. UI polish on Admin Results page
- Group dropdowns visually: "🥇 Top Winners" card with 3 rows; "🎁 Lucky Winners" card with count selector + auto-pick + per-row re-roll + per-row prize input.
- Show "Pool size: X students submitted" so admin knows how many lucky winners are possible.
- Disable Publish button until: all 3 top slots filled, all prizes filled, all lucky rows have a name + prize.

## Technical details

### Migration
```sql
-- 1. Track when a test naturally ended
ALTER TABLE tests ADD COLUMN ended_at timestamptz;

-- 2. Auto-finalize trigger / function called from frontend on page open
CREATE OR REPLACE FUNCTION mark_test_ended(p_test_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE tests SET ended_at = COALESCE(ended_at, now())
  WHERE id = p_test_id AND end_time IS NOT NULL AND end_time < now();
END $$;

-- 3. Update publish_test_winners to also create the banner
-- inside the existing RPC: after inserting winners and setting
-- results_published_at, INSERT INTO banners (...) with template
-- 'results_announcement' and eligible_classes from test_eligible_classes.

-- 4. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE test_winners;
ALTER PUBLICATION supabase_realtime ADD TABLE tests;
```

### Files to edit
- `supabase/migrations/<new>.sql` — column, `mark_test_ended`, updated `publish_test_winners`, realtime.
- `src/pages/admin/AdminTestResultsPage.tsx` — call `mark_test_ended`, auto-suggest top + lucky on first load if ended, pool-size display, stricter Publish disable logic.
- `src/pages/dashboard/LeaderboardPage.tsx` — subscribe to `test_winners` realtime channel.
- `src/pages/dashboard/TestResultPage.tsx` — subscribe to `test_winners` realtime channel.
- `src/components/dashboard/BannerCarousel.tsx` — render `results_announcement` template (link → leaderboard).

## Result flow
1. Teacher creates test, sets `end_time`.
2. Test ends → admin opens **Results & Winners** → page auto-suggests Top 1/2/3 from scores and pre-picks 3 lucky winners.
3. Teacher edits dropdowns/prizes if needed → clicks **Publish Results & Winners**.
4. RPC saves winners + creates a results banner targeted to eligible classes + sets `results_published_at`.
5. Students instantly see the banner on dashboard, full 🏆 Top + 🎁 Lucky lists on the leaderboard, and the WinnersSlider updates live.

