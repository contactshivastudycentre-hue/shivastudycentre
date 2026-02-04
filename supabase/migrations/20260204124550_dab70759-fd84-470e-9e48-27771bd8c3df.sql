-- Update the trigger function to use the new admin email
CREATE OR REPLACE FUNCTION public.handle_new_user_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Auto-assign admin role for the specified admin email
  IF NEW.email = 'contact.shivastudycentre@gmail.com' THEN
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