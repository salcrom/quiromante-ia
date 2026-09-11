create table public.reading_images (
  id uuid primary key default gen_random_uuid(),
  reading_id uuid not null references public.readings(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  hand_side public.hand_side not null,
  image_role text not null default 'palm' check (image_role in ('palm','thumb','edge','detail')),
  storage_path text not null unique,
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp','image/heic','image/heif')),
  byte_size bigint not null check (byte_size > 0 and byte_size <= 15728640),
  width integer,
  height integer,
  validation_status text not null default 'pending' check (validation_status in ('pending','accepted','rejected')),
  validation_notes text,
  created_at timestamptz not null default now()
);

create index reading_images_reading_id_idx on public.reading_images(reading_id);
create index reading_images_owner_user_id_idx on public.reading_images(owner_user_id);

alter table public.reading_images enable row level security;
create policy "reading_images_select_own" on public.reading_images for select using (auth.uid() = owner_user_id);
create policy "reading_images_insert_own" on public.reading_images for insert with check (
  auth.uid() = owner_user_id and exists (
    select 1 from public.readings r
    join public.persons p on p.id = r.person_id
    where r.id = reading_id and p.owner_user_id = auth.uid()
  )
);
create policy "reading_images_delete_own" on public.reading_images for delete using (auth.uid() = owner_user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('reading-images', 'reading-images', false, 15728640, array['image/jpeg','image/png','image/webp','image/heic','image/heif'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "reading_images_storage_insert_own" on storage.objects for insert to authenticated with check (
  bucket_id = 'reading-images' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "reading_images_storage_select_own" on storage.objects for select to authenticated using (
  bucket_id = 'reading-images' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "reading_images_storage_delete_own" on storage.objects for delete to authenticated using (
  bucket_id = 'reading-images' and (storage.foldername(name))[1] = auth.uid()::text
);
