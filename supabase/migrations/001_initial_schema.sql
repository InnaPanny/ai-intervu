create extension if not exists "pgcrypto";

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  industry text not null,
  role text not null,
  experience text not null,
  resume_text text,
  jd_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target_id uuid not null references public.targets(id) on delete cascade,
  text text not null,
  intent text not null,
  category text not null,
  reason text not null,
  focus text not null,
  is_core boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'completed', 'hidden')),
  hidden_from_status text check (hidden_from_status in ('pending', 'completed')),
  source text not null default 'generated' check (source in ('generated', 'review')),
  review_only boolean not null default false,
  draft_answer text,
  answer text,
  final_answer text,
  outline jsonb not null default '[]'::jsonb,
  keywords jsonb not null default '[]'::jsonb,
  rating text,
  dimensions jsonb not null default '[]'::jsonb,
  information_gaps jsonb not null default '[]'::jsonb,
  improvement text,
  hint_used boolean not null default false,
  last_practice_used_hint boolean not null default false,
  follow_up_count integer not null default 0,
  follow_ups_complete boolean not null default false,
  in_focus_practice boolean not null default false,
  focus_completed boolean not null default false,
  mastery text,
  training_mode text,
  next_review_date date,
  interval_excellent_streak integer not null default 0,
  last_interval_review_date date,
  review_count integer not null default 0,
  helpful boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (target_id, intent)
);

create table public.interview_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target_id uuid not null references public.targets(id) on delete cascade,
  role text not null,
  interview_date date not null,
  company text,
  industry text,
  status text not null default 'draft' check (status in ('draft', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.review_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  review_id uuid not null references public.interview_reviews(id) on delete cascade,
  text text not null,
  actual_answer text,
  reference_answer text,
  final_answer text,
  classification text not null default 'record' check (classification in ('record', 'pending', 'focus', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index targets_user_id_idx on public.targets(user_id);
create index questions_target_id_idx on public.questions(target_id);
create index questions_focus_review_idx on public.questions(target_id, in_focus_practice, next_review_date);
create index interview_reviews_target_date_idx on public.interview_reviews(target_id, interview_date desc);
create index review_questions_review_id_idx on public.review_questions(review_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger targets_set_updated_at before update on public.targets
for each row execute function public.set_updated_at();
create trigger questions_set_updated_at before update on public.questions
for each row execute function public.set_updated_at();
create trigger interview_reviews_set_updated_at before update on public.interview_reviews
for each row execute function public.set_updated_at();
create trigger review_questions_set_updated_at before update on public.review_questions
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.targets enable row level security;
alter table public.questions enable row level security;
alter table public.interview_reviews enable row level security;
alter table public.review_questions enable row level security;

create policy "users manage own profile" on public.profiles
for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "users manage own targets" on public.targets
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users manage own questions" on public.questions
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users manage own interview reviews" on public.interview_reviews
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users manage own review questions" on public.review_questions
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
