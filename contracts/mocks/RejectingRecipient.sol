// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface ILotteryClaims {
    function buyTicket() external payable;
    function withdrawWinnings(address payable recipient) external;
}

contract RejectingRecipient {
    function enter(address lottery) external payable {
        ILotteryClaims(lottery).buyTicket{value: msg.value}();
    }

    function claimTo(address lottery, address payable recipient) external {
        ILotteryClaims(lottery).withdrawWinnings(recipient);
    }

    receive() external payable {
        revert("reject ETH");
    }
}
