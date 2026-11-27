const User = require("../models/User.model");
const Dealer = require("../models/Dealer.model");
const Beneficiary = require("../models/Beneficiary.model");
const walletUtil = require("../utils/wallet");
const blockchainService = require("../services/blockchainService");

/**
 * Fetch Dealer stock profile (allocated and current stock quantities).
 * @route GET /api/dealer/stock
 */
const getStock = async (req, res) => {
  try {
    const dealer = await Dealer.findOne({ userId: req.user._id });
    if (!dealer) {
      return res.status(404).json({
        success: false,
        message: "Dealer inventory profile not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Inventory stock levels retrieved successfully",
      data: {
        fpsShopId: dealer.fpsShopId,
        allocatedStock: dealer.allocatedStock,
        currentStock: dealer.currentStock,
        location: dealer.location
      }
    });

  } catch (error) {
    console.error(`[DEALER STOCK ERROR]: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Server error fetching stock levels",
      error: error.message
    });
  }
};

/**
 * Records distribution of grain to a beneficiary.
 * Calls collectRation on the blockchain and updates stock level in DB.
 * @route POST /api/dealer/distribute
 */
const distributeRation = async (req, res) => {
  const { rationCardNumber, quantity } = req.body;

  try {
    if (!rationCardNumber || !quantity) {
      return res.status(400).json({
        success: false,
        message: "Please provide rationCardNumber and quantity"
      });
    }

    // Locate Beneficiary record
    const beneficiary = await Beneficiary.findOne({ rationCardNumber: rationCardNumber.trim() });
    if (!beneficiary) {
      return res.status(404).json({
        success: false,
        message: "Beneficiary ration record not found"
      });
    }

    // Locate Dealer record
    const dealer = await Dealer.findOne({ userId: req.user._id });
    if (!dealer) {
      return res.status(404).json({
        success: false,
        message: "Authorized Dealer shop not found"
      });
    }

    // Pre-flight check: Verify Dealer has enough physical stock remaining
    if (dealer.currentStock < Number(quantity)) {
      return res.status(400).json({
        success: false,
        message: "Ration distribution rejected: Insufficient stock at FPS shop"
      });
    }

    // Retrieve Admin private key (which is funded) to sign the transaction
    const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY;
    if (!adminPrivateKey) {
      throw new Error("Admin private key is missing in .env configurations");
    }

    // Call blockchain function collectRation
    console.log(`[ON-CHAIN] Invoking collectRation for beneficiary wallet: ${beneficiary.walletAddress}`);
    const tx = await blockchainService.collectRation(
      beneficiary.walletAddress,
      Number(quantity),
      adminPrivateKey
    );

    // Update database physical stock levels
    dealer.currentStock -= Number(quantity);
    await dealer.save();

    return res.status(200).json({
      success: true,
      message: "Ration distributed successfully and signed on-chain",
      data: {
        rationCardNumber: beneficiary.rationCardNumber,
        quantityDistributed: Number(quantity),
        remainingStock: dealer.currentStock,
        transactionHash: tx.transactionHash
      }
    });

  } catch (error) {
    console.error(`[DEALER DISTRIBUTE ERROR]: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Server error executing ration distribution",
      error: error.message
    });
  }
};

/**
 * Generate cryptographic receipt on-chain.
 * @route POST /api/dealer/receipt
 */
const generateReceipt = async (req, res) => {
  const { beneficiaryId, quantity, transactionReference } = req.body;

  try {
    if (!beneficiaryId || !quantity || !transactionReference) {
      return res.status(400).json({
        success: false,
        message: "Please provide beneficiaryId, quantity, and transactionReference"
      });
    }

    // Retrieve Admin private key to sign the receipt generation transaction
    const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY;
    if (!adminPrivateKey) {
      throw new Error("Admin private key is missing in .env configurations");
    }

    // Request on-chain receipt in ReceiptManager.sol
    const result = await blockchainService.generateReceipt(
      Number(beneficiaryId),
      Number(quantity),
      transactionReference,
      adminPrivateKey
    );

    return res.status(200).json({
      success: true,
      message: "Blockchain digital receipt generated",
      data: {
        receiptId: result.receiptId,
        beneficiaryId: Number(beneficiaryId),
        quantity: Number(quantity),
        transactionReference,
        transactionHash: result.transactionHash,
        timestamp: result.timestamp
      }
    });

  } catch (error) {
    console.error(`[DEALER RECEIPT ERROR]: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Server error generating collection receipt",
      error: error.message
    });
  }
};

const searchBeneficiary = async (req, res) => {
  const { rationCardNumber } = req.params;

  try {
    const beneficiary = await Beneficiary.findOne({ rationCardNumber: rationCardNumber.trim() });
    if (!beneficiary) {
      return res.status(404).json({
        success: false,
        message: `Beneficiary with Ration Card Number '${rationCardNumber}' not found.`
      });
    }

    // Load real-time on-chain status
    let onChainStatus = { hasCollected: false, isRegistered: false };
    try {
      onChainStatus = await blockchainService.getBeneficiaryStatus(beneficiary.walletAddress);
    } catch (bcError) {
      console.error(`[DEALER SEARCH BC WARNING]: ${bcError.message}`);
    }

    return res.status(200).json({
      success: true,
      data: {
        beneficiaryId: beneficiary.userId, // references user ID
        dbId: beneficiary._id,
        name: beneficiary.name,
        rationCardNumber: beneficiary.rationCardNumber,
        walletAddress: beneficiary.walletAddress,
        monthlyEntitlement: beneficiary.monthlyEntitlement,
        registeredDealer: beneficiary.registeredDealer,
        isRegisteredOnChain: onChainStatus.isRegistered,
        hasCollectedThisMonth: onChainStatus.hasCollected
      }
    });

  } catch (error) {
    console.error(`[DEALER SEARCH BENEFICIARY ERROR]: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Server error searching beneficiary",
      error: error.message
    });
  }
};

const getDealerDistributions = async (req, res) => {
  try {
    const dealer = await Dealer.findOne({ userId: req.user._id });
    if (!dealer) {
      return res.status(404).json({
        success: false,
        message: "Dealer inventory profile not found."
      });
    }

    const beneficiaries = await Beneficiary.find({ registeredDealer: dealer._id });
    const beneficiaryMap = new Map();
    beneficiaries.forEach((b) => {
      beneficiaryMap.set(b.walletAddress.toLowerCase(), {
        name: b.name,
        rationCardNumber: b.rationCardNumber,
        monthlyEntitlement: b.monthlyEntitlement
      });
    });

    const distributions = await blockchainService.getAllDistributions();

    const dealerDistributions = [];
    distributions.forEach((d) => {
      const beneficiaryInfo = beneficiaryMap.get(d.beneficiaryAddress.toLowerCase());
      if (beneficiaryInfo) {
        const date = new Date(d.timestamp);
        const monthIndex = date.getMonth();
        const year = date.getFullYear();
        const months = [
          "January", "February", "March", "April", "May", "June",
          "July", "August", "September", "October", "November", "December"
        ];
        const monthName = months[monthIndex];

        dealerDistributions.push({
          beneficiaryAddress: d.beneficiaryAddress,
          name: beneficiaryInfo.name,
          rationCardNumber: beneficiaryInfo.rationCardNumber,
          quantity: Number(d.quantity),
          timestamp: d.timestamp,
          transactionHash: d.transactionHash,
          month: monthName,
          year: year,
          monthKey: `${year}-${String(monthIndex + 1).padStart(2, '0')}`
        });
      }
    });

    dealerDistributions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return res.status(200).json({
      success: true,
      message: "Dealer distribution history retrieved successfully",
      data: dealerDistributions
    });

  } catch (error) {
    console.error(`[DEALER DISTRIBUTIONS ERROR]: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Server error retrieving dealer distributions",
      error: error.message
    });
  }
};

module.exports = {
  getStock,
  distributeRation,
  generateReceipt,
  searchBeneficiary,
  getDealerDistributions
};
