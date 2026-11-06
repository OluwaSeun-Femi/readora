"use client";

import { useActionState } from "react";
import { motion } from "motion/react";
import { KeyRound, LoaderCircle } from "lucide-react";
import { memberSignIn } from "@/app/actions";
import { idle } from "@/lib/types";
import { button } from "@/components/ui/button";
import { Field, FormMessage } from "@/components/ui/field";
import { Wordmark } from "@/components/wordmark";

export function MemberSignIn() {
  const [state, formAction, pending] = useActionState(memberSignIn, idle);
  const error = (name: string) => (!state.ok && state.field === name ? state.message : undefined);

  return (
    <div className="mx-auto grid max-w-4xl items-center gap-10 md:grid-cols-[1fr_400px]">
      <div>
        <h1
          className="font-serif text-[40px] font-semibold leading-[1.05] tracking-[-0.02em] sm:text-[52px]"
          style={{ fontVariationSettings: '"opsz" 72' }}
        >
          Your books, your streak
        </h1>
        <p className="mt-4 max-w-md text-[17px] text-ink-soft">
          Sign in to see the books you have at home, mark how far you&rsquo;ve read, and stamp your reading card each day you
          read.
        </p>
        <p className="mt-6 text-[15px] text-ink-faint">
          No PIN yet? Ask the librarian. They&rsquo;ll send one to your phone.
        </p>
      </div>

      {/* The form sits on a library card. */}
      <motion.div
        initial={{ rotate: 2, y: 12, opacity: 0 }}
        animate={{ rotate: 0, y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 22, stiffness: 200 }}
        className="relative overflow-hidden rounded-[18px] border border-line bg-surface p-6 shadow-[0_24px_48px_-28px_rgb(10_14_30/0.45)]"
      >
        {/* a date-due strip along the top, like the slip in a library book */}
        <div aria-hidden className="absolute inset-x-0 top-0 h-1.5 bg-stamp/80" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <Wordmark />
            <span className="font-serif text-sm italic text-ink-faint">Library card</span>
          </div>
          <form action={formAction} className="mt-6 space-y-4" noValidate>
            <Field
              label="Phone number"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              defaultValue={state.fields?.phone}
              placeholder="0803 123 4567"
              error={error("phone")}
            />
            <Field
              label="PIN"
              name="pin"
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              maxLength={6}
              placeholder="6 digits"
              error={error("pin")}
              className="[&_input]:tracking-[0.3em] [&_input]:placeholder:tracking-normal"
            />
            {!state.ok && state.message && !state.field && <FormMessage ok={false} message={state.message} />}
            <button type="submit" disabled={pending} className={`${button.primary} w-full`}>
              {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <KeyRound className="size-4" aria-hidden />}
              {pending ? "Checking…" : "Sign in"}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
