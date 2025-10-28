# Modular IBV Implementation for Multiple Providers

## Overview

This implementation provides a flexible, provider-agnostic approach to handling Instant Bank Verification (IBV) across multiple providers (Flinks, Inverite, Plaid, and others).

## Database Schema Changes

### New Columns in `loan_applications` table:
- `ibv_provider` (enum): 'flinks', 'inverite', 'plaid', 'other'
- `ibv_status` (enum): 'pending', 'processing', 'verified', 'failed', 'cancelled', 'expired'
- `ibv_provider_data` (JSONB): Provider-specific data stored as JSON
- `ibv_verified_at` (timestamp): When verification was completed

### Provider-Specific Data Structures:

**Flinks:**
```json
{
  "flinks_login_id": "string",
  "flinks_request_id": "string",
  "flinks_institution": "string",
  "flinks_connected_at": "timestamp"
}
```

**Inverite:**
```json
{
  "session_id": "string",
  "applicant_id": "string",
  "request_guid": "string",
  "verified_at": "timestamp"
}
```

**Plaid:**
```json
{
  "item_id": "string",
  "request_id": "string",
  "institution": "string",
  "access_token": "string"
}
```

## Migration

Run the migration file:
```bash
supabase db push
# or
psql -h your-host -U postgres -d postgres -f supabase/migrations/20250128000000_add_modular_ provides
```

This migration:
1. Creates IBV provider and status enums
2. Adds new modular columns
3. Migrates existing Flinks data to the new schema
4. Creates indexes for performance
5. Adds helper functions

## Usage Example

### Updating an application with IBV data:

```typescript
import { createIbvProviderData, determineIbvStatus } from '@/src/lib/supabase'

// For Inverite
const ibvData = createIbvProviderData('inverite', {
  sessionId: 'inverite-12345',
  applicantId: 'applicant-67890',
  requestGuid: 'guid-abc123'
})

const status = determineIbvStatus('inverite', 'verified')

// Update the application
await supabase
  .from('loan_applications')
  .update({
    ibv_provider: 'inverite',
    ibv_status: status,
    ibv_provider_data: ibvData,
    ibv_verified_at: new Date().toISOString()
  })
  .eq('id', applicationId)
```

### Querying applications by provider:

```typescript
// Get all verified Inverite applications
const { data } = await supabase
  .from('loan_applications')
  .select('*')
  .eq('ibv_provider', 'inverite')
  .eq('ibv_status', 'verified')
```

## Helper Functions

### `createIbvProviderData(provider, data)`
Transforms provider-specific connection data into normalized IBV provider data.

### `getProviderSpecificData(provider, providerData)`
Extracts provider-specific data from the JSONB field.

### `determineIbvStatus(provider, verificationStatus)`
Maps provider-specific status strings to standardized IBV status.

### `isIbvDataComplete(provider, providerData)`
Checks if all required fields are present for a provider.

## Benefits

1. **Provider Flexibility**: Easy to add new IBV providers
2. **Data Consistency**: Standardized status across providers
3. **Backward Compatible**: Old Flinks columns retained
4. **Type Safety**: Full TypeScript support
5. **Query Performance**: Indexed for fast searches
6. **Extensible**: JSONB allows custom fields per provider

## Migration Path

The old Flinks-specific columns are still present for backward compatibility. A future cleanup migration can remove them after all applications are updated to use the new schema.

## Adding a New Provider

1. Add provider enum value: `CREATE TYPE public.ibv_provider AS ENUM ('new-provider')`
2. Define TypeScript interface in `types.ts`
3. Update `createIbvProviderData()` in `ibv-helpers.ts`
4. Update `isIbvDataComplete()` if needed

