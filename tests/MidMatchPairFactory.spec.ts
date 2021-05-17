import { BigNumber } from '@ethersproject/bignumber';
import { deployContract } from 'ethereum-waffle';
import { ethers, waffle } from 'hardhat';

import { MidMatchPair } from '../typechain/MidMatchPair';
import { TestERC20 } from '../typechain/TestERC20';
import { FEES, INITIAL_TOKEN_BALANCE, UNISWAP_PAIR} from './shared/constants';
import { expect } from './shared/expect';

describe('MidMatchPairFactory', () => {

    describe('#createTokenPair');

});