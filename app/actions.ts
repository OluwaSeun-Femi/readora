"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sql } from "@/db";
import { isAdmin } from "@/lib/admin-auth";
import { ADMIN_COOKIE, adminToken, safeEqual } from "@/lib/admin-token";
import { findCoverUrl } from "@/lib/cover-lookup";
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
  const [found] = await sql<{ id: number }[]>`
    select id from authors where lower(name) = lower(${name})
  `;
  if (found) return found.id;
  const [added] = await sql<{ id: number }[]>`
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
  const fields = { phone };
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
  redirect("/me");
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
