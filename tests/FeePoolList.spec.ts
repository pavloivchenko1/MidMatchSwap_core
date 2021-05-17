import { BigNumber, BigNumberish } from '@ethersproject/bignumber';
import { ethers, waffle } from 'hardhat';

import { FeePoolList } from '../typechain/FeePoolList';
import { FEES, INITIAL_TOKEN_BALANCE, UNISWAP_PAIR, ZERO } from './shared/constants';
import { expect } from './shared/expect';

const { constants } = ethers

const createFixtureLoader = waffle.createFixtureLoader;

const poolDataMock = {
    queue: UNISWAP_PAIR,
    factory: UNISWAP_PAIR,
    token: UNISWAP_PAIR,
    liquidity: ZERO,
    prevId: ZERO,
    nextId: ZERO,
    poolFeeX100000: FEES.ten,
    protocolFeeX100000: FEES.one,
    numberOfPeopleInQueue: ZERO
}


describe('MidMatchPair', () => {
    const [owner, maker0, taker0] = waffle.provider.getWallets()

    let feePoolList: FeePoolList;
    let feePoolAddress: string;

    const fixture = async () => {
        const feePoolListFactory = await ethers.getContractFactory('FeePoolList',
            {
                libraries: {
                    FeePool: feePoolAddress
                }
            });
        return (await feePoolListFactory.deploy()) as FeePoolList;
    }

    async function deployFeePoolLib() {
        const feePoolFactory = await ethers.getContractFactory("FeePool");
        const feePool = await feePoolFactory.deploy();
        await feePool.deployed();
        return feePool.address;
    }

    let loadFixture: ReturnType<typeof createFixtureLoader>

    before('create fixture loader', async () => {
        loadFixture = createFixtureLoader([owner, maker0, taker0]);
    });

    beforeEach('deploy factory', async () => {
        feePoolAddress = await deployFeePoolLib();
        feePoolList = await loadFixture(fixture);
    })

    function addFirstPool() {
        return feePoolList.addFeePool(poolDataMock, ZERO, ZERO);
    }

    // TODO: CHECK TEST CASES
    async function checkPoolsOrder(feesInCorrectOrder: BigNumber[]): Promise<boolean> {
        const pools = {};
        const order = [];
        for (let i = 0; i < feesInCorrectOrder.length; i++) {
            const fee = feesInCorrectOrder[i];
            pools[fee.toNumber()] = await feePoolList.pools(fee);
            order.push(fee.toNumber());
        }
        for (let i = 0; i < order.length; i++) {
            const fee = order[i];
            const feePool = pools[fee];
            if (i === 0) {
                if (feePool.prevId > 0) {
                    return false;
                }
                const nextPool = pools[order[i + 1]];
                if (nextPool.prevId !== feePool.poolFeeX100000) {
                    return false;
                }
                continue;
            }
            if (i === (order.length - 1)) {
                if (feePool.nextId > 0) {
                    return false;
                }
                const prevPool = pools[order[i - 1]];
                if (prevPool.nextId !== feePool.poolFeeX100000) {
                    return false;
                }
                continue;
            }
            const prevPool = pools[order[i - 1]];
            const nextPool = pools[order[i + 1]];
            if (prevPool.nextId !== feePool.poolFeeX100000 || nextPool.prevId !== feePool.poolFeeX100000) {
                return false;
            }
        }
        return true;
    }

    async function addMockFeePools() {
        await addFirstPool();
        const mock2 = { ...poolDataMock }
        mock2.poolFeeX100000 = FEES.twenty;
        await feePoolList.addFeePool(mock2, poolDataMock.poolFeeX100000, BigNumber.from(0));
        const mock3 = { ...poolDataMock }
        mock3.poolFeeX100000 = FEES.twentyFive;
        await feePoolList.addFeePool(mock3, mock2.poolFeeX100000, BigNumber.from(0));
    }

    describe('#addFeePool', () => {

        describe('fail cases', () => {

            it('tries to add first pool twice', async () => {
                await addFirstPool();
                const mock2 = { ...poolDataMock }
                mock2.poolFeeX100000 = FEES.fifteen;
                await expect(feePoolList.addFeePool(mock2, ZERO, ZERO)).to.be.revertedWith('First pool is already added');
            });

            it('fails if pool with given fee is already on the list', async () => {
                await addFirstPool();
                const mock2 = { ...poolDataMock }
                mock2.poolFeeX100000 = FEES.fifteen;
                // add second pool in the end with fee == 15
                await feePoolList.addFeePool(mock2, poolDataMock.poolFeeX100000, ZERO);
                // add second pool in the end with fee == 15
                await expect(feePoolList.addFeePool(mock2, poolDataMock.poolFeeX100000, FEES.fifteen)).to.be.revertedWith('Pool is already on the list');
            });

            it('tries to add fee pool in the beggining but fails', async () => {
                // add first pool with fee == 10
                await addFirstPool();
                const mock2 = { ...poolDataMock }
                mock2.poolFeeX100000 = FEES.fifteen;
                // add second pool in the beggining with fee == 15
                await expect(feePoolList.addFeePool(mock2, BigNumber.from(0), poolDataMock.poolFeeX100000)).to.be.revertedWith('Given pool is not the first');
            });

            it('tries to add fee pool in the end but fails', async () => {
                // add first pool with fee == 10
                await addFirstPool();
                const mock2 = { ...poolDataMock }
                mock2.poolFeeX100000 = FEES.five;
                // add second pool in the end with fee == 5
                await expect(feePoolList.addFeePool(mock2, poolDataMock.poolFeeX100000, BigNumber.from(0))).to.be.revertedWith('Given pool is not the last');
            });

            it('fails if prev value is wrong', async () => {
                await addFirstPool();
                const mock2 = { ...poolDataMock }
                mock2.poolFeeX100000 = FEES.twenty;
                // add second pool with fee == 20
                await feePoolList.addFeePool(mock2, poolDataMock.poolFeeX100000, BigNumber.from(0));
                const mock3 = { ...poolDataMock }
                mock3.poolFeeX100000 = FEES.twentyFive;
                await expect(feePoolList.addFeePool(mock3, FEES.one, FEES.twentyFive)).to.be.revertedWith('Fee must be between prev and next values');
            });

            it('fails if next value is wrong', async () => {
                await addFirstPool();
                const mock2 = { ...poolDataMock }
                mock2.poolFeeX100000 = FEES.twenty;
                // add second pool with fee == 20
                await feePoolList.addFeePool(mock2, poolDataMock.poolFeeX100000, BigNumber.from(0));
                const mock3 = { ...poolDataMock }
                mock3.poolFeeX100000 = FEES.fifteen;
                await expect(feePoolList.addFeePool(mock3, poolDataMock.poolFeeX100000, FEES.twentyFive)).to.be.revertedWith('Fee must be between prev and next values');
            });

        });

        describe('success cases', () => {

            it('adds fee pool with 0 nextId and 0 prevId', async () => {
                await expect(addFirstPool()).to.be.not.reverted;
            });

            it('adds fee pool in the beggining of the list', async () => {
                // add first pool with fee == 10
                await expect(addFirstPool()).to.be.not.reverted;
                const mock2 = { ...poolDataMock }
                mock2.poolFeeX100000 = FEES.five;
                // add second pool in the beggining with fee == 5
                await expect(feePoolList.addFeePool(mock2, BigNumber.from(0), poolDataMock.poolFeeX100000)).to.be.not.reverted;
                expect(await checkPoolsOrder([FEES.five, FEES.ten])).to.eq(true);
            });

            it('adds fee pool in the end of the list', async () => {
                // add first pool with fee == 10
                await expect(addFirstPool()).to.be.not.reverted;
                const mock2 = { ...poolDataMock }
                mock2.poolFeeX100000 = FEES.fifteen;
                // add second pool in the end with fee == 15
                await expect(feePoolList.addFeePool(mock2, poolDataMock.poolFeeX100000, BigNumber.from(0))).to.be.not.reverted;
                expect(await checkPoolsOrder([FEES.ten, FEES.fifteen])).to.eq(true);
            });

            it('adds fee pool in the middle of the list', async () => {
                // add first pool with fee == 10
                await expect(addFirstPool()).to.be.not.reverted;
                const mock2 = { ...poolDataMock }
                mock2.poolFeeX100000 = FEES.twentyFive;
                // add second pool in the end with fee == 25
                await expect(feePoolList.addFeePool(mock2, poolDataMock.poolFeeX100000, BigNumber.from(0))).to.be.not.reverted;
                const mock3 = { ...poolDataMock }
                mock3.poolFeeX100000 = FEES.twenty;
                // add third pool in the middle with fee == 20
                await expect(feePoolList.addFeePool(mock3, poolDataMock.poolFeeX100000, mock2.poolFeeX100000)).to.be.not.reverted;
                expect(await checkPoolsOrder([FEES.ten, FEES.twenty, FEES.twentyFive])).to.eq(true);
            });

            it('succeeds if lowest fee is updated correctly', async () => {
                await addFirstPool();
                expect(await feePoolList.lowestFee()).to.eq(10);
                const mock2 = { ...poolDataMock }
                mock2.poolFeeX100000 = FEES.five;
                await feePoolList.addFeePool(mock2, BigNumber.from(0), poolDataMock.poolFeeX100000);
                expect(await feePoolList.lowestFee()).to.eq(5);
                const mock3 = { ...poolDataMock }
                mock3.poolFeeX100000 = FEES.one;
                await feePoolList.addFeePool(mock3, BigNumber.from(0), mock2.poolFeeX100000);
                expect(await feePoolList.lowestFee()).to.eq(1);
            });

            it('succeeds if highest fee is updated correctly', async () => {
                await addFirstPool();
                expect(await feePoolList.highestFee()).to.eq(10);
                const mock2 = { ...poolDataMock }
                mock2.poolFeeX100000 = FEES.twenty;
                await feePoolList.addFeePool(mock2, poolDataMock.poolFeeX100000, BigNumber.from(0));
                expect(await feePoolList.highestFee()).to.eq(20);
                const mock3 = { ...poolDataMock }
                mock3.poolFeeX100000 = FEES.twentyFive;
                await feePoolList.addFeePool(mock3, mock2.poolFeeX100000, BigNumber.from(0));
                expect(await feePoolList.highestFee()).to.eq(25);
            });

            it('succeeds if number of pools is updated correctly', async () => {
                await addFirstPool();
                expect(await feePoolList.numberOfPools()).to.eq(1);
                const mock2 = { ...poolDataMock }
                mock2.poolFeeX100000 = FEES.twentyFive;
                await feePoolList.addFeePool(mock2, poolDataMock.poolFeeX100000, BigNumber.from(0));
                expect(await feePoolList.numberOfPools()).to.eq(2);
                const mock3 = { ...poolDataMock }
                mock3.poolFeeX100000 = FEES.twenty;
                await feePoolList.addFeePool(mock3, poolDataMock.poolFeeX100000, mock2.poolFeeX100000);
                expect(await feePoolList.numberOfPools()).to.eq(3);
            });

        });

    });

    describe('#deleteFeePool', () => {

        beforeEach('add fee pools', async () => {
            // existing pools: 10, 20, 25
            await addMockFeePools();
        });

        describe('fail cases', () => {

            it('tries to delete pool that don\'t exist', async () => {
                await expect(feePoolList.deleteFeePool(FEES.fifteen)).to.be.revertedWith('Pool is not on the list');
            });

        });

        describe('success cases', () => {

            it('deletes pool from the beggining of list', async () => {
                await expect(feePoolList.deleteFeePool(FEES.ten)).to.be.not.reverted;
                expect((await feePoolList.pools(FEES.ten)).token).to.eq(constants.AddressZero);
                expect(await checkPoolsOrder([FEES.twenty, FEES.twentyFive])).to.eq(true);
            });

            it('deletes pool in the middle of list', async () => {
                await expect(feePoolList.deleteFeePool(FEES.twenty)).to.be.not.reverted;
                expect((await feePoolList.pools(FEES.twenty)).token).to.eq(constants.AddressZero);
                expect(await checkPoolsOrder([FEES.ten, FEES.twentyFive])).to.eq(true);
            });

            it('deletes pool in the end of list', async () => {
                await expect(feePoolList.deleteFeePool(FEES.twentyFive)).to.be.not.reverted;
                expect((await feePoolList.pools(FEES.twentyFive)).token).to.eq(constants.AddressZero);
                expect(await checkPoolsOrder([FEES.ten, FEES.twenty])).to.eq(true);
            });

            it('deletes pool and checks lowest fee', async () => {
                await feePoolList.deleteFeePool(FEES.ten);
                expect(await feePoolList.lowestFee()).to.eq(20);
                await feePoolList.deleteFeePool(FEES.twenty);
                expect(await feePoolList.lowestFee()).to.eq(25);
                await feePoolList.deleteFeePool(FEES.twentyFive);
                expect(await feePoolList.lowestFee()).to.eq(0);
            });

            it('deletes pool and checks highest fee', async () => {
                await feePoolList.deleteFeePool(FEES.twentyFive);
                expect(await feePoolList.highestFee()).to.eq(20);
                await feePoolList.deleteFeePool(FEES.twenty);
                expect(await feePoolList.highestFee()).to.eq(10);
                await feePoolList.deleteFeePool(FEES.ten);
                expect(await feePoolList.highestFee()).to.eq(0);
            });

            it('deletes pool and checks number of pools', async () => {
                await feePoolList.deleteFeePool(FEES.ten);
                expect(await feePoolList.numberOfPools()).to.eq(2);
                await feePoolList.deleteFeePool(FEES.twenty);
                expect(await feePoolList.numberOfPools()).to.eq(1);
                await feePoolList.deleteFeePool(FEES.twentyFive);
                expect(await feePoolList.numberOfPools()).to.eq(0);
            });

        });

    });

    describe('#getFeePool', async () => {

        beforeEach('add fee pools', async () => {
            // existing pools: 10, 20, 25
            await addMockFeePools();
        });

        it('check if fee pool is correct', async () => {
            expect((await feePoolList.get(20)).poolFeeX100000).to.eq(20);
        });

    });

    describe('#updateProtocolFee', async () => {

        beforeEach('add fee pools', async () => {
            // existing pools: 10, 20, 25
            await addMockFeePools();
        });

        it('succeeds if protocolFee is changed', async () => {
            await feePoolList.updateProtocolFee(FEES.ten, FEES.twenty);
            expect((await feePoolList.get(10)).protocolFeeX100000).to.eq(20);
        });

    });

});