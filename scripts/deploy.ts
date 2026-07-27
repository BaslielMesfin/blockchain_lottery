import { network } from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    const { ethers, networkName } = await network.create();
    console.log(`🚀 Deploying TimeBasedLottery to ${networkName}...`);

    const ticketPrice = ethers.parseEther("0.01");
    const durationInSeconds = 7200;

    const lottery = await ethers.deployContract("TimeBasedLottery", [
        ticketPrice,
        durationInSeconds,
    ]);

    await lottery.waitForDeployment();

    const contractAddress = await lottery.getAddress();
    console.log("✅ Contract Deployed To:", contractAddress);

    // 1. Read the compiled ABI from Hardhat artifacts
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

    // 2. Ensure the root constants directory exists
    const dirPath = "./constants";
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }

    // 3. Write both address AND ABI to constants/contract.ts
    const configContent = `export const CONTRACT_ADDRESS = "${contractAddress}";

export const CONTRACT_ABI = ${abi} as const;
`;
    fs.writeFileSync(path.join(dirPath, "contract.ts"), configContent);
    console.log("📝 Updated constants/contract.ts with address + ABI!");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});