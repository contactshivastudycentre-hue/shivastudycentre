UPDATE public.test_events
SET end_date = start_date + interval '1 hour'
WHERE end_date <= start_date;

CREATE OR REPLACE FUNCTION public.validate_test_event_dates()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.end_date IS NULL OR NEW.start_date IS NULL THEN
    RAISE EXCEPTION 'Start and end date are required';
  END IF;
  IF NEW.end_date <= NEW.start_date THEN
    RAISE EXCEPTION 'End date must be after start date';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_test_event_dates ON public.test_events;
CREATE TRIGGER trg_validate_test_event_dates
BEFORE INSERT OR UPDATE ON public.test_events
FOR EACH ROW EXECUTE FUNCTION public.validate_test_event_dates();