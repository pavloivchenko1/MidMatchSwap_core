// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.7.0 <0.9.0;

import "../QueueImpl.sol";

library FeePool {
    uint24 constant feeMultiplier = 100000;

    struct Info {
        // implementation of market makers queue
        CustomerQueue queue;
        // pool deployer address
        address factory;
        // pool token e.g. CAKE
        address token;
        // total pool liquidity
        uint256 liquidity;
        // id of pool with next lower fee
        uint24 prevId;
        // id of pool with next higher fee
        uint24 nextId;
        // pool fee multiplied by 100000 (used as pool id)
        // lowest percent value would be 0,001% what equals 1 when multipliying by 100000
        uint24 poolFeeX100000;
        // protocol fee multiplied by 100000
        uint24 protocolFeeX100000;
        // total number of people in current fee pool
        uint24 numberOfPeopleInQueue;
    }

    function initialize(
        address token,
        uint24 poolFee,
        uint24 protocolFee
    ) external returns (Info memory) {
        Info memory f;
        f.factory = address(this);
        f.token = token;
        f.queue = new CustomerQueue();
        f.poolFeeX100000 = poolFee;
        f.protocolFeeX100000 = protocolFee;
        return f;
    }

    function buy(
        FeePool.Info storage self,
        uint256 amount, // 1000 EUR
        // 130000
        uint256 exchangeRateX100000,
        mapping(address => mapping(address => uint256)) storage withrawals
    )
        external
        returns (
            uint256,
            uint256,
            uint256
        )
    {
        require(amount > 0, "Amount must be higher than zero.");
        uint256 totalProtocolFees; // w EUR
        uint256 convertedAmount; // w USD
        // iterate until amount is fullfilled or pool becomes empty
        while (amount != 0 && self.liquidity != 0) {
            (Customer.Info memory maker, address _addr) = self.queue.getFirst();
            uint256 protocolFee; // W EUR
            if (maker.amount > (amount * exchangeRateX100000) / feeMultiplier) {
                // maker.amount w USD
                protocolFee =
                    (amount * self.protocolFeeX100000) /
                    feeMultiplier; // protocolFee w EUR
                // calculate protocol fees
                totalProtocolFees += protocolFee;
                // remove protocol fee from amount
                amount -= protocolFee;
                // move tokens to maker's account
                withrawals[self.token][_addr] += amount;
                // amount przeliczone przez exchange rate bez uwzgłędnienia prowizji
                uint256 amountBeforeFee =
                    (amount * exchangeRateX100000) / feeMultiplier; // 1199,4 USD
                // maker's fee
                uint256 makersFee =
                    (amountBeforeFee * self.poolFeeX100000) / feeMultiplier; // 2,3988 USD
                // amount with fee
                uint256 amountAfterFee = amountBeforeFee - makersFee; // 1197,0012 USD
                // update maker's balance
                self.queue.updateBalance(
                    _addr,
                    maker.amount - (amountAfterFee)
                );
                // remove amount from pool liquidity
                self.liquidity -= amountAfterFee;
                //
                convertedAmount += amountAfterFee;
                // clear amount
                delete amount;
                break;
            }
            uint256 amountInTokenA =
                (maker.amount / exchangeRateX100000) * feeMultiplier; // 500 USD / 130000 * 100000 = 384,6 EUR
            protocolFee =
                (amountInTokenA * self.protocolFeeX100000) /
                feeMultiplier; // 0,19 EUR
            // calculate protocol fees
            totalProtocolFees += protocolFee;
            // remove protocol fee from amount
            amount -= protocolFee; // 1000 EUR - 0,19 EUR = 999,81 EUR
            // remove converted amount
            amount -= amountInTokenA; // 999,81 EUR - 384,6 EUR = 615,2 EUR - taker's amount left to trade
            // pobraliśmy wszystkie tokeny z makera
            withrawals[self.token][_addr] += maker.amount;
            // remove amount from pool liquidity
            self.liquidity -= maker.amount;
            //
            convertedAmount += maker.amount;
            // remove maker from the queue
            self.queue.dequeue();
        }
        return (amount, convertedAmount, totalProtocolFees);
    }

    function addLiquidity(FeePool.Info storage self, Customer.Info memory maker)
        external
    {
        require(maker.amount > 0, "Amount must be higher than zero.");
        self.liquidity += maker.amount;
        self.numberOfPeopleInQueue++;
        // TODO: THIS LINE REVERTS TRANSACTION
        // self.queue.enqueue(maker);
    }

    function removeLiquidity(FeePool.Info memory self)
        external
        returns (uint256)
    {
        self.numberOfPeopleInQueue--;
        Customer.Info memory deletedUser =
            self.queue.deleteFromQueue(msg.sender);
        self.liquidity -= deletedUser.amount;
        return deletedUser.amount;
    }
}
