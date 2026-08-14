-- Ficha básica del paciente: lo que todo médico pregunta al inicio de la cita.
create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  birth_date date,
  blood_type text,
  allergies text,
  conditions text,
  insurance text,
  emergency_contact text,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "own profile" on public.profiles
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Poder anotar preguntas para hacerle al médico y marcarlas cuando ya las resolvió.
alter table public.entries drop constraint if exists entries_kind_check;
alter table public.entries add constraint entries_kind_check
  check (kind in ('sintoma', 'dolor', 'sangrado', 'medicamento', 'animo', 'cita', 'examen', 'pregunta', 'otro'));

alter table public.entries add column if not exists resolved boolean not null default false;
