import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: "Echotext - Drop a link. Get the words.",
  description: "Transcribe any YouTube or X/Twitter video instantly with AI-powered chat and insights.",
  openGraph: {
    title: "Echotext - Video Transcription & AI Chat",
    description: "Drop a link. Get the words. Transcribe any YouTube or X/Twitter video instantly.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Echotext",
    description: "Drop a link. Get the words.",
  },
};

export const viewport: Viewport = {
  themeColor: "#06b6d4",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://api.openai.com" />
        <link rel="preconnect" href="https://api.anthropic.com" />
        <link rel="preconnect" href="https://generativelanguage.googleapis.com" />
        <link rel="dns-prefetch" href="https://youtube.com" />
        <link rel="dns-prefetch" href="https://x.com" />
        <script dangerouslySetInnerHTML={{ __html: `(function(){var t=localStorage.getItem('transcriber_theme')||'dark';document.documentElement.classList.toggle('dark',t==='dark')})();`}} />
      </head>
      <body className={`${inter.variable} font-sans antialiased bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
