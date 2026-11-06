import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { BookOpen, ChevronLeft, KeyRound } from "lucide-react";
import { getChapters, getPages, getReaderBook } from "@/db/queries";
import { currentMember } from "@/lib/member-auth";
import { button } from "@/components/ui/button";
import { BookReader } from "@/components/reader/book-reader";

export const metadata: Metadata = { title: "Reading", robots: { index: false } };

export default function ReadPage({ params }: PageProps<"/read/[bookId]">) {
  return (
    <Suspense fallback={<ReaderLoading />}>
      <ReaderData params={params} />
    </Suspense>
  );
}

async function ReaderData({ params }: { params: Promise<{ bookId: string }> }) {
  await connection();
  const bookId = Number((await params).bookId);
  if (!Number.isInteger(bookId) || bookId <= 0) notFound();

  const member = await currentMember();
  if (!member) {
    return (
      <Gate title="Sign in to read">
        <p className="text-ink-soft">E-books are for members. Sign in with your library card to borrow and read this one.</p>
        <Link href={`/me?borrow=${bookId}`} className={`${button.primary} mt-6`}>
          <KeyRound className="size-4" aria-hidden />
          Sign in
        </Link>
      </Gate>
    );
  }

  const book = await getReaderBook(member.id, bookId);
  if (!book) notFound();

  if (book.page_count === 0) {
    return (
      <Gate title={book.title}>
        <p className="text-ink-soft">This book is a paper copy only, so it can&rsquo;t be read here. Borrow it and collect it from the shelf.</p>
        <Link href="/me" className={`${button.secondary} mt-6`}>
          <ChevronLeft className="size-4" aria-hidden />
          My books
        </Link>
      </Gate>
    );
  }

  if (!book.loan_id) {
    return (
      <Gate title={book.title}>
        <p className="text-ink-soft">
          {book.on_loan_to_someone_else
            ? "Another reader has this e-book right now. The library lends one copy at a time, like a paper book."
            : "Borrow this e-book to start reading. It's yours for 14 days, and your page is saved as you go."}
        </p>
        {!book.on_loan_to_someone_else && (
          <Link href={`/me?borrow=${book.id}`} className={`${button.stamp} mt-6`}>
            <BookOpen className="size-4" aria-hidden />
            Borrow and read
          </Link>
        )}
      </Gate>
    );
  }

  const start = Math.min(Math.max(book.page, 1), book.page_count);
  const [pages, chapters] = await Promise.all([
    getPages(book.id, Math.max(1, start - 3), Math.min(book.page_count, start + 10)),
    getChapters(book.id),
  ]);

  return (
    <BookReader
      book={{ id: book.id, title: book.title, author: book.author, pageCount: book.page_count, source: book.ebook_source }}
      startPage={start}
      initialPages={pages}
      chapters={chapters}
      dueOn={book.due_on}
    />
  );
}

function Gate({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-1 items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link href="/me" className="mb-8 inline-flex items-center gap-1 text-[15px] font-medium text-ink-soft hover:text-ink">
          <ChevronLeft className="size-4" aria-hidden />
          My books
        </Link>
        <h1 className="font-serif text-[32px] font-semibold leading-tight tracking-[-0.015em]">{title}</h1>
        <div className="mt-3">{children}</div>
      </div>
    </main>
  );
}

function ReaderLoading() {
  return (
    <main className="mx-auto w-full max-w-[38rem] flex-1 px-6 pt-24" aria-busy="true">
      {Array.from({ length: 9 }, (_, i) => (
        <div key={i} className="mb-3 h-4 animate-pulse rounded bg-sunken" style={{ width: `${92 - (i % 3) * 9}%` }} />
      ))}
      <p className="sr-only">Opening the book…</p>
    </main>
  );
}
