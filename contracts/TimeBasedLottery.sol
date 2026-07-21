// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title TimeBasedLottery
 * @dev Time-based lottery contract with a 10% platform/house fee on payouts.
 */
contract TimeBasedLottery {
    address public owner;
    address payable[] public players;
    address public recentWinner;
    
    uint256 public ticketPrice;
    uint256 public duration;
    uint256 public lotteryEndTime;
    bool public lotteryOpen;

    // Platform fee percentage kept by the owner (10%)
    uint256 public constant HOUSE_FEE_PERCENT = 10;

    // Events to notify the frontend when things happen
    event TicketPurchased(address indexed player, uint256 amount);
    event WinnerPicked(address indexed winner, uint256 prizeAmount, uint256 houseFee);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner can call this");
        _;
    }

    modifier onlyWhileOpen() {
        require(lotteryOpen, "Lottery is currently closed");
        require(block.timestamp < lotteryEndTime, "Lottery time has expired! Waiting for draw.");
        _;
    }

    /**
     * @dev Initialize lottery with a ticket price in Wei (or ETH) and duration in seconds.
     * Example: ticketPrice = 10000000000000000 (0.01 ETH), durationInSeconds = 180 (3 mins)
     */
    constructor(uint256 _ticketPriceInWei, uint256 _durationInSeconds) {
        owner = msg.sender;
        ticketPrice = _ticketPriceInWei;
        duration = _durationInSeconds;
        
        lotteryEndTime = block.timestamp + duration;
        lotteryOpen = true;
    }

    /**
     * @notice Enter the lottery by buying a ticket.
     */
    function buyTicket() external payable onlyWhileOpen {
        require(msg.value == ticketPrice, "Incorrect ETH amount sent");
        
        players.push(payable(msg.sender));
        emit TicketPurchased(msg.sender, msg.value);
    }

    /**
     * @notice Selects the winner, calculates payouts (90% winner, 10% owner), and resets timer.
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
        uint256 houseFee = (totalPool * HOUSE_FEE_PERCENT) / 100; // 10% to developer
        uint256 prizeAmount = totalPool - houseFee;               // 90% to winner

        // 3. Reset state for the next round BEFORE making transfers (Security best practice)
        players = new address payable[](0);
        lotteryEndTime = block.timestamp + duration;

        // 4. Send 10% fee directly to your owner wallet
        (bool successOwner, ) = payable(owner).call{value: houseFee}("");
        require(successOwner, "Failed to send fee to owner");

        // 5. Send 90% jackpot to the winner
        (bool successWinner, ) = winner.call{value: prizeAmount}("");
        require(successWinner, "Failed to send prize to winner");

        emit WinnerPicked(winner, prizeAmount, houseFee);
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