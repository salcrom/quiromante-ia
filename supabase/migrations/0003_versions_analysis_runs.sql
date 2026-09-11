create table public.engine_versions (
  id uuid primary key default gen_random_uuid(), version text not null unique, vision_version text, interpretation_version text, report_version text, released_at timestamptz, notes text, active boolean not null default false, created_at timestamptz not null default now()
);
create table public.knowledge_versions (
  id uuid primary key default gen_random_uuid(), version text not null unique, description text, released_at timestamptz, active boolean not null default false, created_at timestamptz not null default now()
);
create table public.analysis_runs (
  id uuid primary key default gen_random_uuid(), reading_id uuid not null references public.readings(id) on delete cascade, engine_version_id uuid references public.engine_versions(id), knowledge_version_id uuid references public.knowledge_versions(id), prompt_version text not null default '1.0', model_metadata jsonb not null default '{}'::jsonb, status public.job_status not null default 'queued', started_at timestamptz, completed_at timestamptz, error_summary text, created_at timestamptz not null default now()
);
alter table public.readings add constraint readings_active_analysis_run_fk foreign key (active_analysis_run_id) references public.analysis_runs(id) on delete set null;
create index analysis_runs_reading_id_idx on public.analysis_runs(reading_id);
