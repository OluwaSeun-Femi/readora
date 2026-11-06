import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { countMissingCovers, getAuthorNames, getBooks, getMembers, getToday } from "@/db/queries";
import { BooksManager } from "@/components/admin/books-manager";
import { ListSkeleton } from "@/components/admin/page-header";

export const metadata: Metadata = { title: "Books" };

export default function BooksPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <BooksData />
    </Suspense>
  );
}

async function BooksData() {
  await connection();
  const [books, members, authors, today, missingCovers] = await Promise.all([
    getBooks(),
    getMembers(),
    getAuthorNames(),
    getToday(),
    countMissingCovers(),
  ]);
  return (
    <BooksManager books={books} members={members.map(({ id, name }) => ({ id, name }))} authors={authors} today={today} missingCovers={missingCovers} />
  );
}
