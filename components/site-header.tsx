import Link from "next/link";
import { BookMarked, KeyRound, LibraryBig } from "lucide-react";
import { Wordmark } from "@/components/wordmark";

const LINKS = [
  { href: "/", label: "Catalogue", key: "catalogue", icon: LibraryBig },
  { href: "/me", label: "My books", key: "me", icon: BookMarked },
  { href: "/admin", label: "Librarian", key: "admin", icon: KeyRound },
] as const;

export function SiteHeader({ active }: { active: "catalogue" | "me" }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
        <Link href="/" className="shrink-0 rounded-md">
          <Wordmark />
        </Link>
        <nav aria-label="Main" className="flex items-center gap-0.5">
          {LINKS.map(({ href, label, key, icon: Icon }) => {
            const current = key === active;
            return (
              <Link
                key={key}
                href={href}
                aria-current={current ? "page" : undefined}
                className={`inline-flex h-10 items-center gap-2 rounded-[10px] px-2.5 text-[15px] font-medium transition-colors sm:px-3 ${
                  current ? "bg-sunken text-ink" : "text-ink-soft hover:bg-sunken hover:text-ink"
                } ${key === "catalogue" ? "max-sm:hidden" : ""}`}
              >
                <Icon className="size-4" aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
