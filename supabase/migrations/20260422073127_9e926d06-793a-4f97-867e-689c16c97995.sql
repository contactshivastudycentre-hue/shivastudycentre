
-- 1. Class group enum + column
DO $$ BEGIN
  CREATE TYPE public.class_group_enum AS ENUM ('single','junior','senior','custom');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.tests
  ADD COLUMN IF NOT EXISTS class_group public.class_group_enum NOT NULL DEFAULT 'single';

-- 2. test_eligible_classes
CREATE TABLE IF NOT EXISTS public.test_eligible_classes (
  test_id uuid NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  class text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (test_id, class)
);

ALTER TABLE public.test_eligible_classes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage eligible classes" ON public.test_eligible_classes;
CREATE POLICY "Admins manage eligible classes"
  ON public.test_eligible_classes FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Approved students view their eligible class rows" ON public.test_eligible_classes;
CREATE POLICY "Approved students view their eligible class rows"
  ON public.test_eligible_classes FOR SELECT
  USING (
    public.is_student_approved()
    AND class = (SELECT p.class FROM public.profiles p WHERE p.user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_test_eligible_classes_class ON public.test_eligible_classes(class);
CREATE INDEX IF NOT EXISTS idx_test_eligible_classes_test ON public.test_eligible_classes(test_id);

-- 3. Banner audience array
ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS eligible_classes text[];
CREATE INDEX IF NOT EXISTS idx_banners_eligible_classes ON public.banners USING GIN(eligible_classes);

-- 4. test_winners
ALTER TABLE public.test_winners ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'top';
DO $$ BEGIN
  ALTER TABLE public.test_winners
    ADD CONSTRAINT test_winners_category_check CHECK (category IN ('top','lucky'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE public.test_winners ALTER COLUMN rank DROP NOT NULL;

-- 5. Trigger for eligible classes
CREATE OR REPLACE FUNCTION public.sync_test_eligible_classes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
BEGIN
  IF NEW.class_group = 'single' THEN
    DELETE FROM public.test_eligible_classes WHERE test_id = NEW.id;
    INSERT INTO public.test_eligible_classes (test_id, class) VALUES (NEW.id, NEW.class) ON CONFLICT DO NOTHING;
  ELSIF NEW.class_group = 'junior' THEN
    DELETE FROM public.test_eligible_classes WHERE test_id = NEW.id;
    INSERT INTO public.test_eligible_classes (test_id, class)
    VALUES (NEW.id,'Class 6'),(NEW.id,'Class 7') ON CONFLICT DO NOTHING;
  ELSIF NEW.class_group = 'senior' THEN
    DELETE FROM public.test_eligible_classes WHERE test_id = NEW.id;
    INSERT INTO public.test_eligible_classes (test_id, class)
    VALUES (NEW.id,'Class 8'),(NEW.id,'Class 9'),(NEW.id,'Class 10') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_sync_test_eligible_classes ON public.tests;
CREATE TRIGGER trg_sync_test_eligible_classes
AFTER INSERT OR UPDATE OF class_group, class ON public.tests
FOR EACH ROW EXECUTE FUNCTION public.sync_test_eligible_classes();

-- Backfill
INSERT INTO public.test_eligible_classes (test_id, class)
SELECT id, class FROM public.tests ON CONFLICT DO NOTHING;

-- 6. RLS updates
DROP POLICY IF EXISTS "Students can view published tests for their class" ON public.tests;
CREATE POLICY "Students can view published tests for their class"
  ON public.tests FOR SELECT
  USING (
    is_published = true AND public.is_student_approved()
    AND EXISTS (
      SELECT 1 FROM public.test_eligible_classes ec
      WHERE ec.test_id = tests.id
        AND ec.class = (SELECT p.class FROM public.profiles p WHERE p.user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Students can view questions of their class tests" ON public.questions;
CREATE POLICY "Students can view questions of their class tests"
  ON public.questions FOR SELECT
  USING (
    public.is_student_approved()
    AND EXISTS (
      SELECT 1 FROM public.tests t
      JOIN public.test_eligible_classes ec ON ec.test_id = t.id
      WHERE t.id = questions.test_id AND t.is_published = true
        AND ec.class = (SELECT p.class FROM public.profiles p WHERE p.user_id = auth.uid())
    )
  );

-- 7. sync_test_banner with eligible_classes
CREATE OR REPLACE FUNCTION public.sync_test_banner()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
DECLARE
  banner_title text;
  is_highlight boolean;
  meta jsonb;
  v_eligible text[];
BEGIN
  is_highlight := NEW.test_type IN ('sunday_special','weekly','surprise_quiz');
  IF NOT is_highlight OR NEW.is_published = false OR NEW.banner_image IS NULL
     OR (NEW.end_time IS NOT NULL AND NEW.end_time < now()) THEN
    DELETE FROM public.banners WHERE title = 'TEST_BANNER:' || NEW.id::text;
    RETURN NEW;
  END IF;
  banner_title := 'TEST_BANNER:' || NEW.id::text;
  SELECT array_agg(class) INTO v_eligible FROM public.test_eligible_classes WHERE test_id = NEW.id;
  IF v_eligible IS NULL OR array_length(v_eligible,1) IS NULL THEN
    v_eligible := ARRAY[NEW.class];
  END IF;
  meta := jsonb_build_object(
    'test_id', NEW.id, 'test_type', NEW.test_type, 'class', NEW.class,
    'class_group', NEW.class_group, 'eligible_classes', v_eligible,
    'subject', NEW.subject, 'duration_minutes', NEW.duration_minutes,
    'prize_pool', NEW.prize_pool, 'prize_type', NEW.prize_type,
    'prize_value', NEW.prize_value, 'prize_description', NEW.prize_description,
    'start_time', NEW.start_time, 'end_time', NEW.end_time, 'description', NEW.description
  );
  INSERT INTO public.banners (
    title, subtitle, description, image_url, target_class, eligible_classes,
    is_universal, is_active, priority, start_date, end_date, template, cta_link, cta_text
  ) VALUES (
    banner_title, NEW.title, meta::text, NEW.banner_image, NEW.class, v_eligible,
    false, true, 100, NEW.start_time, NEW.end_time, 'test_announcement',
    '/dashboard/tests/' || NEW.id::text, 'Attempt Test'
  )
  ON CONFLICT (title) WHERE (title LIKE 'TEST_BANNER:%') DO UPDATE SET
    subtitle = EXCLUDED.subtitle, description = EXCLUDED.description,
    image_url = EXCLUDED.image_url, target_class = EXCLUDED.target_class,
    eligible_classes = EXCLUDED.eligible_classes,
    start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date,
    cta_link = EXCLUDED.cta_link, is_active = true, updated_at = now();
  RETURN NEW;
END;
$fn$;

UPDATE public.banners b
SET eligible_classes = COALESCE(
  (SELECT array_agg(ec.class) FROM public.test_eligible_classes ec
     JOIN public.tests t ON t.id = ec.test_id
     WHERE 'TEST_BANNER:' || t.id::text = b.title),
  CASE WHEN b.target_class IS NOT NULL THEN ARRAY[b.target_class] ELSE NULL END
)
WHERE b.title LIKE 'TEST_BANNER:%';

-- 8. banners RLS
DROP POLICY IF EXISTS "Students can view relevant active banners" ON public.banners;
CREATE POLICY "Students can view relevant active banners"
  ON public.banners FOR SELECT
  USING (
    public.is_student_approved() AND is_active = true
    AND (end_date IS NULL OR end_date >= now())
    AND (template = 'test_announcement' OR start_date IS NULL OR start_date <= now())
    AND (
      is_universal = true
      OR (eligible_classes IS NOT NULL
          AND (SELECT p.class FROM public.profiles p WHERE p.user_id = auth.uid()) = ANY(eligible_classes))
      OR ((eligible_classes IS NULL OR array_length(eligible_classes,1) IS NULL)
          AND target_class = (SELECT p.class FROM public.profiles p WHERE p.user_id = auth.uid()))
    )
  );

-- 9. publish_test_winners
CREATE OR REPLACE FUNCTION public.publish_test_winners(p_test_id uuid, p_winners jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
DECLARE v_count int := 0; v_winner jsonb;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Only admins can publish winners'; END IF;
  DELETE FROM public.test_winners WHERE test_id = p_test_id;
  FOR v_winner IN SELECT * FROM jsonb_array_elements(COALESCE(p_winners,'[]'::jsonb)) LOOP
    INSERT INTO public.test_winners (
      test_id, user_id, full_name, score, time_seconds,
      rank, prize_text, category, auto_calculated
    )
    SELECT
      p_test_id, (v_winner->>'user_id')::uuid,
      COALESCE(v_winner->>'full_name', p.full_name, 'Student'),
      NULLIF(v_winner->>'score','')::int,
      NULLIF(v_winner->>'time_seconds','')::int,
      NULLIF(v_winner->>'rank','')::int,
      NULLIF(v_winner->>'prize_text',''),
      COALESCE(NULLIF(v_winner->>'category',''), 'top'),
      false
    FROM public.profiles p
    WHERE p.user_id = (v_winner->>'user_id')::uuid;
    v_count := v_count + 1;
  END LOOP;
  UPDATE public.tests SET results_published_at = now(), updated_at = now() WHERE id = p_test_id;
  RETURN jsonb_build_object('status','published','winners_count', v_count);
END;
$fn$;

-- 10. Drop and recreate get_recent_winners with category
DROP FUNCTION IF EXISTS public.get_recent_winners(integer);
CREATE OR REPLACE FUNCTION public.get_recent_winners(p_days integer DEFAULT 7)
RETURNS TABLE(
  test_id uuid, test_title text, test_class text, test_type text,
  results_published_at timestamptz, rank integer, user_id uuid,
  full_name text, score integer, prize_text text, category text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $fn$
  SELECT t.id, t.title, t.class, t.test_type::text, t.results_published_at,
    w.rank, w.user_id, w.full_name, w.score, w.prize_text, w.category
  FROM public.test_winners w
  JOIN public.tests t ON t.id = w.test_id
  WHERE t.results_published_at IS NOT NULL
    AND t.results_published_at >= now() - (p_days || ' days')::interval
  ORDER BY t.results_published_at DESC,
           CASE WHEN w.category = 'top' THEN 0 ELSE 1 END,
           w.rank ASC NULLS LAST;
$fn$;
