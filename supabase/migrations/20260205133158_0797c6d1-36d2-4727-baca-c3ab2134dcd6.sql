-- Atomic test submit with explicit ACK
-- Performs row-level locking, prevents double submit, and returns a strict success payload

CREATE OR REPLACE FUNCTION public.submit_test_attempt(
  p_attempt_id uuid,
  p_answers jsonb,
  p_mcq_score integer,
  p_score integer,
  p_has_descriptive boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_row public.test_attempts%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'not_authenticated');
  END IF;

  -- Lock the attempt row to prevent concurrent submissions
  SELECT *
  INTO v_row
  FROM public.test_attempts
  WHERE id = p_attempt_id
    AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'attempt_not_found');
  END IF;

  -- If already submitted, return success ACK (idempotent)
  IF v_row.submitted_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'status', 'success',
      'attemptId', v_row.id,
      'resultStatus', COALESCE(v_row.evaluation_status, 'pending')
    );
  END IF;

  UPDATE public.test_attempts
  SET
    answers = COALESCE(p_answers, '{}'::jsonb),
    mcq_score = COALESCE(p_mcq_score, 0),
    score = CASE WHEN p_has_descriptive THEN NULL ELSE p_score END,
    evaluation_status = CASE WHEN p_has_descriptive THEN 'pending' ELSE 'completed' END,
    submitted_at = now()
  WHERE id = p_attempt_id
    AND user_id = v_user_id
    AND submitted_at IS NULL
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'status', 'success',
    'attemptId', v_row.id,
    'resultStatus', v_row.evaluation_status
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Never leave the client hanging; return explicit error
    RETURN jsonb_build_object('status', 'error', 'message', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_test_attempt(uuid, jsonb, integer, integer, boolean) TO authenticated;
