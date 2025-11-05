-- Migration: Add IBV Results to loan_applications table
-- This adds a column to store IBV (Instant Bank Verification) results as JSON

-- Add IBV results column to loan_applications table
ALTER TABLE public.loan_applications 
ADD COLUMN IF NOT EXISTS ibv_results JSONB DEFAULT NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_loan_applications_ibv_results 
  ON public.loan_applications USING GIN (ibv_results);

-- Add comment to document the column
COMMENT ON COLUMN public.loan_applications.ibv_results IS 'IBV (Instant Bank Verification) results from Flinks as JSON data';

-- Create a function to extract specific IBV data for easier querying (optional)
CREATE OR REPLACE FUNCTION public.get_ibv_field(
  p_application_id UUID,
  p_field_path TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ibv_results JSONB;
  v_result JSONB;
BEGIN
  -- Get the IBV results JSON
  SELECT ibv_results INTO v_ibv_results
  FROM public.loan_applications
  WHERE id = p_application_id;

  -- If no results, return NULL
  IF v_ibv_results IS NULL THEN
    RETURN NULL;
  END IF;

  -- Use jsonb_path_query or -> operator to extract the field
  -- Example: get_ibv_field('123', 'accounts.balance')
  v_result := v_ibv_results #> string_to_array(p_field_path, '.')::TEXT[];

  RETURN v_result;
END;
$$;

-- Add comment to the function
COMMENT ON FUNCTION public.get_ibv_field(UUID, TEXT) IS 'Extract a specific field from IBV results JSON using dot notation (e.g., accounts.balance)';

