import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "ETH LOTTERY — Autonomous Multi-Pool Web3 Jackpot dApp",
  description: "ETH Lottery is an autonomous Web3 dApp built with Next.js, Tailwind CSS, and Solidity. Featuring a cyberpunk ticket-stub UI, players buy 0.01 ETH tickets across 4 pool tiers (1-Min, 1-Hour, 6-Hour, 1-Week) to win an automated 70% jackpot, 20% referrer reward (or jackpot rollover), and 10% house fee.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="dark h-full antialiased"
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Anton&family=Hanken+Grotesk:ital,wght@0,100..900;1,100..900&family=JetBrains+Mono:ital,wght@0,100..800;1,100..800&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background text-on-surface min-h-full flex flex-col font-body-md bg-concentric bg-fixed">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
