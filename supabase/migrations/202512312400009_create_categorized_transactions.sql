-- Create categorized_transactions table to store categorized bank transactions
-- This allows fast searching and filtering by category

CREATE TABLE IF NOT EXISTS public.categorized_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.loan_applications(id) ON DELETE CASCADE,
  account_index INTEGER NOT NULL DEFAULT 0,
  
  -- Transaction data
  description TEXT NOT NULL,
  transaction_date DATE NOT NULL,
  credit NUMERIC(10, 2),
  debit NUMERIC(10, 2),
  balance NUMERIC(10, 2),
  
  -- Categorization data
  detected_category TEXT NOT NULL,
  confidence NUMERIC(3, 2) NOT NULL DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
  
  -- Account info
  account_type TEXT,
  account_description TEXT,
  account_number TEXT,
  institution TEXT,
  
  -- Original category from provider (if available)
  original_category TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Indexes for fast searching
  CONSTRAINT unique_transaction UNIQUE (application_id, account_index, description, transaction_date, credit, debit)
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_categorized_transactions_application_id ON public.categorized_transactions(application_id);
CREATE INDEX IF NOT EXISTS idx_categorized_transactions_category ON public.categorized_transactions(detected_category);
CREATE INDEX IF NOT EXISTS idx_categorized_transactions_date ON public.categorized_transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_categorized_transactions_search ON public.categorized_transactions USING gin(to_tsvector('english', description));
CREATE INDEX IF NOT EXISTS idx_categorized_transactions_account_index ON public.categorized_transactions(application_id, account_index);

-- Enable RLS
ALTER TABLE public.categorized_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Admin and staff can view all, clients can view their own
CREATE POLICY "Admin and staff can view all categorized transactions"
  ON public.categorized_transactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.staff
      WHERE staff.id = auth.uid()
    )
  );

CREATE POLICY "Clients can view their own categorized transactions"
  ON public.categorized_transactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.loan_applications
      WHERE loan_applications.id = categorized_transactions.application_id
      AND loan_applications.client_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_categorized_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at
CREATE TRIGGER update_categorized_transactions_updated_at
  BEFORE UPDATE ON public.categorized_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_categorized_transactions_updated_at();

COMMENT ON TABLE public.categorized_transactions IS 'Stores categorized bank transactions for fast searching and filtering';
COMMENT ON COLUMN public.categorized_transactions.detected_category IS 'Category detected by categorization system: salary, employment_insurance, government_benefit, pension, loan_payment, loan_receipt, nsf_fee, overdraft_fee, bank_fee, transfer, other_income, other_expense, unknown';
COMMENT ON COLUMN public.categorized_transactions.confidence IS 'Confidence score (0-1) for the category detection';

