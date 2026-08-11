export { CONTRACT_ABI } from "./abi";

export interface NetworkConfig {
  chainId: number;
  chainIdHex: string;
  name: string;
  rpcUrl: string;
  explorerUrl: string;
  testnet: boolean;
  vrfCoordinator: string;
}

export interface PoolConfig {
  id: string;
  name: string;
  icon: string;
  address: string;
  duration: number;
  ticketPriceEth: string;
  deploymentBlock: number;
}

/**
 * Checked-in configuration is deliberately local-only. Running scripts/deploy.ts
 * rewrites this file with the selected chain and verified deployment addresses.
 */
export const NETWORK: NetworkConfig = {
  chainId: 31337,
  chainIdHex: "0x7a69",
  name: "Hardhat Local",
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545",
  explorerUrl: "",
  testnet: true,
  vrfCoordinator: "0x0000000000000000000000000000000000000000",
};

export const POOLS: PoolConfig[] = [
  { id: "flash", name: "1-MIN FLASH", icon: "bolt", address: "0x5FbDB2315678afecb367f032d93F642f64180aa3", duration: 60, ticketPriceEth: "0.01", deploymentBlock: 0 },
  { id: "express", name: "1-HOUR EXPRESS", icon: "avg_pace", address: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512", duration: 3600, ticketPriceEth: "0.01", deploymentBlock: 0 },
  { id: "standard", name: "6-HOUR STANDARD", icon: "local_fire_department", address: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0", duration: 21600, ticketPriceEth: "0.01", deploymentBlock: 0 },
  { id: "mega", name: "1-WEEK MEGA", icon: "diamond", address: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9", duration: 604800, ticketPriceEth: "0.01", deploymentBlock: 0 },
];

export const CONTRACT_ADDRESS = POOLS[2].address;
