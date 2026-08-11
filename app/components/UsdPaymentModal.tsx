"use client";

import { useEffect, useRef } from "react";
import { NETWORK } from "@/constants/contract";
import { useWallet } from "@/app/context/WalletContext";

interface UsdPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticketCount?: number;
}

export function UsdPaymentModal({ isOpen, onClose, ticketCount = 1 }: UsdPaymentModalProps) {
  const { account, activePool, ethUsdPrice, connectWallet, connectMobileWallet } = useWallet();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const onrampTemplate = process.env.NEXT_PUBLIC_ONRAMP_URL_TEMPLATE;
  const totalEth = Number(activePool.ticketPrice) * ticketCount;
  const totalUsd = ethUsdPrice > 0 ? totalEth * ethUsdPrice : null;

  useEffect(() => {
    if (!isOpen) return;
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const launchOnramp = () => {
    if (!account || !onrampTemplate) return;
    const url = onrampTemplate
      .replaceAll("{address}", encodeURIComponent(account))
      .replaceAll("{chainId}", String(NETWORK.chainId))
      .replaceAll("{amountEth}", String(totalEth));
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-void-black/80 backdrop-blur-sm p-4"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="onramp-title"
        aria-describedby="onramp-description"
        className="bg-surface-indigo text-primary border border-outline-variant ticket-notch w-full max-w-lg shadow-2xl relative"
      >
        <button
          ref={closeButtonRef}
          onClick={onClose}
          aria-label="Close hosted crypto purchase dialog"
          className="absolute top-4 right-4 text-on-surface-variant hover:text-primary p-2 cursor-pointer"
        >
          <span className="material-symbols-outlined" aria-hidden="true">close</span>
        </button>

        <div className="p-7 md:p-9">
          <span className="font-label-mono text-[10px] text-secondary-fixed uppercase tracking-widest block mb-1 font-bold">
            HOSTED CRYPTO ON-RAMP
          </span>
          <h2 id="onramp-title" className="font-headline-lg text-3xl uppercase text-primary pr-10">
            Buy ETH with a card
          </h2>
          <p id="onramp-description" className="font-body-md text-sm text-on-surface-variant mt-3">
            A regulated third-party provider handles identity checks and card details. ETH is delivered to your wallet;
            you then approve the lottery ticket purchase on-chain. This app never receives your card number or CVC.
          </p>

          <div className="mt-6 border border-outline-variant/60 bg-surface-container-lowest p-4 grid grid-cols-2 gap-3 font-label-mono text-xs">
            <span className="text-on-surface-variant">Tickets requested</span><strong className="text-right">{ticketCount}</strong>
            <span className="text-on-surface-variant">Required ETH</span><strong className="text-right">{totalEth} ETH + gas</strong>
            <span className="text-on-surface-variant">Indicative USD</span><strong className="text-right">{totalUsd === null ? "Quote unavailable" : `$${totalUsd.toFixed(2)}`}</strong>
            <span className="text-on-surface-variant">Network</span><strong className="text-right">{NETWORK.name}</strong>
          </div>

          {!account ? (
            <div className="mt-6 grid sm:grid-cols-2 gap-3">
              <button onClick={() => void connectWallet()} className="bg-primary-container text-on-primary-fixed py-3 px-4 font-label-mono text-xs font-bold uppercase cursor-pointer">
                Connect browser wallet
              </button>
              <button onClick={() => void connectMobileWallet()} className="border border-secondary-fixed text-secondary-fixed py-3 px-4 font-label-mono text-xs font-bold uppercase cursor-pointer">
                Connect mobile wallet
              </button>
            </div>
          ) : (
            <button
              onClick={launchOnramp}
              disabled={!onrampTemplate}
              className="mt-6 w-full bg-primary-container text-on-primary-fixed py-3 px-6 font-headline-lg text-lg uppercase font-bold disabled:opacity-50 cursor-pointer"
            >
              {onrampTemplate ? "Open secure hosted on-ramp" : "On-ramp provider not configured"}
            </button>
          )}

          {!onrampTemplate && (
            <p className="mt-3 text-xs text-warning-yellow font-label-mono" role="status">
              Add NEXT_PUBLIC_ONRAMP_URL_TEMPLATE after selecting and receiving approval from an on-ramp provider.
              Direct ETH wallet payments remain available.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
