// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IVRFCoordinatorV2Plus, VRFV2PlusClient} from "../chainlink/ChainlinkInterfaces.sol";

interface IVRFV2PlusConsumer {
    function rawFulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) external;
}

contract MockVRFCoordinatorV2Plus is IVRFCoordinatorV2Plus {
    uint256 public nextRequestId = 1;
    mapping(uint256 => address) public consumers;

    function requestRandomWords(
        VRFV2PlusClient.RandomWordsRequest calldata
    ) external returns (uint256 requestId) {
        requestId = nextRequestId++;
        consumers[requestId] = msg.sender;
    }

    function fulfillRequest(uint256 requestId, uint256 randomWord) external {
        uint256[] memory words = new uint256[](1);
        words[0] = randomWord;
        IVRFV2PlusConsumer(consumers[requestId]).rawFulfillRandomWords(requestId, words);
    }
}
