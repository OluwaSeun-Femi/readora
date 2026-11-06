"use client";

import { useCallback, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BookUp2, KeyRound, Pencil, Phone, Search, SearchX, TriangleAlert, UserPlus, Users } from "lucide-react";
import type { MemberRow } from "@/db/queries";
import { clothFor } from "@/lib/covers";
import { dueLabel, formatDate, initials, plural } from "@/lib/format";
import { button, input } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { LendForm, MemberForm, PinIssuer, ReturnButton, type BookOption } from "./forms";
import { EmptyState, PageHeader } from "./page-header";

type Panel =
  | { kind: "add" }
  | { kind: "lend"; memberId: number }
  | { kind: "edit"; memberId: number }
  | { kind: "pin"; memberId: number }
  | null;

export function MembersManager({ members, books, today }: { members: MemberRow[]; books: BookOption[]; today: string }) {
  const [query, setQuery] = useState("");
  const [panel, setPanel] = useState<Panel>(null);
  const [fresh, setFresh] = useState<string | null>(null);
  const close = useCallback(() => setPanel(null), []);

  const shown = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    return members.filter((m) => {
      const haystack = `${m.name} ${m.phone ?? ""} ${m.loans.map((l) => l.title).join(" ")}`.toLowerCase();
      return words.every((word) => haystack.includes(word));
    });
  }, [members, query]);

  const borrowing = members.filter((m) => m.books_out > 0).length;
  const current = panel && "memberId" in panel ? members.find((m) => m.id === panel.memberId) : undefined;

  return (
    <>
      <PageHeader
        title="Members"
        description={`${plural(members.length, "member")}, ${borrowing} with books at home.`}
        actions={
          <button type="button" className={button.primary} onClick={() => setPanel({ kind: "add" })}>
            <UserPlus className="size-4" aria-hidden />
            Add a member
          </button>
        }
      />

      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-ink-faint" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, phone or book"
          aria-label="Search members"
          className={`${input} pl-11`}
        />
      </div>

      <div className="mt-4">
        {shown.length === 0 ? (
          members.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No members yet"
              action={
                <button type="button" className={button.primary} onClick={() => setPanel({ kind: "add" })}>
                  <UserPlus className="size-4" aria-hidden />
                  Add the first member
                </button>
              }
            >
              Members are the people you lend books to.
            </EmptyState>
          ) : (
            <EmptyState icon={SearchX} title="No members match">
              Check the spelling, or search by phone number.
            </EmptyState>
          )
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            <AnimatePresence initial={false}>
              {shown.map((member) => {
                const tint = clothFor(member.name);
                return (
                  <motion.li
                    key={member.id}
                    layout
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                      boxShadow:
                        fresh === member.name
                          ? ["0 0 0 3px var(--color-stamp)", "0 0 0 0px var(--color-stamp)"]
                          : "0 0 0 0px var(--color-stamp)",
                    }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.25, boxShadow: { duration: 2 } }}
                    className="flex flex-col rounded-[14px] border border-line bg-surface p-4"
                  >
                    <div className="flex items-start gap-3.5">
                      <span
                        className="cloth inline-flex size-11 shrink-0 items-center justify-center rounded-full font-serif text-[15px] font-semibold"
                        style={{ backgroundColor: tint.bg, color: tint.foil }}
                        aria-hidden
                      >
                        {initials(member.name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-serif text-[18px] font-semibold leading-snug">{member.name}</p>
                        {member.phone ? (
                          <a
                            href={`tel:${member.phone.replace(/\s/g, "")}`}
                            className="mt-0.5 inline-flex items-center gap-1.5 text-[15px] text-ink-soft hover:text-ink"
                          >
                            <Phone className="size-3.5" aria-hidden />
                            {member.phone}
                          </a>
                        ) : (
                          <p className="mt-0.5 text-[15px] text-ink-faint">No phone number</p>
                        )}
                      </div>
                      {member.overdue > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-alarm-soft px-2 py-0.5 text-sm font-medium text-alarm">
                          <TriangleAlert className="size-3.5" aria-hidden />
                          Overdue
                        </span>
                      )}
                    </div>

                    {member.loans.length > 0 ? (
                      <ul className="mt-4 space-y-2 border-t border-line pt-3">
                        {member.loans.map((loan) => (
                          <li key={loan.loan_id} className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate font-serif font-semibold">{loan.title}</p>
                              <p className={`text-sm ${loan.days_left < 0 ? "font-medium text-alarm" : "text-ink-faint"}`}>
                                {loan.days_left < 0 ? dueLabel(loan.days_left) : `Due ${formatDate(loan.due_on, { year: false })}`}
                              </p>
                            </div>
                            <ReturnButton loanId={loan.loan_id} />
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-4 border-t border-line pt-3 text-[15px] text-ink-faint">No books at home</p>
                    )}
                    <div className="mt-2 -mb-1 flex flex-wrap items-center gap-1">
                      <button
                        type="button"
                        className={`${button.ghost} -ml-3 text-stamp hover:text-stamp`}
                        onClick={() => setPanel({ kind: "lend", memberId: member.id })}
                      >
                        <BookUp2 className="size-4" aria-hidden />
                        Lend a book
                      </button>
                      <span className="flex-1" />
                      <button
                        type="button"
                        className={`${button.ghost} h-9 px-2.5 text-sm`}
                        onClick={() => setPanel({ kind: "pin", memberId: member.id })}
                      >
                        <KeyRound className="size-4" aria-hidden />
                        {member.has_pin ? "Can sign in" : "Give a PIN"}
                      </button>
                      <button
                        type="button"
                        className={button.icon}
                        onClick={() => setPanel({ kind: "edit", memberId: member.id })}
                        aria-label={`Edit ${member.name}`}
                      >
                        <Pencil className="size-[18px]" />
                      </button>
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </div>

      <Sheet open={panel?.kind === "add"} onClose={close} title="Add a member" description="Name is required. Phone is optional.">
        <MemberForm
          onDone={(result) => {
            setFresh(result.data?.name ?? null);
            setQuery("");
            close();
          }}
        />
      </Sheet>

      <Sheet open={panel?.kind === "edit" && Boolean(current)} onClose={close} title="Edit member">
        {current && panel?.kind === "edit" && <MemberForm key={current.id} member={current} onDone={close} />}
      </Sheet>

      <Sheet
        open={panel?.kind === "pin" && Boolean(current)}
        onClose={close}
        title={current?.has_pin ? `Sign-in PIN for ${current.name}` : `Give ${current?.name ?? ""} a PIN`}
        variant="dialog"
      >
        {current && panel?.kind === "pin" && <PinIssuer key={current.id} member={current} onClose={close} />}
      </Sheet>

      <Sheet open={panel?.kind === "lend"} onClose={close} title="Lend a book">
        {panel?.kind === "lend" && (
          <LendForm
            key={panel.memberId}
            books={books}
            members={members.map(({ id, name }) => ({ id, name }))}
            memberId={panel.memberId}
            today={today}
            onDone={close}
          />
        )}
      </Sheet>
    </>
  );
}
