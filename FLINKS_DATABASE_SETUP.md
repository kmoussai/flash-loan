# Flinks Connection Database Setup

This document describes the database changes needed to support Flinks Connect integration.

## Migration File

**File**: `supabase/migrations/20250126000000_add_flinks_connection_fields.sql`

## Database Changes

### New Columns Added to `loan_applications` Table

| Column | Type | Description |
|--------|------|-------------|
| `flinks_login_id` | VARCHAR(255) | Unique identifier from Flinks Connect for the bank connection |
| `flinks_request_id` | VARCHAR(255) | Unique identifier from Flinks Connect for the verification request |
| `flinks_verification_status` | VARCHAR(50) | Status of Flinks verification: `pending`, `verified`, `failed`, `cancelled` |
| `flinks_connected_at` | TIMESTAMP | Timestamp when Flinks connection was established |

### Indexes Created

```sql
CREATE INDEX idx_loan_applications_flinks_login_id 
  ON public.loan_applications(flinks_login_id);

CREATE INDEX idx_loan_applications_flinks_request_id 
  ON public.loan_applications(flinks_request_id);

CREATE INDEX idx_loan_applications_flinks_verification_status 
  ON public.loan_applications(flinks_verification_status);
```


## Applying the Migration

### Option 1: Using Supabase CLI

```bash
cd /path/to/your/project
supabase db push
```

### Option 2: Using Supabase Dashboard

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy and paste the migration file contents
4. Run the SQL

### Option 3: Direct Database Connection

```bash
psql -h your-db-host -U postgres -d postgres -f supabase/migrations/20250126000000_add_flinks_connection_fields.sql
```

## API Changes

### Updated Type Definition

The `LoanApplicationRequestBody` interface in `src/app/api/loan-application/route.ts` now includes:

```typescript
interface LoanApplicationRequestBody {
  // ... existing fields ...
  
  // Flinks Connection Data (optional)
  flinksLoginId?: string
  flinksRequestId?: string
  flinksVerificationStatus?: string
}
```

### How Data Is Stored

1. **Loan application is created** using the existing `submit_loan_application` function
2. **If Flinks data is provided**, the API updates the application with:
   - `flinks_login_id`
   - `flinks_request_id`
   - `flinks_verification_status`
   - `flinks_connected_at` (automatic timestamp)

### Error Handling

- If Flinks data update fails, the loan application still succeeds
- Error is logged but doesn't block the main transaction
- This ensures users can submit applications even if Flinks update fails

## Usage Example

### Frontend (apply1/page.tsx)

```typescript
// When Flinks connection succeeds
const handleFlinksSuccess = (data) => {
  setFlinksConnection({
    loginId: data.loginId,
    requestId: data.requestId
  })
}

// When submitting application
const response = await fetch('/api/loan-application', {
  method: 'POST',
  body: JSON.stringify({
    // ... form data ...
    flinksLoginId: flinksConnection?.loginId,
    flinksRequestId: flinksConnection?.requestId,
    flinksVerificationStatus: ibvVerified ? 'verified' : 'pending'
  })
})
```

### Backend (route.ts)

```typescript
// The API automatically updates the application with Flinks data
if (body.flinksLoginId) {
  await supabase
    .from('loan_applications')
    .update({
      flinks_login_id: body.flinksLoginId,
      flinks_request_id: body.flinksRequestId,
      flinks_verification_status: body.flinksVerificationStatus,
      flinks_connected_at: new Date().toISOString()
    })
    .eq('id', txResult.application_id)
}
```

## Querying Flinks Data

### Get All Verified Applications with Flinks

```typescript
const { data } = await supabase
  .from('loan_applications')
  .select('*')
  .eq('flinks_verification_status', 'verified')
```

### Get Application by Flinks loginId

```typescript
const { data } = await supabase
  .from('loan_applications')
  .select('*')
  .eq('flinks_login_id', loginId)
  .single()
```

### Check Verification Status

```typescript
const { data } = await supabase
  .from('loan_applications')
  .select('flinks_verification_status')
  .eq('id', applicationId)
  .single()

// Status values: 'pending', 'verified', 'failed', 'cancelled'
```

## Benefits

1. **Track Flinks Connections**: Store and retrieve which applications have Flinks verification
2. **Query by loginId**: Find applications by their Flinks connection ID
3. **Status Tracking**: Monitor verification status over time
4. **Audit Trail**: Timestamp of when connections were established
5. **Integration Ready**: Prepared for background Flinks data fetching

## Next Steps

1. Run the migration to add Flinks fields
2. Test the loan application submission with Flinks data
3. Implement background Flinks data fetching using the stored `loginId`
4. Add admin dashboard features to view Flinks connections
5. Set up monitoring for Flinks verification success rates

## Testing

To test the Flinks connection storage:

1. Submit a loan application through `/apply1`
2. Complete Flinks verification
3. Check database for new Flinks fields
4. Verify data is stored correctly

```sql
SELECT 
  id,
  first_name,
  last_name,
  flinks_login_id,
  flinks_request_id,
  flinks_verification_status,
  flinks_connected_at
FROM loan_applications
WHERE flinks_login_id IS NOT NULL;
```
