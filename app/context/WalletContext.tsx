"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { BrowserProvider, Contract, formatEther, parseEther } from "ethers";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "@/constants/contract";

/* ─── Types ──────────────────────────────────────────── */
interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export interface DrawWinnerEvent {
  winner: string;
  prizeAmount: string;
  houseFee: string;
  blockNumber: number;
}

interface WalletContextType {
  mounted: boolean;
  account: string | null;
  isConnecting: boolean;
  timeRemaining: number;
  ticketPrice: string;
  players: string[];
  recentWinner: string;
  owner: string;
  lotteryOpen: boolean;
  isBuying: boolean;
  isPicking: boolean;
  isRestarting: boolean;
  txStatus: string | null;
  pastWinners: DrawWinnerEvent[];
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  buyTicket: () => Promise<void>;
  pickWinner: () => Promise<void>;
  restartLottery: () => Promise<void>;
  fetchPastWinners: () => Promise<void>;
  fetchContractData: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  /* ── Wallet state ────────────────────────────────── */
  const [account, setAccount] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  /* ── Contract state ──────────────────────────────── */
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [ticketPrice, setTicketPrice] = useState<string>("0.01");
  const [players, setPlayers] = useState<string[]>([]);
  const [recentWinner, setRecentWinner] = useState<string>("");
  const [owner, setOwner] = useState<string>("");
  const [lotteryOpen, setLotteryOpen] = useState<boolean>(true);
  const [pastWinners, setPastWinners] = useState<DrawWinnerEvent[]>([]);

  /* ── TX state ────────────────────────────────────── */
  const [isBuying, setIsBuying] = useState(false);
  const [isPicking, setIsPicking] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const [txStatus, setTxStatus] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const providerRef = useRef<BrowserProvider | null>(null);
  const readContractRef = useRef<Contract | null>(null);
  const lotteryEndTimeRef = useRef<number>(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  /* ── Provider & Contract Getters ─────────────────── */
  const getProvider = useCallback(() => {
    if (typeof window === "undefined" || !window.ethereum) return null;
    if (!providerRef.current) {
      providerRef.current = new BrowserProvider(window.ethereum);
    }
    return providerRef.current;
  }, []);

  const getReadContract = useCallback(() => {
    const provider = getProvider();
    if (!provider) return null;
    if (!readContractRef.current) {
      readContractRef.current = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    }
    return readContractRef.current;
  }, [getProvider]);

  const getWriteContract = useCallback(async () => {
    const provider = getProvider();
    if (!provider) return null;
    const signer = await provider.getSigner();
    return new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
  }, [getProvider]);

  /* ── Fetch Contract Data ─────────────────────────── */
  const fetchContractData = useCallback(async () => {
    const contract = getReadContract();
    if (!contract) return;

    try {
      const [price, playerList, winner, contractOwner, isOpen, endTime] =
        await Promise.all([
          contract.ticketPrice(),
          contract.getPlayers(),
          contract.recentWinner(),
          contract.owner(),
          contract.lotteryOpen(),
          contract.lotteryEndTime(),
        ]);

      setTicketPrice(formatEther(price));
      setPlayers(playerList as string[]);
      setRecentWinner(winner as string);
      setOwner((contractOwner as string).toLowerCase());
      setLotteryOpen(isOpen as boolean);

      lotteryEndTimeRef.current = Number(endTime);
    } catch (err) {
      console.error("Failed to fetch contract data:", err);
    }
  }, [getReadContract]);

  /* ── Fetch Past Winners Events ───────────────────── */
  const fetchPastWinners = useCallback(async () => {
    const contract = getReadContract();
    if (!contract) return;

    try {
      const filter = contract.filters.WinnerPicked();
      const events = await contract.queryFilter(filter, 0, "latest");

      const formatted: DrawWinnerEvent[] = events.map((evt) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const args = (evt as any).args;
        return {
          winner: args[0] as string,
          prizeAmount: formatEther(args[1]),
          houseFee: formatEther(args[2]),
          blockNumber: evt.blockNumber,
        };
      }).reverse();

      setPastWinners(formatted);
    } catch (err) {
      console.error("Failed to fetch past winner events:", err);
    }
  }, [getReadContract]);

  /* ── Countdown Poller ────────────────────────────── */
  const startCountdownPoller = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    const tick = () => {
      const endTime = lotteryEndTimeRef.current;
      if (endTime === 0) return;

      const nowSeconds = Math.floor(Date.now() / 1000);
      const remaining = Math.max(0, endTime - nowSeconds);
      setTimeRemaining(remaining);
    };

    tick();
    timerRef.current = setInterval(tick, 1000);
  }, []);

  /* ── Connect Wallet ──────────────────────────────── */
  const connectWallet = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      setTxStatus("Error: Please install MetaMask to use this dApp.");
      setTimeout(() => setTxStatus(null), 5000);
      return;
    }
    setIsConnecting(true);
    try {
      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];
      if (accounts.length > 0) {
        setAccount(accounts[0].toLowerCase());
        setTxStatus("Wallet connected successfully!");
        setTimeout(() => setTxStatus(null), 3000);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Wallet connection rejected";
      setTxStatus(`Error: ${message.slice(0, 80)}`);
      setTimeout(() => setTxStatus(null), 5000);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  /* ── Disconnect Wallet ───────────────────────────── */
  const disconnectWallet = useCallback(() => {
    setAccount(null);
    providerRef.current = null;
    readContractRef.current = null;
    setTxStatus("Wallet disconnected.");
    setTimeout(() => setTxStatus(null), 3000);
  }, []);

  /* ── Buy Ticket ──────────────────────────────────── */
  const buyTicket = useCallback(async () => {
    setIsBuying(true);
    setTxStatus("Sending transaction…");
    try {
      const contract = await getWriteContract();
      if (!contract) throw new Error("No contract");

      const tx = await contract.buyTicket({ value: parseEther("0.01") });
      setTxStatus("Mining… please wait");
      await tx.wait();
      setTxStatus("Ticket purchased! 🎉");
      await fetchContractData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Transaction failed";
      setTxStatus(`Error: ${message.slice(0, 80)}`);
    } finally {
      setIsBuying(false);
      setTimeout(() => setTxStatus(null), 4000);
    }
  }, [getWriteContract, fetchContractData]);

  /* ── Pick Winner ─────────────────────────────────── */
  const pickWinner = useCallback(async () => {
    setIsPicking(true);
    setTxStatus("Picking winner…");
    try {
      const contract = await getWriteContract();
      if (!contract) throw new Error("No contract");

      const tx = await contract.pickWinner();
      setTxStatus("Mining… please wait");
      await tx.wait();
      setTxStatus("Winner picked! 🏆");
      await fetchContractData();
      await fetchPastWinners();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Transaction failed";
      setTxStatus(`Error: ${message.slice(0, 80)}`);
    } finally {
      setIsPicking(false);
      setTimeout(() => setTxStatus(null), 4000);
    }
  }, [getWriteContract, fetchContractData, fetchPastWinners]);

  /* ── Restart Lottery ─────────────────────────────── */
  const restartLottery = useCallback(async () => {
    setIsRestarting(true);
    setTxStatus("Restarting lottery…");
    try {
      const contract = await getWriteContract();
      if (!contract) throw new Error("No contract");

      const tx = await contract.restartLottery();
      setTxStatus("Mining… please wait");
      await tx.wait();
      setTxStatus("Lottery restarted! 🎉");
      await fetchContractData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Transaction failed";
      setTxStatus(`Error: ${message.slice(0, 80)}`);
    } finally {
      setIsRestarting(false);
      setTimeout(() => setTxStatus(null), 4000);
    }
  }, [getWriteContract, fetchContractData]);

  /* ── Effects ─────────────────────────────────────── */
  useEffect(() => {
    if (!mounted || typeof window === "undefined" || !window.ethereum) return;

    (async () => {
      try {
        const accounts = (await window.ethereum.request({
          method: "eth_accounts",
        })) as string[];
        if (accounts.length > 0) setAccount(accounts[0].toLowerCase());
      } catch {
        /* silent */
      }
    })();

    const handleAccountsChanged = (...args: unknown[]) => {
      const accs = args[0] as string[];
      providerRef.current = null;
      readContractRef.current = null;
      setAccount(accs.length > 0 ? accs[0].toLowerCase() : null);
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    return () => {
      window.ethereum?.removeListener("accountsChanged", handleAccountsChanged);
    };
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    fetchContractData();
    fetchPastWinners();
    startCountdownPoller();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [mounted, fetchContractData, fetchPastWinners, startCountdownPoller]);

  /* ── Auto-pick winner effect ─────────────────────── */
  const autoPickTriggeredRef = useRef(false);
  const isOwner = account !== null && owner !== "" && account === owner;

  useEffect(() => {
    if (timeRemaining > 0) {
      autoPickTriggeredRef.current = false;
      return;
    }

    if (
      timeRemaining === 0 &&
      isOwner &&
      players.length > 0 &&
      !isPicking &&
      !autoPickTriggeredRef.current
    ) {
      autoPickTriggeredRef.current = true;
      pickWinner();
    }
  }, [timeRemaining, isOwner, players.length, isPicking, pickWinner]);

  return (
    <WalletContext.Provider
      value={{
        mounted,
        account,
        isConnecting,
        timeRemaining,
        ticketPrice,
        players,
        recentWinner,
        owner,
        lotteryOpen,
        isBuying,
        isPicking,
        isRestarting,
        txStatus,
        pastWinners,
        connectWallet,
        disconnectWallet,
        buyTicket,
        pickWinner,
        restartLottery,
        fetchPastWinners,
        fetchContractData,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}
