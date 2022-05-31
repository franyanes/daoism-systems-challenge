const hre = require("hardhat");

async function main() {
  const CustomNFT = await hre.ethers.getContractFactory("CustomNFT");
  const Ballot = await hre.ethers.getContractFactory("Ballot");

  const customNFT = await CustomNFT.deploy();
  await customNFT.deployed();

  const ballot = await Ballot.deploy(customNFT.address);
  await ballot.deployed();

  console.log("CustomNFT deployed to: ", customNFT.address);
  console.log("Ballot deployed to: ", ballot.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
