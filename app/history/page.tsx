"use client";

import { Header } from "@/app/components/Header";
import { MobileNav } from "@/app/components/MobileNav";
import { Toast } from "@/app/components/Toast";
import { useWallet } from "@/app/context/WalletContext";

function shortAddress(addr: string): string {
  if (!addr) return "N/A";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function HistoryPage() {
  const { pastWinners, recentWinner, mounted } = useWallet();

  if (!mounted) return null;

  const isZeroWinner =
    !recentWinner || recentWinner === "0x0000000000000000000000000000000000000000";

  return (
    <div className="min-h-screen flex flex-col justify-between relative overflow-x-hidden">
      <div>
        <Header />

        <main className="max-w-5xl mx-auto px-4 md:px-16 py-8 md:py-12 mb-20 md:mb-12">
          {/* Header Section */}
          <div className="mb-10 text-center md:text-left">
            <span className="font-label-mono text-xs text-secondary-fixed uppercase tracking-widest block mb-2 font-bold">
              // ON-CHAIN AUDIT LOG
            </span>
            <h1 className="font-headline-lg text-4xl md:text-6xl text-primary uppercase tracking-tight">
              PAST DRAWS & WINNERS
            </h1>
            <p className="font-body-md text-sm md:text-base text-on-surface-variant max-w-xl mt-3">
              Historical record of all completed lottery draws and prize payouts emitted on-chain.
            </p>
          </div>

          {/* Past Winners List */}
          {pastWinners.length > 0 ? (
            <div className="flex flex-col gap-6">
              {pastWinners.map((draw, idx) => (
                <div
                  key={`${draw.blockNumber}-${idx}`}
                  className="bg-surface-indigo border border-outline-variant ticket-notch p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-xl relative"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-secondary-fixed text-on-secondary-fixed w-12 h-12 flex items-center justify-center font-headline-lg text-xl font-bold">
                      #{pastWinners.length - idx}
                    </div>

                    <div>
                      <span className="font-label-mono text-[10px] text-on-surface-variant/70 uppercase block">
                        WINNER ADDRESS
                      </span>
                      <span className="font-ticket-id text-base md:text-lg text-primary font-bold">
                        {shortAddress(draw.winner)}
                      </span>
                      <span className="font-label-mono text-[10px] text-on-surface-variant block mt-0.5">
                        Full: {draw.winner}
                      </span>
                    </div>
                  </div>

                  <div className="w-full md:w-auto border-t md:border-t-0 md:border-l border-dashed border-outline-variant/40 pt-4 md:pt-0 md:pl-8 flex justify-between md:flex-col items-end gap-2">
                    <div className="text-left md:text-right">
                      <span className="font-label-mono text-[10px] text-on-surface-variant/70 uppercase block">
                        PRIZE PAYOUT
                      </span>
                      <span className="font-headline-lg text-2xl md:text-3xl text-primary-container">
                        {draw.prizeAmount} ETH
                      </span>
                    </div>

                    <div className="text-right font-label-mono text-[10px] text-on-surface-variant">
                      <span>House Fee: {draw.houseFee} ETH</span>
                      <span className="block opacity-60">Block #{draw.blockNumber}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : !isZeroWinner ? (
            <div className="bg-surface-indigo border border-outline-variant ticket-notch p-8 flex flex-col items-center justify-center text-center shadow-xl">
              <span className="material-symbols-outlined text-secondary-fixed text-5xl mb-3">
                emoji_events
              </span>
              <h3 className="font-headline-lg text-2xl text-primary uppercase mb-2">
                MOST RECENT WINNER
              </h3>
              <div className="font-ticket-id text-sm md:text-base bg-surface-container-lowest py-3 px-6 border border-outline-variant/50 text-secondary-fixed font-bold mb-2">
                {recentWinner}
              </div>
              <p className="font-label-mono text-xs text-on-surface-variant">
                Live draw history events will populate here as rounds complete.
              </p>
            </div>
          ) : (
            <div className="bg-surface-indigo border border-outline-variant ticket-notch p-12 flex flex-col items-center justify-center text-center shadow-xl">
              <span className="material-symbols-outlined text-on-surface-variant/40 text-6xl mb-4">
                history
              </span>
              <h3 className="font-headline-lg text-3xl text-primary uppercase mb-2">
                NO DRAWS COMPLETED YET
              </h3>
              <p className="font-body-md text-sm text-on-surface-variant max-w-md">
                Buy a ticket on the main Draws page to start the lottery and become the first winner!
              </p>
            </div>
          )}
        </main>
      </div>

      <Toast />
      <MobileNav />
    </div>
  );
}
