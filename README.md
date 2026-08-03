# 🎟️ ETH LOTTERY — 100% Autonomous Multi-Pool Jackpot dApp 🚀

**ETH Lottery** is a 100% autonomous, trustless Web3 dApp built with Next.js, Tailwind CSS, and Solidity. Featuring a tactile cyberpunk "ticket-stub" interface, players buy 0.01 ETH tickets across **4 multi-tier pools** (1-Min Flash, 1-Hour Express, 6-Hour Standard, 1-Week Mega) to compete for an automated **70% winner jackpot**, **20% referrer reward** (or **20% jackpot rollover** if unreferred), and **10% house fee** when the round timer expires. 💰

---

## 🌟 Overview 📝

**ETH Lottery** grounds abstract blockchain interactions in a familiar physical metaphor—the paper ticket. Designed with a **Tactile High-Contrast Cyberpunk** aesthetic, the dApp features cut-out ticket stubs, perforated dividers, decorative barcode strips, and high-impact typography. 🎨

The entire lottery lifecycle is **100% autonomous and trustless**. Zero owner privileges or admin intervention required. All funds, player entries, referral mappings, automatic round rollovers, countdown timers, 70/20/10 payout splits, and unreferred 20% jackpot rollovers are enforced by Solidity smart contracts deployed on the Ethereum blockchain. ⚡

---

## ✨ Key Features ⚡

- 🎟️ **4 Multi-Tier Pools:** Choose between ⚡ **1-Min Flash**, ⏱️ **1-Hour Express**, 🔥 **6-Hour Standard**, and 💎 **1-Week Mega** pools running simultaneously.
- 💵 **USD Primary Currency Display:** Primary hero numbers, ticket prices, and history payouts are displayed in USD with real-time ETH/USD CoinGecko price integration and subtext ETH values.
- 🤝 **Referral System (20% Reward):** Share referral links (`/?ref=YOUR_WALLET`). When your referee wins, 20% of the gross jackpot is automatically sent to your referrer wallet on-chain!
- 🔄 **20% Unreferred Jackpot Rollover:** If a winner has no referrer, the 20% referral fee automatically rolls over into the smart contract balance for the next round's jackpot!
- 💰 **70/20/10 Prize Split:** Jackpot pool is distributed 70% to Winner, 20% to Referrer/Rollover, and 10% to Protocol Owner.
- 🤖 **100% Autonomous & Permissionless:** Anyone can trigger a winner draw when the timer expires. Buying a ticket in an expired round automatically executes the draw or restarts the round.
- 💳 **USD / Credit Card Payment Option:** In addition to Web3 wallets (MetaMask/Rabby), users can pay via card simulation.
- 📜 **On-Chain Audit Log (History):** View historical draw results with pool filter tabs (All Pools, Flash, Express, Standard, Mega) fetched directly from smart contract event logs.
- 📋 **Terms & Conditions Page (`/terms`):** Detailed breakdown of multi-pool tiers, prize distribution, referral mechanisms, auto-rollover, and protocol governance.
- 📖 **Interactive Rules Page (`/rules`):** Built-in protocol guide explaining ticket prices, draw mechanics, and provable transparency.
- 🔌 **Web3 Wallet Bridge:** Connect/disconnect MetaMask or Rabby wallets with real-time account detection and network status feedback.

---

## 🛠️ Technical Architecture 🏗️

### 📊 Tech Stack

| Layer 🧱 | Technology 💻 | Description 📄 |
|---|---|---|
| **Smart Contract** 📜 | Solidity `0.8.20` | Core lottery logic, referral registry, 70/20/10 payout split, auto-rollover |
| **Framework** ⚡ | Next.js 16 (App Router) | React 19 framework with TypeScript and Turbopack |
| **Styling** 🎨 | Tailwind CSS v4 | Custom design tokens, clip-path ticket notches, barcode utility patterns |
| **Web3 Integration** 🌐 | ethers.js `v6` | Provider, signer, contract instance management, event filter querying |
| **Development Environment** 🛠️ | Hardhat | Local EVM network node, compilation, and deployment pipeline |

---

## 🚀 How to Set Up & Run ETH Lottery on Your Computer

Follow these steps to clone the project, start the local blockchain (Hardhat), deploy the contract, and launch the website.

---

## 📋 Prerequisites
1. **Node.js** (v18 or higher installed) → Check with `node -v`
2. **Git** installed → Check with `git --version`
3. **MetaMask** or **Rabby** browser extension installed in your browser.

---

## 1️⃣ Clone the Repo & Install Dependencies

Open your terminal or PowerShell and run:

```bash
# 1. Clone the repository
git clone https://github.com/BaslielMesfin/blockchain_lottery.git

# 2. Go into the project folder
cd blockchain_lottery

# 3. Install all required dependencies
npm install
```

---

## 2️⃣ Start the Local Hardhat Blockchain (Terminal 1)

In your first terminal window, start the local Ethereum test network:

```bash
npx hardhat node
```

> ⚠️ **Keep this terminal window running!**
> It will display 20 test accounts, each loaded with 10,000 fake test ETH.
> Look at **Account #0** in that terminal output. Copy its private key for step 5:

**Account #0 Private Key:**
`0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`

---

## 3️⃣ Compile & Deploy the Contract (Terminal 2)

Open a **second terminal window** in the `blockchain_lottery` folder and run:

```bash
# 1. Compile the Solidity contract
npx hardhat compile

# 2. Deploy to your running local Hardhat node
npx hardhat run scripts/deploy.ts --network localhost
```

You will see:
```text
🚀 Deploying TimeBasedLottery to localhost...
✅ Contract Deployed To: 0x5FbDB2315678afecb367f032d93F642f64180aa3
📝 Updated constants/contract.ts with address + ABI!
```

---

## 4️⃣ Start the Next.js Dev Server (Terminal 2)

In the same second terminal window, start the website:

```bash
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** in your browser! 🌐

---

## 5️⃣ Configure Your Wallet (MetaMask / Rabby)

To test buying tickets and interacting with the contract:

### Add Local Network to your Wallet:
- **Network Name:** Hardhat Localhost
- **RPC URL:** `http://127.0.0.1:8545`
- **Chain ID:** `31337`
- **Currency Symbol:** ETH

### Import Test Account:
Go to **Account Switcher** → **Import Account** → **Import Private Key**.

Paste Account #0 Private Key:
`0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`

You will now see **10,000 test ETH** ready to test the dApp! 🎟️

---

## 📁 Project Structure 🗂️

```
blockchain_lottery/
├── app/
│   ├── components/
│   │   ├── Header.tsx         # 🔝 Navigation bar & wallet connect/disconnect button
│   │   ├── MobileNav.tsx      # 📱 Mobile bottom navigation bar
│   │   ├── Toast.tsx          # 🏷️ Ticket-tag notification toast overlay
│   │   └── UsdPaymentModal.tsx# 💳 USD/Card payment modal
│   ├── context/
│   │   └── WalletContext.tsx  # 🌐 Shared Web3 provider, referral state & context
│   ├── history/
│   │   └── page.tsx           # 📜 Past draws & winner audit log page with referrers
│   ├── rules/
│   │   └── page.tsx           # 📖 Protocol rules & transparency guide page
│   ├── terms/
│   │   └── page.tsx           # 📋 Terms & Conditions page (70/20/10 split, referrals)
│   ├── globals.css            # 🎨 Cyberpunk design system, tokens & clip-paths
│   ├── layout.tsx             # 🧱 Root layout with Google Fonts (Anton, Hanken, JetBrains)
│   ├── page.tsx               # 🎟️ Main Draws jackpot dashboard & Refer & Earn card
│   └── providers.tsx          # 🔌 Client provider wrapper
├── constants/
│   └── contract.ts            # 🔑 Contract deployment address & complete ABI
├── contracts/
│   └── TimeBasedLottery.sol   # 📜 Solidity smart contract with referral & auto-rollover
├── scripts/
│   └── deploy.ts              # 🚀 Hardhat deployment script (2-hour default duration)
├── test/
│   └── TimeBasedLottery.test.ts # 🧪 Hardhat test suite for referral, split & rollover
└── hardhat.config.ts          # ⚙️ Hardhat configuration for local network node
```

---

## 📄 License ⚖️

MIT
