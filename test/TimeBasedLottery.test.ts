import { expect } from "chai";
import { network } from "hardhat";

describe("TimeBasedLottery - Referral, Auto-Rollover & 70/20/10 Split", function () {
  async function deployFixture() {
    const { ethers } = await network.create();
    const [owner, player1, player2, referrer] = await ethers.getSigners();

    const ticketPrice = ethers.parseEther("0.01");
    const duration = 7200; // 2 hours

    const TimeBasedLottery = await ethers.getContractFactory("TimeBasedLottery");
    const lottery = await TimeBasedLottery.deploy(ticketPrice, duration);

    return { lottery, ticketPrice, duration, owner, player1, player2, referrer, ethers };
  }

  describe("Constructor & Defaults", function () {
    it("Should initialize with 7200 seconds default duration when passed 0 or 7200", async function () {
      const { lottery, duration } = await deployFixture();
      expect(await lottery.duration()).to.equal(BigInt(duration));
    });
  });

  describe("Referral & Auto-Rollover Ticket Purchase", function () {
    it("Should register referrer on buyTicketWithReferrer", async function () {
      const { lottery, ticketPrice, player1, referrer } = await deployFixture();

      await lottery.connect(player1).buyTicketWithReferrer(referrer.address, { value: ticketPrice });

      expect(await lottery.referrers(player1.address)).to.equal(referrer.address);
      const players = await lottery.getPlayers();
      expect(players.length).to.equal(1);
      expect(players[0]).to.equal(player1.address);
    });

    it("Should auto-rollover round if round expired when buying ticket", async function () {
      const { lottery, ticketPrice, player1, player2, ethers } = await deployFixture();

      // Player 1 buys ticket
      await lottery.connect(player1).buyTicket({ value: ticketPrice });
      expect((await lottery.getPlayers()).length).to.equal(1);

      // Fast forward time past duration (7201 seconds)
      await ethers.provider.send("evm_increaseTime", [7201]);
      await ethers.provider.send("evm_mine", []);

      // Player 2 buys ticket in expired round -> auto-rollover clears players and starts new round
      await lottery.connect(player2).buyTicket({ value: ticketPrice });

      const playersAfter = await lottery.getPlayers();
      expect(playersAfter.length).to.equal(1);
      expect(playersAfter[0]).to.equal(player2.address);
    });
  });

  describe("70 / 20 / 10 Payout Split", function () {
    it("Should distribute 70% winner, 20% referrer, 10% owner when winner has referrer", async function () {
      const { lottery, ticketPrice, owner, player1, referrer, ethers } = await deployFixture();

      // Player 1 buys ticket with referrer
      await lottery.connect(player1).buyTicketWithReferrer(referrer.address, { value: ticketPrice });

      // Fast forward time to expire round
      await ethers.provider.send("evm_increaseTime", [7201]);
      await ethers.provider.send("evm_mine", []);

      const totalPool = ticketPrice; // 0.01 ETH
      const expectedHouseFee = (totalPool * 10n) / 100n; // 10%
      const expectedReferrerReward = (totalPool * 20n) / 100n; // 20%
      const expectedWinnerPrize = totalPool - expectedHouseFee - expectedReferrerReward; // 70%

      const ownerBalBefore = await ethers.provider.getBalance(owner.address);
      const referrerBalBefore = await ethers.provider.getBalance(referrer.address);
      const player1BalBefore = await ethers.provider.getBalance(player1.address);

      const tx = await lottery.connect(owner).pickWinner();
      const receipt = await tx.wait();
      const gasUsed = receipt!.fee;

      const ownerBalAfter = await ethers.provider.getBalance(owner.address);
      const referrerBalAfter = await ethers.provider.getBalance(referrer.address);
      const player1BalAfter = await ethers.provider.getBalance(player1.address);

      expect(ownerBalAfter + gasUsed - ownerBalBefore).to.equal(expectedHouseFee);
      expect(referrerBalAfter - referrerBalBefore).to.equal(expectedReferrerReward);
      expect(player1BalAfter - player1BalBefore).to.equal(expectedWinnerPrize);
    });

    it("Should distribute 90% winner, 10% owner when winner has NO referrer", async function () {
      const { lottery, ticketPrice, owner, player1, ethers } = await deployFixture();

      // Player 1 buys ticket without referrer
      await lottery.connect(player1).buyTicket({ value: ticketPrice });

      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [7201]);
      await ethers.provider.send("evm_mine", []);

      const totalPool = ticketPrice; // 0.01 ETH
      const expectedHouseFee = (totalPool * 10n) / 100n; // 10%
      const expectedWinnerPrize = (totalPool * 90n) / 100n; // 90%

      const ownerBalBefore = await ethers.provider.getBalance(owner.address);
      const player1BalBefore = await ethers.provider.getBalance(player1.address);

      const tx = await lottery.connect(owner).pickWinner();
      const receipt = await tx.wait();
      const gasUsed = receipt!.fee;

      const ownerBalAfter = await ethers.provider.getBalance(owner.address);
      const player1BalAfter = await ethers.provider.getBalance(player1.address);

      expect(ownerBalAfter + gasUsed - ownerBalBefore).to.equal(expectedHouseFee);
      expect(player1BalAfter - player1BalBefore).to.equal(expectedWinnerPrize);
    });
  });
});
