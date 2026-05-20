import type { Metadata } from "next";
import { Geist, Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  display: "swap",
});

// Inter covers Cyrillic glyphs that Geist lacks.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

// Playfair Display: display serif with full Cyrillic support — replaces Fraunces.
const playfair = Playfair_Display({
  variable: "--font-fraunces",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Shadow",
  description: "AI second memory + life analytics layer",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      className={`${geist.variable} ${inter.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[var(--bg-base)] text-[var(--text-primary)]">
        {children}
      </body>
    </html>
  );
}
