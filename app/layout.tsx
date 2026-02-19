import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Transcriber - X Video to Text + AI Chat",
  description: "Paste any Twitter/X video URL to get an instant transcript with AI-powered insights, summaries, and Q&A.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased bg-slate-950 text-white min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
