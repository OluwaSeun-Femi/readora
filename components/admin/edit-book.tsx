"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import type { BookRow } from "@/db/queries";
import { Cover } from "@/components/ui/book-art";
import { button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { StatusPill } from "@/components/ui/status";
import { BookForm, DeleteBook } from "./forms";

/** The full-page editor at /admin/books/[id]. */
export function EditBook({ book, authors }: { book: BookRow; authors: string[] }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="grid gap-8 md:grid-cols-[220px_1fr]">
      <div className="mx-auto w-40 md:mx-0 md:w-full">
        <Cover title={book.title} author={book.author} src={book.cover_url} size="lg" />
      </div>
      <div className="max-w-lg">
        <h1 className="font-serif text-[32px] font-semibold leading-[1.1] tracking-[-0.015em]">Edit book</h1>
        <div className="mb-6 mt-3">
          <StatusPill dueOn={book.due_on} daysLeft={book.days_left} borrower={book.borrower} />
        </div>
        <BookForm book={book} authors={authors} onDone={() => router.push("/admin/books")} />
        <div className="mt-8 border-t border-line pt-6">
          <button type="button" className={`${button.ghost} text-alarm hover:bg-alarm-soft hover:text-alarm`} onClick={() => setConfirming(true)}>
            <Trash2 className="size-4" aria-hidden />
            Delete this book
          </button>
        </div>
      </div>
      <Sheet
        open={confirming}
        onClose={() => setConfirming(false)}
        title={book.loan_id ? "This book is on loan" : "Delete this book?"}
        variant="dialog"
      >
        <DeleteBook book={book} onCancel={() => setConfirming(false)} onDone={() => router.push("/admin/books")} />
      </Sheet>
    </div>
  );
}
