const User = require("../models/User.model");
const Dealer = require("../models/Dealer.model");
const Beneficiary = require("../models/Beneficiary.model");
const Receipt = require("../models/Receipt.model");
const walletUtil = require("../utils/wallet");
const blockchainService = require("../services/blockchainService");
const { generateReceiptPdf } = require("../services/pdfService");

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

    // Verify / auto-heal beneficiary on-chain registration (e.g. if Ganache was redeployed)
    try {
      const status = await blockchainService.getBeneficiaryStatus(beneficiary.walletAddress);
      if (!status || !status.isRegistered) {
        console.log(`[AUTO-SYNC] Registering beneficiary wallet ${beneficiary.walletAddress} on-chain...`);
        await blockchainService.registerBeneficiary(
          beneficiary.walletAddress,
          beneficiary.monthlyEntitlement || 35,
          adminPrivateKey
        );
      }
    } catch (bcSyncErr) {
      if (bcSyncErr.message && bcSyncErr.message.includes("Beneficiary not registered")) {
        console.log(`[AUTO-HEAL] Registering beneficiary wallet ${beneficiary.walletAddress} on-chain...`);
        await blockchainService.registerBeneficiary(
          beneficiary.walletAddress,
          beneficiary.monthlyEntitlement || 35,
          adminPrivateKey
        );
      }
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
 * Generate cryptographic receipt on-chain and persist off-chain metadata in MongoDB.
 * @route POST /api/dealer/receipt
 */
const generateReceipt = async (req, res) => {
  const { beneficiaryId, quantity, transactionReference, rationCardNumber } = req.body;

  try {
    if (!beneficiaryId || !quantity || !transactionReference) {
      return res.status(400).json({
        success: false,
        message: "Please provide beneficiaryId, quantity, and transactionReference"
      });
    }

    // Idempotency check: Check if receipt document already exists for this distribution transaction
    let existingReceipt = await Receipt.findOne({ transactionHash: transactionReference.trim() });
    if (existingReceipt) {
      return res.status(200).json({
        success: true,
        message: "Digital receipt already generated for this transaction",
        data: {
          receiptId: existingReceipt.receiptId,
          blockchainReceiptId: existingReceipt.blockchainReceiptId,
          beneficiaryName: existingReceipt.beneficiaryName,
          rationCardNumber: existingReceipt.rationCardNumber,
          quantity: existingReceipt.quantity,
          transactionReference: existingReceipt.transactionHash,
          transactionHash: existingReceipt.transactionHash,
          verificationUrl: existingReceipt.verificationUrl,
          timestamp: existingReceipt.distributionDate
        }
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

    if (!result || !result.receiptId) {
      console.error("[DEALER RECEIPT] Failed to obtain on-chain receiptId from ReceiptManager.sol");
      return res.status(500).json({
        success: false,
        message: "Failed to mint digital receipt on the blockchain smart contract. Please check your Ethereum node connection."
      });
    }

    // Look up Dealer record
    const dealer = await Dealer.findOne({ userId: req.user._id }).populate("userId");

    // Look up Beneficiary record
    let beneficiary = null;
    if (rationCardNumber) {
      beneficiary = await Beneficiary.findOne({ rationCardNumber: rationCardNumber.trim() });
    }
    if (!beneficiary) {
      beneficiary = await Beneficiary.findOne({
        $or: [
          { userId: beneficiaryId },
          { _id: (typeof beneficiaryId === "string" && beneficiaryId.length === 24) ? beneficiaryId : null }
        ]
      });
    }

    // Format human-readable unique Receipt ID: e.g. PDS-RCP-2026-00001
    const year = new Date().getFullYear();
    const formattedReceiptId = `PDS-RCP-${year}-${String(result.receiptId).padStart(5, "0")}`;

    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const distributionDate = result.timestamp || new Date();
    const distributionMonth = `${months[distributionDate.getMonth()]} ${distributionDate.getFullYear()}`;

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const verificationUrl = `${frontendUrl}/verify/${formattedReceiptId}`;

    // Persist off-chain receipt metadata in MongoDB
    const receiptDoc = new Receipt({
      receiptId: formattedReceiptId,
      beneficiaryId: beneficiary ? beneficiary._id : null,
      dealerId: dealer ? dealer._id : null,
      beneficiaryName: beneficiary ? beneficiary.name : "Registered Beneficiary",
      rationCardNumber: beneficiary ? beneficiary.rationCardNumber : (rationCardNumber || `RC-${beneficiaryId}`),
      mobileNumber: beneficiary?.mobileNumber || "N/A",
      beneficiaryWalletAddress: beneficiary?.walletAddress || "N/A",
      dealerName: dealer?.userId?.name || "Licensed FPS Dealer",
      fpsShopId: dealer?.fpsShopId || "FPS-DEALER",
      dealerLocation: dealer?.location || "Distribution Center",
      dealerWalletAddress: dealer?.userId?.walletAddress || "N/A",
      distributionDate,
      distributionMonth,
      commodity: "Food Grains (Wheat / Rice)",
      quantity: Number(quantity),
      blockchainReceiptId: String(result.receiptId),
      blockchainBeneficiaryId: String(Number(beneficiaryId) || 1),
      transactionHash: transactionReference.trim(),
      blockNumber: result.blockNumber || null,
      contractAddress: process.env.RECEIPT_MANAGER_ADDRESS,
      receiptStatus: "Confirmed on Blockchain",
      verificationUrl
    });

    await receiptDoc.save();

    return res.status(200).json({
      success: true,
      message: "Blockchain digital receipt generated and recorded in ledger",
      data: {
        receiptId: receiptDoc.receiptId,
        blockchainReceiptId: receiptDoc.blockchainReceiptId,
        beneficiaryName: receiptDoc.beneficiaryName,
        rationCardNumber: receiptDoc.rationCardNumber,
        quantity: receiptDoc.quantity,
        transactionReference: receiptDoc.transactionHash,
        transactionHash: result.transactionHash,
        verificationUrl: receiptDoc.verificationUrl,
        timestamp: receiptDoc.distributionDate
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

/**
 * Downloads official PDF receipt for a verified distribution.
 * Authorized for the distributing Dealer or Admin.
 * @route GET /api/dealer/receipt/:receiptId/pdf
 */
const downloadReceiptPdf = async (req, res) => {
  const { receiptId } = req.params;

  try {
    if (!receiptId) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid receiptId"
      });
    }

    const receipt = await Receipt.findOne({ receiptId: receiptId.trim() });
    if (!receipt) {
      return res.status(404).json({
        success: false,
        message: `Distribution receipt '${receiptId}' not found`
      });
    }

    // Role-based access authorization:
    // If user is a Dealer, verify the receipt belongs to their shop
    if (req.user.role === "Dealer") {
      const dealer = await Dealer.findOne({ userId: req.user._id });
      if (!dealer || (receipt.dealerId && !receipt.dealerId.equals(dealer._id))) {
        return res.status(403).json({
          success: false,
          message: "Forbidden: You are not authorized to download receipts from another dealer"
        });
      }
    }

    // Generate high-fidelity PDF binary stream with embedded QR code
    const pdfBuffer = await generateReceiptPdf(receipt);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${receipt.receiptId}.pdf"`);
    res.setHeader("Content-Length", pdfBuffer.length);

    return res.end(pdfBuffer);

  } catch (error) {
    console.error(`[DEALER RECEIPT PDF ERROR]: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Server error generating receipt PDF",
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
  downloadReceiptPdf,
  searchBeneficiary,
  getDealerDistributions
};
