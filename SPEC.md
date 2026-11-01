# SPEC: Library Manager

## Client brief

"I look after the lending library at our church. Right now everything is in an exercise book, and I can never tell which books are on the shelf. I want one page that lists every book with who wrote it, and shows whether it's on the shelf or who has it and when it's due back. I need to add new books, fix mistakes and remove books we've lost. I need to register members, lend a book to a member, and record when it comes back. My assistant uses a laptop and I use my phone, and we must both see the same thing. My nephew wants to build a WhatsApp bot later, so give him a link that returns the list of books as data. Send me the link."

Built: Sunday 1 November, 6pm–8pm, in your group repo. Delivered: a public link, tested live by the client at 7:25.

## Done means (the client's acceptance criteria)

- [ ] 1. I see every book with its author, and whether it's Available or On loan to (name), due (date).
- [ ] 2. I can add a book with a title, an author and a year. A new author is added once; typing an author we already have doesn't create a second one.
- [ ] 3. A book with no title or no author, or a year that isn't a real year, is not saved, and I'm told why.
- [ ] 4. I can fix a book's title, author or year, and delete a book. A book that's on loan can't be deleted until it comes back, and I'm told why.
- [ ] 5. I can add a member with a name and phone number. A member with no name is not saved, and I'm told why.
- [ ] 6. I can lend an available book to a member for 14 days, and record its return. A book that's already out can't be lent again.
- [ ] 7. What I add on my laptop is there on my phone, from the public link, and still there tomorrow.
- [ ] 8. /api/books on the live link returns every book, with its author and whether it's on loan, as JSON.

## What the client told us

| Question | Answer |
| --- | --- |
| Do we need to log in? | Not this week. |
| How many copies of each book? | One. If we get a second copy, add it as another book. |
| How long is a loan? | 14 days from the day it's lent. |
| Can a member borrow more than one book? | Yes. |
| What do you need to know about a member? | Name and phone number. The phone is optional. |
| Can we delete a book that's on loan? | No. Record the return first. |
| What happens to a book's loan history when it's deleted? | It goes with the book. That's fine. |
| Do you want to delete members? | Not this week. |
| Search? Overdue warnings? | Nice to have, not needed this week. |

## How we'll build it

- Next.js app in a folder called `library` in the group repo, styled with Tailwind. Two pages: Books (`/`) and Members (`/members`).
- Postgres in the group's own Supabase project. The connection string goes in `.env.local` as `DATABASE_URL` (Session pooler string) and in Vercel's environment variables. It never goes in Git.
- Plain SQL: the four tables are written as `create table` statements in `db/schema.sql`, and the starter data as `insert` statements in `db/seed.sql`. Both are committed to Git and run once in the group's Supabase SQL Editor. The app talks to Postgres with the `postgres` package: `db/index.ts` makes the connection, and every query in the app is written in SQL.
- Safe queries: every value goes into a query as a parameter, like `where id = ${id}`, so it's sent separately from the SQL. Never build SQL by joining strings, like `'where id = ' + id`.
- Server actions in `app/actions.ts` check everything the user typed before it touches the database: never trust input. The pages read the database on the server, inside `<Suspense>`.
- API: `app/api/books/route.ts` answers `GET /api/books` with JSON.

## The tables

| Table | Columns | Rules |
| --- | --- | --- |
| authors | id, name | Name required and unique |
| books | id, title, year, author_id | Title required; author_id must point at a real author |
| members | id, name, phone | Name required; phone optional |
| loans | id, book_id, member_id, borrowed_on, due_on, returned_on | book_id and member_id must be real; returned_on is empty while the book is out; a book can have only one loan with an empty returned_on |

A book is on loan when it has a loan with no returned_on. Deleting a book deletes its loans.

Starter data (seed): at least 5 authors (one of them Chinua Achebe), 10 books, 5 members and 2 books on loan.

## Features to build (in this order)

| # | Feature | Done when | Driver |
| --- | --- | --- | --- |
| 1 | Tables and starter data | `db/schema.sql` and `db/seed.sql` are in Git, and Supabase's Table Editor shows the 4 tables with the starter rows | Captain |
| 2 | Books list | Every book shows its author and "Available" or "On loan to (name), due (date)" | Captain |
| 3 | Add a book | A new book appears; empty title or author, or a bad year, shows a message; an existing author isn't duplicated | Captain |
| 4 | Edit and delete a book | A title can be fixed; a book can be deleted; a book on loan can't be, with a message | Captain |
| 5 | Members | The Members page lists members and adds one; an empty name shows a message | Captain |
| 6 | Lend and return | Lending shows "On loan to (name), due (date)"; returning shows "Available" again | Captain |
| 7 | Books API | `/api/books` returns every book as JSON | Captain |

The captain drives every feature, sharing their screen. The rest of the group reads the code with them, suggests the next step, and tests each feature before the captain merges its pull request. At 7:10, add `DATABASE_URL` to Vercel. At 7:15, stop adding features and deploy with `npx vercel --prod`.

## The client test (Sunday, 7:25, on the live link)

1. Open the live link. (Books with authors; at least two "On loan".)
2. Add a book with no title. (A message, not a saved book.)
3. Add "Anthills of the Savannah" by Chinua Achebe, 1987. (It appears; Chinua Achebe is still one author.)
4. Lend it to a member. ("On loan to (name), due (date 14 days away)".)
5. Try to delete it. (A message: it's on loan.)
6. Record the return, then fix the year to 1988, then delete it.
7. Add a member with no name (a message), then add "Bola Ade".
8. Open the link on a phone. (Bola Ade is there, and the books match the laptop.)
9. Open /api/books. (JSON with every book.)

## Not in scope this week

Logging in, deleting members, search, overdue warnings, more than one copy of a book.
