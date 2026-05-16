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
                "font-sans text-sm rounded-xl border border-slate-200 shadow-lg",
              success: "text-emerald-700 border-emerald-200 bg-emerald-50",
              error: "text-red-700 border-red-200 bg-red-50",
              warning: "text-amber-700 border-amber-200 bg-amber-50",
              info: "text-blue-700 border-blue-200 bg-blue-50",
            },
          }}
        />
      </body>
    </html>
  );
}
