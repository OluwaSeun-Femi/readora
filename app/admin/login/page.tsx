import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./login-form";
import { Wordmark } from "@/components/wordmark";
import { ThemeToggle } from "@/components/theme-switch";

export const metadata: Metadata = { title: "Librarian sign-in", robots: { index: false } };

export default function LoginPage() {
  return (
    <main className="flex min-h-full flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-[400px]">
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-block rounded-md">
            <Wordmark />
          </Link>
          <ThemeToggle />
        </div>
        <h1 className="mt-8 font-serif text-[32px] font-semibold leading-tight tracking-[-0.015em]">Librarian sign-in</h1>
        <p className="mt-2 text-ink-soft">Enter the passcode to lend books, record returns and manage members.</p>
        <LoginForm />
        <Link href="/" className="mt-8 inline-block text-[15px] font-medium text-ink-soft underline-offset-4 hover:text-ink hover:underline">
          Back to the catalogue
        </Link>
      </div>
    </main>
  );
}
