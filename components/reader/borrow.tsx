"use client";

import { useMemo, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import Link from "next/link";
import { BookOpen, BookUp2, CalendarClock, CircleCheck, LoaderCircle, Search, SearchX, TabletSmartphone } from "lucide-react";
import type { PublicBook } from "@/db/queries";
import { borrowBook } from "@/app/actions";
import { addDays, formatDate, plural } from "@/lib/format";
import { button, input } from "@/components/ui/button";
import { Cover } from "@/components/ui/book-art";
import { Segmented } from "@/components/ui/segmented";
import { DueStamp } from "@/components/ui/status";

/** Confirms a borrow, then stamps the due date and hands back to the page. */
export function BorrowConfirm({
  book,
  today,
  onDone,
  onCancel,
}: {
  book: PublicBook;
  today: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [dueOn, setDueOn] = useState<string | null>(null);

  if (dueOn) {
    return (
      <div className="flex flex-col items-center py-8 text-center" role="status">
        <motion.div
          initial={{ scale: 2.4, rotate: -18, opacity: 0 }}
          animate={{ scale: 1, rotate: -4, opacity: 1 }}
          transition={{ type: "spring", damping: 13, stiffness: 320, mass: 0.7 }}
          onAnimationComplete={() => {
            if (book.page_count === 0) window.setTimeout(onDone, 900);
          }}
        >
          <DueStamp dueOn={dueOn} className="scale-[1.9]" />
        </motion.div>
        <motion.p
          className="mt-12 font-serif text-xl font-semibold"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          It&rsquo;s yours until {formatDate(dueOn)}
        </motion.p>
        <motion.p className="mt-1 max-w-xs text-ink-soft" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
          {book.page_count > 0
            ? `"${book.title}" is ready to read, ${book.page_count} pages.`
            : `Take "${book.title}" from the shelf. It's now under Reading now.`}
        </motion.p>
        {book.page_count > 0 && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-6 w-full max-w-xs">
            <Link href={`/read/${book.id}`} className={`${button.stamp} w-full`} data-autofocus>
              <BookOpen className="size-4" aria-hidden />
              Start reading
            </Link>
          </motion.div>
        )}
      </div>
    );
  }

  if (book.on_loan) {
    return (
      <div className="space-y-4 pb-2">
        <p className="rounded-[12px] bg-stamp-soft p-4 text-[15px] font-medium text-stamp">
          &ldquo;{book.title}&rdquo; is out on loan right now
          {book.due_on && !book.overdue ? ` until ${formatDate(book.due_on)}` : ""}. Pick another book from the list.
        </p>
        <button type="button" onClick={onCancel} className={`${button.secondary} w-full`}>
          Choose another book
        </button>
      </div>
    );
  }

  const due = addDays(today, 14);
  return (
    <div className="space-y-5 pb-2">
      <div className="flex gap-4">
        <div className="w-24 shrink-0">
          <Cover title={book.title} author={book.author} src={book.cover_url} size="sm" />
        </div>
        <div className="min-w-0">
          <p className="font-serif text-xl font-semibold leading-snug">{book.title}</p>
          <p className="mt-0.5 text-ink-soft">
            {book.author}
            {book.year ? `, ${book.year}` : ""}
          </p>
          {book.page_count > 0 && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-stamp">
              <TabletSmartphone className="size-4" aria-hidden />
              E-book, {book.page_count} pages. Read it here.
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4 rounded-[14px] border border-dashed border-line-strong p-4">
        <DueStamp dueOn={due} />
        <p className="text-[15px] text-ink-soft">
          Loans last 14 days, so it&rsquo;s due back on <span className="font-semibold text-ink">{formatDate(due)}</span>.
        </p>
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} className={button.secondary}>
          Not now
        </button>
        <button
          type="button"
          disabled={pending}
          data-autofocus
          className={button.stamp}
          onClick={() =>
            startTransition(async () => {
              const result = await borrowBook(book.id);
              if (result.ok && result.data) {
                toast.success(result.message, { description: `Due back ${formatDate(result.data.due_on)}` });
                setDueOn(result.data.due_on);
              } else {
                toast.error(result.message);
              }
            })
          }
        >
          {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <BookUp2 className="size-4" aria-hidden />}
          {pending ? "Borrowing…" : "Borrow book"}
        </button>
      </div>
    </div>
  );
}

type Filter = "available" | "all";

/** Every book in the library, with a Borrow button on the ones on the shelf. */
export function BookBrowser({
  books,
  mine,
  onBorrow,
}: {
  books: PublicBook[];
  mine: Set<number>;
  onBorrow: (id: number) => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("available");
  const available = books.filter((b) => !b.on_loan).length;

  const shown = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    return books.filter((book) => {
      if (filter === "available" && book.on_loan) return false;
      const haystack = `${book.title} ${book.author} ${book.year ?? ""}`.toLowerCase();
      return words.every((word) => haystack.includes(word));
    });
  }, [books, query, filter]);

  return (
    <div>
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-ink-faint" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, author or year"
            aria-label="Search the library"
            className={`${input} pl-11`}
          />
        </div>
        <Segmented
          label="Show"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "available", label: "On the shelf", count: available },
            { value: "all", label: "All books", count: books.length },
          ]}
        />
      </div>

      {shown.length === 0 ? (
        <div className="mt-4 flex flex-col items-center rounded-[14px] border border-dashed border-line-strong px-6 py-10 text-center">
          <SearchX className="size-7 text-ink-faint" aria-hidden />
          <p className="mt-3 font-serif text-lg font-semibold">
            {available === 0 && filter === "available" ? "Every book is out right now" : "No books match"}
          </p>
          <p className="mt-1 text-ink-soft">
            {available === 0 && filter === "available" ? "Check back soon, or look at all books." : "Try fewer words."}
          </p>
        </div>
      ) : (
        <ul className="mt-4 grid grid-cols-1 gap-2.5 md:grid-cols-2">
          <AnimatePresence mode="popLayout" initial={false}>
            {shown.map((book) => {
              const yours = mine.has(book.id);
              return (
                <motion.li
                  key={book.id}
                  layout
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ type: "spring", damping: 30, stiffness: 340 }}
                  className="flex min-w-0 items-center gap-3.5 rounded-[14px] border border-line bg-surface p-3 pr-3.5"
                >
                  <div className="w-12 shrink-0">
                    <Cover title={book.title} author={book.author} src={book.cover_url} size="xs" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 font-serif text-[16px] font-semibold leading-snug">{book.title}</p>
                    <p className="truncate text-sm text-ink-soft">
                      {book.author}
                      {book.year ? `, ${book.year}` : ""}
                    </p>
                    {book.page_count > 0 && !yours && !book.on_loan && (
                      <p className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-stamp">
                        <TabletSmartphone className="size-3.5" aria-hidden />
                        E-book
                      </p>
                    )}
                    {yours ? (
                      book.page_count > 0 ? (
                        <Link href={`/read/${book.id}`} className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-stamp hover:underline">
                          <BookOpen className="size-3.5" aria-hidden />
                          Read now
                        </Link>
                      ) : (
                        <p className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-stamp">
                          <CircleCheck className="size-3.5" aria-hidden />
                          You have this
                        </p>
                      )
                    ) : book.on_loan ? (
                      <p className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-ink-faint">
                        <CalendarClock className="size-3.5" aria-hidden />
                        {book.due_on && !book.overdue ? `Out until ${formatDate(book.due_on, { year: false })}` : "Out on loan"}
                      </p>
                    ) : null}
                  </div>
                  {!yours && !book.on_loan && (
                    <button
                      type="button"
                      onClick={() => onBorrow(book.id)}
                      className={`${button.small} shrink-0`}
                      aria-label={`Borrow ${book.title}`}
                    >
                      <BookUp2 className="size-4" aria-hidden />
                      Borrow
                    </button>
                  )}
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}
      <p className="mt-4 text-sm text-ink-faint">{plural(available, "book")} on the shelf to borrow.</p>
    </div>
  );
}
