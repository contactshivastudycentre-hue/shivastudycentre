CREATE OR REPLACE FUNCTION public.get_event_leaderboard(p_event_id uuid)
RETURNS TABLE (
  rank bigint,
  user_id uuid,
  full_name text,
  score integer,
  time_seconds integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_test_id uuid;
  v_approved boolean;
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  IF NOT (public.is_student_approved(auth.uid()) OR public.is_admin(auth.uid())) THEN RETURN; END IF;

  SELECT te.test_id, te.results_approved
  INTO v_test_id, v_approved
  FROM public.test_events te
  WHERE te.id = p_event_id;

  IF v_test_id IS NULL OR NOT v_approved THEN RETURN; END IF;

  RETURN QUERY
  SELECT
    ROW_NUMBER() OVER (
      ORDER BY COALESCE(ta.score, ta.mcq_score, 0) DESC,
               EXTRACT(EPOCH FROM (ta.submitted_at - ta.started_at))::int ASC
    ) AS rank,
    ta.user_id,
    COALESCE(p.full_name, 'Student')::text AS full_name,
    COALESCE(ta.score, ta.mcq_score, 0)::int AS score,
    EXTRACT(EPOCH FROM (ta.submitted_at - ta.started_at))::int AS time_seconds
  FROM public.test_attempts ta
  LEFT JOIN public.profiles p ON p.user_id = ta.user_id
  WHERE ta.test_id = v_test_id
    AND ta.submitted_at IS NOT NULL
    AND ta.is_banned = false
    AND COALESCE(p.full_name, '') NOT ILIKE 'admin%'
    AND COALESCE(p.mobile, '') <> '0000000000';
END;
$$;