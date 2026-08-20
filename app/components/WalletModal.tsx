"use client";

import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@/app/context/WalletContext";
import type { Eip1193Provider } from "ethers";

/* ── EIP-6963 types ────────────────────────────────── */
interface EIP6963ProviderInfo {
  uuid: string;
  name: string;
  icon: string;  // data-uri or https URL
  rdns: string;  // reverse-domain (io.metamask, io.rabby, etc.)
}

interface EIP6963ProviderDetail {
  info: EIP6963ProviderInfo;
  provider: Eip1193Provider;
}

interface EIP6963AnnounceEvent extends Event {
  detail: EIP6963ProviderDetail;
}

/* ── Component ─────────────────────────────────────── */
interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WalletModal({ isOpen, onClose }: WalletModalProps) {
  const { connectWalletWithProvider, connectWallet, isConnecting } = useWallet();
  const [wallets, setWallets] = useState<EIP6963ProviderDetail[]>([]);
  const [connecting, setConnecting] = useState<string | null>(null);

  /* ── Discover wallets via EIP-6963 ───────────────── */
  useEffect(() => {
    if (!isOpen) return;

    const discovered = new Map<string, EIP6963ProviderDetail>();

    const handleAnnounce = (event: Event) => {
      const detail = (event as EIP6963AnnounceEvent).detail;
      if (!detail?.info?.uuid) return;
      discovered.set(detail.info.uuid, detail);
      setWallets(Array.from(discovered.values()));
    };

    window.addEventListener("eip6963:announceProvider", handleAnnounce);
    window.dispatchEvent(new Event("eip6963:requestProvider"));

    // Small delay fallback: some wallets announce asynchronously
    const timeout = setTimeout(() => {
      setWallets(Array.from(discovered.values()));
    }, 300);

    return () => {
      window.removeEventListener("eip6963:announceProvider", handleAnnounce);
      clearTimeout(timeout);
    };
  }, [isOpen]);

  /* ── Connect to specific wallet ──────────────────── */
  const handleConnect = useCallback(async (wallet: EIP6963ProviderDetail) => {
    setConnecting(wallet.info.uuid);
    try {
      await connectWalletWithProvider(wallet.provider);
      onClose();
    } catch {
      // error already handled in context
    } finally {
      setConnecting(null);
    }
  }, [connectWalletWithProvider, onClose]);

  /* ── Fallback: use window.ethereum directly ──────── */
  const handleFallback = useCallback(async () => {
    setConnecting("fallback");
    try {
      await connectWallet();
      onClose();
    } catch {
      // error already handled in context
    } finally {
      setConnecting(null);
    }
  }, [connectWallet, onClose]);

  if (!isOpen) return null;

  const hasWallets = wallets.length > 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-void-black/80 backdrop-blur-sm z-[100]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-[101] p-4">
        <div className="bg-surface-indigo border-2 border-outline-variant w-full max-w-md shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b-2 border-dashed border-outline-variant">
            <h2 className="font-headline-lg text-xl text-primary uppercase tracking-tight">
              Connect Wallet
            </h2>
            <button
              onClick={onClose}
              className="text-on-surface-variant hover:text-error transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>

          {/* Wallet List */}
          <div className="p-6 flex flex-col gap-3">
            {hasWallets ? (
              <>
                <p className="font-label-mono text-[10px] text-on-surface-variant/70 uppercase tracking-wider mb-1">
                  Detected Wallets
                </p>
                {wallets.map((wallet) => {
                  const isActive = connecting === wallet.info.uuid;
                  return (
                    <button
                      key={wallet.info.uuid}
                      onClick={() => void handleConnect(wallet)}
                      disabled={isConnecting}
                      className="w-full flex items-center gap-4 bg-surface-container-lowest border border-outline-variant/40 px-4 py-3.5 hover:border-primary-container hover:bg-surface-container-high/50 transition-all cursor-pointer disabled:opacity-50 group"
                    >
                      {/* Wallet Icon */}
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-void-black/30 flex-shrink-0 flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={wallet.info.icon}
                          alt={wallet.info.name}
                          width={40}
                          height={40}
                          className="w-10 h-10 object-contain"
                        />
                      </div>

                      {/* Wallet Name */}
                      <div className="flex-1 text-left">
                        <span className="font-label-mono text-sm text-primary font-bold block group-hover:text-primary-container transition-colors">
                          {wallet.info.name}
                        </span>
                        <span className="font-label-mono text-[10px] text-on-surface-variant/60 block">
                          {wallet.info.rdns}
                        </span>
                      </div>

                      {/* Arrow / Spinner */}
                      <div className="flex-shrink-0">
                        {isActive ? (
                          <span className="spinner !w-5 !h-5 !border-primary !border-t-transparent" />
                        ) : (
                          <span className="material-symbols-outlined text-on-surface-variant/40 group-hover:text-primary-container transition-colors text-lg">
                            arrow_forward
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </>
            ) : (
              /* No EIP-6963 wallets detected — fallback */
              <div className="flex flex-col items-center gap-4 py-4">
                <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">
                  account_balance_wallet
                </span>
                <p className="font-label-mono text-xs text-on-surface-variant/70 text-center">
                  No wallets detected via multi-provider discovery.
                </p>
                <button
                  onClick={() => void handleFallback()}
                  disabled={isConnecting}
                  className="w-full bg-primary-container text-on-primary-fixed font-label-mono text-sm font-bold uppercase py-3 px-4 hover:shadow-[4px_4px_0px_0px_#000000] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all cursor-pointer disabled:opacity-50"
                >
                  {connecting === "fallback" ? "Connecting…" : "Connect Default Wallet"}
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 pb-5">
            <p className="font-label-mono text-[9px] text-on-surface-variant/50 text-center leading-relaxed">
              By connecting, you agree to the platform&apos;s Terms &amp; Conditions.
              <br />
              Your wallet will be prompted to switch to the correct network.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
