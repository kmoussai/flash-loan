-- ============================================
-- Flash-Loan Database Schema Update
-- Creates accept_pay_sync_log table for tracking Accept Pay API sync operations
-- ============================================

-- 1️⃣ Create accept_pay_sync_log table
CREATE TABLE IF NOT EXISTS public.accept_pay_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  last_sync_at timestamptz NOT NULL DEFAULT now(),
  transactions_synced integer DEFAULT 0,
  errors jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- 2️⃣ Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_accept_pay_sync_log_last_sync_at 
  ON public.accept_pay_sync_log(last_sync_at DESC);

CREATE INDEX IF NOT EXISTS idx_accept_pay_sync_log_created_at 
  ON public.accept_pay_sync_log(created_at DESC);

-- 3️⃣ Enable Row Level Security
ALTER TABLE public.accept_pay_sync_log ENABLE ROW LEVEL SECURITY;

-- 4️⃣ Create RLS policies (admin and staff only)
DROP POLICY IF EXISTS "Staff can view sync logs" ON public.accept_pay_sync_log;
CREATE POLICY "Staff can view sync logs"
  ON public.accept_pay_sync_log
  FOR SELECT
  USING (public.is_staff());

DROP POLICY IF EXISTS "Staff can insert sync logs" ON public.accept_pay_sync_log;
CREATE POLICY "Staff can insert sync logs"
  ON public.accept_pay_sync_log
  FOR INSERT
  WITH CHECK (public.is_staff());

-- 5️⃣ Add comments for documentation
COMMENT ON TABLE public.accept_pay_sync_log IS
'Tracks Accept Pay API sync operations. Logs when transaction status updates are polled from Accept Pay Updates API.';

COMMENT ON COLUMN public.accept_pay_sync_log.last_sync_at IS
'Timestamp of the last sync operation (used as changedSince parameter for next sync)';

COMMENT ON COLUMN public.accept_pay_sync_log.transactions_synced IS
'Number of transactions synced in this sync operation';

COMMENT ON COLUMN public.accept_pay_sync_log.errors IS
'JSONB array of errors encountered during sync operation';

