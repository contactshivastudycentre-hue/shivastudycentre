CREATE OR REPLACE FUNCTION public.validate_test_event_dates()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
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