-- Create a trigger function to auto-assign admin role for specific email
CREATE OR REPLACE FUNCTION public.handle_new_user_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Auto-assign admin role for the specified admin email
  IF NEW.email = 'businesswithswarit1@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Also create an approved profile for admin
    INSERT INTO public.profiles (user_id, full_name, mobile, status)
    VALUES (NEW.id, 'Admin', '0000000000', 'approved')
    ON CONFLICT (user_id) DO UPDATE SET status = 'approved';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users for new signups
DROP TRIGGER IF EXISTS on_auth_user_created_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_admin();

-- Add unique constraint on profiles.user_id if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_user_id_key'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- Clean up any orphaned role entries (roles without valid users)
DELETE FROM public.user_roles WHERE user_id NOT IN (SELECT id FROM auth.users);