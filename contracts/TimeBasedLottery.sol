// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {
    AutomationCompatibleInterface,
    IVRFCoordinatorV2Plus,
    VRFConsumerBaseV2Plus,
    VRFV2PlusClient
} from "./chainlink/ChainlinkInterfaces.sol";

/// @title TimeBasedLottery
/// @notice A time-based ETH lottery using Chainlink-compatible VRF v2.5,
/// Automation, compressed ticket batches, and pull-based payouts.
contract TimeBasedLottery is VRFConsumerBaseV2Plus, AutomationCompatibleInterface {
    enum LotteryState {
        OPEN,
        CALCULATING
    }

    struct TicketBatch {
        address payable buyer;
        uint256 cumulativeTickets;
    }

    struct RoundResult {
        address winner;
        uint256 winningTicket;
        uint256 randomWord;
        uint256 totalTickets;
        uint256 grossPot;
        uint256 prizeAmount;
        uint256 houseFee;
        address referrer;
        uint256 referrerReward;
        uint256 rolledOverAmount;
        uint256 completedAt;
        uint256 requestId;
    }

    error InvalidConfiguration();
    error InvalidTicketCount();
    error IncorrectPayment(uint256 expected, uint256 received);
    error RoundExpired();
    error RoundNotReady();
    error DrawInProgress();
    error RequestNotTimedOut();
    error StaleRandomnessRequest();
    error NoWinnings();
    error WithdrawalFailed();
    error ReentrantCall();
    error TicketOutOfRange();

    uint256 public constant HOUSE_FEE_PERCENT = 10;
    uint256 public constant REFERRER_FEE_PERCENT = 20;
    uint256 public constant WINNER_FEE_PERCENT = 70;
    uint256 public constant MAX_TICKETS_PER_PURCHASE = 100;
    uint16 public constant REQUEST_CONFIRMATIONS = 3;
    uint32 public constant NUM_WORDS = 1;

    address payable public immutable owner;
    uint256 public immutable ticketPrice;
    uint256 public immutable duration;
    IVRFCoordinatorV2Plus public immutable vrfCoordinator;
    uint256 public immutable subscriptionId;
    bytes32 public immutable keyHash;
    uint32 public immutable callbackGasLimit;
    uint256 public immutable vrfTimeout;

    LotteryState public lotteryState;
    uint256 public roundId = 1;
    uint256 public lastCompletedRound;
    uint256 public roundStartTime;
    uint256 public lotteryEndTime;
    uint256 public totalTickets;
    uint256 public rolloverBalance;
    uint256 public activeRequestId;
    uint256 public requestStartedAt;
    address public recentWinner;
    uint256 public recentWinningTicket;
    uint256 public totalClaimable;

    mapping(uint256 => TicketBatch[]) private s_roundBatches;
    mapping(uint256 => mapping(address => uint256)) public ticketsByRound;
    mapping(uint256 => RoundResult) public roundResults;
    mapping(address => address) public referrers;
    mapping(address => uint256) public claimableWinnings;

    bool private s_withdrawing;

    event TicketPurchased(
        uint256 indexed roundId,
        address indexed player,
        uint256 count,
        uint256 firstTicket,
        uint256 amount,
        address indexed referrer
    );
    event RandomnessRequested(uint256 indexed roundId, uint256 indexed requestId, bool retry);
    event WinnerPicked(
        uint256 indexed roundId,
        address indexed winner,
        uint256 winningTicket,
        uint256 randomWord,
        uint256 indexed requestId
    );
    event PayoutAllocated(
        uint256 indexed roundId,
        uint256 grossPot,
        uint256 prizeAmount,
        uint256 houseFee,
        address indexed referrer,
        uint256 referrerReward,
        uint256 rolledOverAmount
    );
    event WinningsWithdrawn(address indexed account, address indexed recipient, uint256 amount);

    constructor(
        uint256 ticketPriceInWei,
        uint256 durationInSeconds,
        address payable house,
        address coordinator,
        uint256 vrfSubscriptionId,
        bytes32 vrfKeyHash,
        uint32 vrfCallbackGasLimit,
        uint256 randomnessTimeout
    ) VRFConsumerBaseV2Plus(coordinator) {
        if (
            ticketPriceInWei == 0 || durationInSeconds == 0 || house == address(0) || coordinator == address(0)
                || vrfCallbackGasLimit == 0 || randomnessTimeout == 0
        ) revert InvalidConfiguration();

        owner = house;
        ticketPrice = ticketPriceInWei;
        duration = durationInSeconds;
        vrfCoordinator = IVRFCoordinatorV2Plus(coordinator);
        subscriptionId = vrfSubscriptionId;
        keyHash = vrfKeyHash;
        callbackGasLimit = vrfCallbackGasLimit;
        vrfTimeout = randomnessTimeout;
        lotteryState = LotteryState.OPEN;
    }

    function buyTicketsWithReferrer(uint256 count, address referrer) public payable {
        if (lotteryState != LotteryState.OPEN) revert DrawInProgress();
        if (count == 0 || count > MAX_TICKETS_PER_PURCHASE) revert InvalidTicketCount();
        if (lotteryEndTime != 0 && block.timestamp >= lotteryEndTime) revert RoundExpired();

        uint256 expected = ticketPrice * count;
        if (msg.value != expected) revert IncorrectPayment(expected, msg.value);

        if (totalTickets == 0) {
            roundStartTime = block.timestamp;
            lotteryEndTime = block.timestamp + duration;
        }

        if (referrer != address(0) && referrer != msg.sender && referrers[msg.sender] == address(0)) {
            referrers[msg.sender] = referrer;
        }

        uint256 firstTicket = totalTickets;
        totalTickets += count;
        ticketsByRound[roundId][msg.sender] += count;
        s_roundBatches[roundId].push(TicketBatch(payable(msg.sender), totalTickets));

        emit TicketPurchased(roundId, msg.sender, count, firstTicket, msg.value, referrers[msg.sender]);
    }

    function buyTickets(uint256 count) external payable {
        buyTicketsWithReferrer(count, address(0));
    }

    function buyTicketWithReferrer(address referrer) external payable {
        buyTicketsWithReferrer(1, referrer);
    }

    function buyTicket() external payable {
        buyTicketsWithReferrer(1, address(0));
    }

    function requestDraw() public returns (uint256 requestId) {
        if (lotteryState != LotteryState.OPEN) revert DrawInProgress();
        if (totalTickets == 0 || lotteryEndTime == 0 || block.timestamp < lotteryEndTime) revert RoundNotReady();
        return _requestRandomness(false);
    }

    function retryRandomness() external returns (uint256 requestId) {
        if (lotteryState != LotteryState.CALCULATING) revert RoundNotReady();
        if (block.timestamp < requestStartedAt + vrfTimeout) revert RequestNotTimedOut();
        return _requestRandomness(true);
    }

    function _requestRandomness(bool retry) internal returns (uint256 requestId) {
        lotteryState = LotteryState.CALCULATING;
        requestStartedAt = block.timestamp;

        requestId = vrfCoordinator.requestRandomWords(
            VRFV2PlusClient.RandomWordsRequest({
                keyHash: keyHash,
                subId: subscriptionId,
                requestConfirmations: REQUEST_CONFIRMATIONS,
                callbackGasLimit: callbackGasLimit,
                numWords: NUM_WORDS,
                extraArgs: VRFV2PlusClient._argsToBytes(VRFV2PlusClient.ExtraArgsV1({nativePayment: false}))
            })
        );
        activeRequestId = requestId;
        emit RandomnessRequested(roundId, requestId, retry);
    }

    function fulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) internal override {
        if (
            lotteryState != LotteryState.CALCULATING || requestId != activeRequestId || randomWords.length == 0
        ) revert StaleRandomnessRequest();

        _settleRound(requestId, randomWords[0]);
    }

    function _settleRound(uint256 requestId, uint256 randomWord) internal {
        uint256 completedRound = roundId;
        RoundResult storage result = roundResults[completedRound];

        result.winningTicket = randomWord % totalTickets;
        result.winner = getTicketOwner(completedRound, result.winningTicket);
        result.randomWord = randomWord;
        result.totalTickets = totalTickets;
        result.grossPot = address(this).balance - totalClaimable;
        result.prizeAmount = (result.grossPot * WINNER_FEE_PERCENT) / 100;
        result.houseFee = (result.grossPot * HOUSE_FEE_PERCENT) / 100;
        result.referrer = referrers[result.winner];
        result.completedAt = block.timestamp;
        result.requestId = requestId;

        if (result.referrer != address(0)) {
            result.referrerReward = (result.grossPot * REFERRER_FEE_PERCENT) / 100;
            claimableWinnings[result.referrer] += result.referrerReward;
        }

        uint256 distributed = result.prizeAmount + result.houseFee + result.referrerReward;
        result.rolledOverAmount = result.grossPot - distributed;

        claimableWinnings[result.winner] += result.prizeAmount;
        claimableWinnings[owner] += result.houseFee;
        totalClaimable += distributed;
        rolloverBalance = result.rolledOverAmount;

        recentWinner = result.winner;
        recentWinningTicket = result.winningTicket;
        lastCompletedRound = completedRound;

        _emitRoundCompleted(completedRound);
        _openNextRound(completedRound);
    }

    function _emitRoundCompleted(uint256 completedRound) internal {
        RoundResult storage result = roundResults[completedRound];
        emit WinnerPicked(
            completedRound, result.winner, result.winningTicket, result.randomWord, result.requestId
        );
        emit PayoutAllocated(
            completedRound,
            result.grossPot,
            result.prizeAmount,
            result.houseFee,
            result.referrer,
            result.referrerReward,
            result.rolledOverAmount
        );
    }

    function _openNextRound(uint256 completedRound) internal {
        roundId = completedRound + 1;
        roundStartTime = 0;
        lotteryEndTime = 0;
        totalTickets = 0;
        activeRequestId = 0;
        requestStartedAt = 0;
        lotteryState = LotteryState.OPEN;
    }

    function withdrawWinnings(address payable recipient) external {
        if (s_withdrawing) revert ReentrantCall();
        uint256 amount = claimableWinnings[msg.sender];
        if (amount == 0) revert NoWinnings();
        if (recipient == address(0)) revert InvalidConfiguration();

        s_withdrawing = true;
        claimableWinnings[msg.sender] = 0;
        totalClaimable -= amount;
        (bool success,) = recipient.call{value: amount}("");
        s_withdrawing = false;
        if (!success) revert WithdrawalFailed();

        emit WinningsWithdrawn(msg.sender, recipient, amount);
    }

    function getTicketOwner(uint256 targetRoundId, uint256 ticketIndex) public view returns (address) {
        TicketBatch[] storage batches = s_roundBatches[targetRoundId];
        if (batches.length == 0 || ticketIndex >= batches[batches.length - 1].cumulativeTickets) {
            revert TicketOutOfRange();
        }

        uint256 low;
        uint256 high = batches.length;
        while (low < high) {
            uint256 mid = (low + high) / 2;
            if (ticketIndex < batches[mid].cumulativeTickets) high = mid;
            else low = mid + 1;
        }
        return batches[low].buyer;
    }

    function getRoundBatches(uint256 targetRoundId) external view returns (TicketBatch[] memory) {
        return s_roundBatches[targetRoundId];
    }

    function currentPot() public view returns (uint256) {
        return address(this).balance - totalClaimable;
    }

    function lotteryOpen() external view returns (bool) {
        return lotteryState == LotteryState.OPEN;
    }

    function getTimeRemaining() external view returns (uint256) {
        if (lotteryEndTime == 0 || block.timestamp >= lotteryEndTime) return 0;
        return lotteryEndTime - block.timestamp;
    }

    function checkUpkeep(bytes calldata)
        external
        view
        override
        returns (bool upkeepNeeded, bytes memory performData)
    {
        upkeepNeeded = lotteryState == LotteryState.OPEN && totalTickets > 0 && lotteryEndTime != 0
            && block.timestamp >= lotteryEndTime;
        performData = bytes("");
    }

    function performUpkeep(bytes calldata) external override {
        requestDraw();
    }
}
