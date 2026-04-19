
Goal: stabilize the mobile WPA reload flow, remove the false “Account not found / Please register” state, ensure SSC Special Test banners always enter the unified student slider, and tighten oversized mobile UI across dashboard pages.

What I found
- Auth boot is still fragile: `src/lib/auth.tsx` sets auth state quickly, but profile fetch has no error-aware recovery. If profile lookup is delayed or returns null once, `DashboardLayout` can still fall into the “Profile Not Found” branch.
- The preview auth logs show refresh-token problems, which matches the reload/logout symptom in the WPA.
- The unified banner exists, but it depends on auto-created `banners` rows plus class-based visibility. If `tests.class`, `banners.target_class`, and `profiles.class` are not perfectly aligned, students won’t see the banner even when the test is published.
- The banner carousel is still visually too tall/dense for phones, and several student pages use large default card/button spacing.
- There are also React ref warnings from `Skeleton` and `SearchInput`; these should be cleaned up during the stabilization pass.

Implementation plan

1. Harden auth bootstrap for reload/PWA
- Refactor `src/lib/auth.tsx` into a proper boot sequence:
  - separate `authReady` / `profileReady` behavior
  - restore session first
  - then fetch user + profile using `user_id`
  - only mark app ready after that flow completes
- Make `fetchProfile` use explicit error handling (`maybeSingle`, reset stale state, retry-safe behavior).
- Prevent stale profile flashes by clearing/loading state correctly on every auth transition.
- Update `src/components/layout/DashboardLayout.tsx` and `src/components/layout/AdminLayout.tsx` to show a centered loading spinner/skeleton until auth + profile are resolved.
- Remove the misleading fallback copy (“Please complete your registration”) for transient failures; only show a true missing-profile screen if the backend confirms the profile does not exist.
- Update `src/pages/StudentAuthPage.tsx` so post-login navigation waits for resolved auth/profile state instead of using possibly stale `isAdmin/profile`.

2. Stabilize mobile PWA reload behavior
- Audit `public/sw.js` and simplify caching so reloads do not serve stale app shell/assets that can cause a blank WPA.
- Prefer safer navigation handling for the SPA shell and avoid over-caching problematic responses.
- Keep a lightweight loading shell visible during route/auth hydration so reload never appears blank.

3. Fix SSC Special Test banner generation and visibility
- Verify and adjust the banner sync path so every published SSC Special test with a banner image creates/updates exactly one `test_announcement` banner row.
- Add a migration to normalize class values across:
  - `tests.class`
  - `banners.target_class`
  - student `profiles.class`
  so RLS and unified slider visibility match reliably.
- Re-sync existing published highlight tests so missing banner rows are rebuilt.
- Tighten `src/components/dashboard/BannerCarousel.tsx` to:
  - explicitly support SSC Special metadata
  - prioritize live test > upcoming test > topper > admin
  - show correct CTA state: Upcoming / Attempt Now / View Result
  - gracefully ignore malformed banner metadata instead of failing the slide.

4. Validate and polish banner upload pipeline
- Keep the existing storage-based upload flow, but standardize it end to end:
  - confirm one canonical banner bucket is used everywhere
  - ensure file validation is strict for images and size
  - keep instant preview after upload
  - surface better upload errors in admin test/banner forms
- Review both:
  - `src/pages/admin/AdminBannersPage.tsx`
  - `src/components/admin/TestBuilder.tsx`
  so uploaded images used for admin banners and SSC Special test banners behave consistently.

5. Mobile UI sizing pass across the student WPA
- Reduce oversized mobile density in:
  - `src/components/dashboard/BannerCarousel.tsx`
  - `src/pages/dashboard/StudentDashboard.tsx`
  - `src/pages/dashboard/TestsPage.tsx`
  - `src/pages/dashboard/NotesPage.tsx`
  - `src/pages/dashboard/VideosPage.tsx`
  - `src/pages/dashboard/VideoWatchPage.tsx`
  - `src/pages/dashboard/TestResultPage.tsx`
  - `src/pages/dashboard/ProfilePage.tsx`
- Adjust:
  - banner aspect ratio and inner spacing
  - CTA/button heights and font sizes
  - card padding on phones
  - chip/badge density
  - section spacing so content sits higher and fits better on 390px-wide screens
- Keep touch targets accessible while removing the oversized look.

6. Cleanup warnings that affect stability
- Convert `src/components/ui/skeleton.tsx` to `forwardRef`.
- Convert `src/components/SearchInput.tsx` to `forwardRef`-friendly behavior.
- This removes the current console warnings and helps avoid focus/render oddities on mobile.

7. End-to-end verification after implementation
- Test flow on mobile-sized preview and WPA-style reload:
  1. reload while logged in
  2. confirm spinner appears, no blank screen
  3. confirm no false “Account not found”
  4. create/publish SSC Special test with banner image
  5. confirm banner appears in unified slider as Upcoming
  6. confirm it changes to Attempt Now when live
  7. confirm student can open test and complete attempt
- Also verify Notes, Videos, Profile, Result, and Dashboard pages for mobile sizing consistency.

Technical details
- Likely files to change:
  - `src/lib/auth.tsx`
  - `src/components/layout/DashboardLayout.tsx`
  - `src/components/layout/AdminLayout.tsx`
  - `src/pages/StudentAuthPage.tsx`
  - `src/components/dashboard/BannerCarousel.tsx`
  - `src/pages/admin/AdminBannersPage.tsx`
  - `src/components/admin/TestBuilder.tsx`
  - `src/pages/dashboard/StudentDashboard.tsx`
  - `src/pages/dashboard/TestsPage.tsx`
  - `src/pages/dashboard/NotesPage.tsx`
  - `src/pages/dashboard/VideosPage.tsx`
  - `src/pages/dashboard/VideoWatchPage.tsx`
  - `src/pages/dashboard/TestResultPage.tsx`
  - `src/pages/dashboard/ProfilePage.tsx`
  - `src/components/ui/skeleton.tsx`
  - `src/components/SearchInput.tsx`
  - `public/sw.js`
- Backend work needed:
  - one migration to normalize class values and re-sync existing test banners
  - possible storage policy/bucket alignment if banner upload config is inconsistent

Result after fix
- Mobile WPA reload shows a loading state instead of a blank screen.
- Logged-in students stay signed in correctly and do not see the false registration error.
- SSC Special tests always appear inside the one unified dashboard banner slider.
- Banner CTA changes correctly with test time.
- Student pages feel properly sized on phone screens instead of oversized.
