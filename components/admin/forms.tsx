"use client";

import { useActionState, useEffect, useTransition } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { BookPlus, BookUp2, Copy, KeyRound, LoaderCircle, MessageCircle, Save, Trash2, Undo2, UserPlus } from "lucide-react";
import { useState } from "react";
import { addBook, addMember, deleteBook, issuePin, lendBook, returnLoan, updateBook, updateMember } from "@/app/actions";
import { idle, type ActionResult } from "@/lib/types";
import { addDays, formatDate } from "@/lib/format";
import { button } from "@/components/ui/button";
import { Field, FormMessage, SelectField } from "@/components/ui/field";
import { DueStamp } from "@/components/ui/status";

export type BookOption = { id: number; title: string; author: string };
export type MemberOption = { id: number; name: string };

function Spinner() {
  return <LoaderCircle className="size-4 animate-spin" aria-hidden />;
}

/* ------------------------------------------------------------- book form */

export function BookForm({
  book,
  authors,
  onDone,
}: {
  book?: { id: number; title: string; author: string; year: number | null; cover_url?: string | null };
  authors: string[];
  onDone?: (result: ActionResult) => void;
}) {
  const editing = Boolean(book);
  const [state, formAction, pending] = useActionState(async (prev: ActionResult, formData: FormData) => {
    const result = await (editing ? updateBook : addBook)(prev, formData);
    if (result.ok) {
      toast.success(result.message);
      onDone?.(result);
    }
    return result;
  }, idle);

  const fields = state.fields ?? {
    title: book?.title ?? "",
    author: book?.author ?? "",
    year: book?.year ? String(book.year) : "",
  };
  const error = (name: string) => (!state.ok && state.field === name ? state.message : undefined);

  return (
    // No "required" attributes: the server action checks the input and explains what's wrong.
    <form action={formAction} className="space-y-4" noValidate>
      {book && <input type="hidden" name="id" value={book.id} />}
      <Field
        label="Title"
        name="title"
        defaultValue={fields.title}
        placeholder="Anthills of the Savannah"
        autoComplete="off"
        error={error("title")}
        data-autofocus
      />
      <div className="grid grid-cols-[1fr_7.5rem] gap-3">
        <Field
          label="Author"
          name="author"
          list="author-names"
          defaultValue={fields.author}
          placeholder="Chinua Achebe"
          autoComplete="off"
          error={error("author")}
        />
        <Field
          label="Year"
          hint="Optional"
          name="year"
          inputMode="numeric"
          defaultValue={fields.year}
          placeholder="1987"
          error={error("year")}
        />
      </div>
      <datalist id="author-names">
        {authors.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
      <p className="text-sm text-ink-faint">
        Pick an author from the suggestions to keep one entry per person. Capitals don&rsquo;t matter.
        {!editing && " The front cover is looked up for you."}
      </p>
      {book && (
        <fieldset>
          <legend className="mb-1.5 text-[15px] font-medium">Front cover</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {[
              { value: "keep", label: book.cover_url ? "Keep this cover" : "Keep as it is" },
              { value: "lookup", label: "Look it up again" },
              { value: "none", label: "Use the designed cover" },
            ].map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-center gap-2.5 rounded-[10px] border border-line-strong px-3 py-2.5 text-[15px] has-[:checked]:border-stamp has-[:checked]:bg-stamp-soft has-[:checked]:text-stamp"
              >
                <input type="radio" name="cover" value={option.value} defaultChecked={option.value === "keep"} className="accent-[var(--color-stamp)]" />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {!state.ok && state.message && !state.field && <FormMessage ok={false} message={state.message} />}
      <button type="submit" disabled={pending} className={`${button.primary} w-full`}>
        {pending ? <Spinner /> : editing ? <Save className="size-4" aria-hidden /> : <BookPlus className="size-4" aria-hidden />}
        {pending ? (editing ? "Saving…" : "Adding…") : editing ? "Save changes" : "Add book"}
      </button>
    </form>
  );
}

/* ----------------------------------------------------------- member form */

export function MemberForm({
  member,
  onDone,
}: {
  member?: { id: number; name: string; phone: string | null };
  onDone?: (result: ActionResult) => void;
}) {
  const [state, formAction, pending] = useActionState(async (prev: ActionResult, formData: FormData) => {
    const result = await (member ? updateMember : addMember)(prev, formData);
    if (result.ok) {
      toast.success(result.message);
      onDone?.(result);
    }
    return result;
  }, idle);
  const fields = state.fields ?? { name: member?.name ?? "", phone: member?.phone ?? "" };
  const error = (name: string) => (!state.ok && state.field === name ? state.message : undefined);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {member && <input type="hidden" name="id" value={member.id} />}
      <Field label="Name" name="name" defaultValue={fields.name} placeholder="Bola Ade" autoComplete="off" error={error("name")} data-autofocus />
      <Field
        label="Phone number"
        hint="Optional"
        name="phone"
        type="tel"
        inputMode="tel"
        defaultValue={fields.phone}
        placeholder="+234 803 555 0199"
        error={error("phone")}
      />
      {!state.ok && state.message && !state.field && <FormMessage ok={false} message={state.message} />}
      <button type="submit" disabled={pending} className={`${button.primary} w-full`}>
        {pending ? <Spinner /> : member ? <Save className="size-4" aria-hidden /> : <UserPlus className="size-4" aria-hidden />}
        {pending ? (member ? "Saving…" : "Adding…") : member ? "Save changes" : "Add member"}
      </button>
    </form>
  );
}

/* ------------------------------------------------------------- lend form */

export function LendForm({
  books,
  members,
  today,
  bookId,
  memberId,
  onDone,
  onAddMember,
}: {
  books: BookOption[]; // available books only
  members: MemberOption[];
  today: string;
  bookId?: number;
  memberId?: number;
  onDone?: () => void;
  onAddMember?: () => void;
}) {
  const [state, formAction, pending] = useActionState(async (prev: ActionResult, formData: FormData) => {
    const result = await lendBook(prev, formData);
    if (result.ok && result.data) {
      toast.success(result.message, { description: `Due back ${formatDate(result.data.due_on)}` });
    } else if (!result.ok && !result.field) {
      toast.error(result.message);
    }
    return result;
  }, idle);

  // After the stamp lands, close the sheet.
  useEffect(() => {
    if (!state.ok) return;
    const timer = window.setTimeout(() => onDone?.(), 1500);
    return () => window.clearTimeout(timer);
  }, [state, onDone]);

  if (state.ok && state.data) {
    return (
      <div className="flex flex-col items-center py-8 text-center" role="status">
        <motion.div
          initial={{ scale: 2.4, rotate: -18, opacity: 0 }}
          animate={{ scale: 1, rotate: -4, opacity: 1 }}
          transition={{ type: "spring", damping: 13, stiffness: 320, mass: 0.7 }}
        >
          <DueStamp dueOn={state.data.due_on} className="scale-[1.9]" />
        </motion.div>
        <motion.p
          className="mt-12 font-serif text-xl font-semibold"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          On loan to {state.data.member}
        </motion.p>
        <motion.p className="mt-1 text-ink-soft" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
          &ldquo;{state.data.title}&rdquo;, due {formatDate(state.data.due_on)}
        </motion.p>
      </div>
    );
  }

  const error = (name: string) => (!state.ok && state.field === name ? state.message : undefined);
  const fixedBook = bookId ? books.find((b) => b.id === bookId) : undefined;
  const due = addDays(today, 14);

  if (books.length === 0) {
    return <p className="py-6 text-ink-soft">Every book is out on loan right now. Record a return first.</p>;
  }

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {fixedBook ? (
        <div>
          <input type="hidden" name="bookId" value={fixedBook.id} />
          <p className="mb-1.5 text-[15px] font-medium">Book</p>
          <p className="rounded-[10px] bg-sunken px-3.5 py-3">
            <span className="font-serif font-semibold">{fixedBook.title}</span>
            <span className="text-ink-soft"> by {fixedBook.author}</span>
          </p>
        </div>
      ) : (
        <SelectField label="Book" name="bookId" defaultValue={bookId ?? ""} error={error("bookId")}>
          <option value="" disabled>
            Choose a book on the shelf
          </option>
          {books.map((b) => (
            <option key={b.id} value={b.id}>
              {b.title} ({b.author})
            </option>
          ))}
        </SelectField>
      )}

      {members.length === 0 ? (
        <p className="rounded-[10px] bg-sunken px-3.5 py-3 text-ink-soft">Add a member before lending a book.</p>
      ) : (
        <SelectField
          label="Lend to"
          name="memberId"
          defaultValue={memberId ?? ""}
          error={error("memberId")}
          data-autofocus={fixedBook ? true : undefined}
        >
          <option value="" disabled>
            Choose a member
          </option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </SelectField>
      )}
      {onAddMember && (
        <button type="button" onClick={onAddMember} className="text-[15px] font-medium text-stamp underline-offset-4 hover:underline">
          Someone new? Add them as a member
        </button>
      )}

      <div className="flex items-center gap-4 rounded-[14px] border border-dashed border-line-strong p-4">
        <DueStamp dueOn={due} />
        <p className="text-[15px] text-ink-soft">
          Loans last 14 days, so this one is due back on <span className="font-semibold text-ink">{formatDate(due)}</span>.
        </p>
      </div>

      <button type="submit" disabled={pending || members.length === 0} className={`${button.stamp} w-full`}>
        {pending ? <Spinner /> : <BookUp2 className="size-4" aria-hidden />}
        {pending ? "Lending…" : "Lend book"}
      </button>
    </form>
  );
}

/* --------------------------------------------------------- return button */

export function ReturnButton({ loanId, size = "small" }: { loanId: number; size?: "small" | "full" }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await returnLoan(loanId);
          if (result.ok) toast.success(result.message);
          else toast.error(result.message);
        })
      }
      className={size === "full" ? `${button.secondary} w-full` : button.small}
    >
      {pending ? <Spinner /> : <Undo2 className="size-4" aria-hidden />}
      {pending ? "Recording…" : "Mark returned"}
    </button>
  );
}

/* ----------------------------------------------------------- delete book */

export function DeleteBook({
  book,
  onDone,
  onCancel,
}: {
  book: { id: number; title: string; borrower: string | null; loan_id: number | null };
  onDone: () => void;
  onCancel: () => void;
}) {
  const [pending, startTransition] = useTransition();

  if (book.loan_id) {
    return (
      <div className="space-y-4 pb-2">
        <p className="rounded-[12px] bg-alarm-soft p-4 text-[15px] font-medium text-alarm">
          This book is on loan{book.borrower ? ` to ${book.borrower}` : ""}. Record the return first, then you can delete it.
        </p>
        <ReturnButton loanId={book.loan_id} size="full" />
        <button type="button" onClick={onCancel} className={`${button.ghost} w-full`}>
          Keep the book
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-2">
      <p className="text-[16px] text-ink-soft">
        &ldquo;<span className="font-serif font-semibold text-ink">{book.title}</span>&rdquo; and its loan history will be removed. This
        can&rsquo;t be undone.
      </p>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} className={button.secondary} data-autofocus>
          Keep the book
        </button>
        <button
          type="button"
          disabled={pending}
          className={button.danger}
          onClick={() =>
            startTransition(async () => {
              const result = await deleteBook(book.id);
              if (result.ok) {
                toast.success(result.message);
                onDone();
              } else {
                toast.error(result.message);
              }
            })
          }
        >
          {pending ? <Spinner /> : <Trash2 className="size-4" aria-hidden />}
          {pending ? "Deleting…" : "Delete book"}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- PIN issue */

/** WhatsApp wants the number in international form without "+": 0803… becomes 234803…. */
function whatsappNumber(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("0") && digits.length === 11 ? `234${digits.slice(1)}` : digits;
}

export function PinIssuer({
  member,
  onClose,
}: {
  member: { id: number; name: string; phone: string | null; has_pin: boolean };
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [pin, setPin] = useState<string | null>(null);

  if (!member.phone) {
    return (
      <p className="rounded-[12px] bg-sunken p-4 text-[15px] text-ink-soft">
        Members sign in with their phone number. Add a phone number for {member.name} first.
      </p>
    );
  }

  if (pin) {
    const first = member.name.split(" ")[0];
    const link = typeof window === "undefined" ? "" : `${window.location.origin}/me`;
    const message = `Hello ${first}, your Readora library PIN is ${pin}. Sign in at ${link} with your phone number and this PIN to see your books and reading streak.`;
    return (
      <div className="space-y-4 pb-2">
        <p className="text-[15px] text-ink-soft">
          Give this PIN to {member.name}. It won&rsquo;t be shown again; you can always make a new one.
        </p>
        <motion.p
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="rounded-[14px] bg-stamp-soft py-5 text-center font-serif text-[40px] font-semibold tracking-[0.3em] text-stamp tabular-nums"
          aria-label={`PIN ${pin.split("").join(" ")}`}
        >
          {pin}
        </motion.p>
        <div className="grid gap-2 sm:grid-cols-2">
          <a
            href={`https://wa.me/${whatsappNumber(member.phone)}?text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noreferrer"
            className={`${button.primary} w-full`}
          >
            <MessageCircle className="size-4" aria-hidden />
            Send on WhatsApp
          </a>
          <button
            type="button"
            className={`${button.secondary} w-full`}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(pin);
                toast.success("PIN copied.");
              } catch {
                toast.error("Couldn't copy. Select the PIN and copy it instead.");
              }
            }}
          >
            <Copy className="size-4" aria-hidden />
            Copy PIN
          </button>
        </div>
        <button type="button" onClick={onClose} className={`${button.ghost} w-full`}>
          Done
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-2">
      <p className="text-[16px] text-ink-soft">
        {member.name} will sign in with <span className="font-medium text-ink">{member.phone}</span> and a 6-digit PIN to see the
        books they have and their reading streak.
        {member.has_pin && " Making a new PIN stops the old one working and signs them out everywhere."}
      </p>
      <button
        type="button"
        disabled={pending}
        className={`${button.stamp} w-full`}
        data-autofocus
        onClick={() =>
          startTransition(async () => {
            const result = await issuePin(member.id);
            if (result.ok && result.data) setPin(result.data.pin);
            else toast.error(result.message);
          })
        }
      >
        {pending ? <Spinner /> : <KeyRound className="size-4" aria-hidden />}
        {member.has_pin ? "Make a new PIN" : "Make a PIN"}
      </button>
    </div>
  );
}
