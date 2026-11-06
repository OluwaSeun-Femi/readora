// Turns a plain-text book into pages of a steady size, so page numbers are the same
// on every phone and laptop and a reader's saved page always points at the same words.

export type Paginated = {
  pages: string[]; // each page is paragraphs separated by a blank line
  chapters: { page_no: number; title: string }[];
};

const PAGE_CHARS = 1300; // about a phone screen of serif text
const MAX_PARAGRAPH = 1100;

const NUMBER =
  "[0-9]+|[ivxlcdm]+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|last";
// "Chapter 4", "CHAPTER IV.", "Book One: The Return", "PART II — Rain". Not "Part of me wanted to stay."
const CHAPTER = new RegExp(`^(chapter|book|part|volume|act|stave|canto)\\s+(${NUMBER})\\b\\.?(\\s*[:.\u2014-]\\s*.{1,80})?$`, "i");
const ROMAN_HEADING = /^[IVXLCDM]{1,7}\.?$/;

/** Removes Project Gutenberg's licence header and footer, keeping only the book. */
export function stripGutenberg(text: string) {
  const start = /\*\*\*\s*START OF (THE|THIS) PROJECT GUTENBERG[^\n]*\n/i.exec(text);
  const end = /\*\*\*\s*END OF (THE|THIS) PROJECT GUTENBERG/i.exec(text);
  const from = start ? start.index + start[0].length : 0;
  const to = end && end.index > from ? end.index : text.length;
  return text.slice(from, to);
}

function paragraphsOf(text: string) {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/\t/g, "    ")
    .split(/\n\s*\n+/)
    .map((p) => p.replace(/\s*\n\s*/g, " ").replace(/[  ]{2,}/g, " ").trim())
    .filter((p) => p.length > 0 && !/^[*\s.]+$/.test(p) && !/^\[?illustration[^\]]*\]?$/i.test(p));
}

/** Splits a very long paragraph at sentence ends so it can flow across pages. */
function splitLong(paragraph: string): string[] {
  if (paragraph.length <= MAX_PARAGRAPH) return [paragraph];
  const sentences = paragraph.match(/[^.!?]+[.!?]+["'”’)\]]*\s*|[^.!?]+$/g) ?? [paragraph];
  const parts: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    if (current && current.length + sentence.length > MAX_PARAGRAPH) {
      parts.push(current.trim());
      current = "";
    }
    current += sentence;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

/** "CHAPTER IV.: THE HARVEST" becomes "Chapter IV: The Harvest"; Roman numerals stay capitals. */
function tidy(title: string) {
  const clean = title.replace(/\s+/g, " ").replace(/\.:/, ":").replace(/\.$/, "").slice(0, 120);
  if (clean !== clean.toUpperCase()) return clean;
  return clean
    .toLowerCase()
    .replace(/\b([a-z])([a-z]*)/g, (word, first, rest) =>
      /^[ivxlcdm]+$/.test(word) ? word.toUpperCase() : first.toUpperCase() + rest,
    );
}

export function isChapterHeading(paragraph: string) {
  return paragraph.length <= 90 && (CHAPTER.test(paragraph) || ROMAN_HEADING.test(paragraph));
}

export function paginate(raw: string): Paginated {
  const paragraphs = paragraphsOf(stripGutenberg(raw)).flatMap(splitLong);
  const pages: string[] = [];
  const chapters: { page_no: number; title: string }[] = [];
  let page: string[] = [];
  let size = 0;

  const flush = () => {
    if (page.length) pages.push(page.join("\n\n"));
    page = [];
    size = 0;
  };

  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i];
    if (isChapterHeading(paragraph)) {
      // A chapter always starts on a fresh page. A short title line right after it joins the heading.
      flush();
      let title = paragraph;
      const nextLine = paragraphs[i + 1];
      if (nextLine && nextLine.length < 70 && !isChapterHeading(nextLine) && !/[.!?,;]$/.test(nextLine)) {
        title = `${tidy(paragraph).replace(/[.:]+$/, "")}: ${nextLine}`;
        page.push(paragraph, nextLine);
        size += paragraph.length + nextLine.length;
        i++;
      } else {
        page.push(paragraph);
        size += paragraph.length;
      }
      chapters.push({ page_no: pages.length + 1, title: tidy(title) });
      continue;
    }
    if (size > 0 && size + paragraph.length > PAGE_CHARS) flush();
    page.push(paragraph);
    size += paragraph.length;
  }
  flush();
  return { pages, chapters };
}
