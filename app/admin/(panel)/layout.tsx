import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { LogOut, ShieldAlert } from "lucide-react";
import { AdminNav, NavView } from "@/components/admin/nav";
import { adminLocked } from "@/lib/admin-auth";
import { signOut } from "@/app/actions";

export const metadata: Metadata = {
  title: "Librarian",
  robots: { index: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full lg:pl-[248px]">
      <Suspense fallback={<NavView pathname="" />}>
        <AdminNav
          footer={
            <Suspense fallback={null}>
              <SignOut />
            </Suspense>
          }
        />
      </Suspense>
      <main className="mx-auto w-full max-w-5xl px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-16 lg:pt-10">
        <Suspense fallback={null}>
          <OpenAdminNotice />
        </Suspense>
        {children}
      </main>
    </div>
  );
}

async function SignOut() {
  await connection();
  if (!adminLocked()) return null;
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="flex h-10 w-full items-center gap-3 rounded-[10px] px-3 text-[15px] font-medium text-ink-soft hover:bg-sunken hover:text-ink max-lg:size-10 max-lg:justify-center max-lg:px-0"
        aria-label="Sign out"
      >
        <LogOut className="size-[18px]" aria-hidden />
        <span className="max-lg:sr-only">Sign out</span>
      </button>
    </form>
  );
}

/** Warns when ADMIN_PASSCODE isn't set, because then anyone with the link can make changes. */
async function OpenAdminNotice() {
  await connection();
  if (adminLocked()) return null;
  return (
    <div className="mb-6 flex gap-3 rounded-[14px] border border-[#e9c46a]/60 bg-[#fdf6e3] p-4 text-[15px] text-[#6b4e0e] dark:border-[#e9c46a]/25 dark:bg-[#2a2310] dark:text-[#f0d897]">
      <ShieldAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
      <p>
        <span className="font-semibold">The librarian pages are open to anyone with the link.</span> Add an{" "}
        <code className="rounded bg-black/5 px-1 py-0.5 text-[14px] dark:bg-white/10">ADMIN_PASSCODE</code> environment
        variable to ask for a passcode.
      </p>
    </div>
  );
}
