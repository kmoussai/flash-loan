-- ============================================
-- Payment Events Outbox Table
-- Stores payment domain events for reliable processing
-- ============================================

-- Create payment_event_status enum
DROP TYPE IF EXISTS public.payment_event_status CASCADE;
CREATE TYPE public.payment_event_status AS ENUM (
  'pending',
  'processed',
  'failed'
);

-- Create payment_events table
CREATE TABLE IF NOT EXISTS public.payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES public.loan_payments(id) ON DELETE CASCADE,
  type text NOT NULL,
  payload jsonb NOT NULL,
  status public.payment_event_status DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz,
  error_message text
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_payment_events_payment_id 
  ON public.payment_events(payment_id);

CREATE INDEX IF NOT EXISTS idx_payment_events_status 
  ON public.payment_events(status) 
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_payment_events_created_at 
  ON public.payment_events(created_at);

-- Enable RLS
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Staff can view all payment events
CREATE POLICY "Staff can view all payment events"
  ON public.payment_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff
      WHERE staff.id = auth.uid()
    )
  );

-- Staff can insert payment events (for system use)
CREATE POLICY "Staff can insert payment events"
  ON public.payment_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff
      WHERE staff.id = auth.uid()
    )
  );

-- Staff can update payment events (for processing)
CREATE POLICY "Staff can update payment events"
  ON public.payment_events
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff
      WHERE staff.id = auth.uid()
    )
  );

-- Comments
COMMENT ON TABLE public.payment_events IS 'Outbox table for payment domain events. Events are persisted here before being processed by side-effect handlers.';
COMMENT ON COLUMN public.payment_events.payment_id IS 'Reference to the payment that generated this event';
COMMENT ON COLUMN public.payment_events.type IS 'Event type (e.g., PaymentSucceeded, PaymentFailed)';
COMMENT ON COLUMN public.payment_events.payload IS 'Full event payload as JSONB';
COMMENT ON COLUMN public.payment_events.status IS 'Processing status: pending, processed, or failed';
COMMENT ON COLUMN public.payment_events.processed_at IS 'Timestamp when event was successfully processed';
COMMENT ON COLUMN public.payment_events.error_message IS 'Error message if processing failed';

