import { expect } from "chai";
import { network } from "hardhat";

const { ethers, networkHelpers } = await network.create();

describe("TimeBasedLottery", function () {
  const TICKET_PRICE = ethers.parseEther("0.01");
  const DURATION = 60;
  const VRF_TIMEOUT = 3600;

  async function deployFixture() {
    const [owner, player1, player2, referrer, keeper, recipient] = await ethers.getSigners();
    const coordinator = await ethers.deployContract("MockVRFCoordinatorV2Plus");
    const lottery = await ethers.deployContract("TimeBasedLottery", [
      TICKET_PRICE,
      DURATION,
      owner.address,
      await coordinator.getAddress(),
      1n,
      ethers.ZeroHash,
      500_000,
      VRF_TIMEOUT,
    ]);
    return { lottery, coordinator, owner, player1, player2, referrer, keeper, recipient };
  }

  async function expireRound() {
    await networkHelpers.time.increase(DURATION + 1);
  }

  describe("round and ticket accounting", function () {
    it("starts the timer with the first ticket instead of at deployment", async function () {
      const { lottery, player1 } = await networkHelpers.loadFixture(deployFixture);
      expect(await lottery.lotteryEndTime()).to.equal(0n);

      await lottery.connect(player1).buyTicket({ value: TICKET_PRICE });

      expect(await lottery.lotteryEndTime()).to.be.greaterThan(0n);
      expect(await lottery.totalTickets()).to.equal(1n);
      expect(await lottery.ticketsByRound(1n, player1.address)).to.equal(1n);
    });

    it("compresses bulk purchases while preserving exact ticket ownership", async function () {
      const { lottery, player1, player2 } = await networkHelpers.loadFixture(deployFixture);
      await lottery.connect(player1).buyTickets(2n, { value: TICKET_PRICE * 2n });
      await lottery.connect(player2).buyTickets(3n, { value: TICKET_PRICE * 3n });

      expect(await lottery.getTicketOwner(1n, 0n)).to.equal(player1.address);
      expect(await lottery.getTicketOwner(1n, 1n)).to.equal(player1.address);
      expect(await lottery.getTicketOwner(1n, 2n)).to.equal(player2.address);
      expect((await lottery.getRoundBatches(1n)).length).to.equal(2);
    });

    it("rejects incorrect values, invalid counts, and purchases after expiry", async function () {
      const { lottery, player1 } = await networkHelpers.loadFixture(deployFixture);
      await expect(lottery.connect(player1).buyTickets(0n)).to.be.revertedWithCustomError(
        lottery,
        "InvalidTicketCount",
      );
      await expect(
        lottery.connect(player1).buyTicket({ value: TICKET_PRICE - 1n }),
      ).to.be.revertedWithCustomError(lottery, "IncorrectPayment");

      await lottery.connect(player1).buyTicket({ value: TICKET_PRICE });
      await expireRound();
      await expect(
        lottery.connect(player1).buyTicket({ value: TICKET_PRICE }),
      ).to.be.revertedWithCustomError(lottery, "RoundExpired");
    });
  });

  describe("Chainlink VRF and Automation flow", function () {
    it("lets Automation request a draw and fulfills a verifiable winning ticket", async function () {
      const { lottery, coordinator, player1, player2, keeper } = await networkHelpers.loadFixture(deployFixture);
      await lottery.connect(player1).buyTicket({ value: TICKET_PRICE });
      await lottery.connect(player2).buyTickets(2n, { value: TICKET_PRICE * 2n });
      await expireRound();

      const [needed] = await lottery.checkUpkeep("0x");
      expect(needed).to.equal(true);
      await expect(lottery.connect(keeper).performUpkeep("0x"))
        .to.emit(lottery, "RandomnessRequested")
        .withArgs(1n, 1n, false);

      await expect(coordinator.fulfillRequest(1n, 2n))
        .to.emit(lottery, "WinnerPicked")
        .withArgs(1n, player2.address, 2n, 2n, 1n);

      const result = await lottery.roundResults(1n);
      expect(result.winner).to.equal(player2.address);
      expect(await lottery.getTicketOwner(1n, result.winningTicket)).to.equal(result.winner);
      expect(await lottery.roundId()).to.equal(2n);
    });

    it("allows a timed-out request to be retried and rejects stale fulfillment", async function () {
      const { lottery, coordinator, player1 } = await networkHelpers.loadFixture(deployFixture);
      await lottery.connect(player1).buyTicket({ value: TICKET_PRICE });
      await expireRound();
      await lottery.requestDraw();

      await expect(lottery.retryRandomness()).to.be.revertedWithCustomError(lottery, "RequestNotTimedOut");
      await networkHelpers.time.increase(VRF_TIMEOUT + 1);
      await expect(lottery.retryRandomness())
        .to.emit(lottery, "RandomnessRequested")
        .withArgs(1n, 2n, true);

      await expect(coordinator.fulfillRequest(1n, 0n)).to.be.revertedWithCustomError(
        lottery,
        "StaleRandomnessRequest",
      );
      await coordinator.fulfillRequest(2n, 0n);
      expect(await lottery.lastCompletedRound()).to.equal(1n);
    });
  });

  describe("pull-based payouts", function () {
    it("allocates the 70/20/10 split and lets each recipient claim", async function () {
      const { lottery, coordinator, owner, player1, referrer, keeper } = await networkHelpers.loadFixture(deployFixture);
      await lottery.connect(player1).buyTicketWithReferrer(referrer.address, { value: TICKET_PRICE });
      await expireRound();
      await lottery.connect(keeper).requestDraw();
      await coordinator.fulfillRequest(1n, 0n);

      expect(await lottery.claimableWinnings(player1.address)).to.equal((TICKET_PRICE * 70n) / 100n);
      expect(await lottery.claimableWinnings(referrer.address)).to.equal((TICKET_PRICE * 20n) / 100n);
      expect(await lottery.claimableWinnings(owner.address)).to.equal((TICKET_PRICE * 10n) / 100n);
      expect(await lottery.rolloverBalance()).to.equal(0n);

      await expect(lottery.connect(player1).withdrawWinnings(player1.address)).to.changeEtherBalance(
        ethers,
        player1,
        (TICKET_PRICE * 70n) / 100n,
      );
    });

    it("rolls an unassigned referral share into the next round", async function () {
      const { lottery, coordinator, player1 } = await networkHelpers.loadFixture(deployFixture);
      await lottery.connect(player1).buyTicket({ value: TICKET_PRICE });
      await expireRound();
      await lottery.requestDraw();
      await coordinator.fulfillRequest(1n, 0n);

      expect(await lottery.rolloverBalance()).to.equal((TICKET_PRICE * 20n) / 100n);
      expect(await lottery.currentPot()).to.equal((TICKET_PRICE * 20n) / 100n);
    });

    it("cannot be frozen by a winner that rejects ETH", async function () {
      const { lottery, coordinator, recipient } = await networkHelpers.loadFixture(deployFixture);
      const rejectingWinner = await ethers.deployContract("RejectingRecipient");
      await rejectingWinner.enter(await lottery.getAddress(), { value: TICKET_PRICE });
      await expireRound();
      await lottery.requestDraw();

      await expect(coordinator.fulfillRequest(1n, 0n)).to.emit(lottery, "WinnerPicked");
      expect(await lottery.roundId()).to.equal(2n);
      expect(await lottery.claimableWinnings(await rejectingWinner.getAddress())).to.be.greaterThan(0n);

      await expect(
        rejectingWinner.claimTo(await lottery.getAddress(), recipient.address),
      ).to.changeEtherBalance(ethers, recipient, (TICKET_PRICE * 70n) / 100n);
    });

    it("maintains the balance = current pot + outstanding claims invariant", async function () {
      const { lottery, coordinator, player1 } = await networkHelpers.loadFixture(deployFixture);
      await lottery.connect(player1).buyTicket({ value: TICKET_PRICE });
      await expireRound();
      await lottery.requestDraw();
      await coordinator.fulfillRequest(1n, 0n);

      const balance = await ethers.provider.getBalance(await lottery.getAddress());
      expect(balance).to.equal((await lottery.currentPot()) + (await lottery.totalClaimable()));
    });
  });
});
