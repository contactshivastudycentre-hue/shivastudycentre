

## Goal
Two fixes:
1. **Admin Lucky Winners** — add a “max available” helper that hard-caps `luckyCount` and disables rows beyond the real eligible pool so admins can never pick more lucky winners than exist after excluding Top 1/2/3.
2. **404 / “Server down” on reload of the live site & PWA** — hardened service worker + boot script so a deep-link refresh (e.g. `/dashboard/tests/...`) or a stale install never blanks the app.

(Note: the site is hosted on **Lovable**, not Vercel. Lovable already does SPA fallback automatically. The 404 you’re seeing is caused by our own `sw.js`, not the host — fixing it there is the correct fix.)

---

## 1. Admin: Lucky-winner pool guardrails

File: `src/pages/admin/AdminTestResultsPage.tsx`

- Compute `maxLucky = max(0, eligible.length - count(filled top picks))`.
- Show a clear helper line under the count input:  
  `“Max lucky winners available: X (after excluding Top 1/2/3)”`  
  Turn red when `luckyCount > maxLucky`.
- Auto-clamp `luckyCount` whenever Top picks change so it never exceeds `maxLucky`.
- Set `<Input max={maxLucky}>` and disable the input entirely when `maxLucky === 0`.
- Disable the **Auto-pick** button when `luckyCount === 0 || luckyCount > maxLucky || !luckyPrize.trim()`.
- For each rendered lucky-pick row beyond `maxLucky`, show a red “Pool exhausted — remove” badge and disable the re-roll button (only the remove button stays active).
- Strengthen the publish button `disabled` condition: also disable when `luckyPicks.length > maxLucky` or any lucky row has no `prize_text` (default or per-row).
- Validation in `publishMutation` already throws on missing prize / duplicates — keep, but add explicit guard: `if (luckyPicks.length > maxLucky) throw …`.

---

## 2. PWA / live-site reload returning 404 / “server down”

Root cause: our `public/sw.js` intercepts navigation, tries the network, and on failure does `caches.match('/')` — but `/` was never added to the cache. Result on flaky networks or after a stale SW install: blank page / `503 Offline` / browser-rendered “site can’t be reached” that students read as a 404.

Fixes (all in `public/sw.js` + `index.html`):

**a. Pre-cache the SPA shell.** During `install`, also fetch and cache `/` so the offline fallback actually has something to serve.

**b. Stop hijacking navigations on the live site.** Change the `fetch` handler so that for `req.mode === 'navigate'` we do a plain `fetch(req)` and only fall back to the cached `/` if the fetch *rejects* (true offline). Do NOT treat non-2xx responses as failures — let the host serve them. This kills the false-404 path.

**c. Bump cache version + skip waiting + clients.claim** so existing installs (including the home-screen PWA) immediately replace the broken SW on next visit. New name: `ssc-static-v7`.

**d. Self-heal old broken installs.** In `index.html`, add a one-time check: if a controlling SW exists and its script URL contains an old cache version OR the page failed to load, force `registration.unregister()` + `caches.keys().then(delete)` then `location.reload()`. This recovers students whose PWA is stuck on the buggy SW *without* them having to reinstall.

**e. Defensive 404 page.** Update `src/pages/NotFound.tsx` so that if the React app *does* mount on a deep route the router doesn’t know, the message is clear (“Page not found — go to Dashboard”) instead of looking like a server error. Add a button to `/dashboard`.

**f. Confirm Lovable hosting handles deep-link refreshes.** No config file needed; Lovable's SPA fallback is built-in. (We will NOT add `vercel.json` / `_redirects` — they do nothing on Lovable.)

---

## Result
- Teacher can pick prize + count of lucky winners and the form physically can’t exceed the real eligible pool — no failed publishes.
- A student refreshing `https://shivastudycentre.lovable.app/dashboard/tests/abc/leaderboard` (in browser or installed PWA) gets the dashboard, not a 404.
- Students whose PWA was stuck on the broken cached SW will auto-recover on their next open — no manual reinstall.

