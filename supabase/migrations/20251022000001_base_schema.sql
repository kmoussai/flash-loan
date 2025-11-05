-- ============================================
-- Flash-Loan Database Schema - Base Schema
-- Consolidated base schema without redundant operations
-- ============================================

-- 1️⃣ Create ENUMS first
DROP TYPE IF EXISTS public.staff_role CASCADE;
CREATE TYPE public.staff_role AS ENUM ('admin', 'support', 'intern');

DROP TYPE IF EXISTS public.loan_type CASCADE;
CREATE TYPE public.loan_type AS ENUM ('without-documents', 'with-documents');

DROP TYPE IF EXISTS public.application_status CASCADE;
CREATE TYPE public.application_status AS ENUM (
  'pending',           -- Application submitted
  'processing',        -- Being reviewed by staff
  'pre_approved',      -- Application approved, ready for contract generation
  'contract_pending',  -- Contract generated, awaiting signature
  'contract_signed',   -- Contract signed (but not yet approved/loan created)
  'approved',          -- Final state: Contract signed AND loan created
  'rejected',
  'cancelled'
);

DROP TYPE IF EXISTS public.income_source_type CASCADE;
CREATE TYPE public.income_source_type AS ENUM (
  'employed', 
  'employment-insurance', 
  'self-employed', 
  'csst-saaq', 
  'parental-insurance', 
  'retirement-plan'
);

-- 2️⃣ Create public.users table (clients)
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  
  -- Original fields
  kyc_status text DEFAULT 'pending',
  national_id text,
  
  -- Client profile fields
  first_name text,
  last_name text,
  date_of_birth date,
  phone text,
  email text,
  preferred_language text DEFAULT 'en',
  
  -- Address reference
  current_address_id uuid,
  
  -- Financial information (Quebec-specific)
  residence_status text,
  gross_salary numeric(10,2),
  rent_or_mortgage_cost numeric(10,2),
  heating_electricity_cost numeric(10,2),
  car_loan numeric(10,2),
  furniture_loan numeric(10,2),
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for users
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone);

-- 3️⃣ Create public.staff table (internal staff accounts)
CREATE TABLE IF NOT EXISTS public.staff (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  role public.staff_role NOT NULL DEFAULT 'intern',
  department text,
  created_at timestamptz DEFAULT now()
);

-- 4️⃣ Create trigger function to sync new auth users into app tables
-- Final version: Does NOT insert staff into public.users
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  user_role public.staff_role;
BEGIN
  IF (NEW.raw_user_meta_data->>'signup_type') = 'staff' THEN
    -- Safely cast role with fallback to 'intern'
    BEGIN
      user_role := (NEW.raw_user_meta_data->>'role')::public.staff_role;
    EXCEPTION WHEN OTHERS THEN
      user_role := 'intern'::public.staff_role;
    END;
    
    -- Insert only into staff; do NOT touch public.users for staff
    INSERT INTO public.staff (id, role, department)
    VALUES (
      NEW.id,
      user_role,
      NEW.raw_user_meta_data->>'department'
    )
    ON CONFLICT (id) DO UPDATE SET
      role = EXCLUDED.role,
      department = EXCLUDED.department;
  ELSE
    -- Client user -> upsert into public.users (profile)
    INSERT INTO public.users (
      id,
      national_id,
      email,
      phone,
      first_name,
      last_name,
      preferred_language
    ) VALUES (
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
  RAISE WARNING 'Error in handle_new_auth_user trigger: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- 5️⃣ Create trigger to automatically run after new user creation in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_auth_user();

-- 6️⃣ Create addresses table
CREATE TABLE IF NOT EXISTS public.addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  address_type text NOT NULL DEFAULT 'current',
  street_number text,
  street_name text,
  apartment_number text,
  city text NOT NULL,
  province text NOT NULL,
  postal_code text NOT NULL,
  moving_date date,
  is_current boolean DEFAULT true,
  verified_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT valid_address_type CHECK (address_type IN ('current', 'previous', 'mailing', 'work'))
);

-- Create indexes for addresses
CREATE INDEX IF NOT EXISTS idx_addresses_client_id ON public.addresses(client_id);
CREATE INDEX IF NOT EXISTS idx_addresses_is_current ON public.addresses(client_id, is_current);
CREATE INDEX IF NOT EXISTS idx_addresses_province ON public.addresses(province);

-- 7️⃣ Create loan_applications table (with all final columns, no Flinks-specific columns)
CREATE TABLE IF NOT EXISTS public.loan_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  address_id uuid REFERENCES public.addresses(id) ON DELETE SET NULL,
  
  -- Loan details
  loan_amount numeric(10,2) NOT NULL,
  loan_type public.loan_type NOT NULL,
  interest_rate numeric(5,2) DEFAULT 29.00,
  
  -- Income information
  income_source public.income_source_type NOT NULL,
  income_fields jsonb DEFAULT '{}',
  
  -- Application status
  application_status public.application_status DEFAULT 'pending',
  assigned_to uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  
  -- Pre-qualification
  bankruptcy_plan boolean DEFAULT false,
  
  -- Timestamp fields for tracking application lifecycle
  submitted_at timestamptz,
  approved_at timestamptz,
  rejected_at timestamptz,
  
  -- Contract-related timestamps
  contract_generated_at timestamptz,
  contract_sent_at timestamptz,
  contract_signed_at timestamptz,
  
  -- Staff notes and rejection reason
  staff_notes text,
  rejection_reason text,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT valid_loan_amount CHECK (loan_amount > 0 AND loan_amount <= 1500)
);

-- Create indexes for loan_applications
CREATE INDEX IF NOT EXISTS idx_loan_applications_client_id ON public.loan_applications(client_id);
CREATE INDEX IF NOT EXISTS idx_loan_applications_status ON public.loan_applications(application_status);
CREATE INDEX IF NOT EXISTS idx_loan_applications_assigned_to ON public.loan_applications(assigned_to);
CREATE INDEX IF NOT EXISTS idx_loan_applications_created_at ON public.loan_applications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_loan_applications_submitted_at ON public.loan_applications(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_loan_applications_interest_rate ON public.loan_applications(interest_rate);

-- 8️⃣ Create references table
CREATE TABLE IF NOT EXISTS public.references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_application_id uuid NOT NULL REFERENCES public.loan_applications(id) ON DELETE CASCADE,
  
  -- Reference details
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text NOT NULL,
  relationship text NOT NULL,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT valid_phone CHECK (phone ~ '^[0-9\+\-\(\) ]+$')
);

-- Create index for references
CREATE INDEX IF NOT EXISTS idx_references_loan_application_id ON public.references(loan_application_id);

-- 9️⃣ Add foreign key constraint for current_address_id (after addresses table exists)
ALTER TABLE public.users
DROP CONSTRAINT IF EXISTS fk_users_current_address,
ADD CONSTRAINT fk_users_current_address 
  FOREIGN KEY (current_address_id) 
  REFERENCES public.addresses(id) 
  ON DELETE SET NULL;

-- 🔟 Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1️⃣1️⃣ Create triggers for updated_at columns
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_addresses_updated_at ON public.addresses;
CREATE TRIGGER update_addresses_updated_at
  BEFORE UPDATE ON public.addresses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_loan_applications_updated_at ON public.loan_applications;
CREATE TRIGGER update_loan_applications_updated_at
  BEFORE UPDATE ON public.loan_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 1️⃣2️⃣ Create function to automatically set submitted_at and other timestamps
CREATE OR REPLACE FUNCTION public.set_submitted_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.application_status = 'pending' AND OLD.submitted_at IS NULL THEN
    NEW.submitted_at = now();
  END IF;
  
  IF NEW.application_status = 'pre_approved'::public.application_status AND OLD.approved_at IS NULL THEN
    NEW.approved_at = now();
  END IF;
  
  IF NEW.application_status = 'approved'::public.application_status 
     AND OLD.application_status != 'approved'::public.application_status 
     AND OLD.approved_at IS NULL THEN
    NEW.approved_at = now();
  END IF;
  
  IF NEW.application_status = 'rejected' AND OLD.rejected_at IS NULL THEN
    NEW.rejected_at = now();
  END IF;
  
  -- Set contract_generated_at when status changes to contract_pending
  IF NEW.application_status = 'contract_pending'::public.application_status 
     AND OLD.application_status != 'contract_pending'::public.application_status 
     AND NEW.contract_generated_at IS NULL THEN
    NEW.contract_generated_at = now();
  END IF;
  
  -- Set contract_signed_at when status changes to contract_signed or approved
  IF (NEW.application_status = 'contract_signed'::public.application_status 
      OR NEW.application_status = 'approved'::public.application_status)
     AND OLD.application_status NOT IN ('contract_signed'::public.application_status, 'approved'::public.application_status)
     AND NEW.contract_signed_at IS NULL THEN
    NEW.contract_signed_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for tracking status changes
DROP TRIGGER IF EXISTS track_application_status_changes ON public.loan_applications;
CREATE TRIGGER track_application_status_changes
  BEFORE UPDATE ON public.loan_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.set_submitted_at();

-- 1️⃣3️⃣ Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.references ENABLE ROW LEVEL SECURITY;

-- 1️⃣4️⃣ Create helper functions for RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.staff
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.staff
    WHERE id = auth.uid()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_staff_role()
RETURNS public.staff_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role public.staff_role;
BEGIN
  SELECT role INTO user_role
  FROM public.staff
  WHERE id = auth.uid();
  
  RETURN user_role;
END;
$$;

-- Grant execute permission on helper functions
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_staff_role() TO authenticated;

-- 1️⃣5️⃣ Create RLS Policies

-- Users: Clients can view/update own profile, staff can view all
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Staff can view all users" ON public.users;
CREATE POLICY "Staff can view all users" ON public.users
  FOR SELECT USING (public.is_staff());

DROP POLICY IF EXISTS "Admins can insert users" ON public.users;
CREATE POLICY "Admins can insert users" ON public.users
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins and support can update users" ON public.users;
CREATE POLICY "Admins and support can update users" ON public.users
  FOR UPDATE USING (public.get_staff_role() IN ('admin', 'support'));

DROP POLICY IF EXISTS "Admins can delete users" ON public.users;
CREATE POLICY "Admins can delete users" ON public.users
  FOR DELETE USING (public.is_admin());

-- Staff: All staff can view own profile, admins can manage all
DROP POLICY IF EXISTS "Staff can view own profile" ON public.staff;
CREATE POLICY "Staff can view own profile" ON public.staff
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all staff" ON public.staff;
CREATE POLICY "Admins can view all staff" ON public.staff
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert staff" ON public.staff;
CREATE POLICY "Admins can insert staff" ON public.staff
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update staff" ON public.staff;
CREATE POLICY "Admins can update staff" ON public.staff
  FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete staff" ON public.staff;
CREATE POLICY "Admins can delete staff" ON public.staff
  FOR DELETE USING (public.is_admin());

DROP POLICY IF EXISTS "Support can view all staff" ON public.staff;
CREATE POLICY "Support can view all staff" ON public.staff
  FOR SELECT USING (public.get_staff_role() = 'support');

-- Addresses: Clients can view their own, staff can view all
DROP POLICY IF EXISTS "Clients can view own addresses" ON public.addresses;
CREATE POLICY "Clients can view own addresses" ON public.addresses
  FOR SELECT USING (auth.uid() = client_id);

DROP POLICY IF EXISTS "Staff can view all addresses" ON public.addresses;
CREATE POLICY "Staff can view all addresses" ON public.addresses
  FOR SELECT USING (public.is_staff());

DROP POLICY IF EXISTS "Clients can insert own addresses" ON public.addresses;
CREATE POLICY "Clients can insert own addresses" ON public.addresses
  FOR INSERT WITH CHECK (auth.uid() = client_id);

DROP POLICY IF EXISTS "Staff can manage all addresses" ON public.addresses;
CREATE POLICY "Staff can manage all addresses" ON public.addresses
  FOR ALL USING (public.is_staff());

-- Loan Applications: Clients can view their own, staff can view all
DROP POLICY IF EXISTS "Clients can view own applications" ON public.loan_applications;
CREATE POLICY "Clients can view own applications" ON public.loan_applications
  FOR SELECT USING (auth.uid() = client_id);

DROP POLICY IF EXISTS "Staff can view all applications" ON public.loan_applications;
CREATE POLICY "Staff can view all applications" ON public.loan_applications
  FOR SELECT USING (public.is_staff());

DROP POLICY IF EXISTS "Clients can insert own applications" ON public.loan_applications;
CREATE POLICY "Clients can insert own applications" ON public.loan_applications
  FOR INSERT WITH CHECK (auth.uid() = client_id);

DROP POLICY IF EXISTS "Staff can manage all applications" ON public.loan_applications;
CREATE POLICY "Staff can manage all applications" ON public.loan_applications
  FOR ALL USING (public.is_staff());

-- References: Can be viewed by client who owns the application, or staff
DROP POLICY IF EXISTS "Application owners can view references" ON public.references;
CREATE POLICY "Application owners can view references" ON public.references
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.loan_applications 
      WHERE id = loan_application_id AND client_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Staff can view all references" ON public.references;
CREATE POLICY "Staff can view all references" ON public.references
  FOR SELECT USING (public.is_staff());

DROP POLICY IF EXISTS "Application owners can insert references" ON public.references;
CREATE POLICY "Application owners can insert references" ON public.references
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.loan_applications 
      WHERE id = loan_application_id AND client_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Staff can manage all references" ON public.references;
CREATE POLICY "Staff can manage all references" ON public.references
  FOR ALL USING (public.is_staff());

-- 1️⃣6️⃣ Create helper view for complete client profile with current address
CREATE OR REPLACE VIEW public.client_profiles AS
SELECT 
  u.id,
  u.first_name,
  u.last_name,
  u.email,
  u.phone,
  u.date_of_birth,
  u.preferred_language,
  u.kyc_status,
  u.residence_status,
  u.gross_salary,
  u.rent_or_mortgage_cost,
  u.heating_electricity_cost,
  u.car_loan,
  u.furniture_loan,
  a.id as address_id,
  a.street_number,
  a.street_name,
  a.apartment_number,
  a.city,
  a.province,
  a.postal_code,
  a.moving_date,
  u.created_at,
  u.updated_at
FROM public.users u
LEFT JOIN public.addresses a ON u.current_address_id = a.id
WHERE a.is_current = true OR a.id IS NULL;

-- Grant permissions on the view
GRANT SELECT ON public.client_profiles TO authenticated;

-- Comments for documentation
COMMENT ON TABLE public.addresses IS 'Stores client addresses with history tracking';
COMMENT ON TABLE public.loan_applications IS 'Tracks individual loan applications from clients';
COMMENT ON TABLE public.references IS 'Personal references provided for each loan application';
COMMENT ON COLUMN public.loan_applications.income_fields IS 'JSONB field storing dynamic income-related data based on income_source type.
Expected schemas:
- employed: {occupation, company_name, supervisor_name, work_phone, post, payroll_frequency, date_hired, next_pay_date}
- employment-insurance: {employment_insurance_start_date, next_deposit_date}
- self-employed: {paid_by_direct_deposit, self_employed_phone, deposits_frequency, self_employed_start_date, next_deposit_date}
- csst-saaq: {next_deposit_date}
- parental-insurance: {next_deposit_date}
- retirement-plan: {next_deposit_date}';
COMMENT ON COLUMN public.loan_applications.interest_rate IS 'Annual interest rate percentage for this loan application. Default: 29.00%. Can be adjusted before contract generation.';

