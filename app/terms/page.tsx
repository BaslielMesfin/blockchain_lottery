"use client";

import { Header } from "@/app/components/Header";
import { MobileNav } from "@/app/components/MobileNav";
import { Toast } from "@/app/components/Toast";

export default function TermsPage() {
  const termsSections = [
    {
      id: "split",
      title: "1. 70 / 20 / 10 Prize Split Model",
      icon: "pie_chart",
      content: (
        <div className="flex flex-col gap-3 text-sm text-on-surface-variant font-body-md">
          <p>
            Every lottery jackpot is split strictly according to the smart contract payout parameters upon winner selection:
          </p>
          <ul className="list-disc list-inside flex flex-col gap-1.5 font-label-mono text-xs text-primary">
            <li>
              <strong className="text-secondary-fixed">70% Winner Payout:</strong> Allocated directly to the winning wallet address.
            </li>
            <li>
              <strong className="text-secondary-fixed">20% Referrer Reward / Rollover:</strong> Transferred automatically to the registered referrer wallet of the winner. If the winner has no registered referrer, this 20% automatically rolls over into the contract jackpot for the next round!
            </li>
            <li>
              <strong className="text-secondary-fixed">10% Protocol House Fee:</strong> Allocated to the contract owner to cover protocol maintenance, hosting, and gas infrastructure.
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: "referrals",
      title: "2. Referral Program Mechanics",
      icon: "group_add",
      content: (
        <div className="flex flex-col gap-3 text-sm text-on-surface-variant font-body-md">
          <p>
            The referral system operates entirely on-chain without centralized tracking:
          </p>
          <ul className="list-disc list-inside flex flex-col gap-1.5 font-label-mono text-xs text-primary">
            <li>
              Referral links follow the URL structure: <code className="bg-surface-container-lowest px-2 py-1 text-secondary-fixed font-bold">http://localhost:3000/?ref=0xYOUR_WALLET</code>.
            </li>
            <li>
              When a user lands via your referral link and buys a ticket, your wallet address is permanently mapped as their referrer inside the smart contract state.
            </li>
            <li>
              Whenever a referee wins a round, the smart contract automatically sends 20% of the gross jackpot pool to your referrer wallet in the same transaction.
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: "rollover",
      title: "3. Zero-Signature Automatic Round Rollover",
      icon: "update",
      content: (
        <div className="flex flex-col gap-3 text-sm text-on-surface-variant font-body-md">
          <p>
            Rounds are governed by a 2-hour (7,200 seconds) duration timer.
          </p>
          <ul className="list-disc list-inside flex flex-col gap-1.5 font-label-mono text-xs text-primary">
            <li>
              If a round expires, buyer entry is never blocked. The smart contract automatically detects the expiration timestamp upon the next ticket purchase.
            </li>
            <li>
              The contract clears previous round participants and initializes a new 2-hour countdown immediately inside the buyer&apos;s transaction.
            </li>
            <li>
              No owner signature or administrative intervention is required to restart active rounds.
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: "security",
      title: "4. Autonomous Execution & Verification",
      icon: "verified_user",
      content: (
        <div className="flex flex-col gap-3 text-sm text-on-surface-variant font-body-md">
          <p>
            All ticket entries, countdown timers, random winner selections, and payout transfers are processed non-custodially on the Ethereum blockchain.
          </p>
          <p className="font-label-mono text-xs text-on-surface-variant/80">
            By interacting with this smart contract dApp, users acknowledge and accept that all transactions are final, non-refundable, and governed solely by deployed smart contract code.
          </p>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen flex flex-col justify-between relative overflow-x-hidden">
      <div>
        <Header />

        <main className="max-w-5xl mx-auto px-4 md:px-16 py-8 md:py-12 mb-20 md:mb-12">
          {/* Header Section */}
          <div className="mb-10 text-center md:text-left">
            <span className="font-label-mono text-xs text-secondary-fixed uppercase tracking-widest block mb-2 font-bold">
              // LEGAL & PROTOCOL TERMS
            </span>
            <h1 className="font-headline-lg text-4xl md:text-6xl text-primary uppercase tracking-tight">
              TERMS & CONDITIONS
            </h1>
            <p className="font-body-md text-sm md:text-base text-on-surface-variant max-w-xl mt-3">
              Official specification of prize distribution, referral program rewards, auto-rollover execution, and protocol governance.
            </p>
          </div>

          {/* Terms Content Sections */}
          <div className="flex flex-col gap-6">
            {termsSections.map((section) => (
              <div
                key={section.id}
                className="bg-surface-indigo border border-outline-variant ticket-notch p-6 md:p-8 flex flex-col gap-4 shadow-xl relative"
              >
                <div className="flex items-center gap-3 border-b border-dashed border-outline-variant/40 pb-4">
                  <span
                    className="material-symbols-outlined text-secondary-fixed text-3xl"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {section.icon}
                  </span>
                  <h3 className="font-headline-lg text-2xl md:text-3xl text-primary uppercase">
                    {section.title}
                  </h3>
                </div>

                <div>{section.content}</div>
              </div>
            ))}
          </div>

          {/* Acceptance Banner */}
          <div className="mt-8 bg-ticket-white text-void-black border-2 border-void-black p-6 md:p-8 shadow-[6px_6px_0px_0px_#000000] flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <span className="font-label-mono text-xs text-void-black/70 uppercase tracking-widest font-bold block mb-1">
                SMART CONTRACT GOVERNANCE
              </span>
              <h4 className="font-headline-lg text-xl md:text-2xl text-void-black uppercase">
                TRANSPARENT & AUDITABLE ON-CHAIN
              </h4>
            </div>

            <a
              href="/"
              className="bg-void-black text-ticket-white font-label-mono text-xs font-bold uppercase px-6 py-3 hover:bg-surface-container-high transition-colors whitespace-nowrap"
            >
              RETURN TO LOTTERY →
            </a>
          </div>
        </main>
      </div>

      <Toast />
      <MobileNav />
    </div>
  );
}
