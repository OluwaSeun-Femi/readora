import { Suspense } from "react";
import { connection } from "next/server";
import { getPublicBooks } from "@/db/queries";
import { Catalog } from "@/components/catalog/catalog";
import { ShelfSkeleton } from "@/components/catalog/shelf";
import { SiteHeader } from "@/components/site-header";

export default function CatalogPage() {
  return (
    <>
      <SiteHeader active="catalogue" />

      <main className="flex-1">
        <Suspense fallback={<CatalogLoading />}>
          <CatalogData />
        </Suspense>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 py-6 text-sm text-ink-faint sm:flex-row sm:justify-between sm:px-6">
          <p>Readora lending library. One copy of each book, lent for 14 days.</p>
          <a href="/api/books" className="underline-offset-4 hover:text-ink hover:underline">
            Book list as JSON
          </a>
        </div>
      </footer>
    </>
  );
}

async function CatalogData() {
  // Wait for a real visitor, so the shelf is read fresh from the database every time.
  await connection();
  const books = await getPublicBooks();
  return <Catalog books={books} />;
}

function CatalogLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-8 sm:px-6 sm:pt-12" aria-busy="true">
      <div className="mb-8 h-14 w-80 max-w-full animate-pulse rounded-lg bg-sunken" />
      <ShelfSkeleton />
      <p className="sr-only">Loading the shelf…</p>
    </div>
  );
}
