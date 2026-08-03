"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { BrowserProvider, Contract, JsonRpcProvider, formatEther, parseEther } from "ethers";
import { POOLS, CONTRACT_ABI, type PoolConfig } from "@/constants/contract";

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
  rolledOverAmount?: string;
  blockNumber: number;
}

export interface PoolState {
  timeRemaining: number;
  ticketPrice: string;
  players: string[];
  recentWinner: string;
  lotteryOpen: boolean;
  rolloverBalance: string;
  pastWinners: DrawWinnerEvent[];
}

/* ── Human-Friendly Error Parser ────────────────────── */
function formatUserFriendlyError(err: unknown): string {
  console.error("[Web3 Technical Log]:", err);
  const rawMsg = err instanceof Error ? err.message : String(err);
  const lower = rawMsg.toLowerCase();

  if (
    lower.includes("user rejected") ||
    lower.includes("action_rejected") ||
    lower.includes("user denied") ||
    lower.includes("rejected action")
  ) {
    return "Error: Transaction cancelled in wallet.";
  }
  if (lower.includes("insufficient funds")) {
    return "Error: Insufficient ETH balance in your wallet to cover ticket & gas.";
  }
  if (lower.includes("nonce") || lower.includes("nonce_expired")) {
    return "Error: Wallet nonce out of sync. Please reset transaction history in wallet settings.";
  }
  if (lower.includes("network") || lower.includes("cannot connect") || lower.includes("failed to fetch")) {
    return "Error: Network connection issue. Please check if your network node is running.";
  }
  if (lower.includes("execution reverted") || lower.includes("call_exception")) {
    return "Error: Transaction reverted by contract. Round status may have updated.";
  }

  return "Error: Transaction could not be completed. Please try again.";
}

function createEmptyPoolState(pool: PoolConfig): PoolState {
  return {
    timeRemaining: 0,
    ticketPrice: pool.ticketPriceEth,
    players: [],
    recentWinner: "",
    lotteryOpen: true,
    rolloverBalance: "0",
    pastWinners: [],
  };
}

interface WalletContextType {
  mounted: boolean;
  account: string | null;
  referrerAddress: string | null;
  isConnecting: boolean;
  owner: string;
  isBuying: boolean;
  isPicking: boolean;
  isRestarting: boolean;
  txStatus: string | null;
  ethUsdPrice: number;

  /* Multi-pool */
  activePoolId: string;
  setActivePoolId: (id: string) => void;
  pools: PoolConfig[];
  poolStates: Record<string, PoolState>;
  activePool: PoolState;
  activePoolConfig: PoolConfig;

  /* Actions (operate on active pool) */
  buyTicketWithUsd: (cardInfo: { cardNumber: string; expiry: string; cvc: string; name: string }) => Promise<void>;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  buyTicket: (customReferrer?: string, count?: number) => Promise<void>;
  pickWinner: () => Promise<void>;
  restartLottery: () => Promise<void>;
  fetchPastWinners: () => Promise<void>;
  fetchContractData: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const DEFAULT_POOL_ID = "standard"; // Default to 6-hour Standard pool

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  /* ── Wallet state ────────────────────────────────── */
  const [account, setAccount] = useState<string | null>(null);
  const [referrerAddress, setReferrerAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  /* ── Shared contract state ──────────────────────── */
  const [owner, setOwner] = useState<string>("");

  /* ── Multi-pool state ──────────────────────────── */
  const [activePoolId, setActivePoolId] = useState<string>(DEFAULT_POOL_ID);
  const [poolStates, setPoolStates] = useState<Record<string, PoolState>>(() => {
    const initial: Record<string, PoolState> = {};
    for (const pool of POOLS) {
      initial[pool.id] = createEmptyPoolState(pool);
    }
    return initial;
  });

  /* ── TX state ────────────────────────────────────── */
  const [isBuying, setIsBuying] = useState(false);
  const [isPicking, setIsPicking] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const [txStatus, setTxStatus] = useState<string | null>(null);
  const [ethUsdPrice, setEthUsdPrice] = useState<number>(3500);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const providerRef = useRef<BrowserProvider | null>(null);
  const readProviderRef = useRef<JsonRpcProvider | BrowserProvider | null>(null);

  /* Per-pool refs */
  const readContractsRef = useRef<Map<string, Contract>>(new Map());
  const lotteryEndTimesRef = useRef<Map<string, number>>(new Map());

  /* Derived state */
  const activePoolConfig = POOLS.find((p) => p.id === activePoolId) || POOLS[2];
  const activePool = poolStates[activePoolId] || createEmptyPoolState(activePoolConfig);

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

  const getReadContract = useCallback((poolId: string) => {
    const existing = readContractsRef.current.get(poolId);
    if (existing) return existing;

    const pool = POOLS.find((p) => p.id === poolId);
    if (!pool) return null;

    const provider = getReadProvider();
    const contract = new Contract(pool.address, CONTRACT_ABI, provider);
    readContractsRef.current.set(poolId, contract);
    return contract;
  }, [getReadProvider]);

  const getWriteContract = useCallback(async (poolId?: string) => {
    const provider = getProvider();
    if (!provider) return null;
    const targetPool = POOLS.find((p) => p.id === (poolId || activePoolId));
    if (!targetPool) return null;
    const signer = await provider.getSigner();
    return new Contract(targetPool.address, CONTRACT_ABI, signer);
  }, [getProvider, activePoolId]);

  /* ── Fetch Contract Data (all pools) ────────────── */
  const fetchContractData = useCallback(async () => {
    const provider = getReadProvider();

    for (const pool of POOLS) {
      const contract = getReadContract(pool.id);
      if (!contract) continue;

      try {
        const code = await provider.getCode(pool.address);
        if (!code || code === "0x" || code === "0x0") continue;

        const [price, playerList, winner, contractOwner, isOpen, endTime, rollover] =
          await Promise.all([
            contract.ticketPrice(),
            contract.getPlayers(),
            contract.recentWinner(),
            contract.owner(),
            contract.lotteryOpen(),
            contract.lotteryEndTime(),
            contract.rolloverBalance(),
          ]);

        // Set owner from any pool (they all share the same deployer)
        setOwner((contractOwner as string).toLowerCase());

        lotteryEndTimesRef.current.set(pool.id, Number(endTime));

        setPoolStates((prev) => ({
          ...prev,
          [pool.id]: {
            ...prev[pool.id],
            ticketPrice: formatEther(price),
            players: playerList as string[],
            recentWinner: winner as string,
            lotteryOpen: isOpen as boolean,
            rolloverBalance: formatEther(rollover),
          },
        }));
      } catch (err) {
        console.error(`Failed to fetch data for pool ${pool.id}:`, err);
      }
    }
  }, [getReadContract, getReadProvider]);

  /* ── Fetch Past Winners Events (active pool) ────── */
  const fetchPastWinners = useCallback(async () => {
    for (const pool of POOLS) {
      const contract = getReadContract(pool.id);
      if (!contract) continue;

      try {
        const provider = getReadProvider();
        const code = await provider.getCode(pool.address);
        if (!code || code === "0x" || code === "0x0") continue;

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
            rolledOverAmount: args[5] ? formatEther(args[5]) : "0",
            blockNumber: evt.blockNumber,
          };
        }).reverse();

        setPoolStates((prev) => ({
          ...prev,
          [pool.id]: {
            ...prev[pool.id],
            pastWinners: formatted,
          },
        }));
      } catch (err) {
        console.error(`Failed to fetch past winners for pool ${pool.id}:`, err);
      }
    }
  }, [getReadContract, getReadProvider]);

  /* ── Countdown Poller (all pools) ───────────────── */
  const startCountdownPoller = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    const tick = () => {
      const nowSeconds = Math.floor(Date.now() / 1000);

      setPoolStates((prev) => {
        const next = { ...prev };
        for (const pool of POOLS) {
          const endTime = lotteryEndTimesRef.current.get(pool.id) || 0;
          if (endTime === 0) continue;
          const remaining = Math.max(0, endTime - nowSeconds);
          next[pool.id] = { ...next[pool.id], timeRemaining: remaining };
        }
        return next;
      });
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
      setTxStatus("Error: Please install MetaMask or Rabby to use this dApp.");
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
      setTxStatus(formatUserFriendlyError(err));
      setTimeout(() => setTxStatus(null), 5000);
    } finally {
      setIsConnecting(false);
    }
  }, [ensureLocalhostNetwork]);

  /* ── Disconnect Wallet ───────────────────────────── */
  const disconnectWallet = useCallback(() => {
    setAccount(null);
    providerRef.current = null;
    readContractsRef.current.clear();
    setTxStatus("Wallet disconnected.");
    setTimeout(() => setTxStatus(null), 3000);
  }, []);

  /* ── Buy Ticket (active pool) ───────────────────── */
  const buyTicket = useCallback(async (customReferrer?: string, count: number = 1) => {
    setIsBuying(true);
    setTxStatus("Sending transaction…");
    try {
      await ensureLocalhostNetwork();
      const contract = await getWriteContract();
      if (!contract) throw new Error("No contract");

      const targetRef = customReferrer || referrerAddress || "0x0000000000000000000000000000000000000000";
      const unitPriceWei = parseEther(activePoolConfig.ticketPriceEth);
      const totalWei = unitPriceWei * BigInt(count);

      let tx;
      if (typeof contract.buyTicketsWithReferrer === "function") {
        tx = await contract.buyTicketsWithReferrer(count, targetRef, { value: totalWei });
      } else if (typeof contract.buyTicketWithReferrer === "function") {
        tx = await contract.buyTicketWithReferrer(targetRef, { value: totalWei });
      } else {
        tx = await contract.buyTicket({ value: totalWei });
      }

      setTxStatus("Mining… please wait");
      await tx.wait();
      setTxStatus(`${count > 1 ? `${count} Tickets` : "Ticket"} purchased! 🎉`);
      await fetchContractData();
    } catch (err: unknown) {
      setTxStatus(formatUserFriendlyError(err));
    } finally {
      setIsBuying(false);
      setTimeout(() => setTxStatus(null), 5000);
    }
  }, [getWriteContract, fetchContractData, referrerAddress, ensureLocalhostNetwork, activePoolConfig]);

  /* ── Pick Winner (active pool) ──────────────────── */
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
      setTxStatus(formatUserFriendlyError(err));
    } finally {
      setIsPicking(false);
      setTimeout(() => setTxStatus(null), 5000);
    }
  }, [getWriteContract, fetchContractData, fetchPastWinners]);

  /* ── Restart Lottery (active pool) ──────────────── */
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
      setTxStatus(formatUserFriendlyError(err));
    } finally {
      setIsRestarting(false);
      setTimeout(() => setTxStatus(null), 5000);
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
      setPoolStates((prev) => ({
        ...prev,
        [activePoolId]: {
          ...prev[activePoolId],
          players: [...prev[activePoolId].players, buyerAddress],
        },
      }));
      
      setTxStatus("Ticket purchased with USD! 🎉");
    } catch (err: unknown) {
      setTxStatus("Error: Card authorization failed.");
    } finally {
      setIsBuying(false);
      setTimeout(() => setTxStatus(null), 4000);
    }
  }, [account, activePoolId]);

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
      readContractsRef.current.clear();
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

  /* ── Auto-pick winner effect (active pool) ──────── */
  const autoPickTriggeredRef = useRef<Set<string>>(new Set());
  const isOwner = account !== null && owner !== "" && account === owner;

  useEffect(() => {
    const pool = poolStates[activePoolId];
    if (!pool) return;

    if (pool.timeRemaining > 0) {
      autoPickTriggeredRef.current.delete(activePoolId);
      return;
    }

    if (
      pool.timeRemaining === 0 &&
      isOwner &&
      pool.players.length > 0 &&
      !isPicking &&
      !autoPickTriggeredRef.current.has(activePoolId)
    ) {
      autoPickTriggeredRef.current.add(activePoolId);
      pickWinner();
    }
  }, [activePoolId, poolStates, isOwner, isPicking, pickWinner]);

  return (
    <WalletContext.Provider
      value={{
        mounted,
        account,
        referrerAddress,
        isConnecting,
        owner,
        isBuying,
        isPicking,
        isRestarting,
        txStatus,
        ethUsdPrice,

        activePoolId,
        setActivePoolId,
        pools: POOLS,
        poolStates,
        activePool,
        activePoolConfig,

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
