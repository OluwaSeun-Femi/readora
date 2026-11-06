"use client";

import { useState, useTransition } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Check, Download, LoaderCircle, Search } from "lucide-react";
import { importEbook, searchEbooks, type EbookResult } from "@/app/actions";
import { button, input } from "@/components/ui/button";

/** Search Project Gutenberg's public-domain books and add them as e-books in one tap. */
export function EbookImport() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<EbookResult[] | null>(null);
  const [note, setNote] = useState("");
  const [searching, startSearch] = useTransition();
  const [adding, setAdding] = useState<number | null>(null);

  const search = (event: React.FormEvent) => {
    event.preventDefault();
    startSearch(async () => {
      const result = await searchEbooks(query);
      setResults(result.results);
      setNote(result.message);
    });
  };

  const add = async (book: EbookResult) => {
    setAdding(book.id);
    const result = await importEbook(book.id);
    setAdding(null);
    if (result.ok) {
      toast.success(result.message);
      setResults((list) => list?.map((b) => (b.id === book.id ? { ...b, inLibrary: true } : b)) ?? null);
    } else {
      toast.error(result.message);
    }
  };

  return (
    <div className="pb-4">
      <p className="text-[15px] text-ink-soft">
        Project Gutenberg has over 70,000 books that are free to share, like Jane Austen, Charles Dickens and Olaudah Equiano.
        Members can borrow and read them right here.
      </p>
      <form onSubmit={search} className="mt-4 flex gap-2" role="search">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-ink-faint" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Title or author"
            aria-label="Search Project Gutenberg"
            className={`${input} pl-11`}
            data-autofocus
          />
        </div>
        <button type="submit" disabled={searching} className={button.primary}>
          {searching ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : "Search"}
        </button>
      </form>

      {note && <p className="mt-4 text-[15px] text-ink-soft">{note}</p>}

      {results && results.length > 0 && (
        <ul className="mt-4 divide-y divide-line rounded-[14px] border border-line">
          {results.map((book, index) => (
            <motion.li
              key={book.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className="flex items-center gap-3 p-3"
            >
              <div className="h-16 w-11 shrink-0 overflow-hidden rounded-[3px_6px_6px_3px] bg-sunken">
                {book.cover && (
                  // eslint-disable-next-line @next/next/no-img-element -- Gutenberg cover thumbnail
                  <img src={book.cover} alt="" loading="lazy" referrerPolicy="no-referrer" className="size-full object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 font-serif font-semibold leading-snug">{book.title}</p>
                <p className="truncate text-sm text-ink-soft">{book.author}</p>
                <p className="text-xs text-ink-faint">{book.downloads.toLocaleString("en-GB")} downloads</p>
              </div>
              {book.inLibrary ? (
                <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-leaf">
                  <Check className="size-4" aria-hidden />
                  Added
                </span>
              ) : (
                <button type="button" onClick={() => add(book)} disabled={adding !== null} className={`${button.small} shrink-0`}>
                  {adding === book.id ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Download className="size-4" aria-hidden />}
                  {adding === book.id ? "Adding…" : "Add"}
                </button>
              )}
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  );
}
