const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.join(__dirname, "../.env") });
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

  const provider = getProvider();
  const nonce = await provider.getTransactionCount(signer.address, "latest");
  const tx = await contract.collectRation(beneficiaryAddress, quantity, { nonce });
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

  const provider = getProvider();
  const nonce = await provider.getTransactionCount(signer.address, "latest");
  const tx = await contract.generateReceipt(beneficiaryId, quantity, transactionReference, { nonce });
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

  // Fallback: If not parsed from receipt logs, query by event filter
  if (!receiptId) {
    try {
      const filter = contract.filters.ReceiptGenerated(null, beneficiaryId);
      const events = await contract.queryFilter(filter, receipt.blockNumber, receipt.blockNumber);
      if (events && events.length > 0) {
        receiptId = events[events.length - 1].args.receiptId.toString();
      }
    } catch (filterErr) {
      console.warn(`[EVENT FILTER FALLBACK WARNING]: ${filterErr.message}`);
    }
  }

  return {
    transactionHash: tx.hash,
    blockNumber: receipt.blockNumber,
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

/**
 * Reads a receipt record directly from ReceiptManager.sol smart contract.
 */
const getBlockchainReceipt = async (receiptId) => {
  const provider = getProvider();
  const contract = new ethers.Contract(
    process.env.RECEIPT_MANAGER_ADDRESS,
    receiptManagerJson.abi,
    provider
  );

  const r = await contract.getReceipt(receiptId);
  const id = r.id !== undefined ? r.id : r[0];
  const beneficiaryId = r.beneficiaryId !== undefined ? r.beneficiaryId : r[1];
  const quantity = r.quantity !== undefined ? r.quantity : r[2];
  const transactionReference = r.transactionReference !== undefined ? r.transactionReference : r[3];
  const timestamp = r.timestamp !== undefined ? r.timestamp : r[4];

  return {
    receiptId: id.toString(),
    beneficiaryId: beneficiaryId.toString(),
    quantity: quantity.toString(),
    transactionReference: transactionReference,
    timestamp: new Date(Number(timestamp) * 1000)
  };
};

module.exports = {
  transferGrain,
  registerBeneficiary,
  updateEntitlement,
  collectRation,
  generateReceipt,
  getBlockchainReceipt,
  getAllGrainTransfers,
  getAllDistributions,
  getBeneficiaryStatus,
  getDistributionsForBeneficiary,
  resetMonthlyCollection
};
