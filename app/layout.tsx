import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Providers } from "./providers";
import "./globals.css";

// Both fonts are bundled with the app (SIL Open Font License), so nothing is fetched from Google.
const literata = localFont({
  src: [
    { path: "./fonts/literata-latin-opsz-normal.woff2", style: "normal", weight: "200 900" },
    { path: "./fonts/literata-latin-opsz-italic.woff2", style: "italic", weight: "200 900" },
  ],
  variable: "--font-literata",
  display: "swap",
});

const atkinson = localFont({
  src: [
    { path: "./fonts/atkinson-hyperlegible-next-latin-wght-normal.woff2", style: "normal", weight: "200 800" },
    { path: "./fonts/atkinson-hyperlegible-next-latin-wght-italic.woff2", style: "italic", weight: "200 800" },
  ],
  variable: "--font-atkinson",
  display: "swap",
});

const THEME_SCRIPT = `try{var t=localStorage.getItem("readora-theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export const metadata: Metadata = {
  title: { default: "Readora Library", template: "%s | Readora Library" },
  description: "See what's on the shelf at the Readora lending library.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f6f9" },
    { media: "(prefers-color-scheme: dark)", color: "#11151c" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: the theme script below sets data-theme before React loads.
    <html lang="en" className={`${literata.variable} ${atkinson.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        {/* Apply the saved theme before the first paint, so a dark page never flashes white. */}
        {/* suppressHydrationWarning: some browser extensions rewrite the first script in <head>. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} suppressHydrationWarning />
      </head>
      {/* suppressHydrationWarning: extensions like Grammarly add attributes to <body> */}
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
