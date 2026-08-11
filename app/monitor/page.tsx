"use client";

import { useCallback, useEffect, useState } from "react";
import { Header } from "@/app/components/Header";
import { MobileNav } from "@/app/components/MobileNav";

interface PoolHealth {
  id: string;
  address: string;
  deployed: boolean;
  status: string;
  state?: string;
  totalTickets?: number;
  potEth?: string;
  payoutLiabilitiesEth?: string;
  activeRequestId?: string;
}

interface HealthReport {
  network: string;
  chainId: number;
  blockNumber?: number;
  rpcLatencyMs?: number;
  rpcHealthy: boolean;
  keeperBalanceEth?: string | null;
  lowKeeperBalance?: boolean;
  checkedAt: string;
  pools?: PoolHealth[];
  error?: string;
}

export default function MonitorPage() {
  const [report, setReport] = useState<HealthReport | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/monitor", { cache: "no-store" });
      const data = await response.json() as HealthReport;
      setReport(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => void refresh(), 0);
    const interval = window.setInterval(() => void refresh(), 30_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [refresh]);

  return (
    <div className="min-h-screen pb-24">
      <Header />
      <main className="max-w-5xl mx-auto px-4 md:px-16 py-10">
        <p className="font-label-mono text-xs text-secondary-fixed uppercase tracking-widest">Protocol operations</p>
        <h1 className="font-headline-lg text-4xl md:text-6xl text-primary uppercase">Health Monitor</h1>
        <p className="text-on-surface-variant mt-3 max-w-2xl">
          Live RPC, deployment, Automation, VRF, keeper, pot, and unpaid-claim checks. Ethereum remains the source of truth.
        </p>

        {loading && <p className="mt-8 font-label-mono text-sm" role="status">Checking protocol health…</p>}
        {report && (
          <div className="mt-8 space-y-5" aria-live="polite">
            <section className={`border p-5 ${report.rpcHealthy ? "border-success-green text-success-green" : "border-error text-error"}`}>
              <strong className="font-label-mono uppercase">RPC {report.rpcHealthy ? "healthy" : "unavailable"}</strong>
              <p className="text-sm mt-2 text-on-surface-variant">
                {report.network} ({report.chainId}) · Block {report.blockNumber ?? "unknown"} · Latency {report.rpcLatencyMs ?? "unknown"} ms
              </p>
              {report.error && <p className="text-sm mt-2">{report.error}</p>}
            </section>

            {report.keeperBalanceEth !== undefined && (
              <section className={`border p-5 ${report.lowKeeperBalance ? "border-warning-yellow text-warning-yellow" : "border-outline-variant text-primary"}`}>
                <strong className="font-label-mono uppercase">Keeper funding</strong>
                <p className="text-sm mt-2">{report.keeperBalanceEth === null ? "KEEPER_ADDRESS is not configured." : `${report.keeperBalanceEth} ETH`}</p>
              </section>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              {report.pools?.map((pool) => (
                <section key={pool.id} className="border border-outline-variant bg-surface-indigo p-5">
                  <div className="flex justify-between gap-3">
                    <h2 className="font-headline-lg text-2xl uppercase">{pool.id}</h2>
                    <strong className={pool.status === "HEALTHY" ? "text-success-green" : "text-warning-yellow"}>{pool.status}</strong>
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-2 text-xs font-label-mono">
                    <dt className="text-on-surface-variant">State</dt><dd>{pool.state ?? "N/A"}</dd>
                    <dt className="text-on-surface-variant">Tickets</dt><dd>{pool.totalTickets ?? 0}</dd>
                    <dt className="text-on-surface-variant">Active pot</dt><dd>{pool.potEth ?? "0"} ETH</dd>
                    <dt className="text-on-surface-variant">Claim liabilities</dt><dd>{pool.payoutLiabilitiesEth ?? "0"} ETH</dd>
                    <dt className="text-on-surface-variant">VRF request</dt><dd className="break-all">{pool.activeRequestId ?? "0"}</dd>
                  </dl>
                </section>
              ))}
            </div>
          </div>
        )}
      </main>
      <MobileNav />
    </div>
  );
}
