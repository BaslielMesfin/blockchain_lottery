"use client";

import { Header } from "@/app/components/Header";
import { MobileNav } from "@/app/components/MobileNav";
import { Toast } from "@/app/components/Toast";

export default function RulesPage() {
  const rules = [
    {
      step: "01",
      title: "Buy A Ticket",
      desc: "Each ticket costs 0.01 ETH. You can purchase as many tickets as you want during an active round to increase your chances.",
      icon: "confirmation_number",
    },
    {
      step: "02",
      title: "Watch The Timer",
      desc: "Each lottery round runs on a set timer (e.g. 5 minutes). The live countdown displays time remaining until draw.",
      icon: "timer",
    },
    {
      step: "03",
      title: "Winner Selection",
      desc: "When the countdown hits 0, a winner is picked randomly using on-chain pseudo-randomness from the block header.",
      icon: "casino",
    },
    {
      step: "04",
      title: "70 / 20 / 10 Prize Split & Rollover",
      desc: "70% of the jackpot is sent directly to the winner's wallet, 20% goes to their referrer (or rolls over into the next jackpot if unreferred), and 10% is the house fee.",
      icon: "payments",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col justify-between relative overflow-x-hidden">
      <div>
        <Header />

        <main className="max-w-5xl mx-auto px-4 md:px-16 py-8 md:py-12 mb-20 md:mb-12">
          {/* Header Section */}
          <div className="mb-10 text-center md:text-left">
            <span className="font-label-mono text-xs text-primary-container uppercase tracking-widest block mb-2 font-bold">
              // HOW IT WORKS
            </span>
            <h1 className="font-headline-lg text-4xl md:text-6xl text-primary uppercase tracking-tight">
              LOTTERY RULES & PROTOCOL
            </h1>
            <p className="font-body-md text-sm md:text-base text-on-surface-variant max-w-xl mt-3">
              Learn how tickets are purchased, how winners are selected on-chain, and how prize pools are split.
            </p>
          </div>

          {/* Rules Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {rules.map((rule) => (
              <div
                key={rule.step}
                className="bg-surface-indigo border border-outline-variant ticket-notch p-6 md:p-8 flex flex-col justify-between relative shadow-lg"
              >
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-label-mono text-xs text-secondary-fixed font-bold tracking-wider">
                      RULE {rule.step}
                    </span>
                    <span
                      className="material-symbols-outlined text-primary-container text-3xl"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      {rule.icon}
                    </span>
                  </div>

                  <h3 className="font-headline-lg text-2xl md:text-3xl text-primary mb-2 uppercase">
                    {rule.title}
                  </h3>

                  <p className="font-body-md text-sm text-on-surface-variant leading-relaxed">
                    {rule.desc}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-dashed border-outline-variant/40 flex justify-between items-center font-label-mono text-[10px] text-on-surface-variant/60">
                  <span>ETHEREUM SMART CONTRACT</span>
                  <span>VERIFIED</span>
                </div>
              </div>
            ))}
          </div>

          {/* Contract Transparency Box */}
          <div className="mt-8 bg-ticket-white text-void-black border-2 border-void-black p-6 md:p-8 shadow-[6px_6px_0px_0px_#000000]">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <span className="font-label-mono text-xs text-void-black/70 uppercase tracking-widest font-bold block mb-1">
                  PROVABLY TRANSPARENT
                </span>
                <h4 className="font-headline-lg text-2xl text-void-black uppercase">
                  FULLY ON-CHAIN & AUTOMATED
                </h4>
                <p className="font-body-md text-xs md:text-sm text-void-black/80 max-w-2xl mt-1">
                  All funds, ticket purchases, countdown timers, and payout distributions are handled by smart contracts. No human intervention can alter the draw outcome.
                </p>
              </div>

              <a
                href="/"
                className="bg-void-black text-ticket-white font-label-mono text-xs font-bold uppercase px-6 py-3 hover:bg-surface-container-high transition-colors whitespace-nowrap"
              >
                PLAY NOW →
              </a>
            </div>
          </div>
        </main>
      </div>

      <Toast />
      <MobileNav />
    </div>
  );
}
