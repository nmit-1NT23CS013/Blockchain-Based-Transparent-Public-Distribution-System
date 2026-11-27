const hre = require("hardhat");

async function main() {
  console.log("====================================================");
  console.log("Starting Smart Contract Deployment Process...");
  console.log("====================================================");

  // Get deployer account info
  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deploying contracts with the account: ${deployer.address}`);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`Account balance: ${hre.ethers.formatEther(balance)} ETH`);
  console.log("----------------------------------------------------");

  // 1. Deploy GrainTransfer Contract
  console.log("Deploying GrainTransfer...");
  const GrainTransfer = await hre.ethers.deployContract("GrainTransfer");
  await GrainTransfer.waitForDeployment();
  const grainTransferAddress = await GrainTransfer.getAddress();
  console.log(`[SUCCESS] GrainTransfer deployed to: ${grainTransferAddress}`);
  console.log("----------------------------------------------------");

  // 2. Deploy BeneficiaryManagement Contract
  console.log("Deploying BeneficiaryManagement...");
  const BeneficiaryManagement = await hre.ethers.deployContract("BeneficiaryManagement");
  await BeneficiaryManagement.waitForDeployment();
  const beneficiaryManagementAddress = await BeneficiaryManagement.getAddress();
  console.log(`[SUCCESS] BeneficiaryManagement deployed to: ${beneficiaryManagementAddress}`);
  console.log("----------------------------------------------------");

  // 3. Deploy ReceiptManager Contract
  console.log("Deploying ReceiptManager...");
  const ReceiptManager = await hre.ethers.deployContract("ReceiptManager");
  await ReceiptManager.waitForDeployment();
  const receiptManagerAddress = await ReceiptManager.getAddress();
  console.log(`[SUCCESS] ReceiptManager deployed to: ${receiptManagerAddress}`);
  
  console.log("====================================================");
  console.log("All Smart Contracts Deployed Successfully!");
  console.log("====================================================");
  console.log(`GrainTransfer address:       ${grainTransferAddress}`);
  console.log(`BeneficiaryManagement address: ${beneficiaryManagementAddress}`);
  console.log(`ReceiptManager address:        ${receiptManagerAddress}`);
  console.log("====================================================");
}

main().catch((error) => {
  console.error("Deployment failed with error:", error);
  process.exitCode = 1;
});
