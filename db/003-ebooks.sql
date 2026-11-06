-- Readora, step 3: e-books you can read page by page.
-- Run once in the Supabase SQL Editor, after 002-members-reading.sql.
-- Every statement checks first, so running it a second time changes nothing.

-- A book's text, already split into pages, so every reader sees the same page numbers.
create table if not exists book_pages (
  book_id integer not null references books (id) on delete cascade,
  page_no integer not null,
  body text not null,
  primary key (book_id, page_no)
);

-- Where each chapter starts, for the reader's contents list.
create table if not exists book_chapters (
  book_id integer not null references books (id) on delete cascade,
  page_no integer not null,
  title text not null,
  primary key (book_id, page_no)
);

-- How many pages the e-book has (0 = paper copy only), and where it came from.
alter table books add column if not exists page_count integer not null default 0;
alter table books add column if not exists ebook_source text;

-- The page a member is on in a borrowed e-book. Progress (0-100) is worked out from it.
alter table loans add column if not exists page integer not null default 1;
