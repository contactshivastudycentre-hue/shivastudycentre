
-- 1. question_progress table for Sunday Special locked-sequence timer
CREATE TABLE IF NOT EXISTS public.question_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL,
  user_id uuid NOT NULL,
  test_id uuid NOT NULL,
  current_question_index integer NOT NULL DEFAULT 0,
  question_started_at timestamptz NOT NULL DEFAULT now(),
  per_question_seconds integer NOT NULL DEFAULT 60,
  is_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (attempt_id)
);

CREATE INDEX IF NOT EXISTS idx_question_progress_user ON public.question_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_question_progress_attempt ON public.question_progress(attempt_id);

ALTER TABLE public.question_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own progress"
ON public.question_progress FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users insert own progress"
ON public.question_progress FOR INSERT
WITH CHECK (auth.uid() = user_id AND is_student_approved());

CREATE POLICY "Users update own progress"
ON public.question_progress FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins manage all progress"
ON public.question_progress FOR ALL
USING (is_admin());

CREATE TRIGGER trg_question_progress_updated
BEFORE UPDATE ON public.question_progress
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 2. Add sequence_locked flag to test_attempts
ALTER TABLE public.test_attempts
ADD COLUMN IF NOT EXISTS sequence_locked boolean NOT NULL DEFAULT false;

-- 3. Helper: start or resume a Sunday Special question (anti-cheat)
CREATE OR REPLACE FUNCTION public.start_sunday_question(
  p_attempt_id uuid,
  p_question_index integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_test_id uuid;
  v_progress public.question_progress%ROWTYPE;
  v_remaining integer;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;

  SELECT test_id INTO v_test_id
  FROM public.test_attempts
  WHERE id = p_attempt_id AND user_id = v_user_id;

  IF v_test_id IS NULL THEN
    RETURN jsonb_build_object('error', 'attempt_not_found');
  END IF;

  SELECT * INTO v_progress
  FROM public.question_progress
  WHERE attempt_id = p_attempt_id
  FOR UPDATE;

  IF NOT FOUND THEN
    -- First question
    INSERT INTO public.question_progress
      (attempt_id, user_id, test_id, current_question_index, question_started_at)
    VALUES
      (p_attempt_id, v_user_id, v_test_id, p_question_index, now())
    RETURNING * INTO v_progress;
  ELSIF v_progress.current_question_index <> p_question_index THEN
    -- Trying to access a different question than recorded -> force them to current one
    RETURN jsonb_build_object(
      'forced_question_index', v_progress.current_question_index,
      'remaining_seconds', GREATEST(0,
        v_progress.per_question_seconds -
        EXTRACT(EPOCH FROM (now() - v_progress.question_started_at))::int)
    );
  END IF;

  v_remaining := GREATEST(0,
    v_progress.per_question_seconds -
    EXTRACT(EPOCH FROM (now() - v_progress.question_started_at))::int);

  RETURN jsonb_build_object(
    'question_index', v_progress.current_question_index,
    'remaining_seconds', v_remaining,
    'per_question_seconds', v_progress.per_question_seconds
  );
END;
$$;

-- 4. Helper: advance to next question (saves answer, resets timer)
CREATE OR REPLACE FUNCTION public.advance_sunday_question(
  p_attempt_id uuid,
  p_next_index integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;

  UPDATE public.question_progress
  SET current_question_index = p_next_index,
      question_started_at = now(),
      updated_at = now()
  WHERE attempt_id = p_attempt_id
    AND user_id = v_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'progress_not_found');
  END IF;

  RETURN jsonb_build_object(
    'question_index', p_next_index,
    'remaining_seconds', 60
  );
END;
$$;

-- 5. Auto-create banner when Sunday Special event is created with banner image
CREATE OR REPLACE FUNCTION public.sync_event_banner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_priority integer;
  v_template text;
  v_title_prefix text;
BEGIN
  -- Determine banner priority/template by event type
  IF NEW.event_type = 'sunday_special' THEN
    v_priority := 100;
    v_template := 'sunday_special';
    v_title_prefix := '🏆 Special Sunday Test – SSC';
  ELSE
    v_priority := 0;
    v_template := 'test_announcement';
    v_title_prefix := NEW.event_name;
  END IF;

  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.banner_image IS DISTINCT FROM NEW.banner_image) THEN
    -- Remove any existing auto-banner for this event
    DELETE FROM public.banners WHERE event_id = NEW.id;

    IF NEW.banner_image IS NOT NULL AND length(trim(NEW.banner_image)) > 0 THEN
      INSERT INTO public.banners (
        title, subtitle, description, image_url,
        cta_text, cta_link, template, priority,
        is_active, is_universal, target_class,
        start_date, end_date, event_id, background_color
      ) VALUES (
        v_title_prefix,
        NEW.event_name,
        NEW.description,
        NEW.banner_image,
        CASE WHEN NEW.event_type = 'sunday_special' THEN 'View Test' ELSE 'Learn More' END,
        '/dashboard/tests',
        v_template,
        v_priority,
        true,
        NEW.is_universal,
        NEW.target_class,
        NEW.start_date,
        NEW.end_date,
        NEW.id,
        NULL
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_event_banner ON public.test_events;
CREATE TRIGGER trg_sync_event_banner
AFTER INSERT OR UPDATE ON public.test_events
FOR EACH ROW EXECUTE FUNCTION public.sync_event_banner();

-- Cascade delete banner when event removed
CREATE OR REPLACE FUNCTION public.delete_event_banner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.banners WHERE event_id = OLD.id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_delete_event_banner ON public.test_events;
CREATE TRIGGER trg_delete_event_banner
BEFORE DELETE ON public.test_events
FOR EACH ROW EXECUTE FUNCTION public.delete_event_banner();

-- 6. Realtime for the new table and test_events
ALTER PUBLICATION supabase_realtime ADD TABLE public.question_progress;
ALTER TABLE public.question_progress REPLICA IDENTITY FULL;
