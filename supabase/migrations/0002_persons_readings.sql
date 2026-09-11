create table public.persons (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  alias text not null check (char_length(alias) between 1 and 120),
  dominant_hand public.hand_side not null default 'unknown',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);
create table public.readings (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.persons(id) on delete cascade,
  mode public.reading_mode not null default 'complete',
  status public.reading_status not null default 'draft',
  reading_date timestamptz not null default now(),
  active_analysis_run_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);
create index persons_owner_user_id_idx on public.persons(owner_user_id);
create index readings_person_id_idx on public.readings(person_id);
