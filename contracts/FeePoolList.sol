// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.7.0 <0.9.0;

import "./libraries/FeePool.sol";
import "./libraries/Customer.sol";


/// @title FeePoolList
/// @notice Stores and manages the list of fee pools for the given token in concrete token pair,
/// every token pair must include two FeePoolLists for each token respectively
/// handles buys and withdrawals
contract FeePoolList {
    using FeePool for FeePool.Info;

    // mapping that stores all initiated fee pools, where key is fee amount and value is Pool.Info struct
    mapping(uint24 => FeePool.Info) public pools;
    // token => user => money
    mapping(address => mapping(address => uint256)) pendingWithdrawals;
    // stores lowest fee from the list of fee pools for current token
    uint24 public lowestFee;
    // stores highest fee from the list of fee pools for current token
    uint24 public highestFee;
    // total number of pools
    uint24 public numberOfPools;
    // opposite fee pools list
    address oppositeList;

    event AddFeePool(
        uint24 prevId,
        uint24 poolFeeX100000,
        uint24 nextId,
        uint24 protocolFeeX100000
    );

    event DeleteFeePool(
        uint24 prevId,
        uint24 poolFeeX100000,
        uint24 nextId,
        uint24 protocolFeeX100000
    );

    /// @dev adds given fee pool in the certain place of the list
    /// @param poolData pool info struct
    /// @param prevId id of previous pool
    /// @param nextId id of next pool
    // TODO: only by admin
    function addFeePool(
        FeePool.Info memory poolData,
        uint24 prevId,
        uint24 nextId
    ) public {
        require(
            pools[poolData.poolFeeX100000].token == address(0),
            "Pool is already on the list"
        );
        FeePool.Info storage prev = pools[prevId];
        FeePool.Info storage next = pools[nextId];
        if (prevId == 0 && nextId == 0) {
            // adding first pool
            require(numberOfPools == 0, "First pool is already added");
            lowestFee = poolData.poolFeeX100000;
            highestFee = poolData.poolFeeX100000;
        } else if (prevId > 0 && nextId == 0) {
            // adding pool at the end of the list
            require(
                prevId == highestFee && poolData.poolFeeX100000 > highestFee,
                "Given pool is not the last"
            );
            highestFee = poolData.poolFeeX100000;
        } else if (prevId == 0 && nextId > 0) {
            // adding pool in the begging of the list
            require(
                nextId == lowestFee && poolData.poolFeeX100000 < lowestFee,
                "Given pool is not the first"
            );
            lowestFee = poolData.poolFeeX100000;
        } else {
            // adding in the middle
            require(
                prev.poolFeeX100000 < poolData.poolFeeX100000 &&
                    next.poolFeeX100000 > poolData.poolFeeX100000,
                "Fee must be between prev and next values"
            );
        }
        prev.nextId = poolData.poolFeeX100000;
        next.prevId = poolData.poolFeeX100000;
        poolData.prevId = prev.poolFeeX100000;
        poolData.nextId = next.poolFeeX100000;
        pools[poolData.poolFeeX100000] = poolData;
        numberOfPools++;
        emit AddFeePool(
            prevId,
            poolData.poolFeeX100000,
            nextId,
            poolData.protocolFeeX100000
        );
    }

    // TODO: only by admin
    function deleteFeePool(uint24 poolFeeX100000) external {
        require(
            pools[poolFeeX100000].token != address(0),
            "Pool is not on the list"
        );
        // update lowest and highest fees
        FeePool.Info memory poolData = pools[poolFeeX100000];
        pools[poolData.prevId].nextId = poolData.nextId;
        pools[poolData.nextId].prevId = poolData.prevId;
        if (poolFeeX100000 == lowestFee) {
            lowestFee = poolData.nextId;
        }
        if (poolFeeX100000 == highestFee) {
            highestFee = poolData.prevId;
        }
        numberOfPools--;
        // TODO: add logic for withdrawing tokens
        emit DeleteFeePool(
            poolData.prevId,
            poolFeeX100000,
            poolData.nextId,
            poolData.protocolFeeX100000
        );
        delete pools[poolFeeX100000];
    }

    function buy(uint256 amount, uint256 rateX100000)
        public
        returns (
            uint256 amountBought,
            uint256 convertedAmount,
            uint256 totalProtocolFees
        )
    {
        // if user tries to buy from empty feePool delete and go next
        if (pools[lowestFee].liquidity == 0) {
            buy(amount, rateX100000);
        }
        return pools[lowestFee].buy(amount, rateX100000, pendingWithdrawals);
    }

    function get(uint24 fee) external view returns (FeePool.Info memory) {
        return pools[fee];
    }

    function addLiquidity(uint24 fee, Customer.Info memory data) external {
        pools[fee].addLiquidity(data);
    }

    function removeLiquidity(uint24 fee) external {
        pools[fee].removeLiquidity();
    }

    function updateProtocolFee(uint24 poolFeeX100000, uint24 protocolFeeX100000)
        external
    {
        pools[poolFeeX100000].protocolFeeX100000 = protocolFeeX100000;
    }

    //???? addLiquidity ??
    // function enqueue(FeePool.Info memory poolData) public returns (uint24) {
    //     //
    //     if (lowestFee == 0) {
    //         lowestFee = poolData.poolFeeX100000;
    //         highestFee = poolData.poolFeeX100000;
    //     } else {
    //         pools[highestFee].nextId = poolData.poolFeeX100000;
    //         poolData.prevId = highestFee;
    //         highestFee = poolData.poolFeeX100000;
    //     }
    //     numberOfPools++;
    //     pools[poolData.poolFeeX100000] = poolData;
    //     return highestFee;
    // }

    // function dequeue()
    //     external
    //     returns (FeePool.Info memory data, uint24 nextAddress)
    // {
    //     require(pools[lowestFee].factory != address(0)); // non-empty queue
    //     data = pools[lowestFee];
    //     delete pools[lowestFee];
    //     lowestFee = data.nextId;
    //     numberOfPools--;
    //     return (data, lowestFee);
    // }

    // function deleteFirst() internal {
    //     require(pools[lowestFee].factory != address(0));
    //     uint24 newFirstAddress = pools[lowestFee].nextId;
    //     delete pools[lowestFee];
    //     lowestFee = newFirstAddress;
    //     delete pools[lowestFee].prevId;
    //     numberOfPools--;
    // }

    // function getBestFeeLiquidity() external view returns (uint256 amount) {
    //     return pools[lowestFee].liquidity;
    // }

    // function getFirst() public view returns (FeePool.Info memory data) {
    //     require(pools[lowestFee].factory != address(0), "EMPTY QUEUE");
    //     return (pools[lowestFee]);
    // }
}
