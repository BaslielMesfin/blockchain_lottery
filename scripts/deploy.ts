import { network } from "hardhat";
import fs from "node:fs";
import path from "node:path";

const POOL_CONFIGS = [
  { id: "flash", name: "1-MIN FLASH", icon: "bolt", ticketPriceEth: "0.01", durationSeconds: 60 },
  { id: "express", name: "1-HOUR EXPRESS", icon: "avg_pace", ticketPriceEth: "0.01", durationSeconds: 3600 },
  { id: "standard", name: "6-HOUR STANDARD", icon: "local_fire_department", ticketPriceEth: "0.01", durationSeconds: 21600 },
  { id: "mega", name: "1-WEEK MEGA", icon: "diamond", ticketPriceEth: "0.01", durationSeconds: 604800 },
] as const;

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

async function main() {
  const { ethers, networkName } = await network.create();
  const [deployer] = await ethers.getSigners();
  const chain = await ethers.provider.getNetwork();
  const chainId = Number(chain.chainId);
  const isLocal = chainId === 31337;

  let coordinatorAddress: string;
  let subscriptionId: bigint;
  let keyHash: string;

  if (isLocal) {
    const coordinator = await ethers.deployContract("MockVRFCoordinatorV2Plus");
    await coordinator.waitForDeployment();
    coordinatorAddress = await coordinator.getAddress();
    subscriptionId = 1n;
    keyHash = ethers.ZeroHash;
  } else {
    if (chainId !== 11155111) throw new Error(`Unsupported deployment chain: ${chainId}`);
    coordinatorAddress = ethers.getAddress(required("VRF_COORDINATOR"));
    subscriptionId = BigInt(required("VRF_SUBSCRIPTION_ID"));
    keyHash = required("VRF_KEY_HASH");
    if (!ethers.isHexString(keyHash, 32)) throw new Error("VRF_KEY_HASH must be 32 bytes");
  }

  const house = ethers.getAddress(process.env.HOUSE_ADDRESS || deployer.address);
  const callbackGasLimit = Number(process.env.VRF_CALLBACK_GAS_LIMIT || "500000");
  const vrfTimeout = Number(process.env.VRF_TIMEOUT_SECONDS || "3600");
  const deployedPools: Array<{
    id: string;
    name: string;
    icon: string;
    address: string;
    duration: number;
    ticketPriceEth: string;
    deploymentBlock: number;
  }> = [];

  console.log(`Deploying four VRF lotteries to ${networkName} (${chainId})`);
  console.log(`House: ${house}`);
  console.log(`VRF coordinator: ${coordinatorAddress}`);

  for (const pool of POOL_CONFIGS) {
    const lottery = await ethers.deployContract("TimeBasedLottery", [
      ethers.parseEther(pool.ticketPriceEth),
      pool.durationSeconds,
      house,
      coordinatorAddress,
      subscriptionId,
      keyHash,
      callbackGasLimit,
      vrfTimeout,
    ]);
    await lottery.waitForDeployment();
    const receipt = await lottery.deploymentTransaction()?.wait();
    const address = await lottery.getAddress();

    deployedPools.push({
      id: pool.id,
      name: pool.name,
      icon: pool.icon,
      address,
      duration: pool.durationSeconds,
      ticketPriceEth: pool.ticketPriceEth,
      deploymentBlock: receipt?.blockNumber ?? 0,
    });
    console.log(`${pool.name}: ${address}`);
  }

  const networkConfig = isLocal
    ? {
        chainId,
        chainIdHex: `0x${chainId.toString(16)}`,
        name: "Hardhat Local",
        rpcFallback: "http://127.0.0.1:8545",
        explorerUrl: "",
        testnet: true,
      }
    : {
        chainId,
        chainIdHex: `0x${chainId.toString(16)}`,
        name: "Ethereum Sepolia",
        rpcFallback: "https://ethereum-sepolia.publicnode.com",
        explorerUrl: "https://sepolia.etherscan.io",
        testnet: true,
      };

  const output = `export { CONTRACT_ABI } from "./abi";

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
  chainId: ${networkConfig.chainId},
  chainIdHex: "${networkConfig.chainIdHex}",
  name: "${networkConfig.name}",
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || "${networkConfig.rpcFallback}",
  explorerUrl: "${networkConfig.explorerUrl}",
  testnet: ${networkConfig.testnet},
  vrfCoordinator: "${coordinatorAddress}",
};

export const POOLS: PoolConfig[] = ${JSON.stringify(deployedPools, null, 2)};
export const CONTRACT_ADDRESS = POOLS[2].address;
`;

  fs.writeFileSync(path.resolve("constants/contract.ts"), output, "utf8");
  console.log("Updated constants/contract.ts with chain-specific addresses and deployment blocks.");
  if (!isLocal) {
    console.log("Next: add every lottery as a VRF subscription consumer and register an Automation upkeep.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
