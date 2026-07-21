"use client";

import { useWallet } from "@/app/context/WalletContext";

export function Toast() {
  const { txStatus } = useWallet();

  if (!txStatus) return null;

  const isError = txStatus.startsWith("Error");
  const isSuccess = txStatus.includes("🎉") || txStatus.includes("🏆") || txStatus.includes("successfully");

  return (
    <div className="fixed bottom-6 right-6 md:bottom-12 md:right-12 z-50 animate-bounce">
      <div className="bg-ticket-white text-void-black border-2 border-void-black p-4 shadow-[4px_4px_0px_0px_#000000] flex items-center gap-4 relative max-w-sm">
        {/* Notched punch hole on left */}
        <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-background rounded-full border-r-2 border-void-black" />

        {isSuccess ? (
          <span
            className="material-symbols-outlined text-success-green text-2xl animate-pulse"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            check_circle
          </span>
        ) : isError ? (
          <span
            className="material-symbols-outlined text-error text-2xl"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            cancel
          </span>
        ) : (
          <div className="spinner !w-5 !h-5 !border-void-black !border-t-transparent" />
        )}

        <div className="flex flex-col">
          <span className="font-label-mono text-xs font-bold uppercase tracking-widest text-void-black">
            {isSuccess ? "Transaction Confirmed" : isError ? "Transaction Error" : "Processing Transaction"}
          </span>
          <span className="font-ticket-id text-[11px] opacity-80 break-words mt-0.5">
            {txStatus}
          </span>
        </div>
      </div>
    </div>
  );
}
