

## Goal
Add a **Class Group system** (Junior C6–7 / Senior C8–10 / per-class) and a **Manual + Random Winner Selection panel** so admins can publish a complete winners list (Top ranks + lucky winners with custom prizes) once a test ends. Tests, leaderboards, banners and dashboards all respect the new group.

## What changes

### 1. Class groups on tests
- New column `tests.class_group` enum: `'junior'` (Class 6, 7), `'senior'` (Class 8, 9, 10), `'single'` (default — uses existing `class` field), `'custom'` (admin picks classes).
- New table `test_eligible_classes(test_id, class)` for `'custom'` group OR for `'junior'/'senior'` (auto-populated by trigger from group choice).
- Update RLS on `tests`, `questions`, `test_attempts` so a student sees a test if `class_group='single' AND tests.class = profile.class` **OR** `EXISTS (SELECT 1 FROM test_eligible_classes WHERE test_id=tests.id AND class = profile.class)`.
- `sync_test_banner` updated: when test is grouped, banner is shown to all eligible classes (insert one banner row per class, or use a new `banners.eligible_classes text[]` instead of single `target_class`). I'll go with the simpler `eligible_classes text[]` column on `banners` and update RLS + carousel query to match.

### 2. Test Builder UI (admin)
- Add a "Audience" section above the existing Class field:
  - Radio: `Single class` · `Junior (6–7)` · `Senior (8–10)` · `Custom`
  - Single → existing ClassSelect.
  - Junior/Senior → auto-fills eligible classes (read-only chips).
  - Custom → multi-select chips of Class 4–12.
- Saves to `tests.class` (primary, used for backwards compat = first class) + `class_group` + `test_eligible_classes`.

### 3. Winners & Results Panel (admin) — `/admin/tests/:id/results` (new dedicated page, replaces "Results & Winners" dropdown link)
A single screen built around three sections:

**A. Submissions overview** (re-uses leaderboard data, grouped by class).

**B. Manual Winner Picker**
- Three slots: **Top 1**, **Top 2**, **Top 3** — each is a `Select` populated with submitted students (sorted by score). Auto-defaulted to current ranking but admin can override.
- Prize text input next to each slot (e.g. "₹500 / Bag").

**C. Lucky Winners**
- Number input: "How many lucky winners?" (0–20).
- Prize text input shared by all lucky winners (or per-winner editable list).
- Button "🎲 Auto-pick lucky winners" → randomly picks N students from submissions (excluding the 3 toppers, banned users, admins) and shows them in an editable list with re-roll per row.

**D. Publish**
- "Publish Results & Winners" button → calls a new RPC `publish_test_winners(p_test_id, p_winners jsonb)` that:
  - Wipes prior `test_winners` rows for the test.
  - Inserts all winners (top + lucky) with `rank` (1,2,3 for top; rank=NULL or 100+ for lucky), `prize_text`, `auto_calculated=false`, `category` (`'top'` or `'lucky'`).
  - Marks `tests.results_published_at = now()`.
- Triggers existing notify-on-results-published.

Schema additions:
- `test_winners.category text` (`'top' | 'lucky'`) default `'top'`.
- `test_winners.rank` becomes nullable (lucky winners can omit rank).

### 4. Student-facing winners display
- `LeaderboardPage` and `TestResultPage` show two grouped lists:
  - 🏆 **Top Winners** (rank 1/2/3 with prize)
  - 🎁 **Lucky Winners** (random)
- `WinnersSlider` on dashboard already pulls from `get_recent_winners` — extend the RPC to include `category` and show a small 🎁 badge for lucky winners.

### 5. Leaderboard groups
- `LeaderboardPage` filter row: `Group: All · Junior · Senior · Class X` (driven by `class_group` + `test_eligible_classes`).

### 6. Dashboard test card
- Show audience badge: "Junior (6–7)" / "Senior (8–10)" / "Class 9" so students immediately see who can join.

## Technical details

### Migrations (schema only)
```sql
-- 1. Class group on tests
CREATE TYPE class_group_enum AS ENUM ('single','junior','senior','custom');
ALTER TABLE tests ADD COLUMN class_group class_group_enum NOT NULL DEFAULT 'single';

-- 2. Eligible classes
CREATE TABLE test_eligible_classes (
  test_id uuid REFERENCES tests(id) ON DELETE CASCADE,
  class text NOT NULL,
  PRIMARY KEY (test_id, class)
);
ALTER TABLE test_eligible_classes ENABLE ROW LEVEL SECURITY;
-- Policies: admins manage all; approved students SELECT their own class row.

-- 3. Banner audience
ALTER TABLE banners ADD COLUMN eligible_classes text[];

-- 4. Winner category + nullable rank
ALTER TABLE test_winners ADD COLUMN category text NOT NULL DEFAULT 'top'
  CHECK (category IN ('top','lucky'));
ALTER TABLE test_winners ALTER COLUMN rank DROP NOT NULL;

-- 5. Trigger: when class_group changes, auto-populate eligible rows.
-- 6. Update sync_test_banner to write eligible_classes from group/custom.
-- 7. Update RLS on tests/questions/test_attempts/banners to honor eligibility.
-- 8. New RPC publish_test_winners(p_test_id uuid, p_winners jsonb).
-- 9. Extend get_recent_winners to include category.
```

### Files to edit
- `src/components/admin/TestBuilder.tsx` — Audience section.
- `src/pages/admin/AdminTestsPage.tsx` — show audience chip column.
- `src/pages/admin/AdminTestResultsPage.tsx` — full rewrite (manual + lucky picker + publish).
- `src/pages/dashboard/TestsPage.tsx` — audience badge on cards.
- `src/pages/dashboard/LeaderboardPage.tsx` — group filter, lucky winners section.
- `src/pages/dashboard/TestResultPage.tsx` — top + lucky winners blocks.
- `src/components/dashboard/WinnersSlider.tsx` — `🎁 Lucky` badge.
- `src/components/dashboard/BannerCarousel.tsx` — read `eligible_classes` array.

### Backwards compatibility
- Existing tests stay `class_group='single'` and behave exactly as today.
- Existing winners default to `category='top'`.

## Out of scope (will not change)
- Per-question difficulty splits between Junior/Senior (one paper per test for now; admin can create separate Junior + Senior tests and put both under the same banner via `class_group`).
- Auto-scheduled different start times for Junior/Senior — admin sets manually.

## Result
Admin creates one SSC Special Test, picks "Junior (6–7)" or "Senior (8–10)", schedules it, and after the test ends opens **Results & Winners** to:
- Pick Top 1/2/3 with prizes,
- Set how many lucky winners to randomize,
- Click **Publish** — students instantly see banner update, leaderboard, and a clearly separated 🏆 Top + 🎁 Lucky winners list.

