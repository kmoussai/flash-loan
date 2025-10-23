-- ============================================
-- Add Row Level Security and Permissions for Staff
-- Enables role-based access control for staff members
-- ============================================

-- 1️⃣ Enable RLS on users and staff tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

-- 2️⃣ Create helper function to check if user is admin
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

-- 3️⃣ Create helper function to check if user is staff (any role)
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

-- 4️⃣ Create helper function to get current staff role
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

-- ============================================
-- RLS POLICIES FOR PUBLIC.USERS TABLE (Clients)
-- ============================================

-- Users can view their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (
    auth.uid() = id
  );

-- Users can update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (
    auth.uid() = id
  );

-- Staff members (all roles) can view all users
DROP POLICY IF EXISTS "Staff can view all users" ON public.users;
CREATE POLICY "Staff can view all users" ON public.users
  FOR SELECT USING (
    public.is_staff()
  );

-- Admins can insert new users
DROP POLICY IF EXISTS "Admins can insert users" ON public.users;
CREATE POLICY "Admins can insert users" ON public.users
  FOR INSERT WITH CHECK (
    public.is_admin()
  );

-- Admins and support can update user profiles
DROP POLICY IF EXISTS "Admins and support can update users" ON public.users;
CREATE POLICY "Admins and support can update users" ON public.users
  FOR UPDATE USING (
    public.get_staff_role() IN ('admin', 'support')
  );

-- Only admins can delete users
DROP POLICY IF EXISTS "Admins can delete users" ON public.users;
CREATE POLICY "Admins can delete users" ON public.users
  FOR DELETE USING (
    public.is_admin()
  );

-- ============================================
-- RLS POLICIES FOR PUBLIC.STAFF TABLE
-- ============================================

-- All staff members can view their own profile
DROP POLICY IF EXISTS "Staff can view own profile" ON public.staff;
CREATE POLICY "Staff can view own profile" ON public.staff
  FOR SELECT USING (
    auth.uid() = id
  );

-- Admins can view all staff profiles
DROP POLICY IF EXISTS "Admins can view all staff" ON public.staff;
CREATE POLICY "Admins can view all staff" ON public.staff
  FOR SELECT USING (
    public.is_admin()
  );

-- Admins can insert new staff members
DROP POLICY IF EXISTS "Admins can insert staff" ON public.staff;
CREATE POLICY "Admins can insert staff" ON public.staff
  FOR INSERT WITH CHECK (
    public.is_admin()
  );

-- Admins can update staff profiles
DROP POLICY IF EXISTS "Admins can update staff" ON public.staff;
CREATE POLICY "Admins can update staff" ON public.staff
  FOR UPDATE USING (
    public.is_admin()
  );

-- Admins can delete staff members
DROP POLICY IF EXISTS "Admins can delete staff" ON public.staff;
CREATE POLICY "Admins can delete staff" ON public.staff
  FOR DELETE USING (
    public.is_admin()
  );

-- Support staff can view other staff (read-only)
DROP POLICY IF EXISTS "Support can view all staff" ON public.staff;
CREATE POLICY "Support can view all staff" ON public.staff
  FOR SELECT USING (
    public.get_staff_role() = 'support'
  );

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Grant execute permission on helper functions to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_staff_role() TO authenticated;

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON FUNCTION public.is_admin() IS 'Returns true if current user is an admin staff member';
COMMENT ON FUNCTION public.is_staff() IS 'Returns true if current user is any staff member';
COMMENT ON FUNCTION public.get_staff_role() IS 'Returns the role of the current staff user, or null if not staff';

-- ============================================
-- PERMISSION MATRIX
-- ============================================
-- 
-- PUBLIC.USERS (Clients):
-- ┌───────────┬────────┬────────┬────────┬────────┐
-- │   Role    │ SELECT │ INSERT │ UPDATE │ DELETE │
-- ├───────────┼────────┼────────┼────────┼────────┤
-- │ Client    │  Own   │   ❌   │  Own   │   ❌   │
-- │ Admin     │  All   │   ✅   │  All   │   ✅   │
-- │ Support   │  All   │   ❌   │  All   │   ❌   │
-- │ Intern    │  All   │   ❌   │   ❌   │   ❌   │
-- └───────────┴────────┴────────┴────────┴────────┘
--
-- PUBLIC.STAFF:
-- ┌───────────┬────────┬────────┬────────┬────────┐
-- │   Role    │ SELECT │ INSERT │ UPDATE │ DELETE │
-- ├───────────┼────────┼────────┼────────┼────────┤
-- │ Admin     │  All   │   ✅   │  All   │   ✅   │
-- │ Support   │  All   │   ❌   │   ❌   │   ❌   │
-- │ Intern    │  Own   │   ❌   │   ❌   │   ❌   │
-- └───────────┴────────┴────────┴────────┴────────┘
--

