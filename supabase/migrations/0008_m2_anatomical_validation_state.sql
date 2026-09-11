alter table public.reading_images
  add column anatomical_validation_status text not null default 'pending'
    check (anatomical_validation_status in ('pending','running','accepted','rejected','failed')),
  add column anatomical_validation_result jsonb;

create index reading_images_anatomical_status_idx
  on public.reading_images(reading_id, anatomical_validation_status);
