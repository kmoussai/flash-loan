-- Create notification_events table for queuing notification events
-- This table stores events that need to be processed by background workers

CREATE TABLE IF NOT EXISTS public.notification_events (
  id TEXT PRIMARY KEY,
  event_data JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  error_message TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for efficient querying of pending events
CREATE INDEX IF NOT EXISTS idx_notification_events_status_created 
  ON public.notification_events(status, created_at) 
  WHERE status IN ('pending', 'processing');

-- Create index for querying by status and attempts
CREATE INDEX IF NOT EXISTS idx_notification_events_status_attempts 
  ON public.notification_events(status, attempts) 
  WHERE status = 'pending' AND attempts < max_attempts;

-- Enable RLS (Row Level Security)
ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can access (for background workers)
CREATE POLICY "Service role can manage notification events"
  ON public.notification_events
  FOR ALL
  USING (auth.role() = 'service_role');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notification_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER notification_events_updated_at
  BEFORE UPDATE ON public.notification_events
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_events_updated_at();

-- Comment on table
COMMENT ON TABLE public.notification_events IS 'Queue table for notification events that need to be processed by background workers';

