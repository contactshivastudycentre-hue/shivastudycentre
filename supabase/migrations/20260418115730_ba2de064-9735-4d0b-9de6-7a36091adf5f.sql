-- ============================================================
-- 1. Cleanup: drop event-based system entirely
-- ============================================================
DROP TRIGGER IF EXISTS sync_event_banner_trigger ON public.test_events;
DROP TRIGGER IF EXISTS delete_event_banner_trigger ON public.test_events;
DROP TRIGGER IF EXISTS notify_on_test_event_change_trigger ON public.test_events;
DROP TRIGGER IF EXISTS validate_test_event_dates_trigger ON public.test_events;

DROP FUNCTION IF EXISTS public.sync_event_banner() CASCADE;
DROP FUNCTION IF EXISTS public.delete_event_banner() CASCADE;
DROP FUNCTION IF EXISTS public.notify_on_test_event_change() CASCADE;
DROP FUNCTION IF EXISTS public.validate_test_event_dates() CASCADE;
DROP FUNCTION IF EXISTS public.get_event_leaderboard(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.toggle_event_results_published(uuid, boolean) CASCADE;

-- Remove banners tied to events (their FK is being dropped)
DELETE FROM public.banners WHERE event_id IS NOT NULL;
ALTER TABLE public.banners DROP COLUMN IF EXISTS event_id;

DROP TABLE IF EXISTS public.event_prizes CASCADE;
DROP TABLE IF EXISTS public.test_events CASCADE;

-- ============================================================
-- 2. Tests table — new columns
-- ============================================================
DO $$ BEGIN
  CREATE TYPE public.test_type_enum AS ENUM ('standard', 'sunday_special', 'practice');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.tests
  ADD COLUMN IF NOT EXISTS test_type public.test_type_enum NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS results_published_at timestamptz,
  ADD COLUMN IF NOT EXISTS highlight_until timestamptz;

CREATE INDEX IF NOT EXISTS idx_tests_test_type ON public.tests(test_type);
CREATE INDEX IF NOT EXISTS idx_tests_results_published ON public.tests(results_published_at);
CREATE INDEX IF NOT EXISTS idx_tests_start_time ON public.tests(start_time);

-- ============================================================
-- 3. Winners table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.test_winners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  rank int NOT NULL CHECK (rank BETWEEN 1 AND 3),
  user_id uuid NOT NULL,
  full_name text,
  score int,
  time_seconds int,
  prize_text text,
  auto_calculated boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(test_id, rank)
);

CREATE INDEX IF NOT EXISTS idx_test_winners_test ON public.test_winners(test_id);
CREATE INDEX IF NOT EXISTS idx_test_winners_created ON public.test_winners(created_at DESC);

ALTER TABLE public.test_winners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all winners"
  ON public.test_winners
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Approved students view winners of published tests"
  ON public.test_winners
  FOR SELECT
  USING (
    public.is_student_approved()
    AND EXISTS (
      SELECT 1 FROM public.tests t
      WHERE t.id = test_winners.test_id
        AND t.results_published_at IS NOT NULL
    )
  );

CREATE TRIGGER set_test_winners_updated_at
  BEFORE UPDATE ON public.test_winners
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- 4. RPC: publish results + auto-rank winners
-- ============================================================
CREATE OR REPLACE FUNCTION public.publish_test_results(p_test_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can publish results';
  END IF;

  -- Mark results as published
  UPDATE public.tests
  SET results_published_at = now(), updated_at = now()
  WHERE id = p_test_id;

  -- Wipe any prior auto winners (preserve manual prize edits if admin re-publishes? -> overwrite)
  DELETE FROM public.test_winners WHERE test_id = p_test_id;

  -- Insert top 3 by score DESC, time ASC, excluding admins/banned
  INSERT INTO public.test_winners (test_id, rank, user_id, full_name, score, time_seconds, auto_calculated)
  SELECT
    p_test_id,
    ROW_NUMBER() OVER (
      ORDER BY COALESCE(ta.score, ta.mcq_score, 0) DESC,
               EXTRACT(EPOCH FROM (ta.submitted_at - ta.started_at))::int ASC
    )::int AS rank,
    ta.user_id,
    COALESCE(p.full_name, 'Student'),
    COALESCE(ta.score, ta.mcq_score, 0)::int,
    EXTRACT(EPOCH FROM (ta.submitted_at - ta.started_at))::int,
    true
  FROM public.test_attempts ta
  LEFT JOIN public.profiles p ON p.user_id = ta.user_id
  WHERE ta.test_id = p_test_id
    AND ta.submitted_at IS NOT NULL
    AND ta.is_banned = false
    AND COALESCE(p.full_name, '') NOT ILIKE 'admin%'
    AND COALESCE(p.mobile, '') <> '0000000000'
  ORDER BY COALESCE(ta.score, ta.mcq_score, 0) DESC,
           EXTRACT(EPOCH FROM (ta.submitted_at - ta.started_at))::int ASC
  LIMIT 3;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN jsonb_build_object('status','published','winners_count', v_count);
END;
$$;

CREATE OR REPLACE FUNCTION public.unpublish_test_results(p_test_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can unpublish results';
  END IF;
  UPDATE public.tests SET results_published_at = NULL, updated_at = now() WHERE id = p_test_id;
  DELETE FROM public.test_winners WHERE test_id = p_test_id;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_winner_prize(p_winner_id uuid, p_prize_text text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can edit prizes';
  END IF;
  UPDATE public.test_winners
  SET prize_text = p_prize_text, auto_calculated = false, updated_at = now()
  WHERE id = p_winner_id;
  RETURN FOUND;
END;
$$;

-- ============================================================
-- 5. RPC: leaderboard for any test (results published only)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_test_leaderboard(p_test_id uuid)
RETURNS TABLE(rank bigint, user_id uuid, full_name text, score int, time_seconds int)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_published timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  IF NOT (public.is_student_approved(auth.uid()) OR public.is_admin(auth.uid())) THEN RETURN; END IF;

  SELECT results_published_at INTO v_published
  FROM public.tests WHERE id = p_test_id;

  IF v_published IS NULL AND NOT public.is_admin(auth.uid()) THEN RETURN; END IF;

  RETURN QUERY
  SELECT
    ROW_NUMBER() OVER (
      ORDER BY COALESCE(ta.score, ta.mcq_score, 0) DESC,
               EXTRACT(EPOCH FROM (ta.submitted_at - ta.started_at))::int ASC
    ) AS rank,
    ta.user_id,
    COALESCE(p.full_name, 'Student')::text,
    COALESCE(ta.score, ta.mcq_score, 0)::int,
    EXTRACT(EPOCH FROM (ta.submitted_at - ta.started_at))::int
  FROM public.test_attempts ta
  LEFT JOIN public.profiles p ON p.user_id = ta.user_id
  WHERE ta.test_id = p_test_id
    AND ta.submitted_at IS NOT NULL
    AND ta.is_banned = false
    AND COALESCE(p.full_name, '') NOT ILIKE 'admin%'
    AND COALESCE(p.mobile, '') <> '0000000000';
END;
$$;

-- ============================================================
-- 6. RPC: recent winners (cross-class, for dashboard slider)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_recent_winners(p_days int DEFAULT 7)
RETURNS TABLE(
  test_id uuid,
  test_title text,
  test_class text,
  test_type text,
  results_published_at timestamptz,
  rank int,
  user_id uuid,
  full_name text,
  score int,
  prize_text text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.id,
    t.title,
    t.class,
    t.test_type::text,
    t.results_published_at,
    w.rank,
    w.user_id,
    w.full_name,
    w.score,
    w.prize_text
  FROM public.test_winners w
  JOIN public.tests t ON t.id = w.test_id
  WHERE t.results_published_at IS NOT NULL
    AND t.results_published_at >= now() - (p_days || ' days')::interval
  ORDER BY t.results_published_at DESC, w.rank ASC;
$$;

-- ============================================================
-- 7. Auto-banner for Sunday Special tests
-- ============================================================
CREATE OR REPLACE FUNCTION public.sync_test_banner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only auto-banner Sunday Special with image
  IF NEW.test_type = 'sunday_special'
     AND NEW.banner_image IS NOT NULL
     AND length(trim(NEW.banner_image)) > 0
     AND NEW.is_published = true THEN

    DELETE FROM public.banners WHERE title = '__test_' || NEW.id::text;

    INSERT INTO public.banners (
      title, subtitle, description, image_url,
      cta_text, cta_link, template, priority,
      is_active, is_universal, target_class,
      start_date, end_date, background_color
    ) VALUES (
      '__test_' || NEW.id::text,  -- internal marker
      NEW.title,
      NEW.description,
      NEW.banner_image,
      'View Test',
      '/dashboard/tests',
      'sunday_special',
      100,
      true,
      false,
      NEW.class,
      NEW.start_time,
      NEW.end_time,
      NULL
    );
  ELSE
    -- Cleanup: if no longer eligible, remove
    DELETE FROM public.banners WHERE title = '__test_' || NEW.id::text;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_test_banner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.banners WHERE title = '__test_' || OLD.id::text;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS sync_test_banner_trigger ON public.tests;
CREATE TRIGGER sync_test_banner_trigger
  AFTER INSERT OR UPDATE OF test_type, banner_image, is_published, start_time, end_time, class, title, description
  ON public.tests
  FOR EACH ROW EXECUTE FUNCTION public.sync_test_banner();

DROP TRIGGER IF EXISTS delete_test_banner_trigger ON public.tests;
CREATE TRIGGER delete_test_banner_trigger
  BEFORE DELETE ON public.tests
  FOR EACH ROW EXECUTE FUNCTION public.delete_test_banner();

-- ============================================================
-- 8. Notification trigger when results are published
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_on_results_published()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (OLD.results_published_at IS NULL AND NEW.results_published_at IS NOT NULL) THEN
    PERFORM public.notify_class(
      NEW.class,
      'results_published',
      '🏅 Results published',
      NEW.title || ' — view your score & leaderboard',
      '/dashboard/tests/' || NEW.id::text || '/result'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_results_published_trigger ON public.tests;
CREATE TRIGGER notify_results_published_trigger
  AFTER UPDATE OF results_published_at ON public.tests
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_results_published();
