import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { Toaster } from "sonner";
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
      suppressHydrationWarning
    >
      <head>
        {/*
         * Runs synchronously before first paint so the `dark` class is present
         * on <html> before any CSS is applied — preventing FOUC for dark-mode
         * users. next/script with strategy="beforeInteractive" is the correct
         * way to inject blocking scripts in Next.js App Router.
         */}
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('sp-theme');var d=window.matchMedia('(prefers-color-scheme:dark)').matches;if(t==='dark'||(t===null&&d)){document.documentElement.classList.add('dark');}}catch(e){}})();`,
          }}
        />
      </head>
      {/*
       * The body is a full-height flex row so that authenticated pages can
       * slot a fixed-width sidebar alongside a scrollable main column.
       * Public pages (landing, auth) ignore the row context and span full
       * width by simply not rendering a sidebar.
       */}
      <body className="flex h-full min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
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
