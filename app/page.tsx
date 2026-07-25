"use client";

import { useState } from "react";
import { Header } from "@/app/components/Header";
import { MobileNav } from "@/app/components/MobileNav";
import { Toast } from "@/app/components/Toast";
import { UsdPaymentModal } from "@/app/components/UsdPaymentModal";
import { useWallet } from "@/app/context/WalletContext";
import { CONTRACT_ADDRESS } from "@/constants/contract";

function shortAddress(addr: string): string {
  if (!addr) return "N/A";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatCountdown(totalSeconds: number): string {
  if (totalSeconds <= 0) return "00:00";
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function DrawsPage() {
  const {
    mounted,
    account,
    timeRemaining,
    ticketPrice,
    players,
    recentWinner,
    owner,
    lotteryOpen,
    isBuying,
    isPicking,
    isRestarting,
    buyTicket,
    pickWinner,
    restartLottery,
    connectWallet,
    ethUsdPrice,
  } = useWallet();

  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!mounted) return null;

  const isOwner = account !== null && owner !== "" && account === owner;
  const jackpot =
    players.length > 0 && ticketPrice !== "0"
      ? (parseFloat(ticketPrice) * players.length).toFixed(2)
      : "0.00";
  const isZeroWinner =
    !recentWinner || recentWinner === "0x0000000000000000000000000000000000000000";

  const jackpotUsd = parseFloat(jackpot) * ethUsdPrice;
  const ticketPriceUsd = parseFloat(ticketPrice) * ethUsdPrice;

  return (
    <div className="min-h-screen flex flex-col justify-between relative overflow-x-hidden">
      <div>
        <Header />

        <main className="max-w-7xl mx-auto px-4 md:px-16 py-8 md:py-12 grid grid-cols-1 md:grid-cols-12 gap-8 items-start mb-20 md:mb-12">
          {/* Left / Center Column (Main Stage - 8 cols) */}
          <div className="md:col-span-8 flex flex-col gap-8">
            {/* Jackpot Ticket Card */}
            <div className="bg-ticket-white text-void-black ticket-notch w-full relative shadow-2xl overflow-hidden">
              {/* Inner glow simulation */}
              <div className="absolute inset-0 border border-success-green opacity-40 blur-xs pointer-events-none" />
              <div className="absolute inset-0 border border-success-green opacity-20 pointer-events-none" />

              <div className="p-6 md:p-8 flex flex-col items-center justify-center text-center relative z-10">
                <span className="font-label-mono text-xs md:text-sm text-void-black/70 uppercase tracking-widest mb-3">
                  Current Pool
                </span>
                <h2 className="font-display-jackpot text-6xl md:text-8xl text-void-black mb-2 leading-none">
                  {jackpot} ETH
                </h2>
                <div className="font-label-mono text-sm md:text-base text-void-black/70 mb-2 font-bold">
                  ~${jackpotUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                </div>

                <div className="flex gap-4 mt-6">
                  <div className="bg-void-black/5 px-4 py-2 border border-void-black/10">
                    <span className="font-label-mono text-[10px] md:text-xs text-void-black/60 block">
                      Ticket Price
                    </span>
                    <span className="font-ticket-id text-sm md:text-base font-bold text-void-black block">
                      {ticketPrice} ETH
                    </span>
                    <span className="font-label-mono text-[10px] text-void-black/60 block mt-0.5">
                      ~${ticketPriceUsd.toFixed(2)} USD
                    </span>
                  </div>
                  <div className="bg-void-black/5 px-4 py-2 border border-void-black/10">
                    <span className="font-label-mono text-[10px] md:text-xs text-void-black/60 block">
                      Tickets Sold
                    </span>
                    <span className="font-ticket-id text-sm md:text-base font-bold text-void-black block">
                      {players.length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Perforation */}
              <div className="w-full border-b-2 border-dashed border-outline-variant/30" />

              <div className="h-20 md:h-24 bg-primary-container/20 p-4 flex justify-between items-center relative z-10">
                <div className="w-2/3 md:w-3/4 h-10 md:h-12 barcode opacity-60" />
                <div className="font-label-mono text-xs text-void-black text-right">
                  <span className="block text-[10px] opacity-60">CONTRACT</span>
                  <span className="font-bold">{shortAddress(CONTRACT_ADDRESS)}</span>
                </div>
              </div>
            </div>

            {/* Countdown Ticket Card */}
            <div className="bg-surface-indigo text-primary border border-outline-variant ticket-notch w-full shadow-xl flex flex-col md:flex-row relative">
              <div className="flex-1 p-6 md:p-8 relative flex flex-col justify-center items-center md:items-start text-center md:text-left">
                {/* Stamp Badge */}
                {lotteryOpen ? (
                  <div className="absolute top-4 right-4 md:top-6 md:right-6 border-4 border-success-green text-success-green font-headline-lg text-xl md:text-2xl px-3 py-1 rotate-6 opacity-90 shadow-md">
                    LIVE
                  </div>
                ) : (
                  <div className="absolute top-4 right-4 md:top-6 md:right-6 border-4 border-warning-orange text-warning-orange font-headline-lg text-xl md:text-2xl px-3 py-1 -rotate-3 opacity-90">
                    ENDED
                  </div>
                )}

                <span className="font-label-mono text-xs text-on-surface-variant uppercase tracking-widest mb-2">
                  Time Remaining
                </span>
                <div className="font-display-jackpot text-6xl md:text-[76px] leading-none mb-4 tracking-tighter text-primary">
                  {formatCountdown(timeRemaining)}
                </div>
                <p className="font-body-md text-sm md:text-base text-on-surface-variant max-w-sm">
                  Purchase a ticket to enter the current round. When the timer reaches zero, a winner is picked automatically.
                </p>
              </div>

              {/* Vertical Perforation */}
              <div className="hidden md:block w-0 border-r-2 border-dashed border-outline-variant my-4" />
              <div className="md:hidden w-full border-b-2 border-dashed border-outline-variant mx-4" />

              {/* Stub Action */}
              <div className="w-full md:w-1/3 p-6 md:p-8 flex flex-col justify-center items-center bg-surface-container-high/50 gap-3">
                {account ? (
                  <button
                    onClick={buyTicket}
                    disabled={isBuying || !lotteryOpen}
                    className="w-full bg-primary-container text-on-primary-fixed font-headline-lg text-lg md:text-xl py-3 px-4 hover:shadow-[4px_4px_0px_0px_#000000] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all duration-200 mb-1 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 uppercase font-bold"
                  >
                    {isBuying ? (
                      <>
                        <span className="spinner !border-on-primary-fixed !border-t-transparent" />
                        BUYING…
                      </>
                    ) : (
                      "PAY WITH ETH"
                    )}
                  </button>
                ) : (
                  <button
                    onClick={connectWallet}
                    className="w-full bg-primary-container text-on-primary-fixed font-headline-lg text-lg md:text-xl py-3 px-4 hover:shadow-[4px_4px_0px_0px_#000000] hover:-translate-y-0.5 transition-all duration-200 mb-1 cursor-pointer uppercase font-bold"
                  >
                    CONNECT WALLET
                  </button>
                )}

                <button
                  onClick={() => setIsModalOpen(true)}
                  disabled={isBuying || !lotteryOpen}
                  className="w-full bg-transparent hover:bg-secondary-fixed/10 text-secondary-fixed border-2 border-secondary-fixed/50 font-headline-lg text-lg md:text-xl py-2.5 px-4 hover:shadow-[4px_4px_0px_0px_rgba(0,251,251,0.4)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all duration-200 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 uppercase font-bold"
                >
                  PAY WITH USD / CARD
                </button>

                <span className="font-label-mono text-[10px] text-on-surface-variant opacity-70 text-center mt-1">
                  Gas approx. 0.002 ETH (ETH option only)
                </span>
              </div>
            </div>
          </div>

          {/* Right Column (Sidebar Stub - 4 cols) */}
          <div className="md:col-span-4 flex flex-col gap-8">
            {/* Vertical Stub Card (Recent Winner) */}
            <div className="bg-surface-indigo border border-outline-variant text-primary shadow-xl flex flex-col h-full relative ticket-notch-top-bottom overflow-hidden">
              {/* Top Header */}
              <div className="bg-secondary-fixed text-on-secondary-fixed p-3 md:p-4 text-center font-label-mono text-xs md:text-sm font-bold tracking-widest uppercase">
                LAST DRAW
              </div>

              {/* Main Content */}
              <div className="flex-1 p-6 flex flex-col items-center justify-center text-center my-4">
                <span
                  className="material-symbols-outlined text-5xl mb-3 text-secondary-fixed"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  emoji_events
                </span>
                <h3 className="font-headline-lg text-3xl md:text-4xl mb-2 text-primary uppercase">
                  WINNER
                </h3>

                {isZeroWinner ? (
                  <div className="font-ticket-id text-xs md:text-sm bg-surface-container-lowest py-2.5 px-4 border border-outline-variant/50 w-full mb-3 text-on-surface-variant">
                    No Winner Yet
                  </div>
                ) : (
                  <>
                    <div className="font-ticket-id text-xs md:text-sm bg-surface-container-lowest py-2.5 px-4 border border-outline-variant/50 break-all w-full mb-3 text-secondary-fixed font-bold">
                      {shortAddress(recentWinner)}
                    </div>
                    <span className="font-label-mono text-xs md:text-sm text-on-surface-variant font-medium">
                      Verified On-Chain
                    </span>
                  </>
                )}
              </div>

              {/* Perforation */}
              <div className="w-full border-b-2 border-dashed border-outline-variant/50" />

              {/* Decorative Barcode Area */}
              <div className="p-6 flex justify-center items-center bg-surface-container/30 h-28 relative">
                <div className="absolute left-0 top-0 bottom-0 w-8 barcode-vert opacity-20" />
                <span className="font-label-mono text-[10px] text-on-surface-variant rotate-90 tracking-widest uppercase font-bold">
                  VERIFIED ON-CHAIN
                </span>
              </div>
            </div>

            {/* Admin Panel (Owner Only) */}
            {isOwner && (
              <div className="border border-outline-variant/50 bg-surface-container-low/40 p-5 flex flex-col gap-3">
                <div className="flex items-center gap-2 font-label-mono text-xs font-bold text-warning-orange uppercase tracking-wider">
                  <span className="material-symbols-outlined text-base">settings_applications</span>
                  ADMIN CONTROLS
                </div>
                
                {players.length > 0 ? (
                  <>
                    <p className="font-body-md text-xs text-on-surface-variant">
                      {players.length} ticket(s) purchased. Draw the winner to distribute the jackpot.
                    </p>
                    <button
                      onClick={pickWinner}
                      disabled={isPicking}
                      className="bg-primary-container text-on-primary-fixed border border-primary-container px-4 py-2.5 font-label-mono text-xs font-bold hover:shadow-[3px_3px_0px_0px_#000] active:translate-y-0 transition-all w-full text-left uppercase flex items-center justify-between cursor-pointer disabled:opacity-50"
                    >
                      <span>Draw Winner ({players.length} Ticket{players.length > 1 ? "s" : ""})</span>
                      {isPicking && <span className="spinner !w-3.5 !h-3.5 !border-on-primary-fixed !border-t-transparent" />}
                    </button>
                  </>
                ) : (
                  <>
                    <p className="font-body-md text-xs text-on-surface-variant">
                      No tickets purchased. Restart the timer to begin a new round.
                    </p>
                    <button
                      onClick={restartLottery}
                      disabled={isRestarting}
                      className="border border-warning-orange text-warning-orange px-4 py-2.5 font-label-mono text-xs font-bold hover:bg-warning-orange hover:text-void-black active:scale-[0.98] transition-all w-full text-left uppercase flex items-center justify-between cursor-pointer disabled:opacity-50"
                    >
                      <span>Restart Round</span>
                      {isRestarting && <span className="spinner !w-3.5 !h-3.5 !border-warning-orange !border-t-transparent" />}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      <Toast />
      <UsdPaymentModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <MobileNav />
    </div>
  );
}
