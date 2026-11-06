"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, List, LoaderCircle, Minus, Plus, Type, Undo2, X } from "lucide-react";
import { readPages, returnEbook, savePage } from "@/app/actions";
import { isChapterHeading } from "@/lib/paginate";
import { formatDate } from "@/lib/format";
import { button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme-switch";

type Book = { id: number; title: string; author: string; pageCount: number; source: string | null };
type Chapter = { page_no: number; title: string };

const SIZES = [16, 17.5, 19, 21, 23, 26];
const SIZE_KEY = "readora-reader-size";

function readSize() {
  try {
    const saved = Number(localStorage.getItem(SIZE_KEY));
    return SIZES.includes(saved) ? saved : 19;
  } catch {
    return 19;
  }
}

/**
 * The e-reader: one page at a time, turned with the arrows, a swipe, the keyboard or the slider.
 * The page you're on is saved to your loan, so you pick up where you left off on any device.
 */
export function BookReader({
  book,
  startPage,
  initialPages,
  chapters,
  dueOn,
}: {
  book: Book;
  startPage: number;
  initialPages: { page_no: number; body: string }[];
  chapters: Chapter[];
  dueOn: string | null;
}) {
  const router = useRouter();
  const [page, setPage] = useState(startPage);
  const [direction, setDirection] = useState(1);
  const [cache, setCache] = useState(() => new Map(initialPages.map((p) => [p.page_no, p.body])));
  const [size, setSize] = useState(19);
  const [panel, setPanel] = useState<"contents" | "type" | "finish" | null>(null);
  const [scrub, setScrub] = useState<number | null>(null);
  const [returning, startReturn] = useTransition();
  const loading = useRef(new Set<number>());
  const saveTimer = useRef<number | undefined>(undefined);
  const lastSaved = useRef(startPage);

  // Font size is a per-device choice, kept in this browser.
  useEffect(() => {
    const saved = readSize();
    if (saved !== 19) setSize(saved); // eslint-disable-line react-hooks/set-state-in-effect -- reading browser storage after hydration
  }, []);

  useEffect(() => {
    if (startPage > 1) toast(`Back to page ${startPage}, where you left off.`, { id: "resume" });
  }, [startPage]);

  /** Makes sure the pages around `around` are loaded. */
  const ensure = useCallback(
    async (around: number) => {
      const from = Math.max(1, around - 3);
      const to = Math.min(book.pageCount, around + 12);
      const missing = [];
      for (let n = from; n <= to; n++) if (!cache.has(n) && !loading.current.has(n)) missing.push(n);
      if (missing.length === 0) return;
      missing.forEach((n) => loading.current.add(n));
      const result = await readPages(book.id, missing[0], missing[missing.length - 1]);
      missing.forEach((n) => loading.current.delete(n));
      if (!result.ok) {
        toast.error("This e-book isn't on loan to you any more.");
        return;
      }
      setCache((old) => {
        const next = new Map(old);
        result.pages.forEach((p) => next.set(p.page_no, p.body));
        return next;
      });
    },
    [book.id, book.pageCount, cache],
  );

  const save = useCallback(
    (n: number) => {
      window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(async () => {
        if (n === lastSaved.current) return;
        const result = await savePage(book.id, n);
        if (result.ok) lastSaved.current = n;
        else toast.error(result.message);
      }, 600);
    },
    [book.id],
  );

  const go = useCallback(
    (target: number) => {
      const n = Math.min(Math.max(1, Math.round(target)), book.pageCount);
      if (n === page) return;
      setDirection(n > page ? 1 : -1);
      setPage(n);
      void ensure(n);
      save(n);
      if (n === book.pageCount) setPanel("finish");
    },
    [book.pageCount, ensure, page, save],
  );

  // Keyboard: arrows, Page Up/Down, space.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (panel || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (["ArrowRight", "PageDown", " "].includes(event.key)) {
        event.preventDefault();
        go(page + 1);
      } else if (["ArrowLeft", "PageUp"].includes(event.key)) {
        event.preventDefault();
        go(page - 1);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [go, page, panel]);

  // Save straight away when the reader leaves or switches apps.
  useEffect(() => {
    const flush = () => {
      if (document.visibilityState === "hidden" && page !== lastSaved.current) void savePage(book.id, page);
    };
    document.addEventListener("visibilitychange", flush);
    return () => document.removeEventListener("visibilitychange", flush);
  }, [book.id, page]);

  // Swipe left or right to turn the page.
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") swipe.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const start = swipe.current;
    swipe.current = null;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) go(page + (dx < 0 ? 1 : -1));
  };

  const changeSize = (delta: number) => {
    const index = Math.min(Math.max(SIZES.indexOf(size) + delta, 0), SIZES.length - 1);
    setSize(SIZES[index]);
    try {
      localStorage.setItem(SIZE_KEY, String(SIZES[index]));
    } catch {}
  };

  const chapter = useMemo(() => [...chapters].reverse().find((c) => c.page_no <= page), [chapters, page]);
  const body = cache.get(page);
  const percent = Math.round((page / book.pageCount) * 100);
  const shownPage = scrub ?? page;

  return (
    <div className="flex h-dvh flex-col bg-paper">
      {/* top bar */}
      <header className="flex h-14 shrink-0 items-center gap-1 border-b border-line/70 px-2 sm:px-4">
        <Link href="/me" className="inline-flex size-10 items-center justify-center rounded-[10px] text-ink-soft hover:bg-sunken hover:text-ink" aria-label="Back to My books">
          <ChevronLeft className="size-5" />
        </Link>
        <div className="min-w-0 flex-1 px-1 text-center">
          <p className="truncate font-serif text-[15px] font-semibold leading-tight">{book.title}</p>
          <p className="truncate text-xs text-ink-faint">{chapter?.title ?? book.author}</p>
        </div>
        {chapters.length > 0 && (
          <button type="button" onClick={() => setPanel("contents")} className="inline-flex size-10 items-center justify-center rounded-[10px] text-ink-soft hover:bg-sunken hover:text-ink" aria-label="Contents">
            <List className="size-[18px]" />
          </button>
        )}
        <button type="button" onClick={() => setPanel(panel === "type" ? null : "type")} className="inline-flex size-10 items-center justify-center rounded-[10px] text-ink-soft hover:bg-sunken hover:text-ink" aria-label="Text size" aria-expanded={panel === "type"}>
          <Type className="size-[18px]" />
        </button>
        <ThemeToggle />
      </header>

      <AnimatePresence>
        {panel === "type" && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute right-3 top-16 z-40 flex items-center gap-1 rounded-[14px] border border-line bg-surface p-1.5 shadow-[0_16px_40px_-12px_rgb(10_14_30/0.35)]"
          >
            <button type="button" onClick={() => changeSize(-1)} disabled={size === SIZES[0]} className={button.icon} aria-label="Smaller text">
              <Minus className="size-4" />
            </button>
            <span className="w-12 text-center font-serif tabular-nums" aria-live="polite">
              {Math.round((size / 19) * 100)}%
            </span>
            <button type="button" onClick={() => changeSize(1)} disabled={size === SIZES[SIZES.length - 1]} className={button.icon} aria-label="Larger text">
              <Plus className="size-4" />
            </button>
            <button type="button" onClick={() => setPanel(null)} className={button.icon} aria-label="Close">
              <X className="size-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* the page */}
      <main
        className="relative min-h-0 flex-1 overflow-hidden [perspective:1400px]"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (swipe.current = null)}
      >
        <AnimatePresence mode="popLayout" initial={false} custom={direction}>
          <motion.article
            key={page}
            custom={direction}
            variants={{
              enter: (d: number) => ({ x: d > 0 ? "28%" : "-28%", rotateY: d > 0 ? -14 : 14, opacity: 0 }),
              center: { x: 0, rotateY: 0, opacity: 1 },
              exit: (d: number) => ({ x: d > 0 ? "-22%" : "22%", rotateY: d > 0 ? 10 : -10, opacity: 0 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", damping: 30, stiffness: 260, mass: 0.8 }}
            className="absolute inset-0 overflow-y-auto"
            style={{ transformOrigin: direction > 0 ? "left center" : "right center" }}
            aria-label={`Page ${page} of ${book.pageCount}`}
          >
            <div className="mx-auto w-full max-w-[38rem] px-6 pb-16 pt-8 sm:px-8 sm:pt-12">
              {body === undefined ? (
                <div aria-busy="true" className="space-y-3 pt-2">
                  {Array.from({ length: 10 }, (_, i) => (
                    <div key={i} className="h-4 animate-pulse rounded bg-sunken" style={{ width: `${94 - (i % 4) * 7}%` }} />
                  ))}
                </div>
              ) : page === 1 && body.length < 400 && !body.split("\n\n").some(isChapterHeading) ? (
                // A short first page is the book's title page: set it centred, like a printed book.
                <div className="flex min-h-[60dvh] flex-col items-center justify-center text-center font-serif">
                  {body.split("\n\n").map((line, i) => (
                    <p
                      key={i}
                      className={i === 0 ? "text-[2em] font-semibold leading-tight tracking-[-0.01em]" : "mt-4 text-[1.1em] italic text-ink-soft"}
                      style={{ fontSize: i === 0 ? size * 1.7 : size * 1.05, fontVariationSettings: '"opsz" 60' }}
                    >
                      {i === 0 && line === line.toUpperCase() ? line.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : line}
                    </p>
                  ))}
                  <p className="mt-10 text-sm text-ink-faint">{book.author}</p>
                </div>
              ) : (
                <div
                  className="font-serif text-ink [hyphens:auto] [text-wrap:pretty]"
                  style={{ fontSize: size, lineHeight: 1.72, fontVariationSettings: `"opsz" ${Math.round(size)}` }}
                  lang="en"
                >
                  {body.split("\n\n").map((paragraph, i) =>
                    isChapterHeading(paragraph) ? (
                      <h2 key={i} className="mb-2 mt-6 text-center text-[1.35em] font-semibold leading-tight tracking-[-0.01em] first:mt-2">
                        {paragraph.replace(/\.$/, "")}
                      </h2>
                    ) : i === 1 && isChapterHeading(body.split("\n\n")[0]) && paragraph.length < 70 ? (
                      <p key={i} className="mb-8 text-center italic text-ink-soft">
                        {paragraph}
                      </p>
                    ) : (
                      <p key={i} className="mb-[0.9em]">
                        {paragraph}
                      </p>
                    ),
                  )}
                </div>
              )}
            </div>
          </motion.article>
        </AnimatePresence>

        {/* big, quiet page-turn buttons on wide screens */}
        <button
          type="button"
          onClick={() => go(page - 1)}
          disabled={page === 1}
          className="absolute left-2 top-1/2 hidden size-12 -translate-y-1/2 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-sunken hover:text-ink disabled:opacity-0 lg:inline-flex"
          aria-label="Previous page"
        >
          <ChevronLeft className="size-6" />
        </button>
        <button
          type="button"
          onClick={() => go(page + 1)}
          disabled={page === book.pageCount}
          className="absolute right-2 top-1/2 hidden size-12 -translate-y-1/2 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-sunken hover:text-ink disabled:opacity-0 lg:inline-flex"
          aria-label="Next page"
        >
          <ChevronRight className="size-6" />
        </button>
      </main>

      {/* bottom bar: page number, slider, turn buttons */}
      <footer className="pb-safe shrink-0 border-t border-line/70 bg-paper px-3 pt-2 sm:px-6">
        <div className="mx-auto flex max-w-[44rem] items-center gap-3">
          <button type="button" onClick={() => go(page - 1)} disabled={page === 1} className={`${button.icon} shrink-0 disabled:opacity-30`} aria-label="Previous page">
            <ChevronLeft className="size-5" />
          </button>
          <div className="min-w-0 flex-1">
            <input
              type="range"
              min={1}
              max={book.pageCount}
              value={shownPage}
              onChange={(e) => setScrub(Number(e.target.value))}
              onPointerUp={() => {
                if (scrub !== null) go(scrub);
                setScrub(null);
              }}
              onKeyUp={(e) => {
                if (scrub !== null && ["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
                  go(scrub);
                  setScrub(null);
                }
              }}
              aria-label="Go to page"
              aria-valuetext={`Page ${shownPage} of ${book.pageCount}`}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-sunken [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-stamp [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-stamp"
              style={{ background: `linear-gradient(90deg, var(--color-stamp) ${(shownPage / book.pageCount) * 100}%, var(--color-sunken) ${(shownPage / book.pageCount) * 100}%)` }}
            />
            <p className="mt-1 flex justify-between text-xs tabular-nums text-ink-faint">
              <span>
                Page {shownPage} of {book.pageCount}
              </span>
              <span>
                {scrub === null ? `${percent}%` : chapters.filter((c) => c.page_no <= scrub).at(-1)?.title ?? ""}
                {dueOn && scrub === null ? `, due ${formatDate(dueOn, { year: false })}` : ""}
              </span>
            </p>
          </div>
          <button type="button" onClick={() => go(page + 1)} disabled={page === book.pageCount} className={`${button.icon} shrink-0 disabled:opacity-30`} aria-label="Next page">
            <ChevronRight className="size-5" />
          </button>
        </div>
      </footer>

      <Sheet open={panel === "contents"} onClose={() => setPanel(null)} title="Contents" description={`${book.pageCount} pages`}>
        <ol className="-mx-2 pb-4">
          {chapters.map((c) => {
            const current = chapter?.page_no === c.page_no;
            return (
              <li key={c.page_no}>
                <button
                  type="button"
                  onClick={() => {
                    go(c.page_no);
                    setPanel(null);
                  }}
                  className={`flex w-full items-baseline justify-between gap-4 rounded-[10px] px-3 py-2.5 text-left hover:bg-sunken ${current ? "bg-stamp-soft text-stamp" : ""}`}
                  aria-current={current ? "true" : undefined}
                >
                  <span className="font-serif">{c.title}</span>
                  <span className="shrink-0 text-sm tabular-nums text-ink-faint">{c.page_no}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </Sheet>

      <Sheet open={panel === "finish"} onClose={() => setPanel(null)} title="You reached the end" variant="dialog">
        <div className="space-y-4 pb-2">
          <p className="text-[16px] text-ink-soft">
            You finished &ldquo;<span className="font-serif font-semibold text-ink">{book.title}</span>&rdquo;.
            {dueOn ? ` It's due back on ${formatDate(dueOn)}.` : ""} Return it now so the next reader can borrow it.
          </p>
          {book.source?.startsWith("gutenberg:") && <p className="text-sm text-ink-faint">Public-domain text from Project Gutenberg.</p>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setPanel(null)} className={button.secondary}>
              Keep it for now
            </button>
            <button
              type="button"
              disabled={returning}
              className={button.stamp}
              onClick={() =>
                startReturn(async () => {
                  const result = await returnEbook(book.id);
                  if (result.ok) {
                    toast.success(result.message);
                    router.push("/me");
                  } else toast.error(result.message);
                })
              }
            >
              {returning ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Undo2 className="size-4" aria-hidden />}
              {returning ? "Returning…" : "Return the e-book"}
            </button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
