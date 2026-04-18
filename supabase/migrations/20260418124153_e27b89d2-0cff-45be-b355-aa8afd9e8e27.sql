-- 1) Add prize_pool to tests
ALTER TABLE public.tests
  ADD COLUMN IF NOT EXISTS prize_pool integer;

-- 2) Update sync_test_banner to embed test metadata into description as JSON
-- so BannerCarousel can render rich UI (class, subject, duration, prize, start_time)
CREATE OR REPLACE FUNCTION public.sync_test_banner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  banner_title text;
  is_highlight boolean;
  meta jsonb;
BEGIN
  is_highlight := NEW.test_type IN ('sunday_special','weekly','surprise_quiz');

  IF NOT is_highlight
     OR NEW.is_published = false
     OR NEW.banner_image IS NULL
     OR (NEW.end_time IS NOT NULL AND NEW.end_time < now())
  THEN
    DELETE FROM public.banners WHERE title = 'TEST_BANNER:' || NEW.id::text;
    RETURN NEW;
  END IF;

  banner_title := 'TEST_BANNER:' || NEW.id::text;

  meta := jsonb_build_object(
    'test_id', NEW.id,
    'test_type', NEW.test_type,
    'class', NEW.class,
    'subject', NEW.subject,
    'duration_minutes', NEW.duration_minutes,
    'prize_pool', NEW.prize_pool,
    'start_time', NEW.start_time,
    'end_time', NEW.end_time,
    'description', NEW.description
  );

  INSERT INTO public.banners (
    title, subtitle, description, image_url, target_class, is_universal,
    is_active, priority, start_date, end_date, template, cta_link, cta_text
  ) VALUES (
    banner_title,
    NEW.title,
    meta::text,
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

-- 3) Re-trigger sync for all currently published highlight tests
UPDATE public.tests
SET updated_at = now()
WHERE test_type IN ('sunday_special','weekly','surprise_quiz')
  AND is_published = true;