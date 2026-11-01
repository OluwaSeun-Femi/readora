import { sql } from "./index";

export type BookRow = {
  id: number;
  title: string;
  year: number | null;
  author: string;
  borrower: string | null; // null means Available
  due_on: string | null; // formatted in SQL, e.g. "12 Nov 2026"
};

// Every book with its author, and who has it now (if anyone).
// The left joins keep books with no open loan; for those, borrower is null.
// due_on is formatted by Postgres so the day never shifts with the server's time zone.
export async function getBooks() {
  return sql<BookRow[]>`
    select b.id,
           b.title,
           b.year,
           a.name as author,
           m.name as borrower,
           to_char(l.due_on, 'FMDD Mon YYYY') as due_on
    from books b
    join authors a on a.id = b.author_id
    left join loans l on l.book_id = b.id and l.returned_on is null
    left join members m on m.id = l.member_id
    order by b.title
  `;
}
