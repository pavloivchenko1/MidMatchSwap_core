// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.7.0 <0.9.0;

library Customer {
   
    struct Info {
        address owner;
        address token;
        uint256 amount;
        address prev;
        address next;
    }
    
}