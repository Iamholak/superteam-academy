-- Persist course completion certificates minted on Devnet
create table if not exists public.course_certificates (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  lesson_completion_id uuid references public.lesson_completions(id) on delete set null,
  wallet_address text not null,
  mint_address text not null unique,
  signature text not null,
  network text not null default 'devnet',
  metadata_uri text,
  issued_at timestamp with time zone default now(),
  unique(user_id, course_id)
);

alter table public.course_certificates enable row level security;

create policy "course_certificates_select_own"
  on public.course_certificates
  for select
  using (auth.uid() = user_id);

create policy "course_certificates_insert_own"
  on public.course_certificates
  for insert
  with check (auth.uid() = user_id);

create index if not exists idx_course_certificates_user_course
  on public.course_certificates(user_id, course_id);

create index if not exists idx_course_certificates_mint
  on public.course_certificates(mint_address);
