import type { Metadata } from "next";
import { Karla, Barlow_Condensed } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/AppShell";

const karla = Karla({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-karla",
  display: "swap",
  fallback: ["system-ui", "arial", "sans-serif"],
});

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-barlow-condensed",
  display: "swap",
});

export const metadata: Metadata = {
  title: "DeskYield — Empty Desk Revenue Recovery",
  description:
    "Predicts which reserved seats will go unused in the next 7 days and surfaces the top 3 revenue recovery actions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${karla.variable} ${barlowCondensed.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-canvas font-sans text-ink">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
