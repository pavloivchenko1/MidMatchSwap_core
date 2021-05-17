// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.7.0 <0.9.0;

import './MidMatchPair.sol';

/// @title MidMatchPairFactory
/// @notice Deploys and manages token pairs
contract MidMatchPairFactory {
    address public owner;
    mapping(address => mapping(address => address)) public getPair;

    constructor() {
        owner = msg.sender;
    }

    /// @dev Deploys token pair
    /// @param token0 The first token of the pair
    /// @param token1 The second token of the pair
    function createTokenPair(address token0, address token1, address uniswapPoolAddress) public {
        // TODO: onlyby admin
        require(getPair[token0][token1] == address(0));
        address pairAddress = address(new MidMatchPair(token0, token1, uniswapPoolAddress));
        getPair[token0][token1] = pairAddress;
    }

}