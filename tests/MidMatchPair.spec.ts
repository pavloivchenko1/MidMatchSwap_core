import { BigNumber } from '@ethersproject/bignumber';
import { deployContract } from 'ethereum-waffle';
import { ethers, waffle } from 'hardhat';

import { MidMatchPair } from '../typechain/MidMatchPair';
import { TestERC20 } from '../typechain/TestERC20';
import { FEES, INITIAL_TOKEN_BALANCE, UNISWAP_PAIR} from './shared/constants';
import { expect } from './shared/expect';

const { constants } = ethers

const createFixtureLoader = waffle.createFixtureLoader;


describe('MidMatchPair', () => {
    const [owner, maker0, taker0] = waffle.provider.getWallets()

    let token0: TestERC20;
    let token1: TestERC20;

    let sp: MidMatchPair;
    const fixture = async () => {
        const feePoolFactory = await ethers.getContractFactory("FeePool");
        const feePool = await feePoolFactory.deploy();
        await feePool.deployed();
        const spFactory = await ethers.getContractFactory('MidMatchPair',
            {
                libraries: {
                    FeePool: feePool.address
                }
            }
        )
        return (await spFactory.deploy()) as MidMatchPair
    }

    const token0Fixture = async() => {
        const token0Factory = await ethers.getContractFactory("TestERC20");
        return (await token0Factory.deploy(INITIAL_TOKEN_BALANCE)) as TestERC20;
    }

    const token1Fixture = async() => {
        const token1Factory = await ethers.getContractFactory("TestERC20");
        return (await token1Factory.deploy(INITIAL_TOKEN_BALANCE)) as TestERC20;
    }
  
    let loadFixture: ReturnType<typeof createFixtureLoader>

    before('create fixture loader', async () => {
      loadFixture = createFixtureLoader([owner, maker0, taker0]);
    });
  
    beforeEach('deploy factory', async () => {
      sp = await loadFixture(fixture)
    })

    before('initialize tokens', async () => {
        token0 = await loadFixture(token0Fixture);
        token1 = await loadFixture(token1Fixture);
    });

    describe('#initialize', () => {

        it('cannot be initialized by addresses that are not owner', async () => {
            await expect(sp.connect(maker0).intialize(token0.address, token1.address, UNISWAP_PAIR)).to.be.reverted;
        })

        it('tokens cannot be the same', async () => {
            await expect(sp.intialize(token0.address, token0.address, UNISWAP_PAIR)).to.be.reverted;
        })

        it('cannot reinitialize token pair', async () => {
            await sp.intialize(token0.address, token1.address, UNISWAP_PAIR);
            await expect(sp.intialize(token0.address, token1.address, UNISWAP_PAIR)).to.be.reverted;
        })

    });

    describe('#addFeePool', () => {

        before('initilize contract', async () => {
            await sp.intialize(token0.address, token1.address, UNISWAP_PAIR);
        });

        describe('fail cases', () => {
            it('cannot be initialized by addresses that are not owner', async () => {
                await expect(sp.connect(maker0).initializeFeePool(token0.address, FEES.ten, FEES.one)).to.be.reverted;
            });
    
            it('token cannot be out of pair', async () => {
                await expect(sp.connect(maker0).initializeFeePool(constants.AddressZero, FEES.ten, FEES.one)).to.be.reverted;
            });

            it('fails if fee pool is already on the list', () => {
                // TODO
            });
        });

        describe('success cases', () => {
            it('successfully adds fee pool', () => {
                // TODO
            });

            it('successfully adds fee pool in the beggining', () => {
                // TODO
            });

            it('successfully adds fee pool in the middle of the list', () => {
                // TODO
            });

            it('successfully adds fee pool at the end of the list', () => {
                // TODO
            });
        });

    });

    describe('#addLiquidity', () => {

        before('approve transfer', async () => {
            await token0.approve(sp.address, constants.MaxUint256);
        });

        before('initilize contract', async () => {
            await sp.intialize(token0.address, token1.address, UNISWAP_PAIR);
        });

        before('initilize fee pool', async () => {
            await sp.initializeFeePool(token0.address, FEES.ten, FEES.one);
        });

        // it('require pool to be initialized', () => {});

        before('add liquidity to token0', async () => {
            await sp.addLiquidity(token0.address, BigNumber.from(10000), FEES.ten);
        });

        // it('check balance after addLiquidity', async () => {
        //     expect((await token0.balanceOf(owner.address)).toNumber()).to.eq(INITIAL_TOKEN_BALANCE.toNumber() - 10000);
        // });

        // it('succeeds if addLiquidity is not reverted', async () => {
        //     await expect(sp.addLiquidity(token0.address, BigNumber.from(10000), FEES.ten)).to.be.not.reverted;
        // });

        it('token0 total liquidity must be higher after addLiquidity', async () => {
            expect((await sp.token0TotalLiquidity()).toNumber()).to.eq(10000);
        });

    });

    describe('#removeFeePool', () => {

    });

});