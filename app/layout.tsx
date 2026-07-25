import type { Metadata } from "next";
import { Anton, Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const anton = Anton({
  weight: "400",
  variable: "--font-anton",
  subsets: ["latin"],
  display: "swap",
});

const hankenGrotesk = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ETH LOTTERY — Decentralized Jackpot dApp",
  description: "Tactile, high-stakes time-based lottery on Ethereum. Buy tickets, track live draws, and claim on-chain jackpots.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${anton.variable} ${hankenGrotesk.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
      </head>
      <body className="bg-background text-on-surface min-h-full flex flex-col font-body-md bg-concentric bg-fixed">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
