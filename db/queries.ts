import { sql } from "./index";

// Dates are returned as "YYYY-MM-DD" text and day counts are worked out by Postgres,
// so every screen shows the same day whatever its time zone.

export type BookRow = {
  id: number;
  title: string;
  year: number | null;
  author_id: number;
  author: string;
  cover_url: string | null;
  loan_id: number | null; // null means Available
  member_id: number | null;
  borrower: string | null;
  borrowed_on: string | null;
  due_on: string | null;
  days_left: number | null; // negative when overdue
};

/** Every book with its author, and who has it now (librarian view). */
export async function getBooks() {
  return sql<BookRow[]>`
    select b.id,
           b.title,
           b.year,
           b.author_id,
           a.name as author,
           b.cover_url,
           l.id as loan_id,
           m.id as member_id,
           m.name as borrower,
           to_char(l.borrowed_on, 'YYYY-MM-DD') as borrowed_on,
           to_char(l.due_on, 'YYYY-MM-DD') as due_on,
           l.due_on - current_date as days_left
    from books b
    join authors a on a.id = b.author_id
    left join loans l on l.book_id = b.id and l.returned_on is null
    left join members m on m.id = l.member_id
    order by lower(b.title), b.id
  `;
}

export type PublicBook = {
  id: number;
  title: string;
  year: number | null;
  author: string;
  cover_url: string | null;
  on_loan: boolean;
  due_on: string | null;
  overdue: boolean;
};

/** The public catalogue: the same join, but without members' names. */
export async function getPublicBooks() {
  return sql<PublicBook[]>`
    select b.id,
           b.title,
           b.year,
           a.name as author,
           b.cover_url,
           (l.id is not null) as on_loan,
           to_char(l.due_on, 'YYYY-MM-DD') as due_on,
           coalesce(l.due_on < current_date, false) as overdue
    from books b
    join authors a on a.id = b.author_id
    left join loans l on l.book_id = b.id and l.returned_on is null
    order by lower(b.title), b.id
  `;
}

export async function getBook(id: number) {
  const [book] = await sql<BookRow[]>`
    select b.id, b.title, b.year, b.author_id, a.name as author, b.cover_url,
           l.id as loan_id, m.id as member_id, m.name as borrower,
           to_char(l.borrowed_on, 'YYYY-MM-DD') as borrowed_on,
           to_char(l.due_on, 'YYYY-MM-DD') as due_on,
           l.due_on - current_date as days_left
    from books b
    join authors a on a.id = b.author_id
    left join loans l on l.book_id = b.id and l.returned_on is null
    left join members m on m.id = l.member_id
    where b.id = ${id}
  `;
  return book ?? null;
}

export async function getAuthorNames() {
  const rows = await sql<{ name: string }[]>`select name from authors order by lower(name)`;
  return rows.map((row) => row.name);
}

export type MemberLoan = {
  loan_id: number;
  book_id: number;
  title: string;
  due_on: string;
  days_left: number;
};

export type MemberRow = {
  id: number;
  name: string;
  phone: string | null;
  has_pin: boolean; // the PIN hash itself never leaves the server
  books_out: number;
  overdue: number;
  loans: MemberLoan[];
};

/** Every member with the books they have now. */
export async function getMembers() {
  return sql<MemberRow[]>`
    select m.id,
           m.name,
           m.phone,
           (m.pin_hash is not null) as has_pin,
           count(l.id)::int as books_out,
           (count(l.id) filter (where l.due_on < current_date))::int as overdue,
           coalesce(
             json_agg(
               json_build_object(
                 'loan_id', l.id,
                 'book_id', b.id,
                 'title', b.title,
                 'due_on', to_char(l.due_on, 'YYYY-MM-DD'),
                 'days_left', l.due_on - current_date
               ) order by l.due_on
             ) filter (where l.id is not null),
             '[]'
           ) as loans
    from members m
    left join loans l on l.member_id = m.id and l.returned_on is null
    left join books b on b.id = l.book_id
    group by m.id
    order by lower(m.name), m.id
  `;
}

export type LoanRow = {
  id: number;
  book_id: number;
  title: string;
  author: string;
  member_id: number;
  member: string;
  phone: string | null;
  borrowed_on: string;
  due_on: string;
  returned_on: string | null;
  days_left: number;
};

/** Open loans first (soonest due at the top), then recent returns. */
export async function getLoans() {
  return sql<LoanRow[]>`
    select l.id,
           l.book_id,
           b.title,
           a.name as author,
           l.member_id,
           m.name as member,
           m.phone,
           to_char(l.borrowed_on, 'YYYY-MM-DD') as borrowed_on,
           to_char(l.due_on, 'YYYY-MM-DD') as due_on,
           to_char(l.returned_on, 'YYYY-MM-DD') as returned_on,
           l.due_on - current_date as days_left
    from loans l
    join books b on b.id = l.book_id
    join authors a on a.id = b.author_id
    join members m on m.id = l.member_id
    order by (l.returned_on is null) desc,
             case when l.returned_on is null then l.due_on end asc,
             l.returned_on desc,
             l.id desc
    limit 500
  `;
}

export type Stats = {
  books: number;
  on_loan: number;
  overdue: number;
  members: number;
  today: string;
};

export async function getStats() {
  const [stats] = await sql<Stats[]>`
    select (select count(*) from books)::int as books,
           (select count(*) from loans where returned_on is null)::int as on_loan,
           (select count(*) from loans where returned_on is null and due_on < current_date)::int as overdue,
           (select count(*) from members)::int as members,
           to_char(current_date, 'YYYY-MM-DD') as today
  `;
  return stats;
}

export async function getToday() {
  const [row] = await sql<{ today: string }[]>`select to_char(current_date, 'YYYY-MM-DD') as today`;
  return row.today;
}

export async function countMissingCovers() {
  const [row] = await sql<{ n: number }[]>`select count(*)::int as n from books where cover_url is null`;
  return row.n;
}

/* ----------------------------------------------------------- member area */

export type ReaderLoan = {
  id: number;
  book_id: number;
  title: string;
  author: string;
  cover_url: string | null;
  borrowed_on: string;
  due_on: string;
  returned_on: string | null;
  days_left: number;
  progress: number;
};

export type Streak = {
  current: number; // consecutive days up to today (or yesterday, so it isn't lost before reading today)
  best: number;
  read_today: boolean;
  total_days: number;
  recent: string[]; // days read in the last 28 days
};

export async function getReaderLoans(memberId: number) {
  return sql<ReaderLoan[]>`
    select l.id, l.book_id, b.title, a.name as author, b.cover_url,
           to_char(l.borrowed_on, 'YYYY-MM-DD') as borrowed_on,
           to_char(l.due_on, 'YYYY-MM-DD') as due_on,
           to_char(l.returned_on, 'YYYY-MM-DD') as returned_on,
           l.due_on - current_date as days_left,
           l.progress
    from loans l
    join books b on b.id = l.book_id
    join authors a on a.id = b.author_id
    where l.member_id = ${memberId}
    order by (l.returned_on is null) desc, l.due_on asc, l.returned_on desc
  `;
}

/** Streaks: consecutive days share the same (day - row number), so each run is one group. */
export async function getStreak(memberId: number) {
  const [streak] = await sql<Streak[]>`
    with days as (
      select read_on from reading_days where member_id = ${memberId}
    ),
    runs as (
      select max(read_on) as end_on, count(*)::int as len
      from (
        select read_on, read_on - (row_number() over (order by read_on))::int as run
        from days
      ) numbered
      group by run
    )
    select
      coalesce((select len from runs where end_on >= current_date - 1 order by end_on desc limit 1), 0) as current,
      coalesce((select max(len) from runs), 0) as best,
      exists (select 1 from days where read_on = current_date) as read_today,
      (select count(*)::int from days) as total_days,
      coalesce(
        (select json_agg(to_char(read_on, 'YYYY-MM-DD') order by read_on) from days where read_on > current_date - 28),
        '[]'
      ) as recent
  `;
  return streak;
}
