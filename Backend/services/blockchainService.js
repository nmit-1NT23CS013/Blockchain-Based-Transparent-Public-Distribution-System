const { ethers } = require("ethers");

// Load contract ABIs from Hardhat artifacts folder
const grainTransferJson = require("../../Blockchain/artifacts/contracts/GrainTransfer.sol/GrainTransfer.json");
const beneficiaryMgmtJson = require("../../Blockchain/artifacts/contracts/BeneficiaryManagement.sol/BeneficiaryManagement.json");
const receiptManagerJson = require("../../Blockchain/artifacts/contracts/ReceiptManager.sol/ReceiptManager.json");

// Establish programmatic provider connection
const getProvider = () => {
  const url = process.env.GANACHE_RPC_URL || "http://127.0.0.1:8545";
  return new ethers.JsonRpcProvider(url);
};

// Create a signer wallet associated with the provider
const getSignerWallet = (privateKey) => {
  const provider = getProvider();
  return new ethers.Wallet(privateKey, provider);
};

/**
 * Transfers grain from Admin central storage to Dealer address on-chain.
 */
const transferGrain = async (dealerAddress, quantity, adminPrivateKey) => {
  const signer = getSignerWallet(adminPrivateKey);
  const contract = new ethers.Contract(
    process.env.GRAIN_TRANSFER_ADDRESS,
    grainTransferJson.abi,
    signer
  );

  const tx = await contract.transferGrain(dealerAddress, quantity);
  const receipt = await tx.wait();
  return {
    transactionHash: tx.hash,
    blockNumber: receipt.blockNumber,
    events: receipt.logs
  };
};

/**
 * Registers a new beneficiary on-chain in BeneficiaryManagement contract.
 */
const registerBeneficiary = async (beneficiaryAddress, entitlement, adminPrivateKey) => {
  const signer = getSignerWallet(adminPrivateKey);
  const contract = new ethers.Contract(
    process.env.BENEFICIARY_MGMT_ADDRESS,
    beneficiaryMgmtJson.abi,
    signer
  );

  const tx = await contract.registerBeneficiary(beneficiaryAddress, entitlement);
  const receipt = await tx.wait();
  return {
    transactionHash: tx.hash,
    blockNumber: receipt.blockNumber
  };
};

/**
 * Updates a beneficiary entitlement amount on-chain.
 */
const updateEntitlement = async (beneficiaryAddress, newEntitlement, adminPrivateKey) => {
  const signer = getSignerWallet(adminPrivateKey);
  const contract = new ethers.Contract(
    process.env.BENEFICIARY_MGMT_ADDRESS,
    beneficiaryMgmtJson.abi,
    signer
  );

  const tx = await contract.updateEntitlement(beneficiaryAddress, newEntitlement);
  const receipt = await tx.wait();
  return {
    transactionHash: tx.hash,
    blockNumber: receipt.blockNumber
  };
};

/**
 * Marks monthly ration collected on-chain.
 * Called by Dealer when distributing ration physically.
 */
const collectRation = async (beneficiaryAddress, quantity, dealerPrivateKey) => {
  const signer = getSignerWallet(dealerPrivateKey);
  const contract = new ethers.Contract(
    process.env.BENEFICIARY_MGMT_ADDRESS,
    beneficiaryMgmtJson.abi,
    signer
  );

  const tx = await contract.collectRation(beneficiaryAddress, quantity);
  const receipt = await tx.wait();
  return {
    transactionHash: tx.hash,
    blockNumber: receipt.blockNumber
  };
};

/**
 * Generates an immutable blockchain receipt for a distribution event.
 */
const generateReceipt = async (beneficiaryId, quantity, transactionReference, dealerPrivateKey) => {
  const signer = getSignerWallet(dealerPrivateKey);
  const contract = new ethers.Contract(
    process.env.RECEIPT_MANAGER_ADDRESS,
    receiptManagerJson.abi,
    signer
  );

  const tx = await contract.generateReceipt(beneficiaryId, quantity, transactionReference);
  const receipt = await tx.wait();

  // Find ReceiptGenerated event and parse it to fetch receiptId
  let receiptId = null;
  for (const log of receipt.logs) {
    try {
      const parsedLog = contract.interface.parseLog({
        topics: [...log.topics],
        data: log.data
      });
      if (parsedLog && parsedLog.name === "ReceiptGenerated") {
        receiptId = parsedLog.args.receiptId.toString();
        break;
      }
    } catch (e) {
      // Log belongs to another contract or can't be parsed
    }
  }

  return {
    transactionHash: tx.hash,
    receiptId: receiptId,
    timestamp: new Date()
  };
};

/**
 * Query all GrainTransferred events.
 */
const getAllGrainTransfers = async () => {
  const provider = getProvider();
  const contract = new ethers.Contract(
    process.env.GRAIN_TRANSFER_ADDRESS,
    grainTransferJson.abi,
    provider
  );

  const filter = contract.filters.GrainTransferred();
  const events = await contract.queryFilter(filter);

  return events.map((event) => ({
    transferId: event.args.transferId.toString(),
    dealerAddress: event.args.dealerAddress,
    quantity: event.args.quantity.toString(),
    timestamp: new Date(Number(event.args.timestamp) * 1000),
    transactionHash: event.transactionHash
  }));
};

/**
 * Query all RationCollected events.
 */
const getAllDistributions = async () => {
  const provider = getProvider();
  const contract = new ethers.Contract(
    process.env.BENEFICIARY_MGMT_ADDRESS,
    beneficiaryMgmtJson.abi,
    provider
  );

  const filter = contract.filters.RationCollected();
  const events = await contract.queryFilter(filter);

  return events.map((event) => ({
    beneficiaryAddress: event.args.walletAddress,
    quantity: event.args.quantity.toString(),
    timestamp: new Date(Number(event.args.timestamp) * 1000),
    transactionHash: event.transactionHash
  }));
};

/**
 * Reads beneficiary's real-time state from the blockchain.
 */
const getBeneficiaryStatus = async (beneficiaryAddress) => {
  const provider = getProvider();
  const contract = new ethers.Contract(
    process.env.BENEFICIARY_MGMT_ADDRESS,
    beneficiaryMgmtJson.abi,
    provider
  );

  const res = await contract.getBeneficiary(beneficiaryAddress);
  return {
    beneficiaryId: res.beneficiaryId.toString(),
    walletAddress: res.wallet,
    monthlyEntitlement: res.monthlyEntitlement.toString(),
    hasCollected: res.hasCollected,
    isRegistered: res.isRegistered
  };
};

/**
 * Query RationCollected events filtered by a specific beneficiary wallet.
 */
const getDistributionsForBeneficiary = async (beneficiaryAddress) => {
  const provider = getProvider();
  const contract = new ethers.Contract(
    process.env.BENEFICIARY_MGMT_ADDRESS,
    beneficiaryMgmtJson.abi,
    provider
  );

  const filter = contract.filters.RationCollected(beneficiaryAddress);
  const events = await contract.queryFilter(filter);

  return events.map((event) => ({
    beneficiaryAddress: event.args.walletAddress,
    quantity: event.args.quantity.toString(),
    timestamp: new Date(Number(event.args.timestamp) * 1000),
    transactionHash: event.transactionHash
  }));
};

/**
 * Resets the monthly collection statuses for all registered beneficiaries.
 */
const resetMonthlyCollection = async (adminPrivateKey) => {
  const signer = getSignerWallet(adminPrivateKey);
  const contract = new ethers.Contract(
    process.env.BENEFICIARY_MGMT_ADDRESS,
    beneficiaryMgmtJson.abi,
    signer
  );

  const tx = await contract.resetMonthlyCollection();
  const receipt = await tx.wait();
  return {
    transactionHash: tx.hash,
    blockNumber: receipt.blockNumber
  };
};

module.exports = {
  transferGrain,
  registerBeneficiary,
  updateEntitlement,
  collectRation,
  generateReceipt,
  getAllGrainTransfers,
  getAllDistributions,
  getBeneficiaryStatus,
  getDistributionsForBeneficiary,
  resetMonthlyCollection
};
