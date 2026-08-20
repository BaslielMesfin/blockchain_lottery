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

export const NETWORK: NetworkConfig = {
  chainId: 11155111,
  chainIdHex: "0xaa36a7",
  name: "Ethereum Sepolia",
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || "https://ethereum-sepolia.publicnode.com",
  explorerUrl: "https://sepolia.etherscan.io",
  testnet: true,
  vrfCoordinator: "0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B",
};

export const POOLS: PoolConfig[] = [
  {
    "id": "flash",
    "name": "1-MIN FLASH",
    "icon": "bolt",
    "address": "0xd0e317140AB44F80F55D349d9078e949F6ac0332",
    "duration": 60,
    "ticketPriceEth": "0.01",
    "deploymentBlock": 11528120
  },
  {
    "id": "express",
    "name": "1-HOUR EXPRESS",
    "icon": "avg_pace",
    "address": "0xdE87F1713195245dd2605F83d6B6290a840ADb4b",
    "duration": 3600,
    "ticketPriceEth": "0.01",
    "deploymentBlock": 11528121
  },
  {
    "id": "standard",
    "name": "6-HOUR STANDARD",
    "icon": "local_fire_department",
    "address": "0xCe7ad9152D4cCE5CCE40Bfc2221f45Ad277F71CC",
    "duration": 21600,
    "ticketPriceEth": "0.01",
    "deploymentBlock": 11528122
  },
  {
    "id": "mega",
    "name": "1-WEEK MEGA",
    "icon": "diamond",
    "address": "0x5bc57F9b989264444813560317bc27f4BCee9296",
    "duration": 604800,
    "ticketPriceEth": "0.01",
    "deploymentBlock": 11528123
  }
];
export const CONTRACT_ADDRESS = POOLS[2].address;
