-- Update the handle_new_auth_user trigger to include first_name and last_name
-- This ensures first_name and last_name from user_metadata are automatically 
-- inserted into the users table for both staff and client users

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  user_role public.staff_role;
BEGIN
  -- Determine if the new user is a staff member or client
  IF (NEW.raw_user_meta_data->>'signup_type') = 'staff' THEN
    -- Safely cast role with fallback to 'intern'
    BEGIN
      user_role := (NEW.raw_user_meta_data->>'role')::public.staff_role;
    EXCEPTION WHEN OTHERS THEN
      user_role := 'intern'::public.staff_role;
    END;
    
    -- Insert into staff table
    INSERT INTO public.staff (id, role, department)
    VALUES (
      NEW.id, 
      user_role,
      NEW.raw_user_meta_data->>'department'
    );
    
    -- Insert into users table with first_name and last_name for staff
    INSERT INTO public.users (
      id, 
      email, 
      phone,
      first_name,
      last_name,
      preferred_language
    )
    VALUES (
      NEW.id,
      NEW.email,
      NEW.phone,
      NEW.raw_user_meta_data->>'first_name',
      NEW.raw_user_meta_data->>'last_name',
      NEW.raw_user_meta_data->>'preferred_language'
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      phone = EXCLUDED.phone,
      first_name = COALESCE(EXCLUDED.first_name, public.users.first_name),
      last_name = COALESCE(EXCLUDED.last_name, public.users.last_name),
      preferred_language = COALESCE(EXCLUDED.preferred_language, public.users.preferred_language);
      
  ELSE
    -- Client user
    INSERT INTO public.users (
      id, 
      national_id, 
      email, 
      phone,
      first_name,
      last_name,
      preferred_language
    )
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'national_id',
      NEW.email,
      NEW.phone,
      NEW.raw_user_meta_data->>'first_name',
      NEW.raw_user_meta_data->>'last_name',
      NEW.raw_user_meta_data->>'preferred_language'
    )
    ON CONFLICT (id) DO UPDATE SET
      national_id = COALESCE(EXCLUDED.national_id, public.users.national_id),
      email = EXCLUDED.email,
      phone = EXCLUDED.phone,
      first_name = COALESCE(EXCLUDED.first_name, public.users.first_name),
      last_name = COALESCE(EXCLUDED.last_name, public.users.last_name),
      preferred_language = COALESCE(EXCLUDED.preferred_language, public.users.preferred_language);
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the auth user creation
  RAISE WARNING 'Error in handle_new_auth_user trigger: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Trigger already exists from previous migration, no need to recreate it
-- The function update above will be used by the existing trigger

