-- ==========================================================
-- Update notifications RLS policies to allow staff inserts
-- ==========================================================

DROP POLICY IF EXISTS "Staff can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Staff can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Clients can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Clients can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Staff can create notifications" ON public.notifications;

CREATE POLICY "Clients can view own notifications" ON public.notifications
  FOR SELECT
  USING (client_id = auth.uid());

CREATE POLICY "Clients can update own notifications" ON public.notifications
  FOR UPDATE
  USING (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "Staff can view own notifications" ON public.notifications
  FOR SELECT
  USING (staff_id = auth.uid());

CREATE POLICY "Staff can update own notifications" ON public.notifications
  FOR UPDATE
  USING (staff_id = auth.uid())
  WITH CHECK (staff_id = auth.uid());

CREATE POLICY "Staff can create notifications" ON public.notifications
  FOR INSERT
  WITH CHECK (public.is_staff());

