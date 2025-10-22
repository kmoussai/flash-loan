-- 1️⃣ Create staff_role ENUM first (drop if exists to avoid conflicts)
DROP TYPE IF EXISTS public.staff_role CASCADE;
CREATE TYPE public.staff_role AS ENUM ('admin', 'support', 'intern');

-- 2️⃣ Table for client users (loan applicants)
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  kyc_status text DEFAULT 'pending',
  national_id text,
  created_at timestamptz DEFAULT now()
);

-- 3️⃣ Table for internal staff accounts
CREATE TABLE IF NOT EXISTS public.staff (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  role public.staff_role NOT NULL DEFAULT 'intern',
  department text,
  created_at timestamptz DEFAULT now()
);

-- 4️⃣ Trigger function to sync new auth users into app tables
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
    
    INSERT INTO public.staff (id, role, department)
    VALUES (
      NEW.id, 
      user_role,
      NEW.raw_user_meta_data->>'department'
    );
  ELSE
    -- Client user
    INSERT INTO public.users (id, national_id)
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'national_id'
    );
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the auth user creation
  RAISE WARNING 'Error in handle_new_auth_user trigger: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- 5️⃣ Trigger to automatically run after new user creation in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_auth_user();
