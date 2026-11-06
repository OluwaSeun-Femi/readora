"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { BookPlus, BookUp2, ImageDown, LibraryBig, LoaderCircle, Pencil, Search, SearchX, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { findMissingCovers } from "@/app/actions";
import type { BookRow } from "@/db/queries";
import type { ActionResult } from "@/lib/types";
import { plural } from "@/lib/format";
import { button, input } from "@/components/ui/button";
import { MiniSpine } from "@/components/ui/book-art";
import { Segmented } from "@/components/ui/segmented";
import { Sheet } from "@/components/ui/sheet";
import { StatusPill } from "@/components/ui/status";
import { BookForm, DeleteBook, LendForm, MemberForm, ReturnButton, type MemberOption } from "./forms";
import { EmptyState, PageHeader } from "./page-header";

type Filter = "all" | "available" | "out" | "overdue";
type Panel =
  | { kind: "add" }
  | { kind: "edit"; id: number }
  | { kind: "delete"; id: number }
  | { kind: "lend"; id: number }
  | { kind: "member"; returnTo: number }
  | null;

export function BooksManager({
  books,
  members,
  authors,
  today,
  missingCovers,
}: {
  books: BookRow[];
  members: MemberOption[];
  authors: string[];
  today: string;
  missingCovers: number;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [panel, setPanel] = useState<Panel>(null);
  const [fresh, setFresh] = useState<string | null>(null);
  const close = useCallback(() => setPanel(null), []);

  const counts = useMemo(
    () => ({
      out: books.filter((b) => b.loan_id).length,
      overdue: books.filter((b) => b.days_left !== null && b.days_left < 0).length,
    }),
    [books],
  );

  const shown = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    return books.filter((book) => {
      if (filter === "available" && book.loan_id) return false;
      if (filter === "out" && !book.loan_id) return false;
      if (filter === "overdue" && !(book.days_left !== null && book.days_left < 0)) return false;
      const haystack = `${book.title} ${book.author} ${book.year ?? ""} ${book.borrower ?? ""}`.toLowerCase();
      return words.every((word) => haystack.includes(word));
    });
  }, [books, query, filter]);

  const current = panel && "id" in panel ? books.find((b) => b.id === panel.id) : undefined;
  const available = books.filter((b) => !b.loan_id).map(({ id, title, author }) => ({ id, title, author }));

  return (
    <>
      <PageHeader
        title="Books"
        description={`${plural(books.length, "book")} in the library, ${counts.out} out on loan.`}
        actions={
          <>
            {missingCovers > 0 && <FindCoversButton count={missingCovers} />}
            <button type="button" className={button.primary} onClick={() => setPanel({ kind: "add" })}>
              <BookPlus className="size-4" aria-hidden />
              Add a book
            </button>
          </>
        }
      />

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-ink-faint" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, author or borrower"
            aria-label="Search books"
            className={`${input} pl-11`}
          />
        </div>
        <Segmented
          label="Show"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All", count: books.length },
            { value: "available", label: "Available", count: books.length - counts.out },
            { value: "out", label: "On loan", count: counts.out },
            { value: "overdue", label: "Overdue", count: counts.overdue },
          ]}
        />
      </div>

      <div className="mt-4">
        {shown.length === 0 ? (
          books.length === 0 ? (
            <EmptyState
              icon={LibraryBig}
              title="No books yet"
              action={
                <button type="button" className={button.primary} onClick={() => setPanel({ kind: "add" })}>
                  <BookPlus className="size-4" aria-hidden />
                  Add the first book
                </button>
              }
            >
              Add the books on your shelf and they&rsquo;ll appear here and in the public catalogue.
            </EmptyState>
          ) : (
            <EmptyState icon={SearchX} title="No books match">
              Try a shorter search or another filter.
            </EmptyState>
          )
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-[14px] border border-line bg-surface">
            <AnimatePresence initial={false}>
              {shown.map((book) => (
                <motion.li
                  key={book.id}
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{
                    opacity: 1,
                    height: "auto",
                    backgroundColor: fresh === book.title ? ["var(--color-stamp-soft)", "var(--color-surface)"] : "var(--color-surface)",
                  }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1], backgroundColor: { duration: 2.2 } }}
                >
                  <div className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4">
                    <div className="flex min-w-0 flex-1 items-center gap-3.5">
                      <MiniSpine title={book.title} />
                      <div className="min-w-0">
                        <Link
                          href={`/admin/books/${book.id}`}
                          className="font-serif text-[17px] font-semibold leading-snug hover:underline hover:underline-offset-4"
                        >
                          {book.title}
                        </Link>
                        <p className="text-[15px] text-ink-soft">
                          {book.author}
                          {book.year ? `, ${book.year}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-end">
                      <StatusPill dueOn={book.due_on} daysLeft={book.days_left} borrower={book.borrower} />
                      <div className="flex items-center gap-1">
                        {book.loan_id ? (
                          <ReturnButton loanId={book.loan_id} />
                        ) : (
                          <button type="button" className={button.small} onClick={() => setPanel({ kind: "lend", id: book.id })}>
                            <BookUp2 className="size-4" aria-hidden />
                            Lend
                          </button>
                        )}
                        <button
                          type="button"
                          className={button.icon}
                          onClick={() => setPanel({ kind: "edit", id: book.id })}
                          aria-label={`Edit ${book.title}`}
                        >
                          <Pencil className="size-[18px]" />
                        </button>
                        <button
                          type="button"
                          className={`${button.icon} hover:!bg-alarm-soft hover:!text-alarm`}
                          onClick={() => setPanel({ kind: "delete", id: book.id })}
                          aria-label={`Delete ${book.title}`}
                        >
                          <Trash2 className="size-[18px]" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>

      <Sheet open={panel?.kind === "add"} onClose={close} title="Add a book" description="It goes straight onto the shelf.">
        <BookForm
          authors={authors}
          onDone={(result: ActionResult) => {
            setFresh(result.data?.title ?? null);
            setFilter("all");
            setQuery("");
            close();
          }}
        />
      </Sheet>

      <Sheet open={panel?.kind === "edit" && Boolean(current)} onClose={close} title="Edit book">
        {current && panel?.kind === "edit" && (
          <BookForm key={current.id} book={current} authors={authors} onDone={close} />
        )}
      </Sheet>

      <Sheet
        open={panel?.kind === "delete" && Boolean(current)}
        onClose={close}
        title={current?.loan_id ? "This book is on loan" : "Delete this book?"}
        variant="dialog"
      >
        {current && <DeleteBook book={current} onDone={close} onCancel={close} />}
      </Sheet>

      <Sheet open={panel?.kind === "lend" && Boolean(current)} onClose={close} title="Lend a book">
        {current && panel?.kind === "lend" && (
          <LendForm
            key={current.id}
            books={current.loan_id ? [] : [{ id: current.id, title: current.title, author: current.author }, ...available.filter((b) => b.id !== current.id)]}
            bookId={current.id}
            members={members}
            today={today}
            onDone={close}
            onAddMember={() => setPanel({ kind: "member", returnTo: current.id })}
          />
        )}
      </Sheet>

      <Sheet open={panel?.kind === "member"} onClose={close} title="Add a member">
        <MemberForm
          onDone={() => {
            const returnTo = panel?.kind === "member" ? panel.returnTo : null;
            setPanel(returnTo ? { kind: "lend", id: returnTo } : null);
          }}
        />
      </Sheet>
    </>
  );
}

function FindCoversButton({ count }: { count: number }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className={button.secondary}
      onClick={() =>
        startTransition(async () => {
          const result = await findMissingCovers();
          if (result.ok) toast.success(result.message, { description: result.data?.note });
          else toast.error(result.message);
        })
      }
    >
      {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <ImageDown className="size-4" aria-hidden />}
      {pending ? "Looking up covers…" : `Find covers (${count})`}
    </button>
  );
}
