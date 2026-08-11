// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @notice Minimal Chainlink VRF v2.5 interfaces. The ABI matches the official
/// Chainlink contracts implementation without making local tests depend on a
/// large external package.
library VRFV2PlusClient {
    bytes4 public constant EXTRA_ARGS_V1_TAG = bytes4(keccak256("VRF ExtraArgsV1"));

    struct ExtraArgsV1 {
        bool nativePayment;
    }

    struct RandomWordsRequest {
        bytes32 keyHash;
        uint256 subId;
        uint16 requestConfirmations;
        uint32 callbackGasLimit;
        uint32 numWords;
        bytes extraArgs;
    }

    function _argsToBytes(ExtraArgsV1 memory extraArgs) internal pure returns (bytes memory) {
        return abi.encodeWithSelector(EXTRA_ARGS_V1_TAG, extraArgs);
    }
}

interface IVRFCoordinatorV2Plus {
    function requestRandomWords(
        VRFV2PlusClient.RandomWordsRequest calldata request
    ) external returns (uint256 requestId);
}

abstract contract VRFConsumerBaseV2Plus {
    error OnlyCoordinatorCanFulfill(address sender, address coordinator);

    address private immutable i_vrfCoordinator;

    constructor(address vrfCoordinator) {
        i_vrfCoordinator = vrfCoordinator;
    }

    function fulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) internal virtual;

    function rawFulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) external {
        if (msg.sender != i_vrfCoordinator) {
            revert OnlyCoordinatorCanFulfill(msg.sender, i_vrfCoordinator);
        }
        fulfillRandomWords(requestId, randomWords);
    }
}

interface AutomationCompatibleInterface {
    function checkUpkeep(bytes calldata checkData) external returns (bool upkeepNeeded, bytes memory performData);
    function performUpkeep(bytes calldata performData) external;
}
