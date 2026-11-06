"use client";

import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { BookCheck, Flame, LibraryBig, LoaderCircle, LogOut, Stamp, Trophy } from "lucide-react";
import type { ReaderLoan, Streak } from "@/db/queries";
import { logReading, memberSignOut, updateProgress } from "@/app/actions";
import { addDays, dueLabel, formatDate, plural } from "@/lib/format";
import { hash } from "@/lib/covers";
import { button } from "@/components/ui/button";
import { Cover } from "@/components/ui/book-art";
import { DueStamp } from "@/components/ui/status";

export function ReaderHome({
  name,
  loans,
  streak,
  today,
}: {
  name: string;
  loans: ReaderLoan[];
  streak: Streak;
  today: string;
}) {
  const reading = loans.filter((l) => !l.returned_on);
  const read = loans.filter((l) => l.returned_on);
  const first = name.split(" ")[0];

  return (
    <>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1
            className="font-serif text-[36px] font-semibold leading-[1.08] tracking-[-0.02em] sm:text-[46px]"
            style={{ fontVariationSettings: '"opsz" 72' }}
          >
            Hello, {first}
          </h1>
          <p className="mt-2 text-[17px] text-ink-soft">
            {reading.length === 0
              ? "You don't have any books at home right now."
              : `You have ${plural(reading.length, "book")} at home.`}
          </p>
        </div>
        <form action={memberSignOut}>
          <button type="submit" className={button.ghost}>
            <LogOut className="size-4" aria-hidden />
            Sign out
          </button>
        </form>
      </div>

      <StreakCard streak={streak} today={today} />

      <section aria-labelledby="reading-heading" className="mt-12">
        <h2 id="reading-heading" className="font-serif text-[28px] font-semibold tracking-[-0.01em]">
          Reading now
        </h2>
        {reading.length === 0 ? (
          <div className="mt-4 flex flex-col items-start gap-4 rounded-[14px] border border-dashed border-line-strong p-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-ink-soft">Find something on the shelf and ask the librarian to lend it to you.</p>
            <Link href="/" className={button.secondary}>
              <LibraryBig className="size-4" aria-hidden />
              Browse the shelf
            </Link>
          </div>
        ) : (
          <ul className="mt-4 grid gap-4 md:grid-cols-2">
            {reading.map((loan) => (
              <ReadingCard key={loan.id} loan={loan} />
            ))}
          </ul>
        )}
      </section>

      {read.length > 0 && (
        <section aria-labelledby="read-heading" className="mt-12">
          <h2 id="read-heading" className="font-serif text-[28px] font-semibold tracking-[-0.01em]">
            Books you&rsquo;ve read
          </h2>
          <p className="mt-1 text-ink-soft">{plural(read.length, "book")} borrowed and returned.</p>
          <ul className="mt-5 grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6">
            {read.map((loan) => (
              <li key={loan.id}>
                <Cover title={loan.title} author={loan.author} src={loan.cover_url} size="sm" />
                <p className="mt-2 line-clamp-2 font-serif text-[15px] font-semibold leading-snug">{loan.title}</p>
                <p className="text-sm text-ink-faint">Returned {formatDate(loan.returned_on!, { year: false })}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

/* ------------------------------------------------------------ streak card */

function StreakCard({ streak, today }: { streak: Streak; today: string }) {
  const [pending, startTransition] = useTransition();
  // Stamp today straight away; the server confirms a moment later.
  const [optimistic, stampOptimistic] = useOptimistic(streak, (current: Streak) =>
    current.read_today
      ? current
      : {
          ...current,
          read_today: true,
          current: current.current + 1,
          best: Math.max(current.best, current.current + 1),
          recent: [...current.recent, today],
        },
  );
  const days = Array.from({ length: 28 }, (_, i) => addDays(today, i - 27));
  const stamped = new Set(optimistic.recent);
  const [justStamped, setJustStamped] = useState(false);

  const stampToday = () =>
    startTransition(async () => {
      stampOptimistic(null);
      setJustStamped(true);
      const result = await logReading();
      if (result.ok) toast.success(optimistic.current + 1 > 1 ? `${optimistic.current + 1} days in a row.` : "Stamped for today.");
      else toast.error(result.message);
    });

  return (
    <section
      aria-labelledby="streak-heading"
      className="grid gap-6 overflow-hidden rounded-[18px] border border-line bg-surface p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_auto]"
    >
      <div className="flex flex-col">
        <h2 id="streak-heading" className="sr-only">
          Reading streak
        </h2>
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex size-12 items-center justify-center rounded-full ${
              optimistic.current > 0 ? "bg-[#fde9d6] text-[#c2410c] dark:bg-[#3a2212] dark:text-[#fb923c]" : "bg-sunken text-ink-faint"
            }`}
          >
            <Flame className="size-6" aria-hidden />
          </span>
          <p className="font-serif leading-none" style={{ fontVariationSettings: '"opsz" 72' }}>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={optimistic.current}
                initial={{ y: 18, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -18, opacity: 0 }}
                className="inline-block text-[52px] font-semibold tabular-nums"
              >
                {optimistic.current}
              </motion.span>
            </AnimatePresence>
            <span className="ml-2 text-[22px] font-semibold">{optimistic.current === 1 ? "day" : "days"} in a row</span>
          </p>
        </div>
        <p className="mt-3 max-w-sm text-[16px] text-ink-soft">
          {optimistic.read_today
            ? "Today is stamped. Read again tomorrow to keep it going."
            : optimistic.current > 0
              ? "Read today and stamp your card to keep your streak."
              : "Read a few pages and stamp your card. Days in a row make a streak."}
        </p>
        <dl className="mt-5 flex gap-8 text-[15px]">
          <div>
            <dt className="text-ink-faint">Best streak</dt>
            <dd className="mt-0.5 inline-flex items-center gap-1.5 font-semibold">
              <Trophy className="size-4 text-foil" aria-hidden />
              {plural(optimistic.best, "day")}
            </dd>
          </div>
          <div>
            <dt className="text-ink-faint">Days read</dt>
            <dd className="mt-0.5 font-semibold">{optimistic.total_days + (optimistic.read_today && !streak.read_today ? 1 : 0)}</dd>
          </div>
        </dl>
        <div className="mt-6 lg:mt-auto lg:pt-6">
          <button
            type="button"
            disabled={optimistic.read_today || pending}
            onClick={stampToday}
            className={`${button.stamp} w-full sm:w-auto disabled:!opacity-100 ${
              optimistic.read_today ? "!bg-stamp-soft !text-stamp" : ""
            }`}
          >
            {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Stamp className="size-4" aria-hidden />}
            {optimistic.read_today ? "Stamped for today" : "I read today"}
          </button>
        </div>
      </div>

      {/* The last four weeks as a library card: each day read gets a stamp. */}
      <div>
        <p className="mb-2 text-sm text-ink-faint">Last 4 weeks</p>
        <ol className="grid grid-cols-7 gap-1.5 sm:gap-2" aria-label="Days read in the last four weeks">
          {days.map((day) => {
            const isToday = day === today;
            const done = stamped.has(day);
            const tilt = (hash(day) % 13) - 6;
            return (
              <li
                key={day}
                className={`relative flex aspect-square w-full items-center justify-center rounded-[8px] border text-[13px] tabular-nums sm:size-11 ${
                  isToday ? "border-stamp/60 border-dashed" : "border-line"
                } ${done ? "text-stamp" : "text-ink-faint"}`}
                aria-label={`${formatDate(day)}${done ? ", read" : ""}${isToday ? ", today" : ""}`}
              >
                <span aria-hidden>{Number(day.slice(8))}</span>
                {done && (
                  <motion.span
                    aria-hidden
                    initial={isToday && justStamped ? { scale: 2.6, opacity: 0, rotate: tilt - 20 } : false}
                    animate={{ scale: 1, opacity: 1, rotate: tilt }}
                    transition={{ type: "spring", damping: 12, stiffness: 320, mass: 0.6 }}
                    className="absolute inset-[3px] rounded-full border-2 border-stamp/75 bg-stamp/[0.07]"
                  />
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------- reading card */

function ReadingCard({ loan }: { loan: ReaderLoan }) {
  const [value, setValue] = useState(loan.progress);
  const [saved, setSaved] = useState(loan.progress);
  const [pending, startTransition] = useTransition();
  const overdue = loan.days_left < 0;

  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const save = (next = value) => {
    window.clearTimeout(timer.current);
    if (next === saved) return;
    startTransition(async () => {
      const result = await updateProgress(loan.id, next);
      if (result.ok) {
        setSaved(next);
        toast.success(result.message, { id: `progress-${loan.id}` });
      } else {
        toast.error(result.message);
        setValue(saved);
      }
    });
  };

  // Arrow keys move in 5% steps; save once the reader pauses rather than on every press.
  const saveSoon = (next: number) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => save(next), 700);
  };

  return (
    <li className="flex gap-4 rounded-[14px] border border-line bg-surface p-4">
      <div className="w-[88px] shrink-0 sm:w-[100px]">
        <Cover title={loan.title} author={loan.author} src={loan.cover_url} size="sm" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-serif text-[18px] font-semibold leading-snug">{loan.title}</p>
            <p className="text-[15px] text-ink-soft">{loan.author}</p>
          </div>
          <DueStamp dueOn={loan.due_on} overdue={overdue} className="shrink-0" />
        </div>
        <p className={`mt-1 text-sm ${overdue ? "font-semibold text-alarm" : "text-ink-faint"}`}>
          {overdue ? `${dueLabel(loan.days_left)}. Please bring it back.` : `${dueLabel(loan.days_left)}, ${formatDate(loan.due_on, { year: false })}`}
        </p>

        <div className="mt-auto pt-4">
          <div className="flex items-baseline justify-between text-sm">
            <label htmlFor={`progress-${loan.id}`} className="font-medium">
              How far you are
            </label>
            <span className="inline-flex items-center gap-1.5 tabular-nums text-ink-soft">
              {pending && <LoaderCircle className="size-3.5 animate-spin" aria-hidden />}
              {value === 100 ? (
                <span className="inline-flex items-center gap-1 font-semibold text-leaf">
                  <BookCheck className="size-4" aria-hidden />
                  Finished
                </span>
              ) : (
                `${value}%`
              )}
            </span>
          </div>
          <input
            id={`progress-${loan.id}`}
            type="range"
            min={0}
            max={100}
            step={5}
            value={value}
            onChange={(e) => {
              const next = Number(e.target.value);
              setValue(next);
              saveSoon(next);
            }}
            onPointerUp={() => save()}
            onBlur={() => save()}
            aria-valuetext={value === 100 ? "Finished" : `${value} percent`}
            className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-sunken accent-[var(--color-stamp)] [&::-moz-range-thumb]:size-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-stamp [&::-webkit-slider-thumb]:size-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-surface [&::-webkit-slider-thumb]:bg-stamp [&::-webkit-slider-thumb]:shadow-[0_1px_4px_rgb(0_0_0/0.3)]"
            style={{
              background: `linear-gradient(90deg, var(--color-stamp) ${value}%, var(--color-sunken) ${value}%)`,
            }}
          />
        </div>
      </div>
    </li>
  );
}
