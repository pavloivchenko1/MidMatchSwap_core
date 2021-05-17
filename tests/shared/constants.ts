import { BigNumber } from "ethers";

export const TOKEN_A = '0x1000000000000000000000000000000000000000'; 
export const TOKEN_B = '0x2000000000000000000000000000000000000000';
export const UNISWAP_PAIR = '0x3000000000000000000000000000000000000000';
export const TEST_ADDRESSES: [string, string, string] = [
    '0x1000000000000000000000000000000000000000',
    '0x2000000000000000000000000000000000000000',
    '0x3000000000000000000000000000000000000000'
]

export const FEES = {
    one: BigNumber.from(1),
    five: BigNumber.from(5),
    ten: BigNumber.from(10),
    fifteen: BigNumber.from(15),
    twenty: BigNumber.from(20),
    twentyFive: BigNumber.from(25),
};

export const ZERO = BigNumber.from(0);

export const INITIAL_TOKEN_BALANCE = BigNumber.from(1000000000);