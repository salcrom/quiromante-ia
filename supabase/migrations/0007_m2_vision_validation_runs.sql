create table public.image_validation_runs (
  id uuid primary key default gen_random_uuid(),
  reading_image_id uuid not null references public.reading_images(id) on delete cascade,
  reading_id uuid not null references public.readings(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  validator_kind text not null default 'anatomical_palm' check (validator_kind in ('anatomical_palm')),
  validator_version text not null default 'vision-palm-v1',
  status public.job_status not null default 'queued',
  request_payload jsonb not null default '{}'::jsonb,
  result_payload jsonb,
  error_summary text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index image_validation_runs_image_id_idx on public.image_validation_runs(reading_image_id);
create index image_validation_runs_reading_id_idx on public.image_validation_runs(reading_id);
create index image_validation_runs_owner_idx on public.image_validation_runs(owner_user_id);

alter table public.image_validation_runs enable row level security;

create policy "image_validation_runs_select_own"
on public.image_validation_runs for select
using (auth.uid() = owner_user_id);

create policy "image_validation_runs_insert_own"
on public.image_validation_runs for insert
with check (
  auth.uid() = owner_user_id and exists (
    select 1
    from public.reading_images i
    where i.id = reading_image_id
      and i.reading_id = reading_id
      and i.owner_user_id = auth.uid()
  )
);
