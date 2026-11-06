"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sql } from "@/db";
import { isAdmin } from "@/lib/admin-auth";
import { ADMIN_COOKIE, adminToken, safeEqual } from "@/lib/admin-token";
import { findCoverUrl } from "@/lib/cover-lookup";
import { downloadText, getGutenbergBook, searchGutenberg, type GutenbergBook } from "@/lib/gutenberg";
import { paginate } from "@/lib/paginate";
import { getChapters, getPages, getReaderBook, gutenbergIdsInLibrary } from "@/db/queries";
import {
  MEMBER_COOKIE,
  currentMember,
  hashPin,
  newPin,
  phoneKey,
  sessionValue,
  verifyPin,
} from "@/lib/member-auth";
import type { ActionResult } from "@/lib/types";
import type { TransactionSql } from "postgres";

// Every action checks what was typed before it touches the database (never trust input),
// and every value goes into SQL as a ${...} parameter.

const SIGNED_OUT: ActionResult = {
  ok: false,
  message: "Your librarian session has ended. Sign in again to make changes.",
};

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim().replace(/\s+/g, " ");
}

function refresh() {
  // Refresh every page that shows books, members or loans.
  revalidatePath("/", "layout");
}

function isPgError(error: unknown, code: string) {
  return typeof error === "object" && error !== null && (error as { code?: string }).code === code;
}

function toId(value: unknown) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/* ------------------------------------------------------------------ books */

type BookInput =
  | { ok: true; title: string; author: string; year: number | null; fields: Record<string, string> }
  | ActionResult;

function readBook(formData: FormData): BookInput {
  const title = text(formData, "title");
  const author = text(formData, "author");
  const yearText = text(formData, "year");
  const fields = { title, author, year: yearText };

  if (!title) return { ok: false, message: "Enter the book's title.", field: "title", fields };
  if (!author) return { ok: false, message: "Enter the author's name.", field: "author", fields };
  if (title.length > 200) return { ok: false, message: "That title is too long.", field: "title", fields };
  if (author.length > 100) return { ok: false, message: "That name is too long.", field: "author", fields };

  const thisYear = new Date().getFullYear();
  let year: number | null = null; // the year is optional
  if (yearText) {
    year = /^\d+$/.test(yearText) ? Number(yearText) : NaN;
    if (!Number.isInteger(year) || year < 1450 || year > thisYear) {
      return {
        ok: false,
        message: `The year must be a whole number between 1450 and ${thisYear}.`,
        field: "year",
        fields,
      };
    }
  }
  return { ok: true, title, author, year, fields };
}

/** Finds the author by name (ignoring capitals) or adds them once. */
async function authorId(name: string) {
  return authorIdIn(sql, name);
}

async function authorIdIn(db: typeof sql | TransactionSql, name: string) {
  const [found] = await db<{ id: number }[]>`
    select id from authors where lower(name) = lower(${name})
  `;
  if (found) return found.id;
  const [added] = await db<{ id: number }[]>`
    insert into authors (name) values (${name})
    on conflict (name) do update set name = excluded.name
    returning id
  `;
  return added.id;
}

export async function addBook(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  if (!(await isAdmin())) return SIGNED_OUT;
  const input = readBook(formData);
  if (!("title" in input)) return input;

  try {
    const author = await authorId(input.author);
    // Look for a front cover while saving. If Open Library is slow, the designed cover is used for now.
    const cover = await findCoverUrl(input.title, input.author, 4000);
    await sql`
      insert into books (title, year, author_id, cover_url)
      values (${input.title}, ${input.year}, ${author}, ${cover})
    `;
  } catch (error) {
    console.error("addBook failed", error);
    return { ok: false, message: "The book wasn't saved. Check your connection and try again.", fields: input.fields };
  }

  refresh();
  return { ok: true, message: `Added "${input.title}".`, data: { title: input.title } };
}

export async function updateBook(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  if (!(await isAdmin())) return SIGNED_OUT;
  const id = toId(formData.get("id"));
  if (!id) return { ok: false, message: "That book couldn't be found." };
  const input = readBook(formData);
  if (!("title" in input)) return input;

  // cover: "keep" leaves it, "lookup" searches again, "none" uses the designed cover.
  const coverChoice = String(formData.get("cover") ?? "keep");

  try {
    const [before] = await sql<{ title: string; author: string }[]>`
      select b.title, a.name as author from books b join authors a on a.id = b.author_id where b.id = ${id}
    `;
    if (!before) return { ok: false, message: "That book has already been deleted." };
    const renamed =
      before.title.toLowerCase() !== input.title.toLowerCase() || before.author.toLowerCase() !== input.author.toLowerCase();

    const author = await authorId(input.author);
    await sql`
      update books
      set title = ${input.title}, year = ${input.year}, author_id = ${author}
      where id = ${id}
    `;
    if (coverChoice === "none") {
      await sql`update books set cover_url = '' where id = ${id}`;
    } else if (coverChoice === "lookup" || renamed) {
      const cover = await findCoverUrl(input.title, input.author, 5000);
      if (cover !== null) await sql`update books set cover_url = ${cover} where id = ${id}`;
    }
  } catch (error) {
    console.error("updateBook failed", error);
    return { ok: false, message: "The changes weren't saved. Try again.", fields: input.fields };
  }

  refresh();
  return { ok: true, message: `Saved "${input.title}".` };
}

export async function deleteBook(bookId: number): Promise<ActionResult> {
  if (!(await isAdmin())) return SIGNED_OUT;
  const id = toId(bookId);
  if (!id) return { ok: false, message: "That book couldn't be found." };

  try {
    // A book that's out can't be deleted until it comes back.
    const [open] = await sql`select 1 from loans where book_id = ${id} and returned_on is null`;
    if (open) return { ok: false, message: "This book is on loan. Record the return first." };

    // Its old loans go with it (on delete cascade).
    const [deleted] = await sql<{ title: string }[]>`
      delete from books where id = ${id} returning title
    `;
    if (!deleted) return { ok: false, message: "That book has already been deleted." };
    refresh();
    return { ok: true, message: `Deleted "${deleted.title}".` };
  } catch (error) {
    console.error("deleteBook failed", error);
    return { ok: false, message: "The book wasn't deleted. Try again." };
  }
}

/* ---------------------------------------------------------------- members */

export async function addMember(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  if (!(await isAdmin())) return SIGNED_OUT;
  const name = text(formData, "name");
  const phone = text(formData, "phone");
  const fields = { name, phone };

  if (!name) return { ok: false, message: "Enter the member's name.", field: "name", fields };
  if (name.length > 100) return { ok: false, message: "That name is too long.", field: "name", fields };
  if (phone && !/^\+?[\d ]{6,20}$/.test(phone)) {
    return {
      ok: false,
      message: "A phone number can only use digits, spaces and a + at the start.",
      field: "phone",
      fields,
    };
  }

  try {
    const [member] = await sql<{ id: number }[]>`
      insert into members (name, phone) values (${name}, ${phone || null})
      returning id
    `;
    refresh();
    return { ok: true, message: `Added ${name} as a member.`, data: { id: String(member.id), name } };
  } catch (error) {
    console.error("addMember failed", error);
    return { ok: false, message: "The member wasn't saved. Try again.", fields };
  }
}

/* ------------------------------------------------------------------ loans */

export async function lendBook(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  if (!(await isAdmin())) return SIGNED_OUT;
  const bookId = toId(formData.get("bookId"));
  const memberId = toId(formData.get("memberId"));
  if (!bookId) return { ok: false, message: "Choose a book to lend.", field: "bookId" };
  if (!memberId) return { ok: false, message: "Choose who is borrowing it.", field: "memberId" };

  try {
    // 14 days from today. The partial unique index refuses a second open loan for the same book.
    const [loan] = await sql<{ due_on: string; title: string; member: string }[]>`
      with new_loan as (
        insert into loans (book_id, member_id, due_on)
        values (${bookId}, ${memberId}, current_date + 14)
        returning book_id, member_id, due_on
      )
      select to_char(n.due_on, 'YYYY-MM-DD') as due_on, b.title, m.name as member
      from new_loan n
      join books b on b.id = n.book_id
      join members m on m.id = n.member_id
    `;
    refresh();
    return {
      ok: true,
      message: `Lent "${loan.title}" to ${loan.member}.`,
      data: { due_on: loan.due_on, member: loan.member, title: loan.title },
    };
  } catch (error) {
    if (isPgError(error, "23505")) return { ok: false, message: "This book is already on loan." };
    if (isPgError(error, "23503")) return { ok: false, message: "That book or member no longer exists." };
    console.error("lendBook failed", error);
    return { ok: false, message: "The loan wasn't recorded. Try again." };
  }
}

export async function returnLoan(loanId: number): Promise<ActionResult> {
  if (!(await isAdmin())) return SIGNED_OUT;
  const id = toId(loanId);
  if (!id) return { ok: false, message: "That loan couldn't be found." };

  try {
    const [returned] = await sql<{ title: string }[]>`
      update loans l
      set returned_on = current_date
      from books b
      where l.id = ${id} and l.returned_on is null and b.id = l.book_id
      returning b.title
    `;
    if (!returned) return { ok: false, message: "That book has already been returned." };
    refresh();
    return { ok: true, message: `"${returned.title}" is back on the shelf.` };
  } catch (error) {
    console.error("returnLoan failed", error);
    return { ok: false, message: "The return wasn't recorded. Try again." };
  }
}

export async function updateMember(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  if (!(await isAdmin())) return SIGNED_OUT;
  const id = toId(formData.get("id"));
  if (!id) return { ok: false, message: "That member couldn't be found." };
  const name = text(formData, "name");
  const phone = text(formData, "phone");
  const fields = { name, phone };
  if (!name) return { ok: false, message: "Enter the member's name.", field: "name", fields };
  if (name.length > 100) return { ok: false, message: "That name is too long.", field: "name", fields };
  if (phone && !/^\+?[\d ]{6,20}$/.test(phone)) {
    return { ok: false, message: "A phone number can only use digits, spaces and a + at the start.", field: "phone", fields };
  }
  try {
    const [member] = await sql<{ id: number }[]>`
      update members set name = ${name}, phone = ${phone || null} where id = ${id} returning id
    `;
    if (!member) return { ok: false, message: "That member couldn't be found." };
  } catch (error) {
    console.error("updateMember failed", error);
    return { ok: false, message: "The changes weren't saved. Try again.", fields };
  }
  refresh();
  return { ok: true, message: `Saved ${name}.` };
}

/** Gives a member a new 6-digit sign-in PIN. It's shown once to the librarian, then only its hash is kept. */
export async function issuePin(memberId: number): Promise<ActionResult> {
  if (!(await isAdmin())) return SIGNED_OUT;
  const id = toId(memberId);
  if (!id) return { ok: false, message: "That member couldn't be found." };
  const [member] = await sql<{ name: string; phone: string | null }[]>`
    select name, phone from members where id = ${id}
  `;
  if (!member) return { ok: false, message: "That member couldn't be found." };
  if (!member.phone) return { ok: false, message: `Add a phone number for ${member.name} first. Members sign in with it.` };

  const pin = newPin();
  await sql`update members set pin_hash = ${hashPin(pin)} where id = ${id}`;
  refresh();
  return { ok: true, message: `New PIN for ${member.name}.`, data: { pin, name: member.name, phone: member.phone } };
}

/** Looks up front covers for books that haven't been checked yet. */
export async function findMissingCovers(): Promise<ActionResult> {
  if (!(await isAdmin())) return SIGNED_OUT;
  const books = await sql<{ id: number; title: string; author: string }[]>`
    select b.id, b.title, a.name as author
    from books b join authors a on a.id = b.author_id
    where b.cover_url is null
    order by b.id
    limit 40
  `;
  let found = 0;
  let failed = 0;
  // A few at a time, to be polite to Open Library.
  for (let i = 0; i < books.length; i += 4) {
    const batch = books.slice(i, i + 4);
    const covers = await Promise.all(batch.map((b) => findCoverUrl(b.title, b.author)));
    for (const [index, cover] of covers.entries()) {
      if (cover === null) {
        failed++;
        continue;
      }
      if (cover) found++;
      await sql`update books set cover_url = ${cover} where id = ${batch[index].id}`;
    }
  }
  refresh();
  if (books.length === 0) return { ok: true, message: "Every book has been checked already." };
  if (failed === books.length) {
    return { ok: false, message: "Open Library couldn't be reached. Try again in a minute." };
  }
  return {
    ok: true,
    message: `Found ${found} ${found === 1 ? "cover" : "covers"}.`,
    data: { note: failed ? `${failed} couldn't be checked; try again later.` : "Books without a cover keep the designed one." },
  };
}

/* ------------------------------------------------------------ member area */

export async function memberSignIn(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const phone = text(formData, "phone");
  const pin = String(formData.get("pin") ?? "").replace(/\s/g, "");
  const fields = { phone, borrow: String(formData.get("borrow") ?? "") };
  if (phoneKey(phone).length < 7) return { ok: false, message: "Enter the phone number the library has for you.", field: "phone", fields };
  if (!/^\d{6}$/.test(pin)) return { ok: false, message: "Your PIN is 6 digits.", field: "pin", fields };

  // Family members can share a number, so check the PIN against each of them.
  const candidates = await sql<{ id: number; pin_hash: string | null }[]>`
    select id, pin_hash from members
    where pin_hash is not null
      and right(regexp_replace(coalesce(phone, ''), '\\D', '', 'g'), 10) = ${phoneKey(phone)}
  `;
  const member = candidates.find((c) => verifyPin(pin, c.pin_hash));
  if (!member || !member.pin_hash) {
    await new Promise((resolve) => setTimeout(resolve, 700)); // slows down guessing
    return {
      ok: false,
      message: "That phone number and PIN don't match. Ask the librarian for a new PIN if you've forgotten it.",
      fields,
    };
  }

  (await cookies()).set(MEMBER_COOKIE, sessionValue(member.id, member.pin_hash), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  });
  // If they came from "Borrow this book", take them back to it.
  const borrow = toId(formData.get("borrow"));
  redirect(borrow ? `/me?borrow=${borrow}` : "/me");
}

export async function memberSignOut() {
  (await cookies()).delete(MEMBER_COOKIE);
  redirect("/me");
}

async function stampToday(memberId: number) {
  await sql`
    insert into reading_days (member_id, read_on) values (${memberId}, current_date)
    on conflict do nothing
  `;
}

/** A signed-in member borrows a book for themselves: a 14-day loan, the same as the librarian lending it. */
export async function borrowBook(bookId: number): Promise<ActionResult> {
  const member = await currentMember();
  if (!member) return { ok: false, message: "Sign in to borrow a book." };
  const id = toId(bookId);
  if (!id) return { ok: false, message: "That book couldn't be found." };

  try {
    const [loan] = await sql<{ due_on: string; title: string }[]>`
      with new_loan as (
        insert into loans (book_id, member_id, due_on)
        values (${id}, ${member.id}, current_date + 14)
        returning book_id, due_on
      )
      select to_char(n.due_on, 'YYYY-MM-DD') as due_on, b.title
      from new_loan n
      join books b on b.id = n.book_id
    `;
    refresh();
    return { ok: true, message: `You've borrowed "${loan.title}".`, data: { due_on: loan.due_on, title: loan.title } };
  } catch (error) {
    // The partial unique index refuses a second open loan, so two people can't borrow the same copy.
    if (isPgError(error, "23505")) return { ok: false, message: "Someone has just borrowed this book. Try another one." };
    if (isPgError(error, "23503")) return { ok: false, message: "That book is no longer in the library." };
    console.error("borrowBook failed", error);
    return { ok: false, message: "The book wasn't borrowed. Try again." };
  }
}

/** "I read today": adds today to the member's streak. */
export async function logReading(): Promise<ActionResult> {
  const member = await currentMember();
  if (!member) return { ok: false, message: "Sign in to keep your streak." };
  await stampToday(member.id);
  revalidatePath("/me");
  return { ok: true, message: "Stamped for today." };
}

/** Saves how far the member is through a book they have now. Counts as reading today. */
export async function updateProgress(loanId: number, progress: number): Promise<ActionResult> {
  const member = await currentMember();
  if (!member) return { ok: false, message: "Sign in to save your progress." };
  const id = toId(loanId);
  const value = Math.round(Number(progress));
  if (!id || !Number.isFinite(value) || value < 0 || value > 100) {
    return { ok: false, message: "Progress must be between 0 and 100 percent." };
  }
  const [loan] = await sql<{ title: string }[]>`
    update loans l set progress = ${value}
    from books b
    where l.id = ${id} and l.member_id = ${member.id} and l.returned_on is null and b.id = l.book_id
    returning b.title
  `;
  if (!loan) return { ok: false, message: "That book isn't on loan to you any more." };
  await stampToday(member.id);
  revalidatePath("/me");
  return {
    ok: true,
    message: value === 100 ? `You finished "${loan.title}". Bring it back when you're ready.` : `Saved: ${value}% of "${loan.title}".`,
  };
}

/* ---------------------------------------------------------------- e-books */

// Either the shared connection or a transaction: both run tagged-template queries.
type Sql = typeof sql | TransactionSql;

/** Saves a book's pages and chapters, replacing any it had. Runs inside the caller's transaction. */
async function storePages(tx: Sql, bookId: number, text: string, source: string) {
  const { pages, chapters } = paginate(text);
  if (pages.length < 2) throw new Error("TOO_SHORT");
  await tx`delete from book_pages where book_id = ${bookId}`;
  await tx`delete from book_chapters where book_id = ${bookId}`;
  for (let i = 0; i < pages.length; i += 200) {
    const rows = pages.slice(i, i + 200).map((body, j) => ({ book_id: bookId, page_no: i + j + 1, body }));
    await tx`insert into book_pages ${tx(rows, "book_id", "page_no", "body")}`;
  }
  if (chapters.length) {
    const rows = chapters.map((c) => ({ book_id: bookId, page_no: c.page_no, title: c.title }));
    await tx`insert into book_chapters ${tx(rows, "book_id", "page_no", "title")} on conflict do nothing`;
  }
  await tx`update books set page_count = ${pages.length}, ebook_source = ${source} where id = ${bookId}`;
  // Anyone part-way through the old text starts again from a page that still exists.
  await tx`update loans set page = least(page, ${pages.length}) where book_id = ${bookId}`;
  return pages.length;
}

export type EbookResult = GutenbergBook & { inLibrary: boolean };

/** Searches Project Gutenberg for public-domain books to add. */
export async function searchEbooks(query: string): Promise<{ ok: boolean; message: string; results: EbookResult[] }> {
  if (!(await isAdmin())) return { ...SIGNED_OUT, results: [] };
  const q = String(query ?? "").trim().slice(0, 100);
  if (q.length < 2) return { ok: false, message: "Type at least two letters of a title or author.", results: [] };
  try {
    const found = await searchGutenberg(q);
    const have = await gutenbergIdsInLibrary(found.map((b) => b.id));
    return {
      ok: true,
      message: found.length ? "" : "No public-domain books match. Try the author's surname.",
      results: found.map((b) => ({ ...b, inLibrary: have.has(b.id) })),
    };
  } catch (error) {
    console.error("searchEbooks failed", error);
    return { ok: false, message: "Project Gutenberg couldn't be reached. Try again in a minute.", results: [] };
  }
}

/** Adds a Project Gutenberg book to the library as an e-book, with its cover and pages. */
export async function importEbook(gutenbergId: number): Promise<ActionResult> {
  if (!(await isAdmin())) return SIGNED_OUT;
  const id = toId(gutenbergId);
  if (!id) return { ok: false, message: "That book couldn't be found." };
  const source = `gutenberg:${id}`;

  const [existing] = await sql`select id from books where ebook_source = ${source}`;
  if (existing) return { ok: false, message: "This e-book is already in the library." };

  let book: GutenbergBook;
  let text: string;
  try {
    book = await getGutenbergBook(id);
    if (!book.textUrl) return { ok: false, message: "This book has no plain-text edition to read." };
    text = await downloadText(book.textUrl);
  } catch (error) {
    console.error("importEbook download failed", error);
    return { ok: false, message: error instanceof Error && /copyright|too long/.test(error.message) ? error.message : "The book couldn't be downloaded. Try again in a minute." };
  }

  try {
    const pages = await sql.begin(async (tx) => {
      const author = await authorIdIn(tx, book.author);
      const [row] = await tx<{ id: number }[]>`
        insert into books (title, author_id, cover_url)
        values (${book.title}, ${author}, ${book.cover ?? ""})
        returning id
      `;
      return storePages(tx, row.id, text, source);
    });
    refresh();
    return { ok: true, message: `Added "${book.title}" as an e-book, ${pages} pages.`, data: { title: book.title } };
  } catch (error) {
    if (error instanceof Error && error.message === "TOO_SHORT") return { ok: false, message: "That text is too short to be a book." };
    console.error("importEbook save failed", error);
    return { ok: false, message: "The e-book wasn't saved. Try again." };
  }
}

/** Gives an existing book an e-book from a plain-text (.txt) file, for books the church may share. */
export async function uploadBookText(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  if (!(await isAdmin())) return SIGNED_OUT;
  const id = toId(formData.get("id"));
  const file = formData.get("file");
  if (!id) return { ok: false, message: "That book couldn't be found." };
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Choose a .txt file first.", field: "file" };
  if (!/\.txt$/i.test(file.name) && !file.type.startsWith("text/plain")) {
    return { ok: false, message: "Only plain-text (.txt) files can be read as e-books.", field: "file" };
  }
  if (file.size > 4_000_000) return { ok: false, message: "That file is too big. The limit is 4 MB.", field: "file" };

  try {
    const text = await file.text();
    const pages = await sql.begin((tx) => storePages(tx, id, text, "upload"));
    refresh();
    return { ok: true, message: `Saved the e-book: ${pages} pages.` };
  } catch (error) {
    if (error instanceof Error && error.message === "TOO_SHORT") return { ok: false, message: "That text is too short to be a book.", field: "file" };
    console.error("uploadBookText failed", error);
    return { ok: false, message: "The text wasn't saved. Try again." };
  }
}

/** Turns a book back into a paper copy only. */
export async function removeBookText(bookId: number): Promise<ActionResult> {
  if (!(await isAdmin())) return SIGNED_OUT;
  const id = toId(bookId);
  if (!id) return { ok: false, message: "That book couldn't be found." };
  await sql.begin(async (tx) => {
    await tx`delete from book_pages where book_id = ${id}`;
    await tx`delete from book_chapters where book_id = ${id}`;
    await tx`update books set page_count = 0, ebook_source = null where id = ${id}`;
  });
  refresh();
  return { ok: true, message: "Removed the e-book. It's a paper copy again." };
}

/** Pages for the reader. Only a member who has borrowed the book can read it. */
export async function readPages(bookId: number, from: number, to: number) {
  const member = await currentMember();
  const id = toId(bookId);
  if (!member || !id) return { ok: false as const, pages: [] };
  const book = await getReaderBook(member.id, id);
  if (!book?.loan_id || book.page_count === 0) return { ok: false as const, pages: [] };
  const start = Math.max(1, Math.floor(Number(from) || 1));
  const end = Math.min(book.page_count, Math.max(start, Math.floor(Number(to) || start)), start + 40);
  return { ok: true as const, pages: await getPages(id, start, end) };
}

export async function readChapters(bookId: number) {
  const id = toId(bookId);
  return id ? getChapters(id) : [];
}

/** Remembers the page a member is on, and counts today as a reading day. */
export async function savePage(bookId: number, page: number): Promise<ActionResult> {
  const member = await currentMember();
  if (!member) return { ok: false, message: "Sign in to save your place." };
  const id = toId(bookId);
  const pageNo = toId(page);
  if (!id || !pageNo) return { ok: false, message: "That page couldn't be saved." };
  const [saved] = await sql<{ page: number }[]>`
    update loans l
    set page = least(${pageNo}, b.page_count),
        progress = least(100, round(100.0 * least(${pageNo}, b.page_count) / greatest(b.page_count, 1)))::smallint
    from books b
    where l.book_id = ${id} and l.member_id = ${member.id} and l.returned_on is null
      and b.id = l.book_id and b.page_count > 0
    returning l.page
  `;
  if (!saved) return { ok: false, message: "This book isn't on loan to you any more." };
  await stampToday(member.id);
  revalidatePath("/me");
  return { ok: true, message: "" };
}

/** Members can hand an e-book back themselves; paper books go back to the librarian. */
export async function returnEbook(bookId: number): Promise<ActionResult> {
  const member = await currentMember();
  if (!member) return { ok: false, message: "Sign in first." };
  const id = toId(bookId);
  if (!id) return { ok: false, message: "That book couldn't be found." };
  const [returned] = await sql<{ title: string }[]>`
    update loans l set returned_on = current_date
    from books b
    where l.book_id = ${id} and l.member_id = ${member.id} and l.returned_on is null
      and b.id = l.book_id and b.page_count > 0
    returning b.title
  `;
  if (!returned) return { ok: false, message: "This e-book isn't on loan to you." };
  refresh();
  return { ok: true, message: `Returned "${returned.title}". It's free for the next reader.` };
}

/* ------------------------------------------------------------ sign in/out */

export async function signIn(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const passcode = process.env.ADMIN_PASSCODE;
  if (!passcode) redirect("/admin");

  const typed = String(formData.get("passcode") ?? "");
  if (!typed) return { ok: false, message: "Enter the librarian passcode.", field: "passcode" };

  if (!safeEqual(adminToken(typed), adminToken(passcode))) {
    await new Promise((resolve) => setTimeout(resolve, 600)); // slows down guessing
    return { ok: false, message: "That passcode isn't right.", field: "passcode" };
  }

  (await cookies()).set(ADMIN_COOKIE, adminToken(passcode), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect("/admin");
}

export async function signOut() {
  (await cookies()).delete(ADMIN_COOKIE);
  redirect("/");
}
