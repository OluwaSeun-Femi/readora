create table authors (
id serial primary key,
name text not null unique -- the same author can't be added twice
);
create table books (
id serial primary key,
title text not null,
year integer,
author_id integer not null references authors (id)
);

create table members (
id serial primary key,
name text not null,
phone text
);
create table loans (
id serial primary key,
book_id integer not null references books (id) on delete cascade,
member_id integer not null references members (id),
borrowed_on date not null default current_date,
due_on date not null,
returned_on date -- empty (null) while the book is still out
);-- The database itself refuses a second open loan for the same book.
create unique index one_open_loan_per_book on loans (book_id) where 
returned_on is null;