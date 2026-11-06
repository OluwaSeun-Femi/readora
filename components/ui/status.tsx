import { CalendarClock, CircleCheck, TriangleAlert } from "lucide-react";
import { dueLabel, formatDate } from "@/lib/format";

/** Green "Available", indigo "On loan…", red when overdue. */
export function StatusPill({
  dueOn,
  daysLeft,
  borrower,
  compact = false,
}: {
  dueOn: string | null;
  daysLeft: number | null;
  borrower?: string | null;
  compact?: boolean;
}) {
  if (!dueOn) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-leaf-soft px-2.5 py-1 text-sm font-medium text-leaf">
        <CircleCheck className="size-4" aria-hidden />
        Available
      </span>
    );
  }
  const overdue = daysLeft !== null && daysLeft < 0;
  const Icon = overdue ? TriangleAlert : CalendarClock;
  const tone = overdue ? "bg-alarm-soft text-alarm" : "bg-stamp-soft text-stamp";
  const text = borrower
    ? `On loan to ${borrower}, due ${formatDate(dueOn, { year: false })}`
    : `Out on loan, due back ${formatDate(dueOn, { year: false })}`;
  return (
    <span className={`inline-flex max-w-full items-start gap-1.5 rounded-[10px] px-2.5 py-1 text-sm font-medium ${tone}`}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>
        {compact ? (overdue ? dueLabel(daysLeft!) : `Due ${formatDate(dueOn, { year: false })}`) : text}
        {!compact && overdue && <span className="font-semibold">. {dueLabel(daysLeft!)}</span>}
      </span>
    </span>
  );
}

/** The "date due" rubber stamp, the way a library slip is stamped. */
export function DueStamp({ dueOn, overdue = false, className = "" }: { dueOn: string; overdue?: boolean; className?: string }) {
  return (
    <span
      className={`inline-flex -rotate-[4deg] flex-col items-center rounded-[6px] border-2 px-2 py-0.5 font-serif leading-none ${
        overdue ? "border-alarm/70 text-alarm" : "border-stamp/70 text-stamp"
      } ${className}`}
      style={{ fontVariationSettings: '"opsz" 12' }}
    >
      <span className="text-[10px] font-semibold tracking-[0.06em]">{overdue ? "Overdue" : "Date due"}</span>
      <span className="text-[15px] font-bold tabular-nums">{formatDate(dueOn, { year: false })}</span>
    </span>
  );
}
