import { Suspense } from "react";
import { connection } from "next/server";
import { getAuthorNames, getBooks, getLoans, getMembers, getStats } from "@/db/queries";
import { Overview } from "@/components/admin/overview";
import { ListSkeleton } from "@/components/admin/page-header";

export default function AdminHome() {
  return (
    <Suspense fallback={<ListSkeleton rows={4} />}>
      <OverviewData />
    </Suspense>
  );
}

async function OverviewData() {
  await connection();
  const [stats, loans, books, members, authors] = await Promise.all([
    getStats(),
    getLoans(),
    getBooks(),
    getMembers(),
    getAuthorNames(),
  ]);
  return (
    <Overview
      stats={stats}
      loans={loans}
      books={books.filter((b) => !b.loan_id).map(({ id, title, author }) => ({ id, title, author }))}
      members={members.map(({ id, name }) => ({ id, name }))}
      authors={authors}
    />
  );
}
