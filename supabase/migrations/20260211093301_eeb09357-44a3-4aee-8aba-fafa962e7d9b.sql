CREATE OR REPLACE FUNCTION public.get_email_by_user_id(target_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT email FROM auth.users WHERE id = target_user_id LIMIT 1;
$$;