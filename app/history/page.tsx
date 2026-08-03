"use client";

import { useState } from "react";
import { Header } from "@/app/components/Header";
import { MobileNav } from "@/app/components/MobileNav";
import { Toast } from "@/app/components/Toast";
import { useWallet } from "@/app/context/WalletContext";

function shortAddress(addr: string): string {
  if (!addr) return "N/A";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function HistoryPage() {
  const { mounted, ethUsdPrice, pools, poolStates } = useWallet();
  const [selectedPoolId, setSelectedPoolId] = useState<string>("all");

  if (!mounted) return null;

  // Aggregate winners across pools or filter by selected pool
  const displayWinners = selectedPoolId === "all"
    ? pools.flatMap((pool) =>
        (poolStates[pool.id]?.pastWinners || []).map((w) => ({ ...w, poolIcon: pool.icon, poolName: pool.name }))
      ).sort((a, b) => b.blockNumber - a.blockNumber)
    : (poolStates[selectedPoolId]?.pastWinners || []).map((w) => {
        const pool = pools.find((p) => p.id === selectedPoolId)!;
        return { ...w, poolIcon: pool.icon, poolName: pool.name };
      });

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

          {/* Pool Filter Tabs */}
          <div className="flex flex-wrap gap-2 mb-8">
            <button
              onClick={() => setSelectedPoolId("all")}
              className={`px-4 py-2 font-label-mono text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border ${
                selectedPoolId === "all"
                  ? "bg-primary-container text-on-primary-fixed border-primary-container"
                  : "bg-surface-container-lowest text-on-surface-variant border-outline-variant/40 hover:border-primary-container"
              }`}
            >
              ALL POOLS
            </button>
            {pools.map((pool) => (
              <button
                key={pool.id}
                onClick={() => setSelectedPoolId(pool.id)}
                className={`px-4 py-2 font-label-mono text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border ${
                  selectedPoolId === pool.id
                    ? "bg-primary-container text-on-primary-fixed border-primary-container"
                    : "bg-surface-container-lowest text-on-surface-variant border-outline-variant/40 hover:border-primary-container"
                }`}
              >
                <span className="material-symbols-outlined text-xs align-middle" style={{ fontVariationSettings: "'FILL' 1" }}>{pool.icon}</span> {pool.name}
              </button>
            ))}
          </div>

          {/* Past Winners List */}
          {displayWinners.length > 0 ? (
            <div className="flex flex-col gap-6">
              {displayWinners.map((draw, idx) => (
                <div
                  key={`${draw.blockNumber}-${idx}`}
                  className="bg-surface-indigo border border-outline-variant ticket-notch p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-xl relative"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-secondary-fixed text-on-secondary-fixed w-12 h-12 flex items-center justify-center font-headline-lg text-xl font-bold">
                      #{displayWinners.length - idx}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-label-mono text-[10px] text-on-surface-variant/70 uppercase">
                          WINNER ADDRESS
                        </span>
                        <span className="font-label-mono text-[10px] bg-primary-container/20 text-primary-container px-2 py-0.5 font-bold">
                          <span className="material-symbols-outlined text-[10px] align-middle" style={{ fontVariationSettings: "'FILL' 1" }}>{draw.poolIcon}</span> {draw.poolName}
                        </span>
                      </div>
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
                      <span className="font-headline-lg text-2xl md:text-3xl text-primary-container block leading-tight">
                        {draw.prizeAmount} ETH
                      </span>
                      <span className="font-label-mono text-[10px] text-on-surface-variant/90 block font-bold">
                        ~${(parseFloat(draw.prizeAmount) * ethUsdPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                      </span>
                    </div>

                    <div className="text-right font-label-mono text-[10px] text-on-surface-variant flex flex-col gap-0.5">
                      <span>House Fee (10%): {draw.houseFee} ETH (~${(parseFloat(draw.houseFee) * ethUsdPrice).toFixed(2)} USD)</span>
                      {draw.referrer && draw.referrer !== "0x0000000000000000000000000000000000000000" && draw.referrerReward && (
                        <span className="text-secondary-fixed font-bold">
                          Referrer Fee (20%): {shortAddress(draw.referrer)} ({draw.referrerReward} ETH / ~${(parseFloat(draw.referrerReward) * ethUsdPrice).toFixed(2)} USD)
                        </span>
                      )}
                      <span className="block opacity-60">Block #{draw.blockNumber}</span>
                    </div>
                  </div>
                </div>
              ))}
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
