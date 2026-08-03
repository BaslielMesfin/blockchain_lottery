import { network } from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface PoolDeployConfig {
    id: string;
    name: string;
    icon: string;
    ticketPriceEth: string;
    durationSeconds: number;
}

const POOL_CONFIGS: PoolDeployConfig[] = [
    { id: "flash",    name: "1-MIN FLASH",      icon: "bolt",           ticketPriceEth: "0.01",  durationSeconds: 60 },
    { id: "express",  name: "1-HOUR EXPRESS",    icon: "avg_pace",       ticketPriceEth: "0.01",  durationSeconds: 3600 },
    { id: "standard", name: "6-HOUR STANDARD",   icon: "local_fire_department", ticketPriceEth: "0.01",  durationSeconds: 21600 },
    { id: "mega",     name: "1-WEEK MEGA",       icon: "diamond",        ticketPriceEth: "0.01",  durationSeconds: 604800 },
];

async function main() {
    const { ethers, networkName } = await network.create();
    console.log(`🚀 Deploying 4 Lottery Pools to ${networkName}...\n`);

    const deployedPools: Array<{
        id: string;
        name: string;
        icon: string;
        address: string;
        duration: number;
        ticketPriceEth: string;
    }> = [];

    for (const pool of POOL_CONFIGS) {
        const ticketPrice = ethers.parseEther(pool.ticketPriceEth);

        const lottery = await ethers.deployContract("TimeBasedLottery", [
            ticketPrice,
            pool.durationSeconds,
        ]);
        await lottery.waitForDeployment();

        const contractAddress = await lottery.getAddress();
        console.log(`  ${pool.icon} ${pool.name}: ${contractAddress} (${pool.ticketPriceEth} ETH / ${pool.durationSeconds}s)`);

        deployedPools.push({
            id: pool.id,
            name: pool.name,
            icon: pool.icon,
            address: contractAddress,
            duration: pool.durationSeconds,
            ticketPriceEth: pool.ticketPriceEth,
        });
    }

    // Read the compiled ABI from Hardhat artifacts (shared across all pools)
    const artifactPath = path.join(
        __dirname,
        "..",
        "artifacts",
        "contracts",
        "TimeBasedLottery.sol",
        "TimeBasedLottery.json"
    );
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
    const abi = JSON.stringify(artifact.abi, null, 4);

    // Ensure the constants directory exists
    const dirPath = "./constants";
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }

    // Write POOLS config + shared ABI to constants/contract.ts
    const poolsJson = JSON.stringify(deployedPools, null, 4);

    const configContent = `export interface PoolConfig {
    id: string;
    name: string;
    icon: string;
    address: string;
    duration: number;
    ticketPriceEth: string;
}

export const POOLS: PoolConfig[] = ${poolsJson};

/** Backward-compatible: default to the Standard pool */
export const CONTRACT_ADDRESS = POOLS[2].address;

export const CONTRACT_ABI = ${abi} as const;
`;
    fs.writeFileSync(path.join(dirPath, "contract.ts"), configContent);

    console.log(`\n✅ All 4 pools deployed!`);
    console.log(`📝 Updated constants/contract.ts with POOLS array + shared ABI!`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});