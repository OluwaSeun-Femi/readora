"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { ArrowRightLeft, ExternalLink, LayoutDashboard, LibraryBig, Users } from "lucide-react";
import { Wordmark } from "@/components/wordmark";

const ITEMS = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/books", label: "Books", icon: LibraryBig },
  { href: "/admin/loans", label: "Loans", icon: ArrowRightLeft },
  { href: "/admin/members", label: "Members", icon: Users },
];

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

/** Sidebar on wide screens, bottom tab bar on phones. */
export function AdminNav({ footer }: { footer?: React.ReactNode }) {
  const pathname = usePathname();
  return <NavView pathname={pathname} footer={footer} />;
}

/** The same navigation without reading the URL, shown while the page streams in. */
export function NavView({ pathname, footer }: { pathname: string; footer?: React.ReactNode }) {
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-line bg-surface px-4 py-5 lg:flex">
        <Link href="/admin" className="rounded-md px-2">
          <Wordmark />
        </Link>
        <p className="mt-1 px-2 pl-[46px] text-sm text-ink-faint">Librarian</p>
        <nav className="mt-8 flex flex-col gap-1" aria-label="Admin">
          {ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`relative flex h-11 items-center gap-3 rounded-[10px] px-3 text-[15px] font-medium transition-colors ${
                  active ? "text-ink" : "text-ink-soft hover:bg-sunken hover:text-ink"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="side-active"
                    className="absolute inset-0 rounded-[10px] bg-sunken"
                    transition={{ type: "spring", damping: 32, stiffness: 400 }}
                  />
                )}
                {active && (
                  <motion.span
                    layoutId="side-bar"
                    className="absolute left-0 top-2.5 h-6 w-[3px] rounded-full bg-stamp"
                    transition={{ type: "spring", damping: 32, stiffness: 400 }}
                  />
                )}
                <Icon className="relative size-[18px]" aria-hidden />
                <span className="relative">{label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto flex flex-col gap-1 border-t border-line pt-4">
          <Link
            href="/"
            className="flex h-11 items-center gap-3 rounded-[10px] px-3 text-[15px] font-medium text-ink-soft hover:bg-sunken hover:text-ink"
          >
            <ExternalLink className="size-[18px]" aria-hidden />
            Open the catalogue
          </Link>
          {footer}
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line/70 bg-paper/85 px-4 backdrop-blur-md lg:hidden">
        <Link href="/admin" className="rounded-md">
          <Wordmark />
        </Link>
        <div className="flex items-center gap-1">
          <Link
            href="/"
            className="inline-flex size-10 items-center justify-center rounded-full text-ink-soft hover:bg-sunken hover:text-ink"
            aria-label="Open the catalogue"
          >
            <ExternalLink className="size-5" />
          </Link>
          {footer}
        </div>
      </header>

      <nav
        aria-label="Admin"
        className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 px-2 pt-1.5 backdrop-blur-md lg:hidden"
      >
        <ul className="mx-auto grid max-w-md grid-cols-4">
          {ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex flex-col items-center gap-0.5 rounded-[12px] py-1.5 text-xs font-medium transition-colors ${
                    active ? "text-stamp" : "text-ink-faint"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="tab-active"
                      className="absolute inset-x-3 top-0 h-8 rounded-full bg-stamp-soft"
                      transition={{ type: "spring", damping: 30, stiffness: 420 }}
                    />
                  )}
                  <Icon className="relative mt-1 size-[22px]" aria-hidden />
                  <span className="relative">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
