import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

let lastQuote: { usd: number; source: string; fetchedAt: string } | null = null;

async function fetchJson(url: string) {
  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "eth-lottery-price-service/1.0" },
    signal: AbortSignal.timeout(5_000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json() as Promise<unknown>;
}

export async function GET() {
  const providers = [
    {
      name: "Coinbase",
      url: "https://api.coinbase.com/v2/prices/ETH-USD/spot",
      parse: (value: unknown) => Number((value as { data?: { amount?: string } }).data?.amount),
    },
    {
      name: "CoinGecko",
      url: "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
      parse: (value: unknown) => Number((value as { ethereum?: { usd?: number } }).ethereum?.usd),
    },
  ];

  for (const provider of providers) {
    try {
      const usd = provider.parse(await fetchJson(provider.url));
      if (!Number.isFinite(usd) || usd <= 0) throw new Error("Invalid quote");
      lastQuote = { usd, source: provider.name, fetchedAt: new Date().toISOString() };
      return NextResponse.json({ ...lastQuote, stale: false }, {
        headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=270" },
      });
    } catch {
      // Try the next independent quote provider.
    }
  }

  if (lastQuote) {
    return NextResponse.json({ ...lastQuote, stale: true }, { headers: { "Cache-Control": "no-store" } });
  }

  return NextResponse.json(
    { error: "ETH/USD quote temporarily unavailable" },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}
