// Finds a front cover on Open Library (https://openlibrary.org/developers/api), a free catalogue
// run by the Internet Archive. Returns the image URL, "" when no cover exists, or null when the
// lookup itself failed (so it can be tried again later).
export async function findCoverUrl(title: string, author: string, timeoutMs = 6000): Promise<string | null> {
  try {
    const url = new URL("https://openlibrary.org/search.json");
    url.searchParams.set("title", title);
    url.searchParams.set("author", author);
    url.searchParams.set("limit", "5");
    url.searchParams.set("fields", "cover_i,title");
    const response = await fetch(url, {
      headers: { "User-Agent": "ReadoraLibrary/1.0 (church lending library)" },
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
    if (!response.ok) return null;
    const json = (await response.json()) as { docs?: { cover_i?: number }[] };
    const doc = json.docs?.find((d) => typeof d.cover_i === "number" && d.cover_i > 0);
    return doc ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : "";
  } catch {
    return null;
  }
}
