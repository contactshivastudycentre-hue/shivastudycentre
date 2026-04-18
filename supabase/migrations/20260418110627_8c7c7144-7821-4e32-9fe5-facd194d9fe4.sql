
-- Speed up "any active attempt for this user" check
CREATE INDEX IF NOT EXISTS idx_test_attempts_user_open
  ON public.test_attempts (user_id)
  WHERE submitted_at IS NULL;

-- Hard DB-enforced session lock: only one open attempt at a time
CREATE OR REPLACE FUNCTION public.start_test_attempt_locked(p_test_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_existing public.test_attempts%ROWTYPE;
  v_blocking public.test_attempts%ROWTYPE;
  v_blocking_title text;
  v_new_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('status','error','code','not_authenticated');
  END IF;

  IF NOT public.is_student_approved(v_user_id) THEN
    RETURN jsonb_build_object('status','error','code','not_approved');
  END IF;

  -- Same-test attempt: resume or block if already submitted
  SELECT * INTO v_existing
  FROM public.test_attempts
  WHERE user_id = v_user_id AND test_id = p_test_id
  LIMIT 1;

  IF FOUND THEN
    IF v_existing.submitted_at IS NOT NULL THEN
      RETURN jsonb_build_object(
        'status','already_submitted',
        'attempt_id', v_existing.id
      );
    END IF;
    RETURN jsonb_build_object(
      'status','resumed',
      'attempt_id', v_existing.id
    );
  END IF;

  -- Hard lock: block if ANY other test is open
  SELECT ta.* INTO v_blocking
  FROM public.test_attempts ta
  WHERE ta.user_id = v_user_id
    AND ta.submitted_at IS NULL
    AND ta.test_id <> p_test_id
  LIMIT 1;

  IF FOUND THEN
    SELECT title INTO v_blocking_title FROM public.tests WHERE id = v_blocking.test_id;
    RETURN jsonb_build_object(
      'status','locked',
      'code','another_test_in_progress',
      'blocking_test_id', v_blocking.test_id,
      'blocking_attempt_id', v_blocking.id,
      'blocking_test_title', COALESCE(v_blocking_title, 'another test')
    );
  END IF;

  -- Create new attempt
  INSERT INTO public.test_attempts (user_id, test_id, answers)
  VALUES (v_user_id, p_test_id, '{}'::jsonb)
  RETURNING id INTO v_new_id;

  RETURN jsonb_build_object('status','started','attempt_id', v_new_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('status','error','code','exception','message', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_test_attempt_locked(uuid) TO authenticated;
