// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title TimeBasedLottery
 * @notice A 100% Autonomous, Trustless & Permissionless Time-Based Lottery Smart Contract.
 * 
 * Features:
 * - 70% Winner Prize / 20% Referrer Reward / 10% House Fee
 * - 100% Autonomous: Anyone can draw the winner when the timer expires.
 * - Auto-Rollover: Buying a ticket in an expired round automatically draws the previous winner or restarts the round.
 * - No Admin Privilege: Owner cannot alter funds, choose winners, or pause rounds.
 */
contract TimeBasedLottery {
    address public owner;
    uint256 public ticketPrice;
    uint256 public lotteryEndTime;
    uint256 public duration;
    bool public lotteryOpen;

    address payable[] public players;
    address public recentWinner;

    // Referrer tracking: buyer address => referrer address
    mapping(address => address) public referrers;

    // Payout percentages
    uint256 public constant HOUSE_FEE_PERCENT = 10;
    uint256 public constant REFERRER_FEE_PERCENT = 20;

    event TicketPurchased(address indexed player, uint256 amount, address indexed referrer);
    event WinnerPicked(address indexed winner, uint256 prizeAmount, uint256 houseFee, address indexed referrer, uint256 referrerReward);
    event RoundRolledOver(uint256 newEndTime);

    /**
     * @dev Initialize lottery with a ticket price in Wei and duration in seconds (default 7200s = 2 hours).
     */
    constructor(uint256 _ticketPriceInWei, uint256 _durationInSeconds) {
        owner = msg.sender;
        ticketPrice = _ticketPriceInWei;
        duration = _durationInSeconds == 0 ? 7200 : _durationInSeconds;
        
        lotteryEndTime = block.timestamp + duration;
        lotteryOpen = true;
    }

    /**
     * @notice Enter the lottery by buying multiple tickets with an optional referrer.
     * Automatically draws winner or rolls over if the current round has expired.
     */
    function buyTicketsWithReferrer(uint256 count, address _referrer) public payable {
        require(count > 0, "Must purchase at least 1 ticket");

        // Auto-handle expired round before processing new ticket
        if (block.timestamp >= lotteryEndTime) {
            if (players.length > 0) {
                _executePickWinner();
            } else {
                delete players;
                lotteryEndTime = block.timestamp + duration;
                lotteryOpen = true;
                emit RoundRolledOver(lotteryEndTime);
            }
        }

        require(lotteryOpen, "Lottery is currently closed");
        require(msg.value == ticketPrice * count, "Incorrect ETH amount sent for ticket count");

        if (_referrer != address(0) && _referrer != msg.sender && referrers[msg.sender] == address(0)) {
            referrers[msg.sender] = _referrer;
        }

        for (uint256 i = 0; i < count; i++) {
            players.push(payable(msg.sender));
        }

        emit TicketPurchased(msg.sender, msg.value, referrers[msg.sender]);
    }

    /**
     * @notice Enter the lottery by buying a single ticket with an optional referrer.
     */
    function buyTicketWithReferrer(address _referrer) public payable {
        buyTicketsWithReferrer(1, _referrer);
    }

    /**
     * @notice Enter the lottery buying multiple tickets without a referrer.
     */
    function buyTickets(uint256 count) external payable {
        buyTicketsWithReferrer(count, address(0));
    }

    /**
     * @notice Enter the lottery by buying a single ticket without a referrer.
     */
    function buyTicket() external payable {
        buyTicketsWithReferrer(1, address(0));
    }

    /**
     * @notice 100% Permissionless: ANYONE can call pickWinner once the timer reaches zero!
     */
    function pickWinner() public {
        require(block.timestamp >= lotteryEndTime, "Lottery timer has not finished yet");
        require(players.length > 0, "No players in the lottery");

        _executePickWinner();
    }

    /**
     * @dev Internal function to select winner, execute 70/20/10 payouts, and reset round.
     */
    function _executePickWinner() internal {
        uint256 totalPool = address(this).balance - msg.value; // Exclude new buyer's ETH if called during buy
        if (totalPool == 0) {
            totalPool = address(this).balance;
        }

        // 1. Generate pseudo-random winner index
        uint256 randomIndex = uint256(
            keccak256(
                abi.encodePacked(block.prevrandao, block.timestamp, players)
            )
        ) % players.length;

        address payable winner = players[randomIndex];
        recentWinner = winner;
        
        // 2. Calculate Payouts
        uint256 houseFee = (totalPool * HOUSE_FEE_PERCENT) / 100;
        address winnerReferrer = referrers[winner];
        uint256 referrerReward = 0;
        uint256 prizeAmount = 0;

        if (winnerReferrer != address(0)) {
            referrerReward = (totalPool * REFERRER_FEE_PERCENT) / 100; // 20%
            prizeAmount = totalPool - houseFee - referrerReward;      // 70%
        } else {
            referrerReward = 0;
            prizeAmount = totalPool - houseFee;                       // 90%
        }

        // 3. Reset state for the next round BEFORE making transfers (Reentrancy Guard)
        delete players;
        lotteryEndTime = block.timestamp + duration;
        lotteryOpen = true;

        // 4. Send payouts
        (bool successOwner, ) = payable(owner).call{value: houseFee}("");
        require(successOwner, "Failed to send fee to owner");

        if (referrerReward > 0 && winnerReferrer != address(0)) {
            (bool successRef, ) = payable(winnerReferrer).call{value: referrerReward}("");
            require(successRef, "Failed to send reward to referrer");
        }

        (bool successWinner, ) = winner.call{value: prizeAmount}("");
        require(successWinner, "Failed to send prize to winner");

        emit WinnerPicked(winner, prizeAmount, houseFee, winnerReferrer, referrerReward);
    }

    /**
     * @notice Helper function to get the list of current players.
     */
    function getPlayers() external view returns (address payable[] memory) {
        return players;
    }

    /**
     * @notice Returns remaining time in seconds until the draw.
     */
    function getTimeRemaining() external view returns (uint256) {
        if (block.timestamp >= lotteryEndTime) {
            return 0;
        }
        return lotteryEndTime - block.timestamp;
    }

    /**
     * @notice 100% Permissionless: ANYONE can restart the lottery timer if expired with 0 players.
     */
    function restartLottery() public {
        require(block.timestamp >= lotteryEndTime, "Current round is still active");
        require(players.length == 0, "Players exist - winner draw will be triggered on next ticket or pickWinner");

        lotteryEndTime = block.timestamp + duration;
        lotteryOpen = true;
        emit RoundRolledOver(lotteryEndTime);
    }
}