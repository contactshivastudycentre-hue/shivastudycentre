
Goal: Fix banner upload duplicate-key error and apply a global compact button/form system across admin pages, starting with /admin/banners.

What I found
- `banners.title` has a UNIQUE constraint (`banners_title_key`) — blocks repeat titles like "SSC SPECIAL TEST".
- Trigger `sync_test_banner` relies on `ON CONFLICT (title) DO UPDATE` using titles like `TEST_BANNER:<uuid>` — those are unique by design but require either a UNIQUE constraint OR rewriting the trigger.
- `id` column already exists as PK with `gen_random_uuid()` default — no schema change needed there.
- Admin banner page and other admin pages use default shadcn buttons that often render full-width on mobile and oversized cards.

Plan

1. Database fix (migration)
   - Drop the global UNIQUE on `banners.title`.
   - Replace it with a PARTIAL UNIQUE index only for auto-managed test banners so the existing trigger keeps working:
     `CREATE UNIQUE INDEX banners_test_sync_title_uidx ON public.banners (title) WHERE title LIKE 'TEST_BANNER:%';`
   - Result: Admin can create unlimited banners with any title (including duplicates), while the test→banner sync still upserts cleanly.

2. Admin Banners page (`src/pages/admin/AdminBannersPage.tsx`)
   - Wrap content in a compact mobile container (`max-w-md md:max-w-3xl mx-auto px-4`).
   - Compact upload card: stacked form, 40px inputs, preview capped at `max-h-[140px] object-cover rounded-xl`.
   - Buttons: `Save Banner` / `Select Image` use new `btn-primary` (h-10, max-w-[200px], not full width); icon actions stay compact.
   - Insert flow: validate image uploaded → image_url present → insert; remove any reliance on title uniqueness.

3. Global button + form tokens (`src/index.css`)
   - Add reusable utility classes:
     - `.btn-primary` (h-10/42px, px-4, text-sm, font-semibold, rounded-[10px], inline-flex, max-w-[200px], whitespace-nowrap)
     - `.btn-secondary` (h-9, px-3, text-[13px], rounded-lg, max-w-[160px])
     - `.page-container` (max-w-[420px] md:max-w-3xl mx-auto p-4)
     - `.banner-upload-card` (rounded-2xl bg-card p-4 shadow-sm)
   - Inputs already 40px via shadcn — keep as is, ensure `w-full` only inside form rows.

4. Apply globally to admin pages
   - Audit `AdminBannersPage`, `AdminTestsPage`, `AdminStudentsPage`, `AdminResultsPage`, `AdminDashboard`.
   - Strip `w-full` from primary action buttons (Create / Save / Publish / Upload) unless inside a true full-width context (e.g., modal footer on mobile).
   - Replace oversized headers/cards with `.page-container` wrapper for consistent 16px padding.

5. Banner display standard (already done in `BannerCarousel`)
   - Confirm `aspect-[2/1]`, `object-cover`, `rounded-2xl`, mobile max-height implicit via aspect ratio.

6. Verification
   - Admin: upload two banners with the same title "SSC SPECIAL TEST" → both succeed.
   - Admin: publish a Sunday Special test → trigger still upserts `TEST_BANNER:<uuid>` row.
   - Mobile (390px): no horizontal scroll, buttons sized ~200px max, preview compact.

Files to change
- `supabase/migrations/<new>.sql` — drop unique, add partial unique index.
- `src/index.css` — add `.btn-primary`, `.btn-secondary`, `.page-container`, `.banner-upload-card`.
- `src/pages/admin/AdminBannersPage.tsx` — compact layout + button sizing.
- `src/pages/admin/AdminTestsPage.tsx`, `AdminStudentsPage.tsx`, `AdminResultsPage.tsx`, `AdminDashboard.tsx` — strip full-width on primary buttons, wrap in `.page-container`.

Result after fix
- Banner upload no longer fails on duplicate titles.
- One global button/input system across admin pages.
- /admin/banners feels compact and mobile-clean at 390px.
- Test→banner auto-sync continues to work safely via partial unique index.
