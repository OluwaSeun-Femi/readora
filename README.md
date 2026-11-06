# Readora Library

A lending library app for the church: a public catalogue, a member area with reading streaks, and a librarian area to manage books, members and loans. Built with Next.js 16, Tailwind, Postgres on Supabase and plain SQL (see `SPEC.md`).

## Pages

| Page | Who it's for | What it does |
| --- | --- | --- |
| `/` | Everyone | The shelf (one spine per book, a gap when a book is out), search, filters and book details. Borrowers' names are never shown here. |
| `/me` | Members | Sign in with phone number and PIN. Borrow books yourself, see books at home with their due dates, mark how far you've read, stamp your reading card each day, see books you've read. |
| `/read/[bookId]` | Members | The e-reader: a borrowed e-book, one page at a time, with contents, text size and your page saved as you read. |
| `/admin` | Librarian | Today at a glance: counts, what's due back, recent returns, quick lend/add. |
| `/admin/books` | Librarian | Add, edit and delete books, lend and record returns, find front covers. |
| `/admin/books/[id]` | Librarian | Full-page editor for one book. |
| `/admin/loans` | Librarian | Out now, overdue and returned loans. |
| `/admin/members` | Librarian | Add and edit members, see who has what, give members a sign-in PIN. `/members` redirects here. |
| `/api/books` | The WhatsApp bot | Every book with its author and whether it's on loan, as JSON (no member names). |

## Set up the database (once per Supabase project)

In Supabase, open **SQL Editor** and run these files in order, once each:

1. `db/schema.sql`: the four tables.
2. `db/seed.sql`: starter books, authors, members and loans.
3. `db/002-members-reading.sql`: member PINs, reading progress, daily streaks and front covers. Safe to run again.
4. `db/003-ebooks.sql`: e-book pages, chapters and each reader's saved page. Safe to run again.

## Environment variables

Put these in `.env.local` for your laptop, and add them in Vercel (Project, Settings, Environment Variables) for the live site. Never commit them.

| Name | Needed | What it is |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Supabase **Session pooler** connection string (host ends in `pooler.supabase.com`). Use a password with letters and numbers only. |
| `ADMIN_PASSCODE` | Recommended | Locks the librarian pages behind this passcode. Without it they're open to anyone with the link, and the app shows a warning. |
| `SESSION_SECRET` | Optional | A long random string used to sign member sign-ins. If it's missing, the app signs with `DATABASE_URL` instead. |

## Run it on your laptop

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## How some things work

- **Front covers** come from [Open Library](https://openlibrary.org). A cover is looked up when a book is added. For books added before covers existed, press **Find covers** on the Books page. A book without a cover keeps its designed cloth cover, and you can switch any book back to the designed cover when you edit it.
- **Member sign-in**: on the Members page, press **Give a PIN** for a member who has a phone number. The 6-digit PIN is shown once; send it with **Send on WhatsApp**. Making a new PIN signs the member out everywhere.
- **Borrowing**: "Borrow this book" in the catalogue opens `/me?borrow=<id>`. The member signs in if needed, confirms, and gets the same 14-day loan the librarian would record. The database still refuses a second open loan for the same book.
- **E-books**: on the Books page, **Add e-books** searches Project Gutenberg's public-domain books (through [Gutendex](https://gutendex.com)) and adds one in a tap, with its cover and text. A book's text can also be uploaded as a .txt file on its edit page, for writing the church has the right to share. The text is split into fixed pages when it's saved, so a member's page number always points at the same words. E-books are lent one copy at a time, like paper books. A member can return an e-book themselves when they finish.
- **Themes**: the sun/moon button switches between light and dark. Until someone taps it, the site follows the device. The choice is saved in the browser and applied before the page draws, so there's no flash.
- **WhatsApp**: send a member their PIN, remind someone about a book that's due or overdue (the message button on Loans and the Overview), and share any book from the catalogue. Shared links open that book's details.
- **If changes don't show** in `npm run dev`, stop it, delete the `.next` folder and start it again.
- **Streaks**: a day counts when a member taps **I read today** or moves their progress slider. Days in a row make the streak.
- **Safe SQL**: every query is written with the `sql` tagged template in `db/`, and every value is a `${...}` parameter. Server actions in `app/actions.ts` check input before it touches the database, and every librarian action checks the passcode itself.
- **Fonts**: Literata and Atkinson Hyperlegible Next are bundled in `app/fonts` under the SIL Open Font License, so nothing loads from Google.
