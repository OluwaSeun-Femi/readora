import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ChevronLeft } from "lucide-react";
import { getAuthorNames, getBook } from "@/db/queries";
import { EditBook } from "@/components/admin/edit-book";
import { ListSkeleton } from "@/components/admin/page-header";

export const metadata: Metadata = { title: "Edit book" };

export default function EditBookPage({ params }: PageProps<"/admin/books/[id]">) {
  return (
    <>
      <Link
        href="/admin/books"
        className="-ml-2 mb-4 inline-flex h-10 items-center gap-1 rounded-[10px] px-2 text-[15px] font-medium text-ink-soft hover:bg-sunken hover:text-ink"
      >
        <ChevronLeft className="size-4" aria-hidden />
        All books
      </Link>
      <Suspense fallback={<ListSkeleton rows={2} />}>
        <EditBookData params={params} />
      </Suspense>
    </>
  );
}

async function EditBookData({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const bookId = Number(id);
  if (!Number.isInteger(bookId) || bookId <= 0) notFound();
  const [book, authors] = await Promise.all([getBook(bookId), getAuthorNames()]);
  if (!book) notFound();
  return <EditBook book={book} authors={authors} />;
}
