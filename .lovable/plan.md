
The user is asking me to "build" a complete system, but 95% of this already exists in the project. Let me map their spec against what's already built and identify the actual gaps.

**What already exists (verified from codebase):**
- ✅ Admin test creation with type (Sunday Special / Standard / Practice) — they want 4 types: Sunday Special, Weekly Test, Mock, Surprise Quiz
- ✅ Class, start/end datetime, banner image, description
- ✅ Bulk question parser (manual paste format)
- ✅ Sunday Special highlighted banner on dashboards (HighlightedTestBanner)
- ✅ Test live-window logic (UPCOMING / LIVE / CLOSED)
- ✅ Test attempt with timer, progress, navigation
- ✅ Admin "Publish Results" RPC + approval workflow
- ✅ 24h highlighted winners (WinnersSlider — auto-hides after 24h)
- ✅ Leaderboard with class dropdown
- ✅ Winner ranks with prize_text
- ✅ Submission count per test (visible on AdminTestResultsPage)
- ✅ RLS security (students view own attempts, admins manage all)
- ✅ Lovable Cloud (Supabase) — not Firebase, but functionally equivalent

**Actual gaps to fill:**

1. **Test types** — currently 3 (`standard | sunday_special | practice`). User wants 4: Sunday Special, Weekly Test, Mock, Surprise Quiz. Need to extend the `test_type_enum`.

2. **AI bulk question generation** — currently parser only accepts pasted text. User wants: paste a chapter/topic → Lovable AI generates 10 MCQs automatically. New edge function needed.

3. **Scrolling marquee winner strip** — current `WinnersSlider` is a fade slider, user wants a horizontal scrolling marquee at the **top** of dashboard with trophy/gold/silver/bronze colors.

4. **Approval status & submission count on Admin Tests list** — currently you click into Results page to see this. Add columns to the main `/admin/tests` table.

5. **"Result pending admin approval" UX after submit** — verify the existing TestResultPage shows this state cleanly when `results_published_at IS NULL`.

I'll skip Firebase entirely — the project is on Lovable Cloud and already has equivalent functionality. I'll note this clearly to the user.

---

# Plan: Fill the 5 gaps

## 1. DB migration — extend test types
- Add `weekly`, `mock`, `surprise_quiz` to `test_type_enum`
- Update `sync_test_banner` trigger so `weekly` and `surprise_quiz` also auto-create highlighted banners (Mock = practice-style, no banner)

## 2. AI Bulk Question Generator (new edge function)
- New edge function `generate-mcq-questions`
  - Accepts: `{ topic, count, class, subject }`
  - Calls Lovable AI Gateway (`google/gemini-3-flash-preview`) with structured tool-calling
  - Returns array of `{ question_text, options[4], correct_option_index }`
- Update `BulkQuestionParser.tsx` (admin):
  - Add tab: **"AI Generate"** alongside existing **"Paste"** tab
  - Form: topic textarea + count selector (5/10/15/20)
  - "Generate" button → calls edge function → preview → "Add to Test"

## 3. Scrolling marquee winner strip
- Replace `WinnersSlider.tsx` motion-fade with a true CSS marquee:
  - Single horizontal infinite-scroll row at the **top** of `StudentDashboard`
  - Dark gradient bg, gold/silver/bronze badges per rank
  - Format: `🏆 1st Rahul ₹500 • 🥈 2nd Aman ₹300 • 🥉 3rd Priya ₹200`
  - Auto-pauses on hover, only renders when winners exist in last 24h

## 4. Admin Tests list improvements
- Update `AdminTestsPage.tsx` table:
  - New column: **Type** (color-coded badge)
  - New column: **Submissions** (live count via subquery)
  - New column: **Results** (Pending / Published with timestamp)
  - Quick "Publish Results" inline action when test has ended

## 5. Polish post-submit screen
- Verify `TestResultPage.tsx` shows clear "⏳ Result pending admin approval" state when `results_published_at IS NULL`, with a check-back hint

---

# Files touched
- **Migration (1):** add enum values, update banner sync trigger
- **New edge function (1):** `supabase/functions/generate-mcq-questions/index.ts`
- **Edited (4):**
  - `src/components/admin/BulkQuestionParser.tsx` — add AI tab
  - `src/components/admin/TestBuilder.tsx` — expose new test types in dropdown
  - `src/components/dashboard/WinnersSlider.tsx` — rewrite as scrolling marquee
  - `src/pages/admin/AdminTestsPage.tsx` — add columns
- **Verified (no edit needed):** `TestResultPage.tsx`, `HighlightedTestBanner.tsx`, RLS, leaderboard

---

# Notes for the user
- **Firebase isn't needed** — your project already runs on Lovable Cloud which provides the same Auth + Database + Rules. Switching would mean rebuilding everything that already works. I'll keep the existing backend.
- **AI question generation** uses your built-in Lovable AI (no extra API key needed).
- **Branding** stays blue (your current SSC identity), not red/orange. Tell me if you want me to change the accent color globally.

Confirm and I'll execute.
