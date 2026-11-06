"use client";

import { useActionState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { BookOpen, FileUp, LoaderCircle, TabletSmartphone, X } from "lucide-react";
import { removeBookText, uploadBookText } from "@/app/actions";
import { idle, type ActionResult } from "@/lib/types";
import type { BookRow } from "@/db/queries";
import { button, input } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/field";

/** On the edit page: give a book readable text from a .txt file, or take it away. */
export function EbookText({ book }: { book: BookRow }) {
  const [removing, startRemove] = useTransition();
  const [state, formAction, pending] = useActionState(async (prev: ActionResult, formData: FormData) => {
    const result = await uploadBookText(prev, formData);
    if (result.ok) toast.success(result.message);
    return result;
  }, idle);

  const fromGutenberg = book.ebook_source?.startsWith("gutenberg:");

  return (
    <section aria-labelledby="ebook-heading" className="mt-8 border-t border-line pt-6">
      <h2 id="ebook-heading" className="flex items-center gap-2 font-serif text-xl font-semibold">
        <TabletSmartphone className="size-5 text-stamp" aria-hidden />
        E-book
      </h2>
      {book.page_count > 0 ? (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[15px] text-ink-soft">
            Members can read it here: {book.page_count} pages
            {fromGutenberg ? ", from Project Gutenberg" : ", from an uploaded file"}.
          </p>
          <button
            type="button"
            disabled={removing}
            className={`${button.ghost} text-alarm hover:bg-alarm-soft hover:text-alarm`}
            onClick={() =>
              startRemove(async () => {
                const result = await removeBookText(book.id);
                if (result.ok) toast.success(result.message);
                else toast.error(result.message);
              })
            }
          >
            {removing ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <X className="size-4" aria-hidden />}
            Make it paper only
          </button>
        </div>
      ) : (
        <p className="mt-2 text-[15px] text-ink-soft">
          A paper copy only. If the church has the right to share this book&rsquo;s text, upload it as a .txt file and members can
          read it here. For classics, use <Link href="/admin/books" className="font-medium text-stamp hover:underline">Add e-books</Link>.
        </p>
      )}
      <form action={formAction} className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center" noValidate>
        <input type="hidden" name="id" value={book.id} />
        <input
          type="file"
          name="file"
          accept=".txt,text/plain"
          aria-label="Text file"
          className={`${input} h-auto py-2 file:mr-3 file:rounded-md file:border-0 file:bg-sunken file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-ink`}
        />
        <button type="submit" disabled={pending} className={`${button.secondary} shrink-0`}>
          {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <FileUp className="size-4" aria-hidden />}
          {pending ? "Saving…" : book.page_count > 0 ? "Replace the text" : "Upload text"}
        </button>
      </form>
      {!state.ok && state.message && <div className="mt-2"><FormMessage ok={false} message={state.message} /></div>}
      {book.page_count > 0 && (
        <p className="mt-3 text-sm text-ink-faint">
          <BookOpen className="mr-1 inline size-3.5 align-[-2px]" aria-hidden />
          Pages are fixed when the text is saved, so readers keep their place.
        </p>
      )}
    </section>
  );
}
