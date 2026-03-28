

# Comprehensive Mobile Responsiveness & Notes System Fix

## Overview
Fix mobile responsiveness across the entire LMS, improve the PDF viewer for mobile, make the admin Students page use cards on mobile, and clean up the promotion section.

## Plan

### 1. PDF Viewer Mobile Optimization
**File:** `src/components/PDFViewer.tsx`
- Make the PDF content area use `overflow-x: hidden` to prevent horizontal scroll
- On mobile, auto-set zoom to fit width (default zoom can stay at 1 since `baseScale` already fits container width)
- Add `touch-action: pan-y pinch-zoom` on the container for better mobile gestures
- Ensure the viewer takes full viewport on mobile with no padding
- Add safe-area padding at the bottom for iOS devices

### 2. Student Notes Page Mobile Polish
**File:** `src/pages/dashboard/NotesPage.tsx`
- Make note cards stack single-column on mobile (`grid-cols-1` instead of `sm:grid-cols-2` on small screens)
- Increase button touch targets to `min-h-[44px]`
- Ensure search input is full-width on mobile
- Add `overflow-hidden` to prevent any horizontal scroll

### 3. Admin Notes Page — Already Good
The admin notes page already has mobile cards vs desktop table, responsive dialog, and full-width buttons. Minor tweaks only:
- Ensure dialog doesn't overflow on very small screens

### 4. Admin Students Page — Mobile Cards
**File:** `src/pages/admin/AdminStudentsPage.tsx`
- Add a mobile card view (hidden on `sm+`) similar to admin notes
- Each card shows: avatar/initials, name, mobile, class, status badge, action menu
- Hide the desktop table on mobile (`hidden sm:block`)
- Move the class change requests section into a collapsible or dialog behind a "View Requests" button to reduce page clutter
- Move promotion history into a dialog/modal behind a button

### 5. Admin Layout Mobile Nav — Already Good
The admin layout already has bottom nav with Content sheet. No changes needed.

### 6. Dashboard Layout — Already Good
Header is fixed, bottom nav exists, sidebar on desktop. No changes needed.

### 7. Global CSS Tweaks
**File:** `src/index.css`
- Add `overflow-x: hidden` on `body` / `html` to globally prevent horizontal scroll
- Ensure `.dashboard-card` has `overflow: hidden`

## Technical Details

### Files to modify:
1. **`src/components/PDFViewer.tsx`** — Add `overflow-x-hidden`, touch-action, safe-area bottom padding
2. **`src/pages/dashboard/NotesPage.tsx`** — Single-column cards on mobile, larger touch targets, full-width search
3. **`src/pages/admin/AdminStudentsPage.tsx`** — Add mobile card view, hide table on mobile, wrap class requests in expandable section
4. **`src/index.css`** — Add global `overflow-x: hidden` on html/body

### Estimated changes:
- PDFViewer: ~5 lines changed
- NotesPage: ~10 lines changed  
- AdminStudentsPage: ~80 lines added (mobile card layout)
- index.css: ~3 lines added

