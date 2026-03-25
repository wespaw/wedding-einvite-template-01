create extension if not exists pgcrypto;

create table if not exists public.site_settings (
  id integer primary key default 1,
  couple_names text not null default 'Isabella & Adrian',
  hero_date_line text not null default 'Saturday, 15 August 2026 • 4:30 PM',
  hero_venue_line text not null default 'The Glasshouse at Seputeh • Kuala Lumpur',
  wedding_datetime timestamptz not null default '2026-08-15T16:30:00+08:00',
  story_kicker text not null default 'Our Story',
  story_title text not null default 'What began with one conversation became our forever.',
  story_paragraph_one text not null default 'We met on an ordinary evening that somehow felt different from the start. A long conversation stretched well past midnight, and what should have been a simple hello quietly became the beginning of everything.',
  story_paragraph_two text not null default 'Over time, that first spark grew into a love shaped by patience, laughter, and the kind of trust that makes even ordinary days feel beautiful.',
  story_quote text not null default '"Every chapter felt gentle, but every chapter led us here."',
  venue_name text not null default 'The Glasshouse at Seputeh',
  venue_address text not null default '86, Jalan Syed Putra, Taman Seputeh, 58000 Kuala Lumpur',
  map_embed_url text not null default 'https://www.google.com/maps?q=The%20Glasshouse%20at%20Seputeh%2C%20Kuala%20Lumpur&z=15&output=embed',
  map_link_url text not null default 'https://maps.google.com/?q=The%20Glasshouse%20at%20Seputeh%2C%20Kuala%20Lumpur',
  dress_code_title text not null default 'Formal Attire In Romantic Tones',
  dress_code_text text not null default 'Formal attire in romantic tones is warmly encouraged.',
  dress_code_palette jsonb not null default '[
    {"label":"Velvet Red","color":"#6f132b"},
    {"label":"Gold","color":"#d1ab70"},
    {"label":"Ivory","color":"#f2ddd7"},
    {"label":"Black Tie","color":"#2b2328"}
  ]'::jsonb,
  gallery jsonb not null default '[
    {"image_url":"https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=80","alt":"Romantic close-up of the couple holding hands"},
    {"image_url":"https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=900&q=80","alt":"Bride and groom in an elegant portrait"},
    {"image_url":"https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=900&q=80","alt":"Romantic wedding moment in soft evening light"}
  ]'::jsonb,
  timeline jsonb not null default '[
    {"time":"4:30","title":"Guest Arrival","description":"Champagne welcome and soft prelude music as the evening begins."},
    {"time":"5:00","title":"Ceremony","description":"A candlelit vow exchange beneath florals, glass, and velvet-red accents."},
    {"time":"6:00","title":"Reception Dinner","description":"Curated dining, toasts, and an elegant evening of celebration."},
    {"time":"8:30","title":"First Dance","description":"Music, dancing, and the final romantic chapter of the night."}
  ]'::jsonb,
  section_visibility jsonb not null default '{
    "story": true,
    "gallery": true,
    "venue": true,
    "timeline": true,
    "dress_code": true,
    "rsvp": true,
    "music": true
  }'::jsonb,
  updated_at timestamptz not null default now(),
  constraint site_settings_single_row check (id = 1)
);

alter table public.site_settings
add column if not exists background_music_url text not null default 'assets/yung-kai-blue.mp3';

alter table public.site_settings
add column if not exists section_visibility jsonb not null default '{
  "story": true,
  "gallery": true,
  "venue": true,
  "timeline": true,
  "dress_code": true,
  "rsvp": true,
  "music": true
}'::jsonb;

insert into public.site_settings (id)
values (1)
on conflict (id) do nothing;

create table if not exists public.rsvps (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  attendance text not null check (attendance in ('attending', 'declined')),
  guests integer not null default 1 check (guests >= 1 and guests <= 8),
  message text,
  created_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;
alter table public.rsvps enable row level security;

drop policy if exists "Public can read site settings" on public.site_settings;
create policy "Public can read site settings"
on public.site_settings
for select
to anon, authenticated
using (true);

drop policy if exists "Authenticated users can update site settings" on public.site_settings;
create policy "Authenticated users can update site settings"
on public.site_settings
for update
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated users can insert site settings" on public.site_settings;
create policy "Authenticated users can insert site settings"
on public.site_settings
for insert
to authenticated
with check (true);

drop policy if exists "Public can submit RSVPs" on public.rsvps;
create policy "Public can submit RSVPs"
on public.rsvps
for insert
to anon, authenticated
with check (true);

drop policy if exists "Authenticated users can read RSVPs" on public.rsvps;
create policy "Authenticated users can read RSVPs"
on public.rsvps
for select
to authenticated
using (true);

insert into storage.buckets (id, name, public)
values ('invitation-assets', 'invitation-assets', true)
on conflict (id) do nothing;

drop policy if exists "Public can read invitation assets" on storage.objects;
create policy "Public can read invitation assets"
on storage.objects
for select
to public
using (bucket_id = 'invitation-assets');

drop policy if exists "Authenticated users can upload invitation assets" on storage.objects;
create policy "Authenticated users can upload invitation assets"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'invitation-assets');

drop policy if exists "Authenticated users can update invitation assets" on storage.objects;
create policy "Authenticated users can update invitation assets"
on storage.objects
for update
to authenticated
using (bucket_id = 'invitation-assets')
with check (bucket_id = 'invitation-assets');

drop policy if exists "Authenticated users can delete invitation assets" on storage.objects;
create policy "Authenticated users can delete invitation assets"
on storage.objects
for delete
to authenticated
using (bucket_id = 'invitation-assets');
