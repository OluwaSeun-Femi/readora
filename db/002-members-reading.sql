-- Readora, step 2: member sign-in, reading progress, daily streaks and front covers.
-- Run once in the Supabase SQL Editor, after schema.sql and seed.sql.
-- Every statement checks first, so running it a second time changes nothing.

-- Members sign in with their phone number and a 6-digit PIN the librarian gives them.
-- Only a scrypt hash of the PIN is stored, never the PIN itself.
alter table members add column if not exists pin_hash text;

-- How far a member is through a borrowed book, from 0 to 100 percent.
alter table loans add column if not exists progress smallint not null default 0;
do $$
begin
  alter table loans add constraint loans_progress_range check (progress between 0 and 100);
exception when duplicate_object then null; -- already added
end $$;

-- One row per member per day they read. A streak is a run of consecutive days.
create table if not exists reading_days (
  member_id integer not null references members (id) on delete cascade,
  read_on date not null default current_date,
  primary key (member_id, read_on)
);

-- The front cover image. null = not looked up yet, '' = none found (the designed cover is used).
alter table books add column if not exists cover_url text;
