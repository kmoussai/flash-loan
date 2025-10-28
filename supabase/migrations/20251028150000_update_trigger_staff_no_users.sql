-- Purpose: Do NOT insert staff into public.users; only into public.staff
-- Leaves client flow unchanged

create or replace function public.handle_new_auth_user()
returns trigger 
security definer
set search_path = public
language plpgsql
as $$
declare
  user_role public.staff_role;
begin
  if (NEW.raw_user_meta_data->>'signup_type') = 'staff' then
    -- derive staff role with safe fallback
    begin
      user_role := (NEW.raw_user_meta_data->>'role')::public.staff_role;
    exception when others then
      user_role := 'intern'::public.staff_role;
    end;

    -- insert only into staff; do NOT touch public.users for staff
    insert into public.staff (id, role, department)
    values (
      NEW.id,
      user_role,
      NEW.raw_user_meta_data->>'department'
    )
    on conflict (id) do update set
      role = excluded.role,
      department = excluded.department;

  else
    -- client user -> upsert into public.users (profile)
    insert into public.users (
      id,
      national_id,
      email,
      phone,
      first_name,
      last_name,
      preferred_language
    ) values (
      NEW.id,
      NEW.raw_user_meta_data->>'national_id',
      NEW.email,
      NEW.phone,
      NEW.raw_user_meta_data->>'first_name',
      NEW.raw_user_meta_data->>'last_name',
      NEW.raw_user_meta_data->>'preferred_language'
    ) on conflict (id) do update set
      national_id = coalesce(excluded.national_id, public.users.national_id),
      email = excluded.email,
      phone = excluded.phone,
      first_name = coalesce(excluded.first_name, public.users.first_name),
      last_name = coalesce(excluded.last_name, public.users.last_name),
      preferred_language = coalesce(excluded.preferred_language, public.users.preferred_language);
  end if;

  return NEW;
exception when others then
  raise warning 'Error in handle_new_auth_user trigger: %', SQLERRM;
  return NEW;
end;
$$;

-- Optional cleanup: remove any staff IDs from public.users if they were inserted previously
delete from public.users u
using public.staff s
where u.id = s.id;


