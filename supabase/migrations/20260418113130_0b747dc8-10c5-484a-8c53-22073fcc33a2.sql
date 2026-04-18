-- ============================================================
-- PART A: Re-attach missing triggers on test_events
-- ============================================================
DROP TRIGGER IF EXISTS trg_sync_event_banner ON public.test_events;
CREATE TRIGGER trg_sync_event_banner
AFTER INSERT OR UPDATE ON public.test_events
FOR EACH ROW EXECUTE FUNCTION public.sync_event_banner();

DROP TRIGGER IF EXISTS trg_delete_event_banner ON public.test_events;
CREATE TRIGGER trg_delete_event_banner
BEFORE DELETE ON public.test_events
FOR EACH ROW EXECUTE FUNCTION public.delete_event_banner();

DROP TRIGGER IF EXISTS trg_notify_test_event ON public.test_events;
CREATE TRIGGER trg_notify_test_event
AFTER INSERT OR UPDATE ON public.test_events
FOR EACH ROW EXECUTE FUNCTION public.notify_on_test_event_change();

-- Re-attach validation trigger (was created in earlier migration but ensure present)
DROP TRIGGER IF EXISTS trg_validate_test_event_dates ON public.test_events;
CREATE TRIGGER trg_validate_test_event_dates
BEFORE INSERT OR UPDATE ON public.test_events
FOR EACH ROW EXECUTE FUNCTION public.validate_test_event_dates();

-- ============================================================
-- PART A2: Normalize target_class on test_events ("Class 10" -> "10")
-- ============================================================
UPDATE public.test_events
SET target_class = regexp_replace(target_class, '^[Cc]lass\s+', '')
WHERE target_class ~ '^[Cc]lass\s+';

-- ============================================================
-- PART A3: Backfill missing banner rows for existing events with banner_image
-- by re-saving the event row (triggers sync_event_banner)
-- ============================================================
UPDATE public.test_events
SET updated_at = now()
WHERE banner_image IS NOT NULL
  AND length(trim(banner_image)) > 0
  AND NOT EXISTS (
    SELECT 1 FROM public.banners b WHERE b.event_id = test_events.id
  );

-- ============================================================
-- PART B: Add scheduling + banner directly on tests
-- ============================================================
ALTER TABLE public.tests
  ADD COLUMN IF NOT EXISTS start_time   timestamptz,
  ADD COLUMN IF NOT EXISTS end_time     timestamptz,
  ADD COLUMN IF NOT EXISTS banner_image text;

-- Backfill: existing published tests without dates get a wide window so they remain available
UPDATE public.tests
SET start_time = COALESCE(start_time, created_at),
    end_time   = COALESCE(end_time, created_at + interval '365 days')
WHERE start_time IS NULL OR end_time IS NULL;

-- Validation trigger for tests dates
CREATE OR REPLACE FUNCTION public.validate_test_dates()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.start_time IS NOT NULL AND NEW.end_time IS NOT NULL
     AND NEW.end_time <= NEW.start_time THEN
    RAISE EXCEPTION 'Test end time must be after start time';
  END IF;
  -- Normalize class: strip "Class " prefix if present
  IF NEW.class IS NOT NULL THEN
    NEW.class := regexp_replace(NEW.class, '^[Cc]lass\s+', '');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_test_dates ON public.tests;
CREATE TRIGGER trg_validate_test_dates
BEFORE INSERT OR UPDATE ON public.tests
FOR EACH ROW EXECUTE FUNCTION public.validate_test_dates();

-- Normalize existing test classes ("Class 10" -> "10")
UPDATE public.tests
SET class = regexp_replace(class, '^[Cc]lass\s+', ''),
    updated_at = now()
WHERE class ~ '^[Cc]lass\s+';

-- Index for fast schedule queries
CREATE INDEX IF NOT EXISTS idx_tests_published_window
  ON public.tests (is_published, start_time, end_time);