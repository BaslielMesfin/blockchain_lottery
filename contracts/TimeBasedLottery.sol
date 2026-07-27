// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title TimeBasedLottery
 * @dev Time-based lottery contract with a 10% platform/house fee on payouts,
 * 20% referrer fee (if registered), 70% winner reward, auto-rollover, and 2-hour default duration.
 */
contract TimeBasedLottery {
    address public owner;
    address payable[] public players;
    address public recentWinner;
    
    uint256 public ticketPrice;
    uint256 public duration;
    uint256 public lotteryEndTime;
    bool public lotteryOpen;

    // Referral registry
    mapping(address => address) public referrers;

    // Platform fee percentage kept by the owner (10%)
    uint256 public constant HOUSE_FEE_PERCENT = 10;
    // Referrer fee percentage (20%)
    uint256 public constant REFERRER_FEE_PERCENT = 20;

    // Events to notify the frontend when things happen
    event TicketPurchased(address indexed player, uint256 amount, address indexed referrer);
    event WinnerPicked(
        address indexed winner,
        uint256 prizeAmount,
        uint256 houseFee,
        address indexed referrer,
        uint256 referrerReward
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner can call this");
        _;
    }

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
     * @notice Enter the lottery by buying a ticket with an optional referrer.
     * Automatically rolls over to a new round if the previous round expired.
     */
    function buyTicketWithReferrer(address _referrer) public payable {
        // Auto-rollover if current round has expired
        if (block.timestamp >= lotteryEndTime) {
            delete players;
            lotteryEndTime = block.timestamp + duration;
            lotteryOpen = true;
        }

        require(lotteryOpen, "Lottery is currently closed");
        require(msg.value == ticketPrice, "Incorrect ETH amount sent");

        if (_referrer != address(0) && _referrer != msg.sender && referrers[msg.sender] == address(0)) {
            referrers[msg.sender] = _referrer;
        }

        players.push(payable(msg.sender));
        emit TicketPurchased(msg.sender, msg.value, referrers[msg.sender]);
    }

    /**
     * @notice Enter the lottery without a referrer.
     */
    function buyTicket() external payable {
        buyTicketWithReferrer(address(0));
    }

    /**
     * @notice Selects the winner, calculates payouts (70% winner, 20% referrer, 10% owner; or 90% winner if no referrer), and resets timer.
     */
    function pickWinner() external onlyOwner {
        require(block.timestamp >= lotteryEndTime, "Lottery timer has not finished yet");
        require(players.length > 0, "No players in the lottery");

        // 1. Generate pseudo-random winner index
        uint256 randomIndex = uint256(
            keccak256(
                abi.encodePacked(block.prevrandao, block.timestamp, players)
            )
        ) % players.length;

        address payable winner = players[randomIndex];
        recentWinner = winner;
        
        // 2. Calculate Payouts
        uint256 totalPool = address(this).balance;
        uint256 houseFee = (totalPool * HOUSE_FEE_PERCENT) / 100; // 10% to house
        
        address winnerReferrer = referrers[winner];
        uint256 referrerReward = 0;
        uint256 prizeAmount = 0;

        if (winnerReferrer != address(0)) {
            referrerReward = (totalPool * REFERRER_FEE_PERCENT) / 100; // 20% to referrer
            prizeAmount = totalPool - houseFee - referrerReward;      // 70% to winner
        } else {
            referrerReward = 0;
            prizeAmount = totalPool - houseFee;                       // 90% to winner
        }

        // 3. Reset state for the next round BEFORE making transfers (Security best practice)
        delete players;
        lotteryEndTime = block.timestamp + duration;
        lotteryOpen = true;

        // 4. Send 10% fee directly to owner wallet
        (bool successOwner, ) = payable(owner).call{value: houseFee}("");
        require(successOwner, "Failed to send fee to owner");

        // 5. Send 20% referrer fee if applicable
        if (referrerReward > 0 && winnerReferrer != address(0)) {
            (bool successRef, ) = payable(winnerReferrer).call{value: referrerReward}("");
            require(successRef, "Failed to send reward to referrer");
        }

        // 6. Send prize jackpot to winner
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
     * @notice Owner can restart the lottery timer (e.g. when a round expired with no players).
     */
    function restartLottery() external onlyOwner {
        require(block.timestamp >= lotteryEndTime, "Current round is still active");
        require(players.length == 0, "Players exist - use pickWinner instead");

        lotteryEndTime = block.timestamp + duration;
        lotteryOpen = true;
    }
}