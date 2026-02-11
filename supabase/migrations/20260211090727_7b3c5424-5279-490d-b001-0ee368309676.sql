-- Add unique constraint on mobile in profiles table
ALTER TABLE public.profiles ADD CONSTRAINT profiles_mobile_unique UNIQUE (mobile);

-- Create DB function for admins to permanently delete a student
CREATE OR REPLACE FUNCTION public.delete_student(student_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can delete students';
  END IF;
  
  DELETE FROM public.test_attempts WHERE user_id = student_user_id;
  DELETE FROM public.video_comments WHERE user_id = student_user_id;
  DELETE FROM public.video_likes WHERE user_id = student_user_id;
  DELETE FROM public.profiles WHERE user_id = student_user_id;
  DELETE FROM public.user_roles WHERE user_id = student_user_id;
  DELETE FROM auth.users WHERE id = student_user_id;
  
  RETURN true;
END;
$$;