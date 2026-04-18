-- Fix: previously this trigger stripped "Class " from test.class, causing
-- mismatch with profiles.class which retains the "Class N" format.
-- New behavior: just validate dates, keep class as-is.
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
  RETURN NEW;
END;
$$;

-- Backfill existing tests to use "Class N" format
UPDATE public.tests
SET class = 'Class ' || trim(class)
WHERE trim(class) ~ '^[0-9]+$';

-- Re-trigger banner sync
UPDATE public.tests
SET updated_at = now()
WHERE test_type IN ('sunday_special','weekly','surprise_quiz')
  AND is_published = true;