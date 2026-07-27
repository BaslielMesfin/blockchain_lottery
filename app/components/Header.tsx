"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallet } from "@/app/context/WalletContext";

function shortAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function Header() {
  const pathname = usePathname();
  const { account, isConnecting, connectWallet, disconnectWallet } = useWallet();

  const navLinks = [
    { name: "Draws", href: "/" },
    { name: "Rules", href: "/rules" },
    { name: "History", href: "/history" },
    { name: "Terms", href: "/terms" },
  ];

  return (
    <header className="bg-background text-primary border-b-2 border-dashed border-outline-variant flat flex justify-between items-center w-full px-4 md:px-16 py-4 max-w-7xl mx-auto z-40 sticky top-0">
      <Link href="/" className="font-headline-lg text-2xl md:text-3xl text-primary uppercase tracking-tighter hover:opacity-90 transition-opacity">
        ETH LOTTERY
      </Link>

      <nav className="hidden md:flex gap-8 items-center font-label-mono text-xs">
        {navLinks.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.name}
              href={link.href}
              className={`pb-1 transition-colors duration-200 ${
                isActive
                  ? "text-primary-container font-bold border-b-2 border-primary-container"
                  : "text-on-surface-variant font-medium hover:text-primary-container"
              }`}
            >
              {link.name}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-3">
        {account ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-void-black/80 border border-outline-variant/60 px-3.5 py-2 font-label-mono text-xs">
              <span className="inline-block w-2 h-2 rounded-full bg-success-green animate-pulse" />
              <span className="text-primary-container font-mono font-bold">
                {shortAddress(account)}
              </span>
            </div>
            <button
              onClick={disconnectWallet}
              title="Disconnect Wallet"
              className="border border-outline-variant/60 bg-void-black/80 text-on-surface-variant hover:text-error hover:border-error px-2.5 py-2 font-label-mono text-xs transition-colors flex items-center justify-center cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">logout</span>
            </button>
          </div>
        ) : (
          <button
            onClick={connectWallet}
            disabled={isConnecting}
            className="bg-primary-container text-on-primary-fixed px-5 md:px-6 py-2.5 md:py-3 font-label-mono text-xs md:text-sm font-bold uppercase tracking-wider hover:shadow-[4px_4px_0px_0px_#000000] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all duration-200 disabled:opacity-50 cursor-pointer"
          >
            {isConnecting ? "Connecting…" : "Connect Wallet"}
          </button>
        )}
      </div>
    </header>
  );
}
