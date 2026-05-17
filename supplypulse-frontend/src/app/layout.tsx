import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { Toaster } from "sonner";
import ThemeProvider from "@/components/layout/ThemeProvider";
import { THEME_COOKIE_NAME } from "@/lib/theme";
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get(THEME_COOKIE_NAME)?.value;
  const isDark = themeCookie === "dark";

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased${isDark ? " dark" : ""}`}
      suppressHydrationWarning
    >
      <body className="flex h-full min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <ThemeProvider />
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            classNames: {
              toast:
                "font-sans text-sm rounded-xl border shadow-lg bg-white text-slate-900 border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100",
              success:
                "text-emerald-800 border-emerald-200 bg-emerald-50 dark:text-emerald-200 dark:border-emerald-900/55 dark:bg-emerald-950/40",
              error:
                "text-red-800 border-red-200 bg-red-50 dark:text-red-200 dark:border-red-900/55 dark:bg-red-950/40",
              warning:
                "text-amber-900 border-amber-200 bg-amber-50 dark:text-amber-200 dark:border-amber-900/50 dark:bg-amber-950/35",
              info:
                "text-blue-800 border-blue-200 bg-blue-50 dark:text-blue-200 dark:border-blue-900/50 dark:bg-blue-950/40",
            },
          }}
        />
      </body>
    </html>
  );
}
