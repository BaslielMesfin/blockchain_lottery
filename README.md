# 🎟️ ETH LOTTERY — Decentralized Time-Based Jackpot dApp 🚀

A tactile, high-stakes, time-based lottery application built on Ethereum. Users purchase tickets for **0.01 ETH**, a live countdown runs, and when the timer hits zero, a winner is selected on-chain to receive **90% of the jackpot pool**, with **10% allocated as the protocol house fee**. 💰

---

## 🌟 Overview 📝

**ETH Lottery** grounds abstract blockchain interactions in a familiar physical metaphor—the paper ticket. Designed with a **Tactile High-Contrast Cyberpunk** aesthetic, the dApp features cut-out ticket stubs, perforated dividers, decorative barcode strips, and high-impact typography. 🎨

The entire lottery lifecycle is **100% decentralized and trustless**. All funds, player entries, countdown timers, and payout splits are enforced by a Solidity smart contract deployed on the Ethereum blockchain. ⚡

---

## ✨ Key Features ⚡

- 🎟️ **Ticket Purchase:** Buy tickets for 0.01 ETH each to enter the active draw round.
- ⏱️ **Live Countdown Timer:** Synchronized timer tracking time remaining in the current round.
- 🏆 **Automated & On-Chain Draws:** Draws a random winner from player entries when the round expires.
- 💰 **Fair Jackpot Distribution:** 90% of contract balance goes directly to the winner's wallet; 10% goes to the protocol owner.
- 📜 **On-Chain Audit Log (History):** View historical draw results and winner payouts fetched directly from smart contract event logs.
- 📖 **Interactive Rules Page:** Built-in protocol guide explaining ticket prices, draw mechanics, and transparency.
- 🛡️ **Smart Admin Panel:** Owner controls to draw winners or restart idle rounds if timer expires without entries.
- 🔌 **Web3 Wallet Bridge:** Connect/disconnect MetaMask or Rabby wallets with real-time account detection and status feedback.

---

## 🛠️ Technical Architecture 🏗️

### 📊 Tech Stack

| Layer 🧱 | Technology 💻 | Description 📄 |
|---|---|---|
| **Smart Contract** 📜 | Solidity `0.8.20` | Core lottery logic, ticket registry, random winner selection, payout split |
| **Framework** ⚡ | Next.js 16 (App Router) | React 19 framework with TypeScript and Turbopack |
| **Styling** 🎨 | Tailwind CSS v4 | Custom design tokens, clip-path ticket notches, barcode utility patterns |
| **Web3 Integration** 🌐 | ethers.js `v6` | Provider, signer, contract instance management, event filter querying |
| **Development Environment** 🛠️ | Hardhat | Local EVM network node, compilation, and deployment pipeline |

### ⚙️ Smart Contract (`TimeBasedLottery.sol`)

- 🎟️ **`buyTicket()` (`payable`):** Accepts exact ticket price (`0.01 ETH`), records buyer's address in `players` array, and emits `TicketPurchased`.
- 🏆 **`pickWinner()` (`onlyOwner`):** Generates pseudo-random index via `keccak256(prevrandao, timestamp, players)`, calculates 90% prize and 10% fee, transfers ETH, resets state, and emits `WinnerPicked`.
- 🔄 **`restartLottery()` (`onlyOwner`):** Allows restarting the timer when a round expires with 0 players (preventing deadlocks).
- 📊 **`getTimeRemaining()` & `getPlayers()`:** Read-only helper functions for real-time dashboard data.

---

## 📁 Project Structure 🗂️

```
blockchain_lottery/
├── app/
│   ├── components/
│   │   ├── Header.tsx         # 🔝 Navigation bar & wallet connect/disconnect button
│   │   ├── MobileNav.tsx      # 📱 Mobile bottom navigation bar
│   │   └── Toast.tsx          # 🏷️ Ticket-tag notification toast overlay
│   ├── context/
│   │   └── WalletContext.tsx  # 🌐 Shared Web3 provider, state & transaction context
│   ├── history/
│   │   └── page.tsx           # 📜 Past draws & winner audit log page
│   ├── rules/
│   │   └── page.tsx           # 📖 Protocol rules & transparency guide page
│   ├── globals.css            # 🎨 Cyberpunk design system, tokens & clip-paths
│   ├── layout.tsx             # 🧱 Root layout with Google Fonts (Anton, Hanken, JetBrains)
│   ├── page.tsx               # 🎟️ Main Draws jackpot dashboard page
│   └── providers.tsx          # 🔌 Client provider wrapper
├── constants/
│   └── contract.ts            # 🔑 Contract deployment address & complete ABI
├── contracts/
│   └── TimeBasedLottery.sol   # 📜 Solidity smart contract
├── scripts/
│   └── deploy.ts            # 🚀 Hardhat deployment script (auto-writes address + ABI)
└── hardhat.config.ts          # ⚙️ Hardhat configuration for local network node
```

---

## 🚀 Local Development Guide 💻

### 📋 Prerequisites
- 📦 Node.js (v18+ recommended)
- 🦊 MetaMask or Rabby browser extension

### 1️⃣ Install Dependencies
```bash
npm install
```

### 2️⃣ Run Local Hardhat Node
```bash
npx hardhat node
```

### 3️⃣ Deploy Smart Contract
In a new terminal window:
```bash
npx hardhat compile
npx hardhat run scripts/deploy.ts --network localhost
```
*The deploy script automatically updates `constants/contract.ts` with the new address and ABI.* 📝

### 4️⃣ Start Next.js Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser. 🌐

---

## 📄 License ⚖️

MIT
