alter table public.image_validation_runs
  add column if not exists attempt_count integer not null default 0 check (attempt_count >= 0),
  add column if not exists max_attempts integer not null default 3 check (max_attempts >= 1 and max_attempts <= 10),
  add column if not exists next_attempt_at timestamptz not null default now(),
  add column if not exists last_error_at timestamptz;

create index if not exists image_validation_runs_retry_queue_idx
  on public.image_validation_runs (status, next_attempt_at, created_at)
  where status = 'queued';
