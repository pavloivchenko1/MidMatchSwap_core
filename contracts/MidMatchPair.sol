// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.7.0 <0.9.0;

import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";

import "./FeePoolList.sol";
import "./libraries/FeePool.sol";
import "./interfaces/IERC20.sol";

/// @title Token Pair Contract
/// @notice Manages concrete token pair: creates pool lists for each token
contract MidMatchPair {
    using FeePool for FeePool.Info;

    address owner;
    address token0;
    address token1;
    uint24 constant decimalsMultiplier = 100000;
    mapping(address => address) reverseToken;
    // token -> user -> money
    mapping(address => mapping(address => uint256)) pendingWithdrawals;
    IUniswapV2Pair uniswapPool;
    FeePoolList feePoolsToken0Queue;
    FeePoolList feePoolsToken1Queue;

    constructor(address tokenA, address tokenB, address uniswapPoolAddress) {
        require(tokenA != tokenB, "Tokens can't be the same");
        owner = msg.sender;
        token0 = tokenA;
        token1 = tokenB;
        reverseToken[token0] = token1;
        reverseToken[token1] = token0;
        uniswapPool = IUniswapV2Pair(uniswapPoolAddress);
        feePoolsToken0Queue = new FeePoolList();
        feePoolsToken1Queue = new FeePoolList();
    }

    modifier onlyBy(address _account) {
        require(msg.sender == _account, "Sender not authorized.");
        _;
    }

    modifier properPermission(address token, uint256 amountToCheck) {
        uint256 tokenBalance = IERC20(token).balanceOf(msg.sender);
        require(tokenBalance > amountToCheck, "TOO SMALL TOKEN BALANCE");
        uint256 tokenAllowance =
            IERC20(token).allowance(msg.sender, address(this));
        require(tokenAllowance > amountToCheck, "TOO SMALL ALLOWANCE");
        _;
    }

    // ???? provide token as param
    // function getLowestFeePool() public view returns (FeePool.Info memory) {
    //     return feePoolsToken0Queue.getFirst();
    // }

    function addFeePool(
        address token,
        uint24 poolFee,
        uint24 protocolFee,
        uint24 prevFee,
        uint24 nextFee
    ) public onlyBy(owner) {
        require(token == token0 || token == token1, 'Token out of pair');
        FeePool.Info memory f = FeePool.initialize(token, poolFee, protocolFee);
        token == token0
            ? feePoolsToken0Queue.addFeePool(f, prevFee, nextFee)
            : feePoolsToken1Queue.addFeePool(f, prevFee, nextFee);
    }

    function getQueueForFeePool(address token, uint24 fee)
        public
        view
        returns (CustomerQueue queue)
    {
        if (token == token0) {
            return feePoolsToken0Queue.get(fee).queue;
        } else {
            return feePoolsToken1Queue.get(fee).queue;
        }
    }

    function addLiquidity(
        address token,
        uint256 amount,
        uint24 fee
    ) public properPermission(token, amount) returns (uint256) {
        Customer.Info memory currentCustomer;
        currentCustomer.amount = amount;
        currentCustomer.owner = msg.sender;
        // transfering ( Checks done in properPermission)
        IERC20(token).transferFrom(msg.sender, address(this), amount);
        // transfering
        token == token0
            ? feePoolsToken0Queue.addLiquidity(fee, currentCustomer)
            : feePoolsToken1Queue.addLiquidity(fee, currentCustomer);
        return amount;
    }

    function exitQueue(uint24 fee, address token)
        public
        returns (uint256 amountReturned)
    {
        pendingWithdrawals[token][msg.sender] = token == token0
            ? feePoolsToken0Queue.get(fee).removeLiquidity()
            : feePoolsToken1Queue.get(fee).removeLiquidity();
        return pendingWithdrawals[token][msg.sender];
    }

    // Przyklad
    //  (1BNB - 4CAKE)
    // amountToBuy 2000 CAKE
    // tokenToBuy CAKE address
    // amountToSwap 500 BNB
    // tokenToSell BNB address
    function buyTokens(
        uint256 amountToBuy,
        address tokenToBuy,
        uint256 amountToSwap,
        address tokenToSell
    ) public properPermission(tokenToSell, amountToSwap) returns (bool) {
        IERC20(tokenToSell).transferFrom(
            msg.sender,
            address(this),
            amountToSwap
        );
        uint256 amountLeft = amountToBuy;
        // wybierz index najmniejszego fee
        // TODO: aktualizować na bieżąco lowestFeeIndex?

        // feeOrder = [0,0.001,0.002 .....] - ustawione na sztywno posortowane
        do {
            // kup w odpowiednim fee a jeżeli nie wystarczy tego fee to idz dalej (do następnego, wyższgo)
            // TODO: do przegadania: od kogo pobieramy prowizje i w jakim momencie?
            // TODO: od razu sprawdzić czy liquidity jest większe od 0?
            uint256 rate = getRate();
            (
                uint256 amountLeft,
                uint256 convertedAmount,
                uint256 totalProtocolFees
            ) = feePoolsToken0Queue.buy(amountToBuy, rate);
        } while (amountLeft > 0);
        // Send tokens from buyer to our address
        return IERC20(tokenToBuy).transfer(msg.sender, amountToBuy);
    }

    function getRate() public view returns (uint256 rate) {
        (uint256 reserver0, uint256 reserver1, uint256 timestamp) =
            getUniswapReserver();
        rate = (reserver0 * decimalsMultiplier) / reserver1;
    }

    function getUniswapReserver()
        public
        view
        returns (
            uint256 reserve0,
            uint256 reserve1,
            uint256 timestamp
        )
    {
        return uniswapPool.getReserves();
    }

    function getRateForAmount(address token, uint256 amount)
        public
        view
        returns (uint256 rate)
    {
        uint256 currentRate = getRate();
        rate = token == token1
            ? (amount * decimalsMultiplier) / currentRate
            : (amount * currentRate) / decimalsMultiplier;
    }

    function withdraw(address token) public {
        uint256 amount = pendingWithdrawals[token][msg.sender];
        require(amount > 0, "There are no funds to withdraw");
        pendingWithdrawals[token][msg.sender] = 0;
        IERC20(token).transfer(msg.sender, amount);
    }
}
