create extension if not exists pgcrypto;
create table audiences (
  id uuid primary key default gen_random_uuid(),
  label text unique not null, year text not null, branch text not null,
  division text not null, size int not null default 60, telegram_chat_id text
);
create table calendar_events (
  id uuid primary key default gen_random_uuid(),
  title text not null, starts_at timestamptz not null, ends_at timestamptz,
  audience_label text not null, source text not null default 'seed', run_id uuid
);
create table runs (
  id uuid primary key default gen_random_uuid(), created_at timestamptz default now(),
  input_type text not null, source_name text, input_text text,
  status text not null default 'running', result jsonb, duration_ms int
);
create table run_steps (
  id bigserial primary key, run_id uuid references runs(id) on delete cascade,
  seq int not null, step text not null, status text not null,
  input text, output text, detail jsonb, tier text, model text, ms int,
  at timestamptz default now()
);
create table deliveries (
  id bigserial primary key, run_id uuid references runs(id) on delete cascade,
  audience_label text, channel text not null, status text not null,
  payload jsonb, sent_at timestamptz default now()
);
create table reminders (
  id bigserial primary key, run_id uuid references runs(id) on delete cascade,
  audience_label text, message text not null, due_at timestamptz not null, sent_at timestamptz
);
alter table audiences enable row level security;
alter table calendar_events enable row level security;
alter table runs enable row level security;
alter table run_steps enable row level security;
alter table deliveries enable row level security;
alter table reminders enable row level security;
-- no policies: only the server (service role) touches these tables
