-- 1) Normalize legacy test class values to match profile format ("Class N")
UPDATE public.tests
SET class = 'Class ' || class
WHERE class ~ '^[0-9]+$';

-- 2) Ensure auto-banner is removed promptly when a highlight test ends.
-- Update sync_test_banner so it removes the corresponding banner row
-- on UPDATE when end_time has passed, in addition to keeping it in sync.
CREATE OR REPLACE FUNCTION public.sync_test_banner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  banner_title text;
  is_highlight boolean;
BEGIN
  is_highlight := NEW.test_type IN ('sunday_special','weekly','surprise_quiz');

  -- Remove banner when test is unpublished, no banner image, not a highlight type, or already ended
  IF NOT is_highlight
     OR NEW.is_published = false
     OR NEW.banner_image IS NULL
     OR (NEW.end_time IS NOT NULL AND NEW.end_time < now())
  THEN
    DELETE FROM public.banners WHERE title = 'TEST_BANNER:' || NEW.id::text;
    RETURN NEW;
  END IF;

  banner_title := 'TEST_BANNER:' || NEW.id::text;

  INSERT INTO public.banners (
    title, subtitle, description, image_url, target_class, is_universal,
    is_active, priority, start_date, end_date, template, cta_link, cta_text
  ) VALUES (
    banner_title,
    NEW.title,
    NEW.description,
    NEW.banner_image,
    NEW.class,
    false,
    true,
    100,
    NEW.start_time,
    NEW.end_time,
    'test_announcement',
    '/dashboard/tests/' || NEW.id::text,
    'Attempt Test'
  )
  ON CONFLICT (title) DO UPDATE SET
    subtitle = EXCLUDED.subtitle,
    description = EXCLUDED.description,
    image_url = EXCLUDED.image_url,
    target_class = EXCLUDED.target_class,
    start_date = EXCLUDED.start_date,
    end_date = EXCLUDED.end_date,
    cta_link = EXCLUDED.cta_link,
    is_active = true,
    updated_at = now();

  RETURN NEW;
END;
$$;

-- Ensure banners.title is unique so ON CONFLICT works
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='banners_title_key'
  ) THEN
    BEGIN
      ALTER TABLE public.banners ADD CONSTRAINT banners_title_key UNIQUE (title);
    EXCEPTION WHEN duplicate_table THEN NULL;
    END;
  END IF;
END $$;

-- Make sure trigger exists on tests
DROP TRIGGER IF EXISTS trg_sync_test_banner ON public.tests;
CREATE TRIGGER trg_sync_test_banner
AFTER INSERT OR UPDATE ON public.tests
FOR EACH ROW EXECUTE FUNCTION public.sync_test_banner();

-- 3) Re-trigger sync for all currently published highlight tests so banners get created/updated
UPDATE public.tests
SET updated_at = now()
WHERE test_type IN ('sunday_special','weekly','surprise_quiz')
  AND is_published = true;