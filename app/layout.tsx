import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Echotext - Drop a link. Get the words.",
  description: "Transcribe any YouTube or X/Twitter video instantly with AI-powered chat and insights.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            var theme = localStorage.getItem('transcriber_theme') || 'dark';
            document.documentElement.classList.toggle('dark', theme === 'dark');
          })();
        `}} />
      </head>
      <body className={`${inter.variable} font-sans antialiased bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
