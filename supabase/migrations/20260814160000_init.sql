-- Historial médico personal. Un usuario = un historial. Todo aislado por RLS.

create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text,
  body_area text,
  status text not null default 'activo' check (status in ('activo', 'seguimiento', 'resuelto')),
  started_on date,
  created_at timestamptz not null default now()
);

create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  topic_id uuid references public.topics (id) on delete set null,
  occurred_at timestamptz not null default now(),
  kind text not null default 'sintoma'
    check (kind in ('sintoma', 'dolor', 'sangrado', 'medicamento', 'animo', 'cita', 'examen', 'otro')),
  title text,
  note text,
  severity smallint check (severity between 0 and 10),
  created_at timestamptz not null default now()
);

create table if not exists public.medications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  topic_id uuid references public.topics (id) on delete set null,
  name text not null,
  dose text,
  frequency text,
  started_on date,
  ended_on date,
  effect text not null default 'sin_saber'
    check (effect in ('ayuda', 'ayuda_poco', 'no_ayuda', 'empeora', 'sin_saber')),
  side_effects text,
  prescribed_by text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  entry_id uuid not null references public.entries (id) on delete cascade,
  path text not null,
  mime text,
  size_bytes bigint,
  caption text,
  created_at timestamptz not null default now()
);

create index if not exists topics_user_idx on public.topics (user_id, status);
create index if not exists entries_user_time_idx on public.entries (user_id, occurred_at desc);
create index if not exists entries_topic_idx on public.entries (topic_id, occurred_at desc);
create index if not exists medications_user_idx on public.medications (user_id, created_at desc);
create index if not exists attachments_entry_idx on public.attachments (entry_id);

alter table public.topics enable row level security;
alter table public.entries enable row level security;
alter table public.medications enable row level security;
alter table public.attachments enable row level security;

-- Cada quien ve y escribe únicamente sus propias filas.
create policy "own topics" on public.topics
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own entries" on public.entries
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own medications" on public.medications
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own attachments" on public.attachments
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Bucket privado para fotos. Las rutas van bajo <user_id>/...
insert into storage.buckets (id, name, public, file_size_limit)
values ('adjuntos', 'adjuntos', false, 26214400)
on conflict (id) do nothing;

create policy "own files read" on storage.objects
  for select to authenticated
  using (bucket_id = 'adjuntos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own files insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'adjuntos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own files delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'adjuntos' and (storage.foldername(name))[1] = auth.uid()::text);
