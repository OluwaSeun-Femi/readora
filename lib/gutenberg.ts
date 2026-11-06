// Public-domain e-books from Project Gutenberg, found through Gutendex (https://gutendex.com),
// a free JSON catalogue of Project Gutenberg's books.

const BASE = process.env.GUTENDEX_URL || "https://gutendex.com";
const MAX_TEXT_BYTES = 4_000_000; // about 1,500 pages; bigger books are refused
const HEADERS = { "User-Agent": "ReadoraLibrary/1.0 (church lending library)" };

export type GutenbergBook = {
  id: number;
  title: string;
  author: string;
  cover: string | null;
  textUrl: string | null;
  downloads: number;
};

type RawBook = {
  id: number;
  title: string;
  authors?: { name: string }[];
  formats?: Record<string, string>;
  download_count?: number;
  copyright?: boolean | null;
  media_type?: string;
};

/** "Austen, Jane" becomes "Jane Austen". */
function authorName(raw?: { name: string }[]) {
  const name = raw?.[0]?.name?.trim();
  if (!name) return "Unknown author";
  const [last, first] = name.split(/,\s*/, 2);
  return (first ? `${first.replace(/\s*\(.*\)$/, "")} ${last}` : last).replace(/\s+/g, " ").trim();
}

function textUrl(formats: Record<string, string> = {}) {
  const entries = Object.entries(formats).filter(([type, url]) => type.startsWith("text/plain") && !url.endsWith(".zip"));
  const preferred =
    entries.find(([type]) => type.includes("utf-8")) ?? entries.find(([type]) => type.includes("us-ascii")) ?? entries[0];
  return preferred?.[1] ?? null;
}

function toBook(raw: RawBook): GutenbergBook {
  return {
    id: raw.id,
    title: raw.title.replace(/\s*\r?\n\s*/g, ": ").replace(/\s+/g, " ").trim().slice(0, 200),
    author: authorName(raw.authors).slice(0, 100),
    cover: raw.formats?.["image/jpeg"] ?? null,
    textUrl: textUrl(raw.formats),
    downloads: raw.download_count ?? 0,
  };
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${BASE}${path}`, { headers: HEADERS, signal: AbortSignal.timeout(10000), cache: "no-store" });
  if (!response.ok) throw new Error(`Gutendex answered ${response.status}`);
  return (await response.json()) as T;
}

/** Public-domain English books with plain text, most downloaded first. */
export async function searchGutenberg(query: string) {
  const params = new URLSearchParams({ search: query, copyright: "false", languages: "en", mime_type: "text/plain" });
  const json = await getJson<{ results?: RawBook[] }>(`/books/?${params}`);
  return (json.results ?? [])
    .filter((b) => b.media_type === undefined || b.media_type === "Text")
    .map(toBook)
    .filter((b) => b.textUrl)
    .slice(0, 12);
}

export async function getGutenbergBook(id: number) {
  const raw = await getJson<RawBook>(`/books/${id}`);
  if (raw.copyright) throw new Error("This book is still under copyright.");
  return toBook(raw);
}

/** Only download text from Project Gutenberg itself (or the test server), never any other address. */
function allowedTextHost(url: string) {
  const host = new URL(url).hostname;
  return host === "gutenberg.org" || host.endsWith(".gutenberg.org") || host === new URL(BASE).hostname;
}

export async function downloadText(url: string) {
  if (!allowedTextHost(url)) throw new Error("That text isn't hosted by Project Gutenberg.");
  const response = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(25000), redirect: "follow", cache: "no-store" });
  if (!response.ok) throw new Error(`Project Gutenberg answered ${response.status}`);
  if (!allowedTextHost(response.url || url)) throw new Error("The download was redirected away from Project Gutenberg.");
  const length = Number(response.headers.get("content-length") ?? 0);
  if (length > MAX_TEXT_BYTES) throw new Error("This book is too long to add.");
  const text = await response.text();
  if (text.length > MAX_TEXT_BYTES) throw new Error("This book is too long to add.");
  return text;
}
