import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SupplyPulse — Supplier Risk Intelligence",
  description:
    "Monitor your supplier watchlist with AI. Get a dynamic 0–100 health score, risk trajectory, and action plan in under 60 seconds.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/*
       * The body is a full-height flex row so that authenticated pages can
       * slot a fixed-width sidebar alongside a scrollable main column.
       * Public pages (landing, auth) ignore the row context and span full
       * width by simply not rendering a sidebar.
       */}
      <body className="flex h-full min-h-screen bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
