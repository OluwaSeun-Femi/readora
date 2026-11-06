"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { BookPlus, BookUp2, ChevronRight, CircleCheck, UserPlus } from "lucide-react";
import type { LoanRow, Stats } from "@/db/queries";
import { dueLabel, formatDate, formatLongDay } from "@/lib/format";
import { button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { DueStamp } from "@/components/ui/status";
import { BookForm, LendForm, MemberForm, ReturnButton, type BookOption, type MemberOption } from "./forms";
import { RemindButton } from "./remind-button";

type Panel = "lend" | "book" | "member" | "lend-member" | null;

export function Overview({
  stats,
  loans,
  books,
  members,
  authors,
}: {
  stats: Stats;
  loans: LoanRow[];
  books: BookOption[];
  members: MemberOption[];
  authors: string[];
}) {
  const [panel, setPanel] = useState<Panel>(null);
  const close = useCallback(() => setPanel(null), []);
  const open = loans.filter((l) => !l.returned_on);
  const returned = loans.filter((l) => l.returned_on).slice(0, 4);
  const onShelf = stats.books - stats.on_loan;

  const ledger = [
    { label: "Books", value: stats.books, href: "/admin/books" },
    { label: "On the shelf", value: onShelf, href: "/admin/books" },
    { label: "Out on loan", value: stats.on_loan, href: "/admin/loans" },
    { label: "Overdue", value: stats.overdue, href: "/admin/loans", alarm: stats.overdue > 0 },
  ];

  return (
    <>
      <div className="mb-6 sm:mb-8">
        <p className="text-[15px] text-ink-faint">{formatLongDay(stats.today)}</p>
        <h1
          className="mt-1 font-serif text-[32px] font-semibold leading-[1.1] tracking-[-0.015em] sm:text-[38px]"
          style={{ fontVariationSettings: '"opsz" 60' }}
        >
          Today at the library
        </h1>
        <div className="mt-5 grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
          <button type="button" className={button.stamp} onClick={() => setPanel("lend")}>
            <BookUp2 className="size-4" aria-hidden />
            Lend a book
          </button>
          <div className="grid grid-cols-2 gap-2 sm:contents">
            <button type="button" className={button.secondary} onClick={() => setPanel("book")}>
              <BookPlus className="size-4" aria-hidden />
              Add a book
            </button>
            <button type="button" className={button.secondary} onClick={() => setPanel("member")}>
              <UserPlus className="size-4" aria-hidden />
              Add a member
            </button>
          </div>
        </div>
      </div>

      {/* One ledger strip rather than four separate cards. */}
      <dl className="grid grid-cols-2 overflow-hidden rounded-[14px] border border-line bg-surface sm:grid-cols-4">
        {ledger.map((item, index) => (
          <Link
            key={item.label}
            href={item.href}
            className={`group px-4 py-4 transition-colors hover:bg-sunken sm:px-5 ${index % 2 === 1 ? "border-l border-line" : ""} ${
              index > 1 ? "border-t border-line sm:border-t-0" : ""
            } ${index > 0 ? "sm:border-l" : ""}`}
          >
            <dt className="text-[15px] text-ink-soft">{item.label}</dt>
            <dd
              className={`mt-1 font-serif text-[34px] font-semibold leading-none tabular-nums ${item.alarm ? "text-alarm" : ""}`}
              style={{ fontVariationSettings: '"opsz" 48' }}
            >
              {item.value}
            </dd>
          </Link>
        ))}
      </dl>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        <section aria-labelledby="due-heading" className="min-w-0">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 id="due-heading" className="font-serif text-[22px] font-semibold">
              Due back
            </h2>
            <Link href="/admin/loans" className="inline-flex items-center gap-0.5 text-[15px] font-medium text-stamp hover:underline">
              All loans
              <ChevronRight className="size-4" aria-hidden />
            </Link>
          </div>
          {open.length === 0 ? (
            <div className="flex items-center gap-3 rounded-[14px] border border-dashed border-line-strong p-5 text-ink-soft">
              <CircleCheck className="size-5 text-leaf" aria-hidden />
              Every book is on the shelf.
            </div>
          ) : (
            <ul className="space-y-2.5">
              {open.slice(0, 6).map((loan, index) => (
                <motion.li
                  key={loan.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                  className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-[14px] border border-line bg-surface px-4 py-3.5"
                >
                  <DueStamp dueOn={loan.due_on} overdue={loan.days_left < 0} />
                  <div className="min-w-0 flex-1">
                    <p className="font-serif text-[17px] font-semibold leading-snug">{loan.title}</p>
                    <p className="text-[15px] text-ink-soft">
                      {loan.member}
                      <span className={loan.days_left < 0 ? "font-semibold text-alarm" : "text-ink-faint"}>
                        {", "}
                        {dueLabel(loan.days_left).toLowerCase()}
                      </span>
                    </p>
                  </div>
                  <div className="flex w-full items-center gap-1 sm:w-auto [&>button]:flex-1 sm:[&>button]:flex-none">
                    <RemindButton member={loan.member} phone={loan.phone} title={loan.title} dueOn={loan.due_on} daysLeft={loan.days_left} />
                    <ReturnButton loanId={loan.id} />
                  </div>
                </motion.li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="returned-heading" className="min-w-0">
          <h2 id="returned-heading" className="mb-3 font-serif text-[22px] font-semibold">
            Recently returned
          </h2>
          {returned.length === 0 ? (
            <p className="rounded-[14px] border border-dashed border-line-strong p-5 text-ink-soft">Returns will show here.</p>
          ) : (
            <ul className="divide-y divide-line rounded-[14px] border border-line bg-surface">
              {returned.map((loan) => (
                <li key={loan.id} className="flex items-center gap-3 px-4 py-3">
                  <CircleCheck className="size-5 shrink-0 text-leaf" aria-hidden />
                  <div className="min-w-0">
                    <p className="truncate font-serif font-semibold">{loan.title}</p>
                    <p className="text-sm text-ink-faint">
                      {loan.member}, {formatDate(loan.returned_on!, { year: false })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <Sheet open={panel === "lend"} onClose={close} title="Lend a book">
        <LendForm books={books} members={members} today={stats.today} onDone={close} onAddMember={() => setPanel("lend-member")} />
      </Sheet>
      <Sheet open={panel === "book"} onClose={close} title="Add a book" description="It goes straight onto the shelf.">
        <BookForm authors={authors} onDone={close} />
      </Sheet>
      <Sheet open={panel === "member" || panel === "lend-member"} onClose={close} title="Add a member">
        <MemberForm onDone={() => setPanel(panel === "lend-member" ? "lend" : null)} />
      </Sheet>
    </>
  );
}
