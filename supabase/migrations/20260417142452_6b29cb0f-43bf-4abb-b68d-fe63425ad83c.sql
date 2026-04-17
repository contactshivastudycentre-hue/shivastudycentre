-- 1. Add new profile fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS school_name TEXT,
  ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT false;

-- 2. Auto-approve all existing students (clean slate per user choice)
UPDATE public.profiles
SET status = 'approved',
    profile_completed = true
WHERE mobile <> '0000000000'
  AND lower(full_name) <> 'admin';

-- 3. Replace handle_new_user_admin trigger logic to also auto-create student profiles
CREATE OR REPLACE FUNCTION public.handle_new_user_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Admin auto-setup
  IF NEW.email = 'contact.shivastudycentre@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;

    INSERT INTO public.profiles (user_id, full_name, mobile, status, profile_completed)
    VALUES (NEW.id, 'Admin', '0000000000', 'approved', true)
    ON CONFLICT (user_id) DO UPDATE SET status = 'approved', profile_completed = true;
    RETURN NEW;
  END IF;

  -- Auto-create incomplete profile for every new student signup
  -- (no admin approval gate; status='approved' but profile_completed=false blocks content)
  INSERT INTO public.profiles (user_id, full_name, mobile, status, profile_completed)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''), 'Student'),
    COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'mobile'), ''), ''),
    'approved',
    false
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$function$;

-- Ensure trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_admin();

-- 4. New helper: can_access_content (approved + profile_completed)
CREATE OR REPLACE FUNCTION public.can_access_content(check_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = check_user_id
      AND status = 'approved'
      AND profile_completed = true
  )
$function$;

-- 5. Update is_student_approved to ALSO require profile_completed
--    (so all existing RLS policies block guests from content automatically)
CREATE OR REPLACE FUNCTION public.is_student_approved(check_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = check_user_id
      AND status = 'approved'
      AND profile_completed = true
  )
$function$;

-- 6. Allow students to update their own profile_completed and school_name
--    (existing UPDATE policy already allows owner update; ensure status can't be self-elevated)
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND status = (SELECT p.status FROM public.profiles p WHERE p.user_id = auth.uid())
  AND verified = (SELECT p.verified FROM public.profiles p WHERE p.user_id = auth.uid())
);

-- 7. Admin RPC to mark/unmark verified
CREATE OR REPLACE FUNCTION public.set_student_verified(target_user_id uuid, is_verified boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can verify students';
  END IF;

  UPDATE public.profiles
  SET verified = is_verified,
      updated_at = now()
  WHERE user_id = target_user_id;

  RETURN FOUND;
END;
$function$;

-- 8. Admin RPC to toggle leaderboard publish state (used by public leaderboard view)
CREATE OR REPLACE FUNCTION public.toggle_event_results_published(event_id uuid, publish boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can publish/unpublish results';
  END IF;

  UPDATE public.test_events
  SET results_approved = publish,
      updated_at = now()
  WHERE id = event_id;

  RETURN FOUND;
END;
$function$;