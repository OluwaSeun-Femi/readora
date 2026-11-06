"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BookOpen, CalendarClock, CircleCheck, Search, SearchX, X } from "lucide-react";
import type { PublicBook } from "@/db/queries";
import { Cover } from "@/components/ui/book-art";
import { Segmented } from "@/components/ui/segmented";
import { Sheet } from "@/components/ui/sheet";
import { formatDate, plural } from "@/lib/format";
import { Shelf } from "./shelf";

type Filter = "all" | "available" | "out";

export function Catalog({ books }: { books: PublicBook[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [openId, setOpenId] = useState<number | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const out = books.filter((b) => b.on_loan).length;
  const onShelf = books.length - out;

  // "/" jumps to the search box, as on most catalogues.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (event.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const shown = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    return books.filter((book) => {
      if (filter === "available" && book.on_loan) return false;
      if (filter === "out" && !book.on_loan) return false;
      const haystack = `${book.title} ${book.author} ${book.year ?? ""}`.toLowerCase();
      return words.every((word) => haystack.includes(word));
    });
  }, [books, query, filter]);

  const openBook = books.find((b) => b.id === openId) ?? null;
  const moreByAuthor = openBook
    ? books.filter((b) => b.author === openBook.author && b.id !== openBook.id)
    : [];

  return (
    <>
      <section aria-labelledby="shelf-heading" className="mx-auto w-full max-w-6xl px-4 pt-8 sm:px-6 sm:pt-12">
        <div className="mb-6 max-w-2xl sm:mb-8">
          <h1
            id="shelf-heading"
            className="font-serif text-[40px] font-semibold leading-[1.05] tracking-[-0.02em] sm:text-[56px]"
            style={{ fontVariationSettings: '"opsz" 72' }}
          >
            What&rsquo;s on the shelf
          </h1>
          <p className="mt-3 text-[17px] text-ink-soft sm:text-lg">
            {books.length === 0
              ? "The shelf is empty for now."
              : `${onShelf} of ${plural(books.length, "book")} ${onShelf === 1 ? "is" : "are"} here to borrow today${
                  out ? `, and ${out} ${out === 1 ? "is" : "are"} out with readers` : ""
                }. Tap a book to see more.`}
          </p>
        </div>
        {books.length > 0 && <Shelf books={books} onOpen={(book) => setOpenId(book.id)} />}
      </section>

      <section aria-labelledby="all-heading" className="mx-auto w-full max-w-6xl px-4 pb-24 pt-12 sm:px-6 sm:pt-16">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <h2 id="all-heading" className="font-serif text-[28px] font-semibold tracking-[-0.01em]">
            Find a book
          </h2>
          <Segmented
            label="Show"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "All", count: books.length },
              { value: "available", label: "On the shelf", count: onShelf },
              { value: "out", label: "Out on loan", count: out },
            ]}
          />
        </div>

        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-ink-faint" aria-hidden />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, author or year"
            aria-label="Search books"
            className="h-14 w-full rounded-[14px] border border-line-strong bg-surface pl-12 pr-12 text-[17px] text-ink placeholder:text-ink-faint focus:border-stamp focus:outline-none focus:ring-4 focus:ring-stamp/15 [&::-webkit-search-cancel-button]:hidden"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-full text-ink-faint hover:bg-sunken hover:text-ink"
              aria-label="Clear search"
            >
              <X className="size-5" />
            </button>
          ) : (
            <kbd className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 rounded-md border border-line-strong px-1.5 font-sans text-xs text-ink-faint sm:block">
              /
            </kbd>
          )}
        </div>

        <p className="mt-4 text-[15px] text-ink-faint" aria-live="polite">
          {query || filter !== "all" ? `Showing ${plural(shown.length, "book")}` : null}
        </p>

        {shown.length === 0 ? (
          <div className="mt-6 flex flex-col items-center rounded-[14px] border border-dashed border-line-strong px-6 py-14 text-center">
            <SearchX className="size-8 text-ink-faint" aria-hidden />
            <p className="mt-3 font-serif text-xl font-semibold">No books match</p>
            <p className="mt-1 max-w-sm text-ink-soft">
              {books.length === 0
                ? "Books the librarian adds will appear here."
                : "Try fewer words, or check the spelling of the title or author."}
            </p>
            {(query || filter !== "all") && (
              <button
                type="button"
                className="mt-5 rounded-[10px] border border-line-strong bg-surface px-4 py-2.5 font-medium hover:bg-sunken"
                onClick={() => {
                  setQuery("");
                  setFilter("all");
                }}
              >
                Show every book
              </button>
            )}
          </div>
        ) : (
          <motion.ul layout className="mt-4 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            <AnimatePresence mode="popLayout" initial={false}>
              {shown.map((book) => (
                <motion.li
                  key={book.id}
                  layout
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.94 }}
                  transition={{ type: "spring", damping: 30, stiffness: 340 }}
                >
                  <button
                    type="button"
                    onClick={() => setOpenId(book.id)}
                    className="group block w-full rounded-[12px] text-left"
                  >
                    <div className="transition-transform duration-300 ease-[var(--ease-settle)] group-hover:-translate-y-1 group-active:translate-y-0">
                      <Cover title={book.title} author={book.author} src={book.cover_url} />
                    </div>
                    <p className="mt-3 line-clamp-2 font-serif text-[17px] font-semibold leading-snug">{book.title}</p>
                    <p className="mt-0.5 text-[15px] text-ink-soft">
                      {book.author}
                      {book.year ? `, ${book.year}` : ""}
                    </p>
                    <p className={`mt-1.5 inline-flex items-center gap-1.5 text-sm font-medium ${book.on_loan ? "text-stamp" : "text-leaf"}`}>
                      {book.on_loan ? (
                        <>
                          <CalendarClock className="size-4" aria-hidden />
                          {book.overdue ? "Out, expected back soon" : `Back ${book.due_on ? formatDate(book.due_on, { year: false }) : "soon"}`}
                        </>
                      ) : (
                        <>
                          <CircleCheck className="size-4" aria-hidden />
                          On the shelf
                        </>
                      )}
                    </p>
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
        )}
      </section>

      <Sheet open={openBook !== null} onClose={() => setOpenId(null)} title={openBook?.title ?? ""}>
        {openBook && (
          <BookDetails book={openBook} moreByAuthor={moreByAuthor} onOpen={(id) => setOpenId(id)} />
        )}
      </Sheet>
    </>
  );
}

function BookDetails({
  book,
  moreByAuthor,
  onOpen,
}: {
  book: PublicBook;
  moreByAuthor: PublicBook[];
  onOpen: (id: number) => void;
}) {
  return (
    <div className="pb-4">
      <div className="flex gap-5">
        <motion.div
          key={book.id}
          className="w-[42%] max-w-[180px] shrink-0"
          initial={{ rotate: -3, y: 10, opacity: 0 }}
          animate={{ rotate: 0, y: 0, opacity: 1 }}
          transition={{ type: "spring", damping: 20, stiffness: 220 }}
        >
          <Cover title={book.title} author={book.author} src={book.cover_url} size="lg" />
        </motion.div>
        <div className="min-w-0 pt-1">
          <p className="font-serif text-lg italic text-ink-soft">{book.author}</p>
          {book.year && <p className="mt-1 text-[15px] text-ink-faint">First published {book.year}</p>}
        </div>
      </div>

      <div
        className={`mt-6 flex gap-3 rounded-[14px] p-4 ${book.on_loan ? "bg-stamp-soft text-stamp" : "bg-leaf-soft text-leaf"}`}
      >
        {book.on_loan ? <CalendarClock className="mt-0.5 size-5 shrink-0" aria-hidden /> : <CircleCheck className="mt-0.5 size-5 shrink-0" aria-hidden />}
        <div>
          <p className="font-semibold">
            {book.on_loan
              ? book.overdue
                ? "Out on loan, expected back soon"
                : `Out on loan, due back ${book.due_on ? formatDate(book.due_on) : "soon"}`
              : "On the shelf now"}
          </p>
          <p className="mt-0.5 text-[15px] opacity-85">
            {book.on_loan
              ? "Ask the librarian to keep it for you when it comes back."
              : "Ask the librarian to lend it to you. Loans last 14 days."}
          </p>
        </div>
      </div>

      {moreByAuthor.length > 0 && (
        <div className="mt-7">
          <h3 className="flex items-center gap-2 text-[15px] font-semibold text-ink-soft">
            <BookOpen className="size-4" aria-hidden />
            More by {book.author}
          </h3>
          <ul className="mt-3 divide-y divide-line rounded-[14px] border border-line">
            {moreByAuthor.map((other) => (
              <li key={other.id}>
                <button
                  type="button"
                  onClick={() => onOpen(other.id)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-sunken"
                >
                  <span>
                    <span className="font-serif font-semibold">{other.title}</span>
                    {other.year && <span className="text-ink-faint">, {other.year}</span>}
                  </span>
                  <span className={`shrink-0 text-sm font-medium ${other.on_loan ? "text-stamp" : "text-leaf"}`}>
                    {other.on_loan ? "Out" : "On the shelf"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
