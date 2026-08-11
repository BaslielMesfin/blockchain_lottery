import { NextRequest, NextResponse } from "next/server";
import { Contract, EventLog, JsonRpcProvider, formatEther, isAddress } from "ethers";
import { CONTRACT_ABI, NETWORK, POOLS } from "@/constants/contract";

export const dynamic = "force-dynamic";
type QueryFilter = Parameters<Contract["queryFilter"]>[0];

async function queryChunked(contract: Contract, filter: QueryFilter, fromBlock: number, toBlock: number) {
  const events: EventLog[] = [];
  const chunkSize = 25_000;
  for (let start = fromBlock; start <= toBlock; start += chunkSize) {
    const end = Math.min(toBlock, start + chunkSize - 1);
    const logs = await contract.queryFilter(filter, start, end);
    events.push(...logs.filter((log): log is EventLog => log instanceof EventLog));
  }
  return events;
}

export async function GET(request: NextRequest) {
  const poolId = request.nextUrl.searchParams.get("pool");
  const account = request.nextUrl.searchParams.get("account");
  const pool = POOLS.find((candidate) => candidate.id === poolId);
  if (!pool) return NextResponse.json({ error: "Unknown pool" }, { status: 400 });
  if (account && !isAddress(account)) return NextResponse.json({ error: "Invalid account" }, { status: 400 });

  const provider = new JsonRpcProvider(NETWORK.rpcUrl, NETWORK.chainId, { staticNetwork: true });
  try {
    if ((await provider.getCode(pool.address)) === "0x") {
      return NextResponse.json({ error: "Contract not deployed", winners: [], tickets: [] }, { status: 503 });
    }
    const contract = new Contract(pool.address, CONTRACT_ABI, provider);
    const latest = await provider.getBlockNumber();
    const fromBlock = Math.max(0, pool.deploymentBlock);
    const [winnerLogs, payoutLogs, ticketLogs] = await Promise.all([
      queryChunked(contract, contract.filters.WinnerPicked(), fromBlock, latest),
      queryChunked(contract, contract.filters.PayoutAllocated(), fromBlock, latest),
      account
        ? queryChunked(contract, contract.filters.TicketPurchased(null, account), fromBlock, latest)
        : Promise.resolve([]),
    ]);

    const payouts = new Map<number, readonly unknown[]>();
    for (const log of payoutLogs) payouts.set(Number(log.args[0]), log.args.toArray());
    const winners = await Promise.all(winnerLogs.map(async (log) => {
      const args = log.args.toArray();
      const roundId = Number(args[0]);
      const winner = String(args[1]);
      const winningTicket = Number(args[2]);
      const payout = payouts.get(roundId) ?? [];
      let proofVerified = false;
      try {
        proofVerified = String(await contract.getTicketOwner(roundId, winningTicket)).toLowerCase() === winner.toLowerCase();
      } catch {
        proofVerified = false;
      }
      return {
        roundId,
        winner,
        winningTicket,
        randomWord: String(args[3]),
        requestId: String(args[4]),
        grossPot: payout[1] ? formatEther(payout[1] as bigint) : "0",
        prizeAmount: payout[2] ? formatEther(payout[2] as bigint) : "0",
        houseFee: payout[3] ? formatEther(payout[3] as bigint) : "0",
        referrer: payout[4] ? String(payout[4]) : undefined,
        referrerReward: payout[5] ? formatEther(payout[5] as bigint) : "0",
        rolledOverAmount: payout[6] ? formatEther(payout[6] as bigint) : "0",
        blockNumber: log.blockNumber,
        proofVerified,
      };
    }));

    const tickets = ticketLogs.map((log) => ({
      roundId: Number(log.args[0]),
      count: Number(log.args[2]),
      firstTicket: Number(log.args[3]),
      amount: formatEther(log.args[4] as bigint),
      transactionHash: log.transactionHash,
      blockNumber: log.blockNumber,
    }));

    return NextResponse.json({
      poolId: pool.id,
      indexedFromBlock: fromBlock,
      indexedToBlock: latest,
      winners: winners.reverse(),
      tickets: tickets.reverse(),
    }, { headers: { "Cache-Control": "public, max-age=5, stale-while-revalidate=15" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Indexing failed" }, { status: 503 });
  }
}
