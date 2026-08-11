import { randomBytes } from "node:crypto";
import { network } from "hardhat";
import { CONTRACT_ABI } from "../constants/abi.js";
import { NETWORK, POOLS } from "../constants/contract.js";

const MOCK_COORDINATOR_ABI = [
  "function fulfillRequest(uint256 requestId,uint256 randomWord)",
] as const;

async function main() {
  const { ethers } = await network.create();
  const chain = await ethers.provider.getNetwork();
  if (Number(chain.chainId) !== 31337) throw new Error("Local automation is restricted to Hardhat chain 31337");
  if (NETWORK.vrfCoordinator === ethers.ZeroAddress) throw new Error("Redeploy locally to record the mock coordinator");

  const coordinator = new ethers.Contract(NETWORK.vrfCoordinator, MOCK_COORDINATOR_ABI, (await ethers.getSigners())[0]);
  for (const pool of POOLS) {
    const lottery = new ethers.Contract(pool.address, CONTRACT_ABI, (await ethers.getSigners())[0]);
    if ((await ethers.provider.getCode(pool.address)) === "0x") continue;
    const [upkeepNeeded] = await lottery.checkUpkeep("0x");
    if (upkeepNeeded) {
      await (await lottery.performUpkeep("0x")).wait();
    }
    const requestId = await lottery.activeRequestId();
    if (requestId > 0n) {
      const randomWord = BigInt(`0x${randomBytes(32).toString("hex")}`);
      await (await coordinator.fulfillRequest(requestId, randomWord)).wait();
      console.log(`Fulfilled ${pool.name} request ${requestId}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
