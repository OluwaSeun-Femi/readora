"use client";

import { motion } from "motion/react";
import type { PublicBook } from "@/db/queries";
import { spineStyle } from "@/components/ui/book-art";
import { formatDate, initials } from "@/lib/format";

const ROW = 214; // height of one shelf row, including the plank

/**
 * The hero: every book as a spine on a walnut shelf.
 * A book that's out leaves a gap with a slip saying when it's due back.
 */
export function Shelf({ books, onOpen }: { books: PublicBook[]; onOpen: (book: PublicBook) => void }) {
  return (
    <div
      className="relative overflow-hidden rounded-[18px] bg-walnut px-3 pt-3 shadow-[inset_0_2px_24px_rgb(0_0_0/0.45)] sm:px-6"
      style={{
        backgroundImage: `linear-gradient(180deg, rgb(0 0 0 / 0.28), transparent 38%),
          repeating-linear-gradient(180deg, transparent 0 ${ROW - 16}px, var(--color-plank) ${ROW - 16}px ${ROW - 6}px, var(--color-walnut-deep) ${ROW - 6}px ${ROW}px)`,
      }}
    >
      <ul className="flex flex-wrap content-start items-end" aria-label="Books on the shelf">
        {books.map((book, index) => {
          const { cloth, width, height } = spineStyle(book.title);
          const delay = Math.min(index * 0.025, 0.7);
          return (
            <li key={book.id} className="flex items-end pb-[16px]" style={{ height: ROW }}>
              {book.on_loan ? (
                <motion.button
                  type="button"
                  onClick={() => onOpen(book)}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: delay + 0.35, duration: 0.4 }}
                  className="group relative mx-[1px] flex items-end justify-center rounded-t-[3px] border border-b-0 border-dashed border-foil/25 text-left"
                  style={{ width, height: height - 6 }}
                  aria-label={`${book.title} by ${book.author}. Out on loan${book.due_on && !book.overdue ? `, due back ${formatDate(book.due_on)}` : ""}`}
                >
                  <span
                    className="spine-title absolute bottom-3 font-sans text-[11px] leading-none text-foil/60 transition-colors group-hover:text-foil"
                    aria-hidden
                  >
                    {book.overdue || !book.due_on ? "Out on loan" : `Out until ${formatDate(book.due_on, { year: false })}`}
                  </span>
                </motion.button>
              ) : (
                <motion.button
                  type="button"
                  onClick={() => onOpen(book)}
                  initial={{ y: 40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  whileHover={{ y: -10 }}
                  whileTap={{ y: -4 }}
                  transition={{ type: "spring", damping: 22, stiffness: 260, delay }}
                  className="cloth relative mx-[1px] flex flex-col items-center overflow-hidden rounded-t-[3px] rounded-b-[1px] shadow-[inset_-3px_0_5px_rgb(0_0_0/0.3),inset_2px_0_2px_rgb(255_255_255/0.08),2px_0_4px_rgb(0_0_0/0.35)] focus-visible:outline-foil"
                  style={{ width, height, backgroundColor: cloth.bg, color: cloth.foil }}
                  aria-label={`${book.title} by ${book.author}. On the shelf`}
                >
                  <span className="mt-2.5 h-px w-[70%] opacity-70" style={{ backgroundColor: cloth.foil }} />
                  <span className="mt-[3px] h-px w-[70%] opacity-40" style={{ backgroundColor: cloth.foil }} />
                  <span
                    className={`spine-title mt-2.5 max-h-[calc(100%-52px)] overflow-hidden font-serif font-semibold ${
                      book.title.length > 17 && width >= 40 ? "line-clamp-2 text-[11.5px] leading-[1.15]" : "line-clamp-1 text-[12.5px] leading-none"
                    }`}
                    style={{ fontVariationSettings: '"opsz" 14' }}
                  >
                    {book.title}
                  </span>
                  <span className="absolute bottom-2.5 font-serif text-[10px] font-semibold tracking-[0.04em] opacity-80" aria-hidden>
                    {initials(book.author)}
                  </span>
                </motion.button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function ShelfSkeleton() {
  return (
    <div
      className="h-[214px] animate-pulse rounded-[18px] bg-walnut/80"
      style={{ backgroundImage: "linear-gradient(180deg, transparent 198px, var(--color-plank) 198px)" }}
    />
  );
}
