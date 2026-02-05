-- Fix permissive RLS policy (WITH CHECK true) on password_reset_requests

DROP POLICY IF EXISTS "Anyone can create reset requests" ON public.password_reset_requests;

CREATE POLICY "Anyone can create reset requests"
ON public.password_reset_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (
  (email IS NOT NULL AND length(trim(email)) > 0)
  OR
  (mobile IS NOT NULL AND length(trim(mobile)) > 0)
);
