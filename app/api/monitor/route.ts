import { NextResponse } from "next/server";
import { Contract, JsonRpcProvider, formatEther, isAddress } from "ethers";
import { CONTRACT_ABI, NETWORK, POOLS } from "@/constants/contract";

export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();
  const provider = new JsonRpcProvider(NETWORK.rpcUrl, NETWORK.chainId, { staticNetwork: true });
  try {
    const blockNumber = await provider.getBlockNumber();
    const now = Math.floor(Date.now() / 1000);
    const pools = await Promise.all(POOLS.map(async (pool) => {
      const code = await provider.getCode(pool.address);
      if (code === "0x") {
        return { id: pool.id, address: pool.address, deployed: false, status: "NOT_DEPLOYED" };
      }
      const contract = new Contract(pool.address, CONTRACT_ABI, provider);
      const [state, tickets, endTime, requestStartedAt, timeout, pot, liabilities, requestId] = await Promise.all([
        contract.lotteryState(),
        contract.totalTickets(),
        contract.lotteryEndTime(),
        contract.requestStartedAt(),
        contract.vrfTimeout(),
        contract.currentPot(),
        contract.totalClaimable(),
        contract.activeRequestId(),
      ]);
      const isCalculating = Number(state) === 1;
      const drawOverdue = !isCalculating && Number(tickets) > 0 && Number(endTime) > 0 && now > Number(endTime) + 300;
      const vrfStalled = isCalculating && Number(requestStartedAt) > 0 && now > Number(requestStartedAt) + Number(timeout);
      return {
        id: pool.id,
        address: pool.address,
        deployed: true,
        status: vrfStalled ? "VRF_STALLED" : drawOverdue ? "DRAW_OVERDUE" : "HEALTHY",
        state: isCalculating ? "CALCULATING" : "OPEN",
        totalTickets: Number(tickets),
        endTime: Number(endTime),
        activeRequestId: requestId.toString(),
        potEth: formatEther(pot),
        payoutLiabilitiesEth: formatEther(liabilities),
      };
    }));

    const keeperAddress = process.env.KEEPER_ADDRESS;
    const keeperBalance = keeperAddress && isAddress(keeperAddress)
      ? formatEther(await provider.getBalance(keeperAddress))
      : null;
    const lowKeeperBalance = keeperBalance !== null && Number(keeperBalance) < Number(process.env.KEEPER_MIN_ETH || "0.05");

    return NextResponse.json({
      network: NETWORK.name,
      chainId: NETWORK.chainId,
      blockNumber,
      rpcLatencyMs: Date.now() - startedAt,
      rpcHealthy: true,
      keeperAddress: keeperAddress ?? null,
      keeperBalanceEth: keeperBalance,
      lowKeeperBalance,
      checkedAt: new Date().toISOString(),
      pools,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({
      network: NETWORK.name,
      chainId: NETWORK.chainId,
      rpcHealthy: false,
      error: error instanceof Error ? error.message : "RPC monitoring failed",
      checkedAt: new Date().toISOString(),
    }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
