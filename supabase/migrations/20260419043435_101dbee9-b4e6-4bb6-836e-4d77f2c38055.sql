ALTER TABLE public.banners DROP CONSTRAINT IF EXISTS banners_title_key;

CREATE UNIQUE INDEX IF NOT EXISTS banners_test_sync_title_uidx
ON public.banners (title)
WHERE title LIKE 'TEST_BANNER:%';