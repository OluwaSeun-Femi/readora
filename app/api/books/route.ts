import { connection } from "next/server";
import { getPublicBooks } from "@/db/queries";

// GET /api/books: every book with its author and whether it's on loan, as JSON.
// Members' names are left out because this link is public.
export async function GET() {
  await connection(); // read fresh from the database on every request
  const books = await getPublicBooks();

  return Response.json(
    books.map((book) => ({
      id: book.id,
      title: book.title,
      author: book.author,
      year: book.year,
      status: book.on_loan ? "on_loan" : "available",
      on_loan: book.on_loan,
      due_on: book.due_on,
    })),
    { headers: { "Cache-Control": "no-store" } },
  );
}
