// Every book gets a cloth binding colour, picked from its title so it stays the same everywhere.
export type Cloth = { bg: string; edge: string; foil: string };

const CLOTHS: Cloth[] = [
  { bg: "#1F4D3A", edge: "#163829", foil: "#E2C275" }, // bottle green
  { bg: "#6B1E2A", edge: "#4F1520", foil: "#E8C9A0" }, // oxblood
  { bg: "#1E2F55", edge: "#152241", foil: "#D9C38A" }, // navy
  { bg: "#A8741C", edge: "#845A14", foil: "#FBEFD2" }, // ochre
  { bg: "#1D5C63", edge: "#15454B", foil: "#E7D7A6" }, // teal
  { bg: "#4A2550", edge: "#371A3C", foil: "#E4C98F" }, // plum
  { bg: "#3B4A57", edge: "#2C3842", foil: "#E2D2A8" }, // slate
  { bg: "#8A3B1C", edge: "#6A2C14", foil: "#F2D8A9" }, // rust
  { bg: "#2F5D3A", edge: "#22452A", foil: "#EADBA8" }, // moss
  { bg: "#2C2A4A", edge: "#1F1D36", foil: "#D8C7F0" }, // midnight
];

export function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function clothFor(title: string): Cloth {
  return CLOTHS[hash(title) % CLOTHS.length];
}

/** Spine size varies a little per book, like a real shelf. */
export function spineSize(title: string) {
  const h = hash(title + "spine");
  return { width: 34 + (h % 18), height: 148 + ((h >>> 8) % 44) };
}

/** Open Library serves the same cover in three sizes: S, M and L. */
export function coverSize(url: string, size: "S" | "M" | "L") {
  return url.replace(/-[SML]\.jpg$/, `-${size}.jpg`);
}
