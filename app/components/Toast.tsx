"use client";

import { useEffect } from "react";
import { useWallet } from "@/app/context/WalletContext";

export function Toast() {
  const { txStatus, txProgress, clearTransactionFeedback } = useWallet();
  const terminalState = !txProgress || txProgress.state === "confirmed" || txProgress.state === "replaced" || txProgress.state === "failed";

  useEffect(() => {
    if (!txStatus || !terminalState) return;
    const timer = window.setTimeout(clearTransactionFeedback, 6_000);
    return () => window.clearTimeout(timer);
  }, [clearTransactionFeedback, terminalState, txStatus]);

  if (!txStatus) return null;

  const isError = txProgress?.state === "failed" || /cancel|reject|fail|error|could not|wrong network|insufficient/i.test(txStatus);
  const isSuccess = txProgress?.state === "confirmed" || txProgress?.state === "replaced" || /confirmed|withdrawn|connected|success/i.test(txStatus);
  const displayMessage = txStatus.replace(/^Error:\s*/, "");

  return (
    <div className="fixed bottom-6 right-6 md:bottom-12 md:right-12 z-50" role="status" aria-live="polite">
      <div className="bg-ticket-white text-void-black border-2 border-void-black p-4 shadow-[4px_4px_0px_0px_#000000] flex items-center gap-4 relative max-w-sm">
        <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-background rounded-full border-r-2 border-void-black" />

        {isSuccess ? (
          <span className="material-symbols-outlined text-success-green text-2xl" aria-hidden="true">check_circle</span>
        ) : isError ? (
          <span className="material-symbols-outlined text-error text-2xl" aria-hidden="true">cancel</span>
        ) : (
          <div className="spinner !w-5 !h-5 !border-void-black !border-t-transparent" aria-hidden="true" />
        )}

        <div className="flex flex-col">
          <span className="font-label-mono text-xs font-bold uppercase tracking-widest text-void-black">
            {isSuccess ? "Transaction confirmed" : isError ? "Transaction cancelled" : "Processing transaction"}
          </span>
          <span className="font-body-md text-xs font-bold text-void-black/80 break-words mt-0.5 leading-snug">
            {displayMessage}
          </span>
        </div>

        {terminalState && (
          <button onClick={clearTransactionFeedback} aria-label="Dismiss transaction message" className="self-start text-void-black/60 hover:text-void-black cursor-pointer">
            <span className="material-symbols-outlined text-base" aria-hidden="true">close</span>
          </button>
        )}
      </div>
    </div>
  );
}
