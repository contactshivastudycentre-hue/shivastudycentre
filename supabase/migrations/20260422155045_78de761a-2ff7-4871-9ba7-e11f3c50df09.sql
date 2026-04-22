-- 1. Track when a test naturally ended
ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS ended_at timestamptz;

-- 2. Mark a test as ended (idempotent)
CREATE OR REPLACE FUNCTION public.mark_test_ended(p_test_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.tests
  SET ended_at = COALESCE(ended_at, now())
  WHERE id = p_test_id
    AND end_time IS NOT NULL
    AND end_time < now()
    AND ended_at IS NULL;
END;
$$;

-- 3. Updated publish_test_winners with banner auto-creation
CREATE OR REPLACE FUNCTION public.publish_test_winners(p_test_id uuid, p_winners jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int := 0;
  v_winner jsonb;
  v_test public.tests%ROWTYPE;
  v_eligible text[];
  v_banner_title text;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can publish winners';
  END IF;

  SELECT * INTO v_test FROM public.tests WHERE id = p_test_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Test not found';
  END IF;

  DELETE FROM public.test_winners WHERE test_id = p_test_id;

  FOR v_winner IN SELECT * FROM jsonb_array_elements(COALESCE(p_winners, '[]'::jsonb)) LOOP
    INSERT INTO public.test_winners (
      test_id, user_id, full_name, score, time_seconds,
      rank, prize_text, category, auto_calculated
    )
    SELECT
      p_test_id,
      (v_winner->>'user_id')::uuid,
      COALESCE(v_winner->>'full_name', p.full_name, 'Student'),
      NULLIF(v_winner->>'score', '')::int,
      NULLIF(v_winner->>'time_seconds', '')::int,
      NULLIF(v_winner->>'rank', '')::int,
      NULLIF(v_winner->>'prize_text', ''),
      COALESCE(NULLIF(v_winner->>'category', ''), 'top'),
      false
    FROM public.profiles p
    WHERE p.user_id = (v_winner->>'user_id')::uuid;
    v_count := v_count + 1;
  END LOOP;

  UPDATE public.tests
  SET results_published_at = now(), updated_at = now()
  WHERE id = p_test_id;

  -- Build eligible classes for the banner
  SELECT array_agg(class) INTO v_eligible
  FROM public.test_eligible_classes
  WHERE test_id = p_test_id;
  IF v_eligible IS NULL OR array_length(v_eligible, 1) IS NULL THEN
    v_eligible := ARRAY[v_test.class];
  END IF;

  v_banner_title := 'RESULTS_BANNER:' || p_test_id::text;

  -- Upsert results announcement banner (7 day window)
  DELETE FROM public.banners WHERE title = v_banner_title;
  INSERT INTO public.banners (
    title, subtitle, description, image_url, target_class, eligible_classes,
    is_universal, is_active, priority, start_date, end_date,
    template, cta_link, cta_text
  ) VALUES (
    v_banner_title,
    '🏆 ' || v_test.title || ' — Winners Announced!',
    jsonb_build_object('test_id', p_test_id, 'test_title', v_test.title)::text,
    v_test.banner_image,
    v_test.class,
    v_eligible,
    false,
    true,
    200,
    now(),
    now() + interval '7 days',
    'results_announcement',
    '/dashboard/tests/' || p_test_id::text || '/leaderboard',
    'View Winners'
  );

  RETURN jsonb_build_object('status', 'published', 'winners_count', v_count);
END;
$$;

-- 4. Realtime publication
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.test_winners;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tests;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

ALTER TABLE public.test_winners REPLICA IDENTITY FULL;
ALTER TABLE public.tests REPLICA IDENTITY FULL;