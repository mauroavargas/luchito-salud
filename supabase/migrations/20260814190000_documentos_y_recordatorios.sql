-- Archivo de documentos: radiografías, órdenes, fórmulas, resultados, incapacidades.
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  topic_id uuid references public.topics (id) on delete set null,
  title text not null,
  kind text not null default 'otro'
    check (kind in ('radiografia', 'examen', 'orden', 'formula', 'resultado', 'incapacidad', 'factura', 'otro')),
  doc_date date,
  path text not null,
  mime text,
  size_bytes bigint,
  notes text,
  created_at timestamptz not null default now()
);

-- Recordatorios: tomar, reclamar en la EPS, hacerse el examen, subir el resultado.
create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  topic_id uuid references public.topics (id) on delete set null,
  medication_id uuid references public.medications (id) on delete cascade,
  title text not null,
  kind text not null default 'otro'
    check (kind in ('tomar', 'reclamar', 'examen', 'documento', 'cita', 'otro')),
  due_on date,
  due_time text,
  repeat text not null default 'none' check (repeat in ('none', 'daily', 'weekly', 'monthly')),
  active boolean not null default true,
  last_done_on date,
  notes text,
  created_at timestamptz not null default now()
);

-- Historial de cumplimiento: sirve para decirle al médico "se la tomó 12 de 20 días".
create table if not exists public.reminder_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  reminder_id uuid not null references public.reminders (id) on delete cascade,
  done_on date not null,
  created_at timestamptz not null default now(),
  unique (reminder_id, done_on)
);

create index if not exists documents_user_idx on public.documents (user_id, doc_date desc);
create index if not exists reminders_user_idx on public.reminders (user_id, active, due_on);
create index if not exists reminder_logs_idx on public.reminder_logs (reminder_id, done_on desc);

alter table public.documents enable row level security;
alter table public.reminders enable row level security;
alter table public.reminder_logs enable row level security;

create policy "own documents" on public.documents
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own reminders" on public.reminders
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own reminder_logs" on public.reminder_logs
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
