import { Suspense } from "react";
import { connection } from "next/server";
import { getBooks } from "@/db/queries";

export default function BooksPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
      <header className="mb-6">
        <p className="text-sm font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
          Readora Library
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Books</h1>
      </header>

      <Suspense fallback={<BooksLoading />}>
        <BookList />
      </Suspense>
    </main>
  );
}

async function BookList() {
  // Wait for a real visitor, so the list is read fresh from the database every time.
  await connection();
  const books = await getBooks();

  if (books.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-300 p-6 text-center text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
        No books yet.
      </p>
    );
  }

  const onLoan = books.filter((book) => book.borrower).length;

  return (
    <>
      <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
        {books.length} {books.length === 1 ? "book" : "books"} · {onLoan} on loan
      </p>

      <ul className="space-y-3">
        {books.map((book) => (
          <li
            key={book.id}
            className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <h2 className="text-base font-semibold leading-snug">{book.title}</h2>
            <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
              {book.author}
              {book.year ? ` · ${book.year}` : ""}
            </p>

            {book.borrower ? (
              <p className="mt-3 inline-block rounded-lg bg-amber-100 px-3 py-1 text-sm font-medium text-amber-900 dark:bg-amber-500/15 dark:text-amber-300">
                On loan to {book.borrower}, due {book.due_on}
              </p>
            ) : (
              <p className="mt-3 inline-block rounded-lg bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-300">
                Available
              </p>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}

function BooksLoading() {
  return (
    <div aria-busy="true">
      <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">Loading…</p>
      <ul className="space-y-3">
        {[0, 1, 2].map((i) => (
          <li
            key={i}
            className="h-28 animate-pulse rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900"
          />
        ))}
      </ul>
    </div>
  );
}
