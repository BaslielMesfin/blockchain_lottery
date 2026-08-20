"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  BrowserProvider,
  Contract,
  JsonRpcProvider,
  formatEther,
  isAddress,
  type Eip1193Provider,
  type TransactionReceipt,
  type TransactionResponse,
} from "ethers";
import { CONTRACT_ABI, NETWORK, POOLS, type PoolConfig } from "@/constants/contract";

interface BrowserWallet extends Eip1193Provider {
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
  disconnect?: () => Promise<void>;
}

declare global {
  interface Window {
    ethereum?: BrowserWallet;
  }
}

export interface DrawWinnerEvent {
  roundId: number;
  winner: string;
  winningTicket: number;
  randomWord: string;
  requestId: string;
  prizeAmount: string;
  houseFee: string;
  grossPot: string;
  referrer?: string;
  referrerReward: string;
  rolledOverAmount: string;
  blockNumber: number;
  proofVerified: boolean;
}

export interface UserTicketEvent {
  roundId: number;
  count: number;
  firstTicket: number;
  amount: string;
  transactionHash: string;
  blockNumber: number;
}

export interface PoolState {
  timeRemaining: number;
  ticketPrice: string;
  totalTickets: number;
  userTickets: number;
  roundId: number;
  recentWinner: string;
  recentWinningTicket: number;
  lotteryState: "OPEN" | "CALCULATING";
  currentPot: string;
  rolloverBalance: string;
  claimable: string;
  totalClaimable: string;
  activeRequestId: string;
  requestStartedAt: number;
  vrfTimeout: number;
  contractReady: boolean;
  pastWinners: DrawWinnerEvent[];
  ticketHistory: UserTicketEvent[];
}

export interface TransactionProgress {
  state: "simulating" | "awaiting-signature" | "submitted" | "confirming" | "confirmed" | "replaced" | "failed";
  label: string;
  hash?: string;
  replacementHash?: string;
  confirmations: number;
  estimatedGas?: string;
  estimatedFeeEth?: string;
}

interface WalletContextType {
  mounted: boolean;
  account: string | null;
  owner: string;
  referrerAddress: string | null;
  walletSource: "injected" | "walletconnect" | null;
  chainOk: boolean;
  rpcHealthy: boolean;
  isConnecting: boolean;
  isBuying: boolean;
  isPicking: boolean;
  isRestarting: boolean;
  txStatus: string | null;
  txProgress: TransactionProgress | null;
  ethUsdPrice: number;
  ethPriceUpdatedAt: number | null;
  ethPriceSource: string | null;
  ethPriceStale: boolean;
  activePoolId: string;
  setActivePoolId: (id: string) => void;
  pools: PoolConfig[];
  poolStates: Record<string, PoolState>;
  activePool: PoolState;
  activePoolConfig: PoolConfig;
  connectWallet: () => Promise<void>;
  connectWalletWithProvider: (provider: Eip1193Provider) => Promise<void>;
  connectMobileWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;
  buyTicket: (customReferrer?: string, count?: number) => Promise<void>;
  pickWinner: () => Promise<void>;
  retryRandomness: () => Promise<void>;
  withdrawClaim: () => Promise<void>;
  fetchPastWinners: () => Promise<void>;
  fetchContractData: () => Promise<void>;
  clearTransactionFeedback: () => void;
}

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const DEFAULT_POOL_ID = "standard";
const WalletContext = createContext<WalletContextType | undefined>(undefined);

function subscribeHydration() {
  return () => undefined;
}

function emptyPool(pool: PoolConfig): PoolState {
  return {
    timeRemaining: 0,
    ticketPrice: pool.ticketPriceEth,
    totalTickets: 0,
    userTickets: 0,
    roundId: 1,
    recentWinner: ZERO_ADDRESS,
    recentWinningTicket: 0,
    lotteryState: "OPEN",
    currentPot: "0",
    rolloverBalance: "0",
    claimable: "0",
    totalClaimable: "0",
    activeRequestId: "0",
    requestStartedAt: 0,
    vrfTimeout: 0,
    contractReady: false,
    pastWinners: [],
    ticketHistory: [],
  };
}

function friendlyError(error: unknown): string {
  console.error("[wallet]", error);
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  if (message.includes("user rejected") || message.includes("action_rejected")) return "Transaction cancelled in wallet.";
  if (message.includes("insufficient funds")) return "Insufficient ETH for the tickets and gas.";
  if (message.includes("roundexpired")) return "This round has ended. Automation is requesting the draw.";
  if (message.includes("wrong network")) return `Switch your wallet to ${NETWORK.name}.`;
  if (message.includes("no contract bytecode")) return "The configured lottery is not deployed on this network.";
  if (message.includes("transaction replaced")) return "The wallet replaced this transaction.";
  return "The transaction could not be completed. Check the wallet details and try again.";
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const mounted = useSyncExternalStore(subscribeHydration, () => true, () => false);
  const [account, setAccount] = useState<string | null>(null);
  const [owner, setOwner] = useState("");
  const [walletSource, setWalletSource] = useState<"injected" | "walletconnect" | null>(null);
  const [chainOk, setChainOk] = useState(false);
  const [rpcHealthy, setRpcHealthy] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isBuying, setIsBuying] = useState(false);
  const [isPicking, setIsPicking] = useState(false);
  const [txStatus, setTxStatus] = useState<string | null>(null);
  const [txProgress, setTxProgress] = useState<TransactionProgress | null>(null);
  const [ethUsdPrice, setEthUsdPrice] = useState(0);
  const [ethPriceUpdatedAt, setEthPriceUpdatedAt] = useState<number | null>(null);
  const [ethPriceSource, setEthPriceSource] = useState<string | null>(null);
  const [ethPriceStale, setEthPriceStale] = useState(false);
  const [activePoolId, setActivePoolId] = useState(DEFAULT_POOL_ID);
  const [poolStates, setPoolStates] = useState<Record<string, PoolState>>(() =>
    Object.fromEntries(POOLS.map((pool) => [pool.id, emptyPool(pool)])),
  );

  const referrerAddress = useMemo(() => {
    if (!mounted) return null;
    const ref = new URLSearchParams(window.location.search).get("ref");
    return ref && isAddress(ref) ? ref.toLowerCase() : null;
  }, [mounted]);

  const browserProviderRef = useRef<BrowserProvider | null>(null);
  const walletProviderRef = useRef<BrowserWallet | null>(null);
  const walletConnectRef = useRef<BrowserWallet | null>(null);
  const readProviderRef = useRef<JsonRpcProvider | null>(null);
  const readContractsRef = useRef<Map<string, Contract>>(new Map());
  const endTimesRef = useRef<Map<string, number>>(new Map());

  const activePoolConfig = POOLS.find((pool) => pool.id === activePoolId) ?? POOLS[2];
  const activePool = poolStates[activePoolId] ?? emptyPool(activePoolConfig);

  const getReadProvider = useCallback(() => {
    if (!readProviderRef.current) {
      readProviderRef.current = new JsonRpcProvider(NETWORK.rpcUrl, NETWORK.chainId, { staticNetwork: true });
      readProviderRef.current.pollingInterval = 6_000;
    }
    return readProviderRef.current;
  }, []);

  const getReadContract = useCallback((pool: PoolConfig) => {
    const cached = readContractsRef.current.get(pool.id);
    if (cached) return cached;
    const contract = new Contract(pool.address, CONTRACT_ABI, getReadProvider());
    readContractsRef.current.set(pool.id, contract);
    return contract;
  }, [getReadProvider]);

  const configureWallet = useCallback(async (source: BrowserWallet, kind: "injected" | "walletconnect") => {
    const provider = new BrowserProvider(source);
    const accounts = await provider.send("eth_requestAccounts", []);
    const network = await provider.getNetwork();
    walletProviderRef.current = source;
    browserProviderRef.current = provider;
    setAccount(accounts[0]?.toLowerCase() ?? null);
    setWalletSource(kind);
    setChainOk(Number(network.chainId) === NETWORK.chainId);
  }, []);

  const ensureNetwork = useCallback(async () => {
    const source = walletProviderRef.current ?? window.ethereum;
    if (!source) throw new Error("No wallet provider");
    const current = await source.request({ method: "eth_chainId" });
    if (String(current).toLowerCase() === NETWORK.chainIdHex.toLowerCase()) {
      setChainOk(true);
      return;
    }
    try {
      await source.request({ method: "wallet_switchEthereumChain", params: [{ chainId: NETWORK.chainIdHex }] });
    } catch (error) {
      if (NETWORK.chainId !== 31337) {
        await source.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: NETWORK.chainIdHex,
            chainName: NETWORK.name,
            rpcUrls: [NETWORK.rpcUrl],
            blockExplorerUrls: NETWORK.explorerUrl ? [NETWORK.explorerUrl] : [],
            nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
          }],
        });
      } else {
        throw error;
      }
    }
    const after = await source.request({ method: "eth_chainId" });
    if (String(after).toLowerCase() !== NETWORK.chainIdHex.toLowerCase()) throw new Error("Wrong network");
    setChainOk(true);
  }, []);

  const getWriteContract = useCallback(async () => {
    await ensureNetwork();
    const source = walletProviderRef.current ?? window.ethereum;
    if (!source) throw new Error("Connect a wallet first");
    const provider = new BrowserProvider(source, "any");
    browserProviderRef.current = provider;
    const network = await provider.getNetwork();
    if (Number(network.chainId) !== NETWORK.chainId) throw new Error("Wrong network");
    const code = await provider.getCode(activePoolConfig.address);
    if (code === "0x") throw new Error("No contract bytecode at configured address");
    return new Contract(activePoolConfig.address, CONTRACT_ABI, await provider.getSigner());
  }, [activePoolConfig.address, ensureNetwork]);

  const fetchContractData = useCallback(async () => {
    const provider = getReadProvider();
    try {
      await provider.getBlockNumber();
      setRpcHealthy(true);
    } catch (error) {
      console.error("RPC health check failed", error);
      setRpcHealthy(false);
      return;
    }

    await Promise.all(POOLS.map(async (pool) => {
      const contract = getReadContract(pool);
      try {
        const code = await provider.getCode(pool.address);
        if (code === "0x") {
          setPoolStates((previous) => ({
            ...previous,
            [pool.id]: { ...previous[pool.id], contractReady: false },
          }));
          return;
        }
        const values = await Promise.all([
          contract.ticketPrice(),
          contract.totalTickets(),
          contract.roundId(),
          contract.recentWinner(),
          contract.recentWinningTicket(),
          contract.lotteryState(),
          contract.currentPot(),
          contract.rolloverBalance(),
          contract.activeRequestId(),
          contract.requestStartedAt(),
          contract.vrfTimeout(),
          contract.totalClaimable(),
          contract.lotteryEndTime(),
          contract.owner(),
          account ? contract.ticketsByRound(await contract.roundId(), account) : 0n,
          account ? contract.claimableWinnings(account) : 0n,
        ]);
        const endTime = Number(values[12]);
        endTimesRef.current.set(pool.id, endTime);
        setOwner(String(values[13]).toLowerCase());
        setPoolStates((previous) => ({
          ...previous,
          [pool.id]: {
            ...previous[pool.id],
            ticketPrice: formatEther(values[0]),
            totalTickets: Number(values[1]),
            roundId: Number(values[2]),
            recentWinner: String(values[3]),
            recentWinningTicket: Number(values[4]),
            lotteryState: Number(values[5]) === 0 ? "OPEN" : "CALCULATING",
            currentPot: formatEther(values[6]),
            rolloverBalance: formatEther(values[7]),
            activeRequestId: values[8].toString(),
            requestStartedAt: Number(values[9]),
            vrfTimeout: Number(values[10]),
            totalClaimable: formatEther(values[11]),
            userTickets: Number(values[14]),
            claimable: formatEther(values[15]),
            contractReady: true,
          },
        }));
      } catch (error) {
        console.error(`Failed to read ${pool.id}`, error);
      }
    }));
  }, [account, getReadContract, getReadProvider]);

  const fetchPastWinners = useCallback(async () => {
    await Promise.all(POOLS.map(async (pool) => {
      try {
        const query = new URLSearchParams({ pool: pool.id });
        if (account) query.set("account", account);
        const response = await fetch(`/api/indexer?${query.toString()}`, { cache: "no-store" });
        if (!response.ok) throw new Error(`Indexer HTTP ${response.status}`);
        const indexed = await response.json() as { winners: DrawWinnerEvent[]; tickets: UserTicketEvent[] };

        setPoolStates((previous) => ({
          ...previous,
          [pool.id]: { ...previous[pool.id], pastWinners: indexed.winners, ticketHistory: indexed.tickets },
        }));
      } catch (error) {
        console.error(`Failed to index ${pool.id} events`, error);
      }
    }));
  }, [account]);

  const fetchEthPrice = useCallback(async () => {
    try {
      const response = await fetch("/api/eth-price", { cache: "no-store" });
      if (!response.ok) {
        setEthPriceStale(true);
        return;
      }
      const data = (await response.json()) as { usd?: number; source?: string; fetchedAt?: string; stale?: boolean };
      if (!data.usd || !Number.isFinite(data.usd)) {
        setEthPriceStale(true);
        return;
      }
      setEthUsdPrice(data.usd);
      setEthPriceSource(data.source ?? null);
      setEthPriceUpdatedAt(data.fetchedAt ? Date.parse(data.fetchedAt) : Date.now());
      setEthPriceStale(Boolean(data.stale));
    } catch {
      setEthPriceStale(true);
    }
  }, []);

  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      setTxStatus("Install MetaMask, Rabby, or another browser wallet.");
      return;
    }
    setIsConnecting(true);
    try {
      await configureWallet(window.ethereum, "injected");
      await ensureNetwork();
      setTxStatus("Wallet connected.");
    } catch (error) {
      setTxStatus(friendlyError(error));
    } finally {
      setIsConnecting(false);
    }
  }, [configureWallet, ensureNetwork]);

  const connectWalletWithProvider = useCallback(async (provider: Eip1193Provider) => {
    setIsConnecting(true);
    try {
      await configureWallet(provider as BrowserWallet, "injected");
      await ensureNetwork();
      setTxStatus("Wallet connected.");
    } catch (error) {
      setTxStatus(friendlyError(error));
    } finally {
      setIsConnecting(false);
    }
  }, [configureWallet, ensureNetwork]);

  const connectMobileWallet = useCallback(async () => {
    const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
    if (!projectId) {
      setTxStatus("WalletConnect needs NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID before it can be enabled.");
      return;
    }
    setIsConnecting(true);
    try {
      const loadModule = new Function("name", "return import(name)") as (name: string) => Promise<{ default: { init: (options: unknown) => Promise<BrowserWallet> } }>;
      const walletConnectModule = await loadModule("@walletconnect/ethereum-provider");
      const provider = await walletConnectModule.default.init({
        projectId,
        chains: [NETWORK.chainId],
        optionalChains: [NETWORK.chainId],
        showQrModal: true,
        rpcMap: { [NETWORK.chainId]: NETWORK.rpcUrl },
        metadata: { name: "ETH Lottery", description: "Verifiable on-chain lottery", url: window.location.origin, icons: [`${window.location.origin}/favicon.ico`] },
      });
      await provider.request({ method: "eth_requestAccounts" });
      walletConnectRef.current = provider;
      await configureWallet(provider, "walletconnect");
      await ensureNetwork();
      setTxStatus("Mobile wallet connected.");
    } catch (error) {
      setTxStatus(`WalletConnect unavailable: ${friendlyError(error)}`);
    } finally {
      setIsConnecting(false);
    }
  }, [configureWallet, ensureNetwork]);

  const disconnectWallet = useCallback(async () => {
    await walletConnectRef.current?.disconnect?.();
    walletConnectRef.current = null;
    walletProviderRef.current = null;
    browserProviderRef.current = null;
    setAccount(null);
    setWalletSource(null);
    setChainOk(false);
    setTxStatus("Wallet disconnected.");
  }, []);

  const trackTransaction = useCallback(async (
    label: string,
    contract: Contract,
    method: string,
    args: readonly unknown[],
    value?: bigint,
  ) => {
    try {
    setTxStatus(`${label}: checking contract and estimating gas…`);
    const options = value === undefined ? {} : { value };
    setTxProgress({ state: "simulating", label, confirmations: 0 });
    await contract.getFunction(method).staticCall(...args, options);
    const gas = await contract.getFunction(method).estimateGas(...args, options);
    const feeData = await contract.runner?.provider?.getFeeData();
    const fee = feeData?.maxFeePerGas ? gas * feeData.maxFeePerGas : undefined;
    setTxProgress({
      state: "awaiting-signature",
      label,
      confirmations: 0,
      estimatedGas: gas.toString(),
      estimatedFeeEth: fee ? formatEther(fee) : undefined,
    });

    setTxStatus(`${label}: approve or cancel in your wallet.`);
    const transaction = await contract.getFunction(method).send(...args, options) as TransactionResponse;
    setTxProgress((previous) => ({ ...previous!, state: "submitted", hash: transaction.hash }));
    setTxStatus(`${label} submitted. Waiting for 2 confirmations…`);
      setTxProgress((previous) => ({ ...previous!, state: "confirming" }));
      const receipt = await transaction.wait(2);
      setTxProgress((previous) => ({ ...previous!, state: "confirmed", confirmations: 2 }));
      return receipt;
    } catch (error) {
      const replacement = error as {
        code?: string;
        cancelled?: boolean;
        replacement?: TransactionResponse;
        receipt?: TransactionReceipt;
      };
      if (replacement.code === "TRANSACTION_REPLACED" && !replacement.cancelled && replacement.replacement) {
        const receipt = replacement.receipt ?? await replacement.replacement.wait(2);
        setTxProgress((previous) => ({
          ...previous!,
          state: "replaced",
          replacementHash: replacement.replacement?.hash,
          confirmations: 2,
        }));
        return receipt;
      }
      setTxProgress((previous) => previous ? { ...previous, state: "failed" } : null);
      throw error;
    }
  }, []);

  const clearTransactionFeedback = useCallback(() => {
    setTxStatus(null);
    setTxProgress(null);
  }, []);

  const buyTicket = useCallback(async (customReferrer?: string, count = 1) => {
    setIsBuying(true);
    try {
      if (!Number.isSafeInteger(count) || count < 1 || count > 100) throw new Error("Invalid ticket count");
      const contract = await getWriteContract();
      const onChainPrice = await contract.ticketPrice() as bigint;
      const referrer = customReferrer && isAddress(customReferrer)
        ? customReferrer
        : referrerAddress ?? ZERO_ADDRESS;
      await trackTransaction("Ticket purchase", contract, "buyTicketsWithReferrer", [count, referrer], onChainPrice * BigInt(count));
      setTxStatus(`${count} ticket${count === 1 ? "" : "s"} confirmed on-chain.`);
      await Promise.all([fetchContractData(), fetchPastWinners()]);
    } catch (error) {
      setTxStatus(friendlyError(error));
    } finally {
      setIsBuying(false);
    }
  }, [fetchContractData, fetchPastWinners, getWriteContract, referrerAddress, trackTransaction]);

  const pickWinner = useCallback(async () => {
    setIsPicking(true);
    try {
      const contract = await getWriteContract();
      await trackTransaction("VRF draw request", contract, "requestDraw", []);
      setTxStatus("Draw requested. Chainlink VRF will fulfill the result asynchronously.");
      await fetchContractData();
    } catch (error) {
      setTxStatus(friendlyError(error));
    } finally {
      setIsPicking(false);
    }
  }, [fetchContractData, getWriteContract, trackTransaction]);

  const retryRandomness = useCallback(async () => {
    setIsPicking(true);
    try {
      const contract = await getWriteContract();
      await trackTransaction("VRF retry", contract, "retryRandomness", []);
      setTxStatus("A replacement VRF request was submitted.");
      await fetchContractData();
    } catch (error) {
      setTxStatus(friendlyError(error));
    } finally {
      setIsPicking(false);
    }
  }, [fetchContractData, getWriteContract, trackTransaction]);

  const withdrawClaim = useCallback(async () => {
    if (!account) return;
    setIsBuying(true);
    try {
      const contract = await getWriteContract();
      await trackTransaction("Claim withdrawal", contract, "withdrawWinnings", [account]);
      setTxStatus("Claim withdrawn to your wallet.");
      await fetchContractData();
    } catch (error) {
      setTxStatus(friendlyError(error));
    } finally {
      setIsBuying(false);
    }
  }, [account, fetchContractData, getWriteContract, trackTransaction]);

  useEffect(() => {
    const tick = window.setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      setPoolStates((previous) => {
        const next = { ...previous };
        for (const pool of POOLS) {
          const end = endTimesRef.current.get(pool.id) ?? 0;
          next[pool.id] = { ...next[pool.id], timeRemaining: end === 0 ? 0 : Math.max(0, end - now) };
        }
        return next;
      });
    }, 1_000);
    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => {
      void fetchContractData();
      void fetchPastWinners();
      void fetchEthPrice();
    }, 0);
    const dataPoll = window.setInterval(() => void fetchContractData(), 12_000);
    const eventPoll = window.setInterval(() => void fetchPastWinners(), 30_000);
    const pricePoll = window.setInterval(() => void fetchEthPrice(), 300_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(dataPoll);
      window.clearInterval(eventPoll);
      window.clearInterval(pricePoll);
    };
  }, [fetchContractData, fetchEthPrice, fetchPastWinners]);

  useEffect(() => {
    if (!window.ethereum) return;
    const accountsChanged = (...args: unknown[]) => {
      const accounts = args[0] as string[];
      setAccount(accounts[0]?.toLowerCase() ?? null);
    };
    const chainChanged = (...args: unknown[]) => {
      const chainId = String(args[0]).toLowerCase();
      setChainOk(chainId === NETWORK.chainIdHex.toLowerCase());
      browserProviderRef.current = null;
    };
    window.ethereum.on?.("accountsChanged", accountsChanged);
    window.ethereum.on?.("chainChanged", chainChanged);
    return () => {
      window.ethereum?.removeListener?.("accountsChanged", accountsChanged);
      window.ethereum?.removeListener?.("chainChanged", chainChanged);
    };
  }, []);

  return (
    <WalletContext.Provider value={{
      mounted,
      account,
      owner,
      referrerAddress,
      walletSource,
      chainOk,
      rpcHealthy,
      isConnecting,
      isBuying,
      isPicking,
      isRestarting: false,
      txStatus,
      txProgress,
      ethUsdPrice,
      ethPriceUpdatedAt,
      ethPriceSource,
      ethPriceStale,
      activePoolId,
      setActivePoolId,
      pools: POOLS,
      poolStates,
      activePool,
      activePoolConfig,
      connectWallet,
      connectWalletWithProvider,
      connectMobileWallet,
      disconnectWallet,
      buyTicket,
      pickWinner,
      retryRandomness,
      withdrawClaim,
      fetchPastWinners,
      fetchContractData,
      clearTransactionFeedback,
    }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) throw new Error("useWallet must be used inside WalletProvider");
  return context;
}
