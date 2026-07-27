"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { BrowserProvider, Contract, JsonRpcProvider, formatEther, parseEther } from "ethers";
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
  referrer?: string;
  referrerReward?: string;
  blockNumber: number;
}

interface WalletContextType {
  mounted: boolean;
  account: string | null;
  referrerAddress: string | null;
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
  ethUsdPrice: number;
  buyTicketWithUsd: (cardInfo: { cardNumber: string; expiry: string; cvc: string; name: string }) => Promise<void>;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  buyTicket: (customReferrer?: string) => Promise<void>;
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
  const [referrerAddress, setReferrerAddress] = useState<string | null>(null);
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
  const [ethUsdPrice, setEthUsdPrice] = useState<number>(3500);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const providerRef = useRef<BrowserProvider | null>(null);
  const readProviderRef = useRef<JsonRpcProvider | BrowserProvider | null>(null);
  const readContractRef = useRef<Contract | null>(null);
  const lotteryEndTimeRef = useRef<number>(0);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref");
      if (ref && /^0x[a-fA-F0-9]{40}$/.test(ref)) {
        setReferrerAddress(ref.toLowerCase());
      }
    }
  }, []);

  /* ── Provider & Contract Getters ─────────────────── */
  const getProvider = useCallback(() => {
    if (typeof window === "undefined" || !window.ethereum) return null;
    if (!providerRef.current) {
      providerRef.current = new BrowserProvider(window.ethereum);
    }
    return providerRef.current;
  }, []);

  const getReadProvider = useCallback(() => {
    if (!readProviderRef.current) {
      readProviderRef.current = new JsonRpcProvider("http://127.0.0.1:8545");
    }
    return readProviderRef.current;
  }, []);

  const getReadContract = useCallback(() => {
    if (!readContractRef.current) {
      const provider = getReadProvider();
      readContractRef.current = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    }
    return readContractRef.current;
  }, [getReadProvider]);

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
      const provider = getReadProvider();
      const code = await provider.getCode(CONTRACT_ADDRESS);
      if (!code || code === "0x" || code === "0x0") {
        console.warn("No contract deployed at CONTRACT_ADDRESS:", CONTRACT_ADDRESS);
        return;
      }

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
  }, [getReadContract, getReadProvider]);

  /* ── Fetch Past Winners Events ───────────────────── */
  const fetchPastWinners = useCallback(async () => {
    const contract = getReadContract();
    if (!contract) return;

    try {
      const provider = getReadProvider();
      const code = await provider.getCode(CONTRACT_ADDRESS);
      if (!code || code === "0x" || code === "0x0") return;

      const filter = contract.filters.WinnerPicked();
      const events = await contract.queryFilter(filter, 0, "latest");

      const formatted: DrawWinnerEvent[] = events.map((evt) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const args = (evt as any).args;
        return {
          winner: args[0] as string,
          prizeAmount: formatEther(args[1]),
          houseFee: formatEther(args[2]),
          referrer: args[3] ? (args[3] as string) : undefined,
          referrerReward: args[4] ? formatEther(args[4]) : "0",
          blockNumber: evt.blockNumber,
        };
      }).reverse();

      setPastWinners(formatted);
    } catch (err) {
      console.error("Failed to fetch past winner events:", err);
    }
  }, [getReadContract, getReadProvider]);

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

  /* ── Network Switch Helper ───────────────────────── */
  const ensureLocalhostNetwork = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum) return;
    const HARDHAT_CHAIN_ID_HEX = "0x7a69"; // 31337
    try {
      const currentChainId = await window.ethereum.request({ method: "eth_chainId" });
      if (currentChainId !== HARDHAT_CHAIN_ID_HEX) {
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: HARDHAT_CHAIN_ID_HEX }],
          });
        } catch (switchError: any) {
          if (switchError.code === 4902 || switchError.message?.includes("Unrecognized chain")) {
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: HARDHAT_CHAIN_ID_HEX,
                  chainName: "Hardhat Localhost",
                  rpcUrls: ["http://127.0.0.1:8545"],
                  nativeCurrency: {
                    name: "ETH",
                    symbol: "ETH",
                    decimals: 18,
                  },
                },
              ],
            });
          }
        }
      }
    } catch {
      /* silent */
    }
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
      await ensureLocalhostNetwork();
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
  }, [ensureLocalhostNetwork]);

  /* ── Disconnect Wallet ───────────────────────────── */
  const disconnectWallet = useCallback(() => {
    setAccount(null);
    providerRef.current = null;
    readContractRef.current = null;
    setTxStatus("Wallet disconnected.");
    setTimeout(() => setTxStatus(null), 3000);
  }, []);

  /* ── Buy Ticket ──────────────────────────────────── */
  const buyTicket = useCallback(async (customReferrer?: string) => {
    setIsBuying(true);
    setTxStatus("Sending transaction…");
    try {
      await ensureLocalhostNetwork();
      const contract = await getWriteContract();
      if (!contract) throw new Error("No contract");

      const targetRef = customReferrer || referrerAddress || "0x0000000000000000000000000000000000000000";

      let tx;
      if (typeof contract.buyTicketWithReferrer === "function") {
        tx = await contract.buyTicketWithReferrer(targetRef, { value: parseEther("0.01") });
      } else {
        tx = await contract.buyTicket({ value: parseEther("0.01") });
      }

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
  }, [getWriteContract, fetchContractData, referrerAddress, ensureLocalhostNetwork]);

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
  
  /* ── Fetch ETH Price ─────────────────────────────── */
  const fetchEthPrice = useCallback(async () => {
    try {
      const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd");
      const data = await res.json();
      if (data && data.ethereum && data.ethereum.usd) {
        setEthUsdPrice(Number(data.ethereum.usd));
      }
    } catch (err) {
      console.error("Failed to fetch ETH price from CoinGecko, using fallback:", err);
      setEthUsdPrice(3500);
    }
  }, []);

  /* ── Buy Ticket with USD ─────────────────────────── */
  const buyTicketWithUsd = useCallback(async (cardInfo: { cardNumber: string; expiry: string; cvc: string; name: string }) => {
    setIsBuying(true);
    setTxStatus("Authorizing Card...");
    
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    
    try {
      await delay(1200);
      setTxStatus("Processing USD Payment...");
      await delay(1200);
      setTxStatus("Issuing Ticket...");
      await delay(1200);
      
      const buyerAddress = account || "0xusd" + Math.random().toString(16).substring(2, 10).padStart(37, "0");
      setPlayers((prev) => [...prev, buyerAddress]);
      
      setTxStatus("Ticket purchased with USD! 🎉");
    } catch (err: unknown) {
      setTxStatus("Error: Card authorization failed.");
    } finally {
      setIsBuying(false);
      setTimeout(() => setTxStatus(null), 4000);
    }
  }, [account]);

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
    fetchEthPrice();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [mounted, fetchContractData, fetchPastWinners, startCountdownPoller, fetchEthPrice]);

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
        referrerAddress,
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
        ethUsdPrice,
        buyTicketWithUsd,
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
