"use client";

import { useEffect, useState } from "react";
import { Header } from "@/app/components/Header";
import { MobileNav } from "@/app/components/MobileNav";
import { Toast } from "@/app/components/Toast";
import { UsdPaymentModal } from "@/app/components/UsdPaymentModal";
import { useWallet } from "@/app/context/WalletContext";

function shortAddress(addr: string): string {
  if (!addr) return "N/A";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatCountdown(totalSeconds: number): string {
  if (totalSeconds <= 0) return "00:00:00";
  const d = Math.floor(totalSeconds / 86400);
  const h = Math.floor((totalSeconds % 86400) / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  if (d > 0) {
    return `${d}d ${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m`;
  }
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Short timer for tab badges */
function formatTabTimer(totalSeconds: number): string {
  if (totalSeconds <= 0) return "ENDED";
  const d = Math.floor(totalSeconds / 86400);
  const h = Math.floor((totalSeconds % 86400) / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function DrawsPage() {
  const {
    mounted,
    account,
    referrerAddress,
    chainOk,
    rpcHealthy,
    isBuying,
    isPicking,
    buyTicket,
    pickWinner,
    retryRandomness,
    withdrawClaim,
    connectWallet,
    connectMobileWallet,
    txProgress,
    ethUsdPrice,
    activePoolId,
    setActivePoolId,
    pools,
    poolStates,
    activePool,
    activePoolConfig,
  } = useWallet();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [ticketCount, setTicketCount] = useState<number>(1);
  const [nowSeconds, setNowSeconds] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setNowSeconds(Math.floor(Date.now() / 1000)), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  if (!mounted) return null;

  const rolloverEth = parseFloat(activePool.rolloverBalance || "0");
  const totalPoolVal = parseFloat(activePool.currentPot || "0");
  const winnerPrize = parseFloat((totalPoolVal * 0.70).toFixed(4)).toString();
  const canBuy = activePool.contractReady && activePool.lotteryState === "OPEN" &&
    (activePool.totalTickets === 0 || activePool.timeRemaining > 0);
  const vrfRetryReady = activePool.lotteryState === "CALCULATING" && activePool.requestStartedAt > 0 &&
    nowSeconds >= activePool.requestStartedAt + activePool.vrfTimeout;

  const isZeroWinner =
    !activePool.recentWinner || activePool.recentWinner === "0x0000000000000000000000000000000000000000";

  const winnerPrizeUsd = parseFloat(winnerPrize) * ethUsdPrice;
  const ticketPriceUsd = parseFloat(activePool.ticketPrice) * ethUsdPrice;

  return (
    <div className="min-h-screen flex flex-col justify-between relative overflow-x-hidden">
      <div>
        <Header />

        <main className="max-w-7xl mx-auto px-4 md:px-16 py-8 md:py-12 grid grid-cols-1 md:grid-cols-12 gap-8 items-start mb-20 md:mb-12">

          {/* ───── Pool Tab Switcher ───── */}
          <div className="md:col-span-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
              {pools.map((pool) => {
                const isActive = pool.id === activePoolId;
                const poolState = poolStates[pool.id];
                const timer = poolState?.timeRemaining ?? 0;

                return (
                  <button
                    key={pool.id}
                    onClick={() => {
                      setActivePoolId(pool.id);
                      setTicketCount(1);
                    }}
                    className={`relative flex flex-col items-center gap-1 px-3 py-3 md:py-4 font-label-mono text-xs md:text-sm font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer border ${
                      isActive
                        ? "bg-primary-container text-on-primary-fixed border-primary-container shadow-[4px_4px_0px_0px_#000000]"
                        : "bg-surface-container-lowest text-on-surface-variant border-outline-variant/40 hover:border-primary-container hover:bg-surface-container-high/50"
                    }`}
                  >
                    <span className="material-symbols-outlined text-base md:text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>{pool.icon}</span>
                    <span className="leading-tight">{pool.name}</span>
                    <span className={`text-[10px] font-mono ${
                      isActive ? "text-on-primary-fixed/80" : "text-on-surface-variant/60"
                    }`}>
                      {formatTabTimer(timer)}
                    </span>
                    {/* Active dot indicator */}
                    {timer > 0 && (
                      <span className={`absolute top-2 right-2 w-1.5 h-1.5 rounded-full ${
                        isActive ? "bg-success-green" : "bg-success-green/50"
                      }`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className={`md:col-span-12 px-4 py-2.5 flex flex-wrap items-center gap-3 font-label-mono text-xs border ${
            activePool.contractReady && rpcHealthy
              ? "bg-success-green/10 border-success-green/50 text-success-green"
              : "bg-error/10 border-error text-error"
          }`} role="status">
            <strong>{activePool.contractReady ? `${activePoolConfig.name} VERIFIED · ${activePoolConfig.address}` : "DEPLOYMENT NOT VERIFIED — PAYMENTS BLOCKED"}</strong>
            <span>{rpcHealthy ? `RPC ONLINE · ROUND #${activePool.roundId}` : "RPC UNAVAILABLE"}</span>
            {account && !chainOk && <span>WALLET IS ON THE WRONG NETWORK</span>}
          </div>

          {/* Referred By Badge */}
          {referrerAddress && (
            <div className="md:col-span-12 bg-secondary-fixed/10 border border-secondary-fixed text-secondary-fixed px-4 py-2.5 flex items-center gap-2 font-label-mono text-xs shadow-md">
              <span className="material-symbols-outlined text-base">badge</span>
              <span>Referred by wallet: <strong>{shortAddress(referrerAddress)}</strong> ({referrerAddress})</span>
            </div>
          )}

          {/* Left / Center Column (Main Stage - 8 cols) */}
          <div className="md:col-span-8 flex flex-col gap-8">
            {/* Jackpot Ticket Card */}
            <div className="bg-ticket-white text-void-black ticket-notch w-full relative shadow-2xl overflow-hidden">
              {/* Inner glow simulation */}
              <div className="absolute inset-0 border border-success-green opacity-40 blur-xs pointer-events-none" />
              <div className="absolute inset-0 border border-success-green opacity-20 pointer-events-none" />

              <div className="p-6 md:p-8 flex flex-col items-center justify-center text-center relative z-10">
                <span className="font-label-mono text-xs md:text-sm bg-void-black text-success-green uppercase tracking-widest px-4 py-1.5 font-bold mb-3 shadow-md border border-void-black rounded-[100px]">
                  ★ WINNER PRIZE ★
                </span>
                <h2 className="font-display-jackpot text-6xl md:text-8xl text-void-black mb-2 leading-none">
                  ${winnerPrizeUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                </h2>
                <div className="font-label-mono text-sm md:text-base text-void-black/70 mb-2 font-bold">
                  ({winnerPrize} ETH)
                </div>

                {rolloverEth > 0 && (
                  <span className="font-label-mono text-[10px] md:text-xs bg-void-black text-secondary-fixed px-3 py-1 font-bold rounded-full flex items-center gap-1 mt-1 border border-secondary-fixed/40">
                    <span className="material-symbols-outlined text-xs">autorenew</span>
                    +{rolloverEth} ETH ROLLED OVER FROM PREVIOUS UNREFERRED WINNER!
                  </span>
                )}

                <div className="flex gap-4 mt-6">
                  <div className="bg-void-black/5 px-4 py-2 border border-void-black/10">
                    <span className="font-label-mono text-[10px] md:text-xs text-void-black/60 block">
                      Ticket Price
                    </span>
                    <span className="font-ticket-id text-sm md:text-base font-bold text-void-black block">
                      ${ticketPriceUsd.toFixed(2)} USD
                    </span>
                    <span className="font-label-mono text-[10px] text-void-black/60 block mt-0.5">
                      ({activePool.ticketPrice} ETH)
                    </span>
                  </div>
                  <div className="bg-void-black/5 px-4 py-2 border border-void-black/10">
                    <span className="font-label-mono text-[10px] md:text-xs text-void-black/60 block">
                      Tickets Sold
                    </span>
                    <span className="font-ticket-id text-sm md:text-base font-bold text-void-black block">
                      {activePool.totalTickets}
                    </span>
                  </div>
                  <div className="bg-void-black/5 px-4 py-2 border border-void-black/10">
                    <span className="font-label-mono text-[10px] md:text-xs text-void-black/60 block">Your Exact Odds</span>
                    <span className="font-ticket-id text-sm md:text-base font-bold text-void-black block">
                      {activePool.totalTickets > 0
                        ? `${activePool.userTickets}/${activePool.totalTickets} (${((activePool.userTickets / activePool.totalTickets) * 100).toFixed(2)}%)`
                        : "0%"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Perforation */}
              <div className="w-full border-b-2 border-dashed border-outline-variant/30" />

              <div className="h-20 md:h-24 bg-primary-container/20 p-4 flex justify-between items-center relative z-10">
                <div className="w-2/3 md:w-3/4 h-10 md:h-12 barcode opacity-60" />
                <div className="font-label-mono text-xs text-void-black text-right">
                  <span className="block text-[10px] opacity-60">POOL</span>
                  <span className="font-bold flex items-center gap-1"><span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>{activePoolConfig.icon}</span> {activePoolConfig.name}</span>
                </div>
              </div>
            </div>

            {/* Countdown Ticket Card */}
            <div className="bg-surface-indigo text-primary border border-outline-variant ticket-notch w-full shadow-xl flex flex-col md:flex-row relative">
              <div className="flex-1 p-6 md:p-8 relative flex flex-col justify-center items-center md:items-start text-center md:text-left">
                {/* Stamp Badge */}
                {canBuy ? (
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
                  {formatCountdown(activePool.timeRemaining)}
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
                {/* Quantity Stepper & Input */}
                <div className="w-full flex flex-col gap-1.5 mb-1">
                  <span className="font-label-mono text-[10px] text-on-surface-variant/80 uppercase font-bold tracking-wider text-center">
                    SELECT QUANTITY
                  </span>
                  <div className="flex items-center justify-between border border-outline-variant/60 bg-surface-container-lowest">
                    <button
                      onClick={() => setTicketCount((prev) => Math.max(1, prev - 1))}
                      className="px-3 py-2 text-primary hover:bg-surface-container-high font-bold text-lg select-none cursor-pointer"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={ticketCount}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setTicketCount(isNaN(val) || val < 1 ? 1 : val);
                      }}
                      className="w-16 text-center bg-transparent font-ticket-id font-bold text-base text-primary focus:outline-none"
                    />
                    <button
                      onClick={() => setTicketCount((prev) => prev + 1)}
                      className="px-3 py-2 text-primary hover:bg-surface-container-high font-bold text-lg select-none cursor-pointer"
                    >
                      +
                    </button>
                  </div>

                  {/* Preset Buttons */}
                  <div className="grid grid-cols-4 gap-1 mt-1">
                    {[1, 5, 10, 25].map((preset) => (
                      <button
                        key={preset}
                        onClick={() => setTicketCount(preset)}
                        className={`py-1 font-label-mono text-[10px] font-bold transition-all cursor-pointer ${
                          ticketCount === preset
                            ? "bg-primary-container text-on-primary-fixed border border-primary-container"
                            : "bg-surface-container-lowest text-on-surface-variant/70 border border-outline-variant/30 hover:border-primary-container"
                        }`}
                      >
                        +{preset}
                      </button>
                    ))}
                  </div>
                </div>

                {account ? (
                  <button
                    onClick={() => buyTicket(undefined, ticketCount)}
                    disabled={isBuying || !canBuy || !chainOk}
                    className="w-full bg-primary-container text-on-primary-fixed font-headline-lg text-lg md:text-xl py-3 px-4 hover:shadow-[4px_4px_0px_0px_#000000] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all duration-200 mb-1 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 uppercase font-bold"
                  >
                    {isBuying ? (
                      <>
                        <span className="spinner !border-on-primary-fixed !border-t-transparent" />
                        BUYING…
                      </>
                    ) : (
                      `BUY ${ticketCount} TICKET${ticketCount > 1 ? "S" : ""} (${parseFloat((parseFloat(activePool.ticketPrice) * ticketCount).toFixed(4))} ETH)`
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
                  disabled={isBuying || !canBuy}
                  className="w-full bg-transparent hover:bg-secondary-fixed/10 text-secondary-fixed border-2 border-secondary-fixed/50 font-headline-lg text-lg md:text-xl py-2.5 px-4 hover:shadow-[4px_4px_0px_0px_rgba(0,251,251,0.4)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all duration-200 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 uppercase font-bold"
                >
                  BUY ETH WITH CARD / ON-RAMP
                </button>

                <span className="font-label-mono text-[10px] text-on-surface-variant opacity-70 text-center mt-1">
                  Exact gas is simulated before wallet approval.
                </span>

                {!account && (
                  <button
                    onClick={connectMobileWallet}
                    className="w-full border border-outline-variant text-on-surface-variant py-2 font-label-mono text-[10px] uppercase cursor-pointer"
                  >
                    CONNECT MOBILE / WALLETCONNECT
                  </button>
                )}

                {txProgress && (
                  <div className="w-full border border-outline-variant/50 bg-surface-container-lowest p-3 font-label-mono text-[10px]" aria-live="polite">
                    <strong className="uppercase">{txProgress.label}: {txProgress.state}</strong>
                    {txProgress.estimatedGas && (
                      <span className="block mt-1">Estimated gas: {txProgress.estimatedGas} · max fee {txProgress.estimatedFeeEth ?? "pending"} ETH</span>
                    )}
                    {txProgress.hash && <span className="block break-all mt-1">Tx: {txProgress.hash}</span>}
                    {txProgress.replacementHash && <span className="block break-all mt-1">Replacement: {txProgress.replacementHash}</span>}
                  </div>
                )}
              </div>
            </div>

            {/* Refer & Earn Card */}
            <div className="bg-surface-indigo border border-secondary-fixed/40 p-6 md:p-8 shadow-xl flex flex-col md:flex-row justify-between items-center gap-6 ticket-notch">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-secondary-fixed text-2xl">share</span>
                  <h3 className="font-headline-lg text-2xl text-primary uppercase">
                    REFER & EARN (20%)
                  </h3>
                </div>
                <p className="font-body-md text-xs md:text-sm text-on-surface-variant max-w-lg">
                  Share your personal referral link with friends. When a user who lands via your link wins a draw, you automatically receive 20% of the total jackpot!
                </p>
              </div>

              <button
                onClick={() => {
                  const link = typeof window !== "undefined"
                    ? `${window.location.origin}/?ref=${account || "YOUR_WALLET"}`
                    : `http://localhost:3000/?ref=${account || "YOUR_WALLET"}`;
                  navigator.clipboard.writeText(link);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 3000);
                }}
                className="w-full md:w-auto bg-secondary-fixed text-on-secondary-fixed font-headline-lg text-sm md:text-base px-6 py-3 hover:shadow-[4px_4px_0px_0px_#000] active:translate-y-0.5 transition-all whitespace-nowrap uppercase font-bold flex items-center justify-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">content_copy</span>
                {copied ? "COPIED LINK!" : "COPY REFERRAL LINK"}
              </button>
            </div>
          </div>

          {/* Right Column (Sidebar Stub - 4 cols) */}
          <div className="md:col-span-4 flex flex-col gap-8">
            {/* Vertical Stub Card (Recent Winner) */}
            <div className="bg-surface-indigo border border-outline-variant text-primary shadow-xl flex flex-col h-full relative ticket-notch-top-bottom overflow-hidden">
              {/* Top Header */}
              <div className="bg-secondary-fixed text-on-secondary-fixed p-3 md:p-4 text-center font-label-mono text-xs md:text-sm font-bold tracking-widest uppercase">
                LAST DRAW — <span className="material-symbols-outlined text-xs align-middle" style={{ fontVariationSettings: "'FILL' 1" }}>{activePoolConfig.icon}</span> {activePoolConfig.name}
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
                      {shortAddress(activePool.recentWinner)}
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

            {/* 100% Autonomous Smart Contract Panel (Trustless, No Admin) */}
            <div className="border border-success-green/40 bg-surface-container-low/60 p-5 flex flex-col gap-3.5 shadow-lg">
              <div className="flex items-center gap-2 font-label-mono text-xs font-bold text-success-green uppercase tracking-wider">
                <span className="material-symbols-outlined text-base">verified_user</span>
                <span>100% AUTONOMOUS CONTRACT</span>
              </div>
              
              <p className="font-body-md text-xs text-on-surface-variant leading-relaxed">
                Chainlink-compatible VRF chooses the winning ticket. Automation requests draws, and pull-based claims prevent a hostile recipient from blocking later rounds.
              </p>

              {activePool.lotteryState === "OPEN" && activePool.timeRemaining === 0 && activePool.totalTickets > 0 ? (
                <button
                  onClick={pickWinner}
                  disabled={isPicking}
                  className="bg-success-green text-void-black border border-success-green px-4 py-2.5 font-label-mono text-xs font-bold hover:shadow-[3px_3px_0px_0px_#000] active:translate-y-0.5 transition-all w-full text-center uppercase flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-base">emoji_events</span>
                  <span>{isPicking ? "REQUESTING VRF…" : `REQUEST DRAW (${activePool.totalTickets} TICKET${activePool.totalTickets > 1 ? "S" : ""})`}</span>
                </button>
              ) : activePool.lotteryState === "CALCULATING" ? (
                <button
                  onClick={retryRandomness}
                  disabled={isPicking || !vrfRetryReady}
                  className="border border-warning-yellow text-warning-yellow px-4 py-2.5 font-label-mono text-xs font-bold uppercase disabled:opacity-50 cursor-pointer"
                >
                  {vrfRetryReady ? "RETRY STALLED VRF REQUEST" : `WAITING FOR CHAINLINK VRF #${activePool.activeRequestId}`}
                </button>
              ) : (
                <div className="flex items-center gap-2 font-label-mono text-[10px] text-secondary-fixed bg-secondary-fixed/10 px-3 py-2 border border-secondary-fixed/30 font-bold">
                  <span className="material-symbols-outlined text-sm">lock</span>
                  <span>AUTONOMOUS DRAW ENFORCED ON-CHAIN</span>
                </div>
              )}

              {account && parseFloat(activePool.claimable) > 0 && (
                <button
                  onClick={withdrawClaim}
                  disabled={isBuying}
                  className="bg-secondary-fixed text-on-secondary-fixed px-4 py-2.5 font-label-mono text-xs font-bold uppercase cursor-pointer disabled:opacity-50"
                >
                  CLAIM {activePool.claimable} ETH
                </button>
              )}
            </div>
          </div>
        </main>
      </div>

      <Toast />
      <UsdPaymentModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} ticketCount={ticketCount} />
      <MobileNav />
    </div>
  );
}
