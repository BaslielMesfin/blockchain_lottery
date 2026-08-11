# ETH Lottery

A Sepolia-first, time-based ETH lottery built with Solidity 0.8.28, Hardhat 3, ethers v6, Next.js 16, and React 19.

> This repository is testnet software. The checked-in deployment configuration targets a local Hardhat chain and has no real monetary value. Do not accept mainnet funds without an independent smart-contract audit, legal review, approved on-ramp provider, and production operations plan.

## Security model

- Chainlink VRF v2.5-compatible requests select an exact winning ticket.
- Chainlink Automation-compatible `checkUpkeep`/`performUpkeep` functions trigger expired draws.
- A timed-out VRF request can be retried permissionlessly.
- Prize, referral, and house allocations use pull payments. A recipient that rejects ETH cannot freeze the lottery.
- Bulk purchases are stored as cumulative ticket batches rather than one storage entry per ticket.
- Every completed round stores its random word, request ID, winning ticket, ticket total, pot, payout allocation, and timestamp.
- The frontend verifies chain ID and deployed bytecode before enabling a payment.
- Every write is simulated and gas-estimated before signature, then tracked through two confirmations and wallet replacement.
- Ethereum state and event logs are authoritative. The indexer API is a disposable read model, not a source of truth.

## Current payment behavior

ETH wallet payment is the only ticket payment method. The “buy ETH with card” flow is a hosted crypto on-ramp handoff: an approved third party handles card data and sends ETH to the user’s wallet. The user still signs the ticket purchase on-chain.

This application never accepts raw card numbers or CVC values. The on-ramp button stays disabled until `NEXT_PUBLIC_ONRAMP_URL_TEMPLATE` is configured for an approved provider. Provider refunds, identity checks, chargebacks, and fiat reconciliation remain with that hosted provider; the lottery recognizes only confirmed on-chain ticket transactions.

## Features

- Four independent pools: 1 minute, 1 hour, 6 hours, and 1 week.
- 70% winner claim, 20% referrer claim or rollover, and 10% house claim.
- On-chain referral attribution.
- Live round state and event indexing.
- Wallet-specific ticket history, ticket ranges, exact current odds, claims, and verified winning-ticket proofs.
- RPC, deployment, overdue draw, stalled VRF, keeper funding, pot, and payout-liability monitoring at `/monitor` and `/api/monitor`.
- Browser wallet support and an optional WalletConnect runtime adapter.
- Prominent local/testnet/mainnet banners and accessible modal/dialog behavior.

## Requirements

- Node.js 20.9 or newer; Node 22 is used in CI.
- MetaMask, Rabby, or another EIP-1193 wallet.
- For Sepolia: funded deployer, VRF v2.5 subscription, coordinator/key hash, Automation upkeep, RPC endpoint, and optionally a Reown project ID.

Copy `.env.example` to `.env.local` for the website and/or `.env` for Hardhat. Never commit private keys.

## Local development

```bash
npm install
npx hardhat node
```

In a second terminal:

```bash
npm run contracts:build
npx hardhat run scripts/deploy.ts --network localhost
npm run dev
```

Open `http://localhost:3000`. The deployment script creates a local VRF coordinator mock, deploys all pools, and rewrites `constants/contract.ts` with the resulting chain-specific addresses.

After a local round expires, run the local Automation/VRF helper:

```bash
npx hardhat run scripts/local-automation.ts --network localhost
```

The helper is deliberately restricted to chain ID 31337 and must never be used as production randomness.

## Sepolia deployment

1. Create and fund a Chainlink VRF v2.5 subscription.
2. Set `SEPOLIA_PRIVATE_KEY`, `SEPOLIA_RPC_URL`, `VRF_COORDINATOR`, `VRF_SUBSCRIPTION_ID`, and `VRF_KEY_HASH` locally.
3. Compile and deploy:

```bash
npm run contracts:build
npx hardhat run scripts/deploy.ts --network sepolia
```

4. Add all four deployed lotteries as VRF subscription consumers.
5. Register each lottery as a Chainlink Automation custom-logic upkeep.
6. Verify the contracts on a block explorer.
7. Commit the generated `constants/contract.ts` only after confirming every address has bytecode on chain ID 11155111.

No Sepolia deployment is performed automatically by this repository because it requires a funded private key and Chainlink subscription.

## WalletConnect and hosted on-ramp

Set `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` after creating a Reown project. The UI loads the WalletConnect provider only when the mobile-connect button is used. Install the provider dependency when enabling it:

```bash
npm install @walletconnect/ethereum-provider
```

Set `NEXT_PUBLIC_ONRAMP_URL_TEMPLATE` only after a provider approves this use case. Supported placeholders are `{address}`, `{chainId}`, and `{amountEth}`. The final hosted URL must be created according to that provider’s current signed-session requirements; do not put secret API keys in a `NEXT_PUBLIC_` variable.

## Indexing and monitoring

`/api/indexer?pool=standard&account=0x...` reads logs in bounded block chunks, joins draw and payout events, and verifies the winning-ticket owner against contract storage. The browser polls this endpoint for live history. A production deployment can replace the implementation with The Graph or a Postgres-backed worker without changing the contract’s authority.

`/api/monitor` checks:

- RPC availability and latency.
- Contract bytecode at every configured address.
- Draws overdue by more than five minutes.
- VRF requests beyond the configured retry timeout.
- Current pots and outstanding payout liabilities.
- Optional keeper balance against `KEEPER_MIN_ETH`.

## Verification

```bash
npm run check
```

The command compiles contracts, runs Solidity and TypeScript tests, type-checks, lints, and creates a production Next.js build. CI runs the same checks on pushes and pull requests.

## Important limitations

- The local Chainlink-compatible interfaces are intentionally minimal and ABI-compatible with the methods used here. Before Sepolia deployment, compare them against the currently published Chainlink contracts and documentation.
- The event indexer has no persistent database. This is intentional for the current stage; it may be slower over a large block history.
- A provider project ID and package installation are still required to activate WalletConnect.
- A hosted on-ramp account and approval are still required to activate card-to-ETH purchases.
- Lottery and referral products may be regulated or prohibited depending on jurisdiction. Technical deployment is not legal approval.

## License

MIT
