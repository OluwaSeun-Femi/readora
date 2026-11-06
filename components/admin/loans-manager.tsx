"use client";

import { useCallback, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRightLeft, BookUp2, CircleCheck, Search, SearchX } from "lucide-react";
import type { LoanRow } from "@/db/queries";
import { dueLabel, formatDate } from "@/lib/format";
import { button, input } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { Sheet } from "@/components/ui/sheet";
import { DueStamp } from "@/components/ui/status";
import { LendForm, MemberForm, ReturnButton, type BookOption, type MemberOption } from "./forms";
import { EmptyState, PageHeader } from "./page-header";
import { RemindButton } from "./remind-button";

type Filter = "out" | "overdue" | "returned";

export function LoansManager({
  loans,
  books,
  members,
  today,
}: {
  loans: LoanRow[];
  books: BookOption[];
  members: MemberOption[];
  today: string;
}) {
  const [filter, setFilter] = useState<Filter>("out");
  const [query, setQuery] = useState("");
  const [panel, setPanel] = useState<"lend" | "member" | null>(null);
  const close = useCallback(() => setPanel(null), []);

  const open = loans.filter((l) => !l.returned_on);
  const overdue = open.filter((l) => l.days_left < 0);
  const returned = loans.filter((l) => l.returned_on);

  const shown = useMemo(() => {
    const list = filter === "out" ? open : filter === "overdue" ? overdue : returned;
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    return list.filter((l) => words.every((w) => `${l.title} ${l.author} ${l.member}`.toLowerCase().includes(w)));
  }, [filter, open, overdue, returned, query]);

  return (
    <>
      <PageHeader
        title="Loans"
        description={
          overdue.length
            ? `${open.length} out now. ${overdue.length} ${overdue.length === 1 ? "is" : "are"} overdue.`
            : `${open.length} out now, none overdue.`
        }
        actions={
          <button type="button" className={button.stamp} onClick={() => setPanel("lend")}>
            <BookUp2 className="size-4" aria-hidden />
            Lend a book
          </button>
        }
      />

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <Segmented
          label="Show"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "out", label: "Out now", count: open.length },
            { value: "overdue", label: "Overdue", count: overdue.length },
            { value: "returned", label: "Returned", count: returned.length },
          ]}
        />
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-ink-faint" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search book or member"
            aria-label="Search loans"
            className={`${input} pl-11`}
          />
        </div>
      </div>

      <div className="mt-4">
        {shown.length === 0 ? (
          query ? (
            <EmptyState icon={SearchX} title="No loans match">
              Try the member&rsquo;s first name or a word from the title.
            </EmptyState>
          ) : filter === "overdue" ? (
            <EmptyState icon={CircleCheck} title="Nothing is overdue">
              Every book that&rsquo;s out is still within its 14 days.
            </EmptyState>
          ) : (
            <EmptyState
              icon={ArrowRightLeft}
              title={filter === "out" ? "Every book is on the shelf" : "No returns yet"}
              action={
                filter === "out" ? (
                  <button type="button" className={button.stamp} onClick={() => setPanel("lend")}>
                    <BookUp2 className="size-4" aria-hidden />
                    Lend a book
                  </button>
                ) : undefined
              }
            >
              {filter === "out" ? "Books you lend will show here until they come back." : "Returned books are listed here."}
            </EmptyState>
          )
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-[14px] border border-line bg-surface">
            <AnimatePresence initial={false}>
              {shown.map((loan) => (
                <motion.li
                  key={loan.id}
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="flex items-center gap-4 px-4 py-4">
                    <div className="hidden w-[78px] shrink-0 justify-center sm:flex">
                      {loan.returned_on ? (
                        <CircleCheck className="size-7 text-leaf" aria-hidden />
                      ) : (
                        <DueStamp dueOn={loan.due_on} overdue={loan.days_left < 0} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-serif text-[17px] font-semibold leading-snug">{loan.title}</p>
                      <p className="text-[15px] text-ink-soft">
                        {loan.returned_on ? "Borrowed by " : "With "}
                        <span className="font-medium text-ink">{loan.member}</span>
                        {loan.phone && !loan.returned_on && (
                          <>
                            {", "}
                            <a href={`tel:${loan.phone.replace(/\s/g, "")}`} className="underline-offset-4 hover:underline">
                              {loan.phone}
                            </a>
                          </>
                        )}
                      </p>
                      <p
                        className={`mt-0.5 text-sm ${
                          !loan.returned_on && loan.days_left < 0 ? "font-semibold text-alarm" : "text-ink-faint"
                        }`}
                      >
                        {loan.returned_on
                          ? `Lent ${formatDate(loan.borrowed_on, { year: false })}, returned ${formatDate(loan.returned_on, { year: false })}`
                          : `Lent ${formatDate(loan.borrowed_on, { year: false })}. ${dueLabel(loan.days_left)}${
                              loan.days_left >= 0 ? ` (${formatDate(loan.due_on, { year: false })})` : ""
                            }`}
                      </p>
                    </div>
                    {!loan.returned_on && (
                      <div className="flex shrink-0 items-center gap-1">
                        <RemindButton member={loan.member} phone={loan.phone} title={loan.title} dueOn={loan.due_on} daysLeft={loan.days_left} />
                        <ReturnButton loanId={loan.id} />
                      </div>
                    )}
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>

      <Sheet open={panel === "lend"} onClose={close} title="Lend a book">
        <LendForm books={books} members={members} today={today} onDone={close} onAddMember={() => setPanel("member")} />
      </Sheet>
      <Sheet open={panel === "member"} onClose={close} title="Add a member">
        <MemberForm onDone={() => setPanel("lend")} />
      </Sheet>
    </>
  );
}
