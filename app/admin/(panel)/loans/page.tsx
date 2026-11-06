import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { getBooks, getLoans, getMembers, getToday } from "@/db/queries";
import { LoansManager } from "@/components/admin/loans-manager";
import { ListSkeleton } from "@/components/admin/page-header";

export const metadata: Metadata = { title: "Loans" };

export default function LoansPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <LoansData />
    </Suspense>
  );
}

async function LoansData() {
  await connection();
  const [loans, books, members, today] = await Promise.all([getLoans(), getBooks(), getMembers(), getToday()]);
  return (
    <LoansManager
      loans={loans}
      books={books.filter((b) => !b.loan_id).map(({ id, title, author }) => ({ id, title, author }))}
      members={members.map(({ id, name }) => ({ id, name }))}
      today={today}
    />
  );
}
