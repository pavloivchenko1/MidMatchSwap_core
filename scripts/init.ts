import { ethers } from "hardhat";
import { MidMatchPair } from "../typechain/MidMatchPair";

async function main() {

  console.log('Deploy FeePool library');
  const FeePool = await ethers.getContractFactory("FeePool");
  const feePool = await FeePool.deploy();
  await feePool.deployed();
  console.log('FeePool deployed!');

  console.log('Deploy Synnetra Pair');
  const MidMatchPair = await ethers.getContractFactory('MidMatchPair',
    {
      libraries: {
        FeePool: feePool.address
      }
    }
  );
  const MidMatchPair = await MidMatchPair.deploy() as MidMatchPair;
  await MidMatchPair.deployed();
  console.log('MidMatchPair deployed!');
  
  MidMatchPair.intialize('0xc778417e063141139fce010982780140aa0cd5ab', '0xad6d458402f60fd3bd25163575031acdce07538d', '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D');
  MidMatchPair.initializeFeePool('0xc778417e063141139fce010982780140aa0cd5ab', 10000, 10000);
  MidMatchPair.addLiquidity(500000, '0xc778417e063141139fce010982780140aa0cd5ab', 10000);
  const token0TotalLiquidity = await MidMatchPair.token0TotalLiquidity();
  console.log(token0TotalLiquidity.toNumber());
  const token1TotalLiquidity = await MidMatchPair.token1TotalLiquidity();
  console.log(token1TotalLiquidity.toNumber());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });