create extension if not exists pgcrypto;
create type public.hand_side as enum ('left', 'right', 'unknown');
create type public.reading_status as enum ('draft','capturing','validating','ready','analyzing','review_required','completed','completed_with_limitations','failed','cancelled','archived');
create type public.reading_mode as enum ('quick','complete','technical','traditional','comparative');
create type public.image_type as enum ('palm','palm_macro','dorsal','thumb_side','fingers_nails','ulnar_edge','other');
create type public.detection_status as enum ('confirmed','probable','candidate','ambiguous','rejected','not_evaluable');
create type public.review_status as enum ('ai_detected','user_confirmed','user_rejected','review_pending','user_modified');
create type public.job_status as enum ('queued','running','completed','failed','cancelled');
