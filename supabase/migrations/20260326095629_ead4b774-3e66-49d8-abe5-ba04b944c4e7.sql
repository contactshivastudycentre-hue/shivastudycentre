-- Class change requests table for students and admins
CREATE TABLE IF NOT EXISTS public.class_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  current_class TEXT NOT NULL,
  requested_class TEXT NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_response TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT class_change_requests_status_check CHECK (status IN ('pending', 'approved', 'rejected'))
);

ALTER TABLE public.class_change_requests ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_class_change_requests_user_id
  ON public.class_change_requests(user_id);

CREATE INDEX IF NOT EXISTS idx_class_change_requests_status_created
  ON public.class_change_requests(status, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_class_change_requests_single_pending
  ON public.class_change_requests(user_id)
  WHERE status = 'pending';

DROP POLICY IF EXISTS "Students can create own class change requests" ON public.class_change_requests;
CREATE POLICY "Students can create own class change requests"
ON public.class_change_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Students can view own class change requests" ON public.class_change_requests;
CREATE POLICY "Students can view own class change requests"
ON public.class_change_requests
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all class change requests" ON public.class_change_requests;
CREATE POLICY "Admins can view all class change requests"
ON public.class_change_requests
FOR SELECT
TO authenticated
USING (is_admin());

DROP POLICY IF EXISTS "Admins can update class change requests" ON public.class_change_requests;
CREATE POLICY "Admins can update class change requests"
ON public.class_change_requests
FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can delete class change requests" ON public.class_change_requests;
CREATE POLICY "Admins can delete class change requests"
ON public.class_change_requests
FOR DELETE
TO authenticated
USING (is_admin());

DROP TRIGGER IF EXISTS trg_class_change_requests_updated_at ON public.class_change_requests;
CREATE TRIGGER trg_class_change_requests_updated_at
BEFORE UPDATE ON public.class_change_requests
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- One-click bulk class promotion utility for admins
CREATE OR REPLACE FUNCTION public.promote_students_class(
  from_class TEXT,
  to_class TEXT,
  include_pending BOOLEAN DEFAULT true
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_count INTEGER := 0;
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can promote classes';
  END IF;

  IF from_class IS NULL OR to_class IS NULL OR from_class = '' OR to_class = '' THEN
    RAISE EXCEPTION 'Both source and target classes are required';
  END IF;

  UPDATE public.profiles p
  SET class = to_class,
      updated_at = now()
  WHERE p.class = from_class
    AND p.mobile <> '0000000000'
    AND lower(p.full_name) <> 'admin'
    AND p.status <> 'inactive'
    AND (include_pending OR p.status = 'approved');

  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN affected_count;
END;
$$;

-- Admin utility to approve/reject class change requests atomically
CREATE OR REPLACE FUNCTION public.process_class_change_request(
  request_id UUID,
  next_status TEXT,
  admin_note TEXT DEFAULT NULL,
  override_class TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req public.class_change_requests%ROWTYPE;
  target_class TEXT;
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can process class change requests';
  END IF;

  IF next_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid status. Use approved or rejected.';
  END IF;

  SELECT * INTO req
  FROM public.class_change_requests
  WHERE id = request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  IF req.status <> 'pending' THEN
    RAISE EXCEPTION 'Only pending requests can be processed';
  END IF;

  IF next_status = 'approved' THEN
    target_class := COALESCE(override_class, req.requested_class);

    UPDATE public.profiles
    SET class = target_class,
        updated_at = now()
    WHERE user_id = req.user_id;
  END IF;

  UPDATE public.class_change_requests
  SET status = next_status,
      admin_response = admin_note,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
  WHERE id = request_id;

  RETURN true;
END;
$$;