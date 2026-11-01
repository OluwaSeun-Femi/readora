-- Starter data for the Library Manager (see SPEC.md, "The tables").
-- Run once, after db/schema.sql, in the Supabase SQL Editor. Never run it twice.
-- Ids are never typed by hand: every foreign key is looked up by name with a join.

-- 5 authors
insert into authors (name) values
  ('Chinua Achebe'),
  ('Chimamanda Ngozi Adichie'),
  ('Wole Soyinka'),
  ('Buchi Emecheta'),
  ('Ben Okri');

-- 10 books: each author_id comes from joining on the author's name
insert into books (title, year, author_id)
select v.title, v.year, a.id
from (values
  ('Things Fall Apart',               1958, 'Chinua Achebe'),
  ('No Longer at Ease',               1960, 'Chinua Achebe'),
  ('Arrow of God',                    1964, 'Chinua Achebe'),
  ('Purple Hibiscus',                 2003, 'Chimamanda Ngozi Adichie'),
  ('Half of a Yellow Sun',            2006, 'Chimamanda Ngozi Adichie'),
  ('Death and the King''s Horseman',  1975, 'Wole Soyinka'),
  ('Aké: The Years of Childhood',     1981, 'Wole Soyinka'),
  ('Second-Class Citizen',            1974, 'Buchi Emecheta'),
  ('The Joys of Motherhood',          1979, 'Buchi Emecheta'),
  ('The Famished Road',               1991, 'Ben Okri')
) as v (title, year, author)
join authors a on a.name = v.author;

-- 5 members (phone is optional, so one has none)
insert into members (name, phone) values
  ('Adaeze Okafor',     '+234 803 555 0101'),
  ('Tunde Bakare',      '+234 805 555 0102'),
  ('Ngozi Eze',         '+234 807 555 0103'),
  ('Emeka Obi',         '+234 809 555 0104'),
  ('Funmilayo Adeyemi', null);

-- 3 loans: 2 still out (returned_on is null) and 1 returned.
-- book_id and member_id come from joining on title and member name.
-- Dates are relative to today, so the open loans are never overdue on demo day.
insert into loans (book_id, member_id, borrowed_on, due_on, returned_on)
select b.id, m.id, v.borrowed_on, v.borrowed_on + 14, v.returned_on
from (values
  ('Things Fall Apart',    'Adaeze Okafor', current_date - 3,  null::date),
  ('Half of a Yellow Sun', 'Tunde Bakare',  current_date - 5,  null::date),
  ('Purple Hibiscus',      'Ngozi Eze',     current_date - 30, current_date - 20)
) as v (title, member, borrowed_on, returned_on)
join books   b on b.title = v.title
join members m on m.name  = v.member;

-- Check (optional): every book with its author and who has it now.
-- select b.title, a.name as author, m.name as borrower, l.due_on
-- from books b
-- join authors a on a.id = b.author_id
-- left join loans l on l.book_id = b.id and l.returned_on is null
-- left join members m on m.id = l.member_id
-- order by b.title;
