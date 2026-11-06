"use client";

import { useActionState } from "react";
import { KeyRound, LoaderCircle } from "lucide-react";
import { signIn } from "@/app/actions";
import { idle } from "@/lib/types";
import { button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signIn, idle);
  return (
    <form action={formAction} className="mt-6 space-y-4" noValidate>
      <Field
        label="Passcode"
        name="passcode"
        type="password"
        autoComplete="current-password"
        autoFocus
        error={!state.ok && state.message ? state.message : undefined}
      />
      <button type="submit" disabled={pending} className={`${button.primary} w-full`}>
        {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <KeyRound className="size-4" aria-hidden />}
        {pending ? "Checking…" : "Sign in"}
      </button>
    </form>
  );
}
