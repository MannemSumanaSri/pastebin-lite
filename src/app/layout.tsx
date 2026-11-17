import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import { Terminal, Plus } from "lucide-react";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "Pastebin Lite — Ephemeral Text & Code Sharing",
  description:
    "Share text and code snippets securely with optional time-based expiry and view-count limits.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen flex flex-col font-sans">
        <header className="border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2.5 text-zinc-100 hover:text-emerald-400 transition-colors"
            >
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">
                <Terminal className="w-4 h-4" />
              </span>
              <span className="font-semibold tracking-tight text-base">
                Pastebin Lite
              </span>
            </Link>

            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              New Paste
            </Link>
          </div>
        </header>

        <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8">
          {children}
        </main>

        <footer className="border-t border-zinc-900 py-5 text-center text-xs text-zinc-500">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>Pastebin Lite · Secure ephemeral text sharing</span>
            <span>Content is rendered strictly as plain text</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
