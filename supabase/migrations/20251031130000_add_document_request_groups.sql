-- Create table for grouping multiple document requests under a single request batch
create table if not exists public.document_request_groups (
  id uuid primary key default gen_random_uuid(),
  loan_application_id uuid not null references public.loan_applications(id) on delete cascade,
  expires_at timestamptz null,
  note text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add group_id to document_requests
alter table public.document_requests
  add column if not exists group_id uuid null references public.document_request_groups(id) on delete set null;

-- Simple backfill: create a group per existing request without a group and link it
do $$
declare r record; g_id uuid; begin
  for r in select id, loan_application_id, expires_at from public.document_requests where group_id is null loop
    insert into public.document_request_groups (loan_application_id, expires_at)
    values (r.loan_application_id, r.expires_at)
    returning id into g_id;
    update public.document_requests set group_id = g_id where id = r.id;
  end loop;
end $$;

-- Update timestamp trigger (optional) if you have one; else leave as-is


