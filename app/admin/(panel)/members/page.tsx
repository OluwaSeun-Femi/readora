import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { getBooks, getMembers, getToday } from "@/db/queries";
import { MembersManager } from "@/components/admin/members-manager";
import { ListSkeleton } from "@/components/admin/page-header";

export const metadata: Metadata = { title: "Members" };

export default function MembersPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <MembersData />
    </Suspense>
  );
}

async function MembersData() {
  await connection();
  const [members, books, today] = await Promise.all([getMembers(), getBooks(), getToday()]);
  return (
    <MembersManager
      members={members}
      books={books.filter((b) => !b.loan_id).map(({ id, title, author }) => ({ id, title, author }))}
      today={today}
    />
  );
}
