

## Root causes found

1. **Mobile admin can't reach Events / Banners / Leaderboard**
   AdminLayout's mobile bottom nav only has Home, Students, Tests, Content, Results — there's literally no entry point on mobile. That's why "no sunday test and banner uploading from admin" works on desktop but not phone.

2. **Banner dialog crashes silently** (`AdminBannersPage.tsx`)
   - `<SelectItem value="">None</SelectItem>` — Radix Select throws because empty-string values are forbidden. Dialog breaks on open.
   - On submit, `event_id: ''` and `target_class: ''` are passed as empty strings to UUID/text columns → Postgres rejects ("invalid input syntax for uuid"). Same in AdminEventsPage when "All Classes" is on but `target_class` was previously set.

3. **Admins can only paste an image URL** — no actual upload widget for banner / event banner images. Should upload to Supabase Storage.

4. **Banner not showing on student dashboard**
   - Carousel query `.eq('is_active', true)` works, but if banner has `event_id = null` the `test_events(*, event_prizes(*))` join still returns the row — that part is fine.
   - Real reason nothing appears: no banner ever got created (because of #2).

5. **PDF upload fails on mobile** (`FileUploader.tsx`)
   - `visibilitychange` only restores UI when `status === 'idle'`. On Android Chrome the input `onChange` fires AFTER visibility flips back, so the ref is set but state may have been reset by a parent re-render (the surrounding Dialog in AdminNotesPage uses controlled state that closes when focus is lost on some browsers). The form is also wrapped in a `<form>` whose submit can be triggered by the upload button.
   - Need: keep the file in BOTH ref + state, lift the dialog out of any auto-closing parent, and ensure the button is `type="button"`.

6. **PDF viewer not visible cleanly on mobile**
   - Uses `paddingTop: env(safe-area-inset-top)` on the fixed container which adds whitespace above the dark canvas area. The header sits below the safe area but the dashboard mobile header (`z-40`) is below `z-[9999]` so that's fine. The actual issue is the back arrow can be small / hard to tap and the PDF area background bleeds into the safe area making header look detached.

7. **Landing page admin button** — user wants to reduce friction so students don't accidentally tap "Admin Login". Solution: move Admin Login to a small subtle link in the landing footer area instead of a big primary button on both desktop and mobile landing.

---

## Fix plan

### A. AdminLayout mobile nav — add access to new pages
Replace the static 5 buttons with a "More" sheet that exposes: Events, Banners, Leaderboard, Notes, Videos, Password Resets. Keep Home, Students, Tests, Results as direct buttons; "More" replaces the Content sheet.

### B. AdminBannersPage — fix dialog + add image upload
- Replace `<SelectItem value="">None</SelectItem>` with `<SelectItem value="__none__">None</SelectItem>` and convert to `null` on submit.
- Sanitize payload: convert empty strings to `null` for `event_id`, `target_class`, `image_url`.
- Add a proper image uploader (reuse `FileUploader` but with `accept="image/*"` and a new `images` storage bucket OR reuse `notes` bucket under `banners/` prefix). Upload returns a public URL → stored as `image_url`.

### C. AdminEventsPage — same fixes
- Sanitize empty strings to null for `test_id`, `target_class`.
- Add image upload widget for `banner_image`.

### D. New storage bucket for banner images
Create public `banner-images` bucket via migration with admin-only insert/update/delete RLS. Make `FileUploader` accept arbitrary `accept` and validate accordingly (currently hardcoded to PDF).

### E. FileUploader — mobile upload bug
- Mirror the file into React state `selectedFile` (not just ref) so unmount/remount restores correctly.
- Add `key` based on bucket so the component doesn't lose state between dialogs.
- Wrap upload action so it cannot trigger a form submit (`type="button"` is already there — also stop propagation on input change).
- Make AdminNotesPage's note dialog NOT close on outside click during upload (`onPointerDownOutside` preventDefault when uploading).

### F. PDFViewer — cleaner mobile header
- Move `paddingTop: env(safe-area-inset-top)` from outer container to the header `<div>` only, and give header a solid `bg-card` so the safe-area zone is filled.
- Increase Back button hit area to `h-11 px-3` and bump font size.
- Confirmed `z-[9999]` is above mobile header (`z-40`) and bottom nav.

### G. Landing page — soften Admin Login
- On `MobileAppLanding`: replace the full-width "Admin Login" button with a small text link at the bottom: "Admin? Sign in here" (smaller font, muted color).
- On desktop `LandingPage` hero: keep Student Login as the only large CTA; move Admin Login to a small ghost link beside "Learn more about us".

### H. BannerCarousel safety
- Add a console-visible empty state hint for admins so they know none are active (already returns null — keep, but ensure query refetches every minute via `refetchInterval`).

---

## Files to change
- `src/components/layout/AdminLayout.tsx` — add "More" sheet with Events/Banners/Leaderboard/Notes/Videos/Resets
- `src/pages/admin/AdminBannersPage.tsx` — fix Select bug, sanitize payload, add image upload
- `src/pages/admin/AdminEventsPage.tsx` — sanitize payload, add banner image upload
- `src/components/admin/FileUploader.tsx` — mobile robustness + accept arbitrary mime
- `src/pages/admin/AdminNotesPage.tsx` — prevent dialog close during upload
- `src/components/PDFViewer.tsx` — header safe-area + bigger back button
- `src/pages/MobileAppLanding.tsx` — admin link instead of button
- `src/pages/LandingPage.tsx` — admin link instead of button
- `src/components/dashboard/BannerCarousel.tsx` — refetchInterval
- New migration — `banner-images` public bucket + admin RLS

After approval, implementing all of the above in one pass.

