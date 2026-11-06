"use client";

import { useState } from "react";
import { clothFor, coverSize, spineSize } from "@/lib/covers";

/** A cloth-bound front cover with foil lettering, generated from the title. */
export function Cover({
  title,
  author,
  src,
  size = "md",
  className = "",
}: {
  title: string;
  author: string;
  /** A real front cover. While it loads, or if it fails, the designed cover shows. */
  src?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const [state, setState] = useState<"loading" | "loaded" | "failed">("loading");
  const cloth = clothFor(title);
  const titleSize =
    size === "lg" ? "text-[22px]" : size === "sm" ? "text-[11px]" : "text-[15px] sm:text-[16px]";
  const long = title.length > 34;
  return (
    <div
      className={`cloth relative aspect-[2/3] overflow-hidden rounded-[4px_10px_10px_4px] shadow-[inset_6px_0_8px_-4px_rgb(0_0_0/0.35),0_1px_0_rgb(255_255_255/0.06)_inset,0_10px_24px_-14px_rgb(10_14_30/0.6)] ${className}`}
      style={{ backgroundColor: cloth.bg, color: cloth.foil }}
      aria-hidden
    >
      {/* the hinge where the cover meets the spine */}
      <div className="absolute inset-y-0 left-[7%] w-px bg-black/25" />
      <div className="absolute inset-y-0 left-[calc(7%+1px)] w-px bg-white/10" />
      <div
        className={`absolute inset-x-[14%] flex flex-col items-center text-center ${size === "sm" ? "top-[12%] bottom-[10%]" : "top-[13%] bottom-[11%]"}`}
      >
        <div className="h-px w-full opacity-70" style={{ backgroundColor: cloth.foil }} />
        <div className="mt-[3px] h-px w-full opacity-40" style={{ backgroundColor: cloth.foil }} />
        <p
          className={`mt-[14%] font-serif font-semibold leading-[1.15] tracking-[0.005em] ${titleSize} ${long ? "line-clamp-5" : "line-clamp-4"}`}
          style={{ fontVariationSettings: '"opsz" 36', textWrap: "balance" }}
        >
          {title}
        </p>
        <div className="mt-auto w-full">
          <p
            className={`font-serif italic opacity-85 ${size === "lg" ? "text-[15px]" : size === "sm" ? "hidden" : "text-[11.5px] sm:text-[12.5px]"}`}
          >
            {author}
          </p>
          <div className="mt-[8%] h-px w-full opacity-40" style={{ backgroundColor: cloth.foil }} />
        </div>
      </div>
      {src && state !== "failed" && (
        // eslint-disable-next-line @next/next/no-img-element -- covers come from Open Library; a plain img keeps it simple
        <img
          src={coverSize(src, size === "lg" ? "L" : "M")}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          ref={(img) => {
            // An image from the browser cache can finish before React listens for onLoad.
            if (img?.complete && state === "loading") setState(img.naturalWidth > 10 ? "loaded" : "failed");
          }}
          onLoad={(e) => {
            // Open Library sometimes answers with a 1x1 placeholder: treat that as "no cover".
            setState(e.currentTarget.naturalWidth > 10 ? "loaded" : "failed");
          }}
          onError={() => setState("failed")}
          className={`absolute inset-0 size-full object-cover transition-opacity duration-500 ${state === "loaded" ? "opacity-100" : "opacity-0"}`}
        />
      )}
      {src && state === "loaded" && (
        // a soft hinge shadow so photos still read as books
        <div className="pointer-events-none absolute inset-0 shadow-[inset_5px_0_6px_-3px_rgb(0_0_0/0.35),inset_0_0_0_1px_rgb(0_0_0/0.08)]" />
      )}
    </div>
  );
}

/** A slim spine used in admin lists. */
export function MiniSpine({ title }: { title: string }) {
  const cloth = clothFor(title);
  return (
    <span
      aria-hidden
      className="cloth relative inline-block h-11 w-3.5 shrink-0 rounded-[2px] shadow-[inset_-2px_0_3px_rgb(0_0_0/0.25)]"
      style={{ backgroundColor: cloth.bg }}
    >
      <span className="absolute inset-x-0 top-1.5 h-px opacity-70" style={{ backgroundColor: cloth.foil }} />
      <span className="absolute inset-x-0 bottom-1.5 h-px opacity-70" style={{ backgroundColor: cloth.foil }} />
    </span>
  );
}

export function spineStyle(title: string) {
  const cloth = clothFor(title);
  const size = spineSize(title);
  return { cloth, ...size };
}
