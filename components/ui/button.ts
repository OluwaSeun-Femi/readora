// Shared button styles. Radii: buttons and inputs 10px, cards 14px, sheets 22px, chips full.
const base =
  "inline-flex items-center justify-center gap-2 rounded-[10px] font-medium transition-[background-color,color,box-shadow,transform] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-55 select-none";

export const button = {
  primary: `${base} bg-ink text-paper hover:bg-ink/88 px-4 h-11 text-[15px]`,
  stamp: `${base} bg-stamp text-white hover:bg-stamp/90 px-4 h-11 text-[15px] dark:text-[#14112e]`,
  secondary: `${base} border border-line-strong bg-surface text-ink hover:bg-sunken px-4 h-11 text-[15px]`,
  ghost: `${base} text-ink-soft hover:bg-sunken hover:text-ink px-3 h-10 text-[15px]`,
  danger: `${base} bg-alarm text-white hover:bg-alarm/90 px-4 h-11 text-[15px] dark:text-[#2a0b07]`,
  icon: `${base} size-10 text-ink-soft hover:bg-sunken hover:text-ink`,
  small: `${base} border border-line-strong bg-surface text-ink hover:bg-sunken px-3 h-9 text-sm`,
};

export const input =
  "block w-full rounded-[10px] border border-line-strong bg-surface px-3.5 h-12 text-base text-ink placeholder:text-ink-faint transition-[border-color,box-shadow] focus:border-stamp focus:outline-none focus:ring-4 focus:ring-stamp/15 aria-invalid:border-alarm aria-invalid:ring-4 aria-invalid:ring-alarm/12";
