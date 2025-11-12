-- ============================================
-- Flash-Loan Database Schema Update
-- Creates reusable notifications system for clients and staff
-- ============================================

-- 1️⃣ Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  category text,
  metadata jsonb DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT notifications_recipient_check CHECK (
    (client_id IS NOT NULL AND staff_id IS NULL)
    OR (client_id IS NULL AND staff_id IS NOT NULL)
  )
);

COMMENT ON TABLE public.notifications IS
'Stores system notifications for both clients (public.users) and staff (public.staff). Exactly one recipient (client or staff) must be specified.';

COMMENT ON COLUMN public.notifications.category IS
'Optional categorization key for grouping notifications (e.g. loan_status, document_request).';

COMMENT ON COLUMN public.notifications.metadata IS
'Optional JSON payload with structured data to render contextual notifications.';

-- 2️⃣ Indexes to accelerate lookups
CREATE INDEX IF NOT EXISTS idx_notifications_client_id_created_at
  ON public.notifications (client_id, created_at DESC)
  WHERE client_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_staff_id_created_at
  ON public.notifications (staff_id, created_at DESC)
  WHERE staff_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON public.notifications (read_at)
  WHERE read_at IS NULL;

-- 3️⃣ Reuse updated_at trigger
DROP TRIGGER IF EXISTS update_notifications_updated_at ON public.notifications;
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 4️⃣ Enable Row Level Security (RLS)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 5️⃣ RLS Policies
DROP POLICY IF EXISTS "Clients can view own notifications" ON public.notifications;
CREATE POLICY "Clients can view own notifications" ON public.notifications
  FOR SELECT
  USING (client_id = auth.uid());

DROP POLICY IF EXISTS "Clients can update own notifications" ON public.notifications;
CREATE POLICY "Clients can update own notifications" ON public.notifications
  FOR UPDATE
  USING (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());

DROP POLICY IF EXISTS "Staff can view own notifications" ON public.notifications;
CREATE POLICY "Staff can view own notifications" ON public.notifications
  FOR SELECT
  USING (staff_id = auth.uid());

DROP POLICY IF EXISTS "Staff can update own notifications" ON public.notifications;
CREATE POLICY "Staff can update own notifications" ON public.notifications
  FOR UPDATE
  USING (staff_id = auth.uid())
  WITH CHECK (staff_id = auth.uid());


