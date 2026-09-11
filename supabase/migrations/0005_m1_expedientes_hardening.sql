create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists persons_set_updated_at on public.persons;
create trigger persons_set_updated_at before update on public.persons for each row execute function public.set_updated_at();

drop trigger if exists readings_set_updated_at on public.readings;
create trigger readings_set_updated_at before update on public.readings for each row execute function public.set_updated_at();

create index if not exists persons_archived_at_idx on public.persons(archived_at);
create index if not exists readings_status_idx on public.readings(status);
create index if not exists readings_reading_date_idx on public.readings(reading_date desc);

drop policy if exists "readings_update_own" on public.readings;
create policy "readings_update_own" on public.readings
for update to authenticated
using (exists (select 1 from public.persons p where p.id = readings.person_id and p.owner_user_id = auth.uid()))
with check (exists (select 1 from public.persons p where p.id = readings.person_id and p.owner_user_id = auth.uid()));

create policy "readings_delete_own" on public.readings
for delete to authenticated
using (exists (select 1 from public.persons p where p.id = readings.person_id and p.owner_user_id = auth.uid()));

grant select, insert, update, delete on public.persons to authenticated;
grant select, insert, update, delete on public.readings to authenticated;
revoke all on public.persons from anon;
revoke all on public.readings from anon;
