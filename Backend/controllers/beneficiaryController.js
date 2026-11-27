const Beneficiary = require("../models/Beneficiary.model");
const Receipt = require("../models/Receipt.model");
const blockchainService = require("../services/blockchainService");
const { generateReceiptPdf } = require("../services/pdfService");

/**
 * Fetch Beneficiary entitlement details from database and on-chain status from smart contract.
 * @route GET /api/beneficiary/entitlement
 */
const getEntitlement = async (req, res) => {
  try {
    // Find beneficiary by authenticated user ID
    const beneficiary = await Beneficiary.findOne({ userId: req.user._id }).populate("registeredDealer");
    if (!beneficiary) {
      return res.status(404).json({
        success: false,
        message: "Beneficiary profile not found"
      });
    }

    // Retrieve real-time data from blockchain
    let onChainStatus = { hasCollected: false, isRegistered: false };
    try {
      onChainStatus = await blockchainService.getBeneficiaryStatus(beneficiary.walletAddress);
    } catch (bcError) {
      console.error(`[ON-CHAIN SYNC WARNING]: Failed to load live blockchain status: ${bcError.message}`);
    }

    return res.status(200).json({
      success: true,
      message: "Entitlement details retrieved successfully",
      data: {
        beneficiaryId: beneficiary._id,
        name: beneficiary.name,
        rationCardNumber: beneficiary.rationCardNumber,
        walletAddress: beneficiary.walletAddress,
        monthlyEntitlement: beneficiary.monthlyEntitlement,
        registeredDealer: beneficiary.registeredDealer
          ? {
              id: beneficiary.registeredDealer._id,
              fpsShopId: beneficiary.registeredDealer.fpsShopId,
              location: beneficiary.registeredDealer.location
            }
          : null,
        // Live Blockchain Data
        isRegisteredOnChain: onChainStatus.isRegistered,
        hasCollectedThisMonth: onChainStatus.hasCollected
      }
    });

  } catch (error) {
    console.error(`[BENEFICIARY ENTITLEMENT ERROR]: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Server error fetching entitlement levels",
      error: error.message
    });
  }
};

/**
 * Retrieve blockchain-verifiable digital receipts of all distributions to this beneficiary.
 * Enriches on-chain distribution events with off-chain MongoDB Receipt metadata and PDF download availability.
 * @route GET /api/beneficiary/receipts
 */
const getReceipts = async (req, res) => {
  try {
    const beneficiary = await Beneficiary.findOne({ userId: req.user._id });
    if (!beneficiary) {
      return res.status(404).json({
        success: false,
        message: "Beneficiary profile not found"
      });
    }

    // 1. Query on-chain logs for events related to this beneficiary's wallet address
    let digitalReceipts = [];
    try {
      console.log(`[ON-CHAIN] Loading digital receipts for wallet: ${beneficiary.walletAddress}`);
      digitalReceipts = await blockchainService.getDistributionsForBeneficiary(beneficiary.walletAddress);
    } catch (bcError) {
      console.warn(`[BENEFICIARY RECEIPTS BC WARNING]: ${bcError.message}`);
    }

    // 2. Query MongoDB Receipt records for this beneficiary
    const mongoReceipts = await Receipt.find({
      $or: [
        { beneficiaryId: beneficiary._id },
        { rationCardNumber: beneficiary.rationCardNumber },
        { beneficiaryWalletAddress: beneficiary.walletAddress }
      ]
    }).sort({ distributionDate: -1 });

    // Index MongoDB receipts by lowercase transactionHash
    const receiptMap = new Map();
    mongoReceipts.forEach((r) => {
      if (r.transactionHash) {
        receiptMap.set(r.transactionHash.toLowerCase(), r);
      }
    });

    // 3. Merge blockchain event records with MongoDB Receipt metadata
    const combinedReceipts = [];
    const matchedTxHashes = new Set();

    digitalReceipts.forEach((event) => {
      const txHashLower = (event.transactionHash || "").toLowerCase();
      const mongoRecord = receiptMap.get(txHashLower);

      if (mongoRecord) {
        matchedTxHashes.add(txHashLower);
        combinedReceipts.push({
          receiptId: mongoRecord.receiptId,
          blockchainReceiptId: mongoRecord.blockchainReceiptId,
          beneficiaryAddress: event.beneficiaryAddress,
          rationCardNumber: mongoRecord.rationCardNumber,
          commodity: mongoRecord.commodity || "Food Grains (Wheat / Rice)",
          quantity: mongoRecord.quantity,
          timestamp: mongoRecord.distributionDate,
          distributionMonth: mongoRecord.distributionMonth,
          dealerName: mongoRecord.dealerName,
          fpsShopId: mongoRecord.fpsShopId,
          dealerLocation: mongoRecord.dealerLocation,
          transactionHash: event.transactionHash,
          receiptStatus: mongoRecord.receiptStatus || "Confirmed on Blockchain",
          hasPdf: true
        });
      } else {
        // Historical transaction without matching MongoDB receipt document
        const eventDate = new Date(event.timestamp);
        const months = [
          "January", "February", "March", "April", "May", "June",
          "July", "August", "September", "October", "November", "December"
        ];
        const monthYear = `${months[eventDate.getMonth()]} ${eventDate.getFullYear()}`;

        combinedReceipts.push({
          receiptId: null,
          blockchainReceiptId: null,
          beneficiaryAddress: event.beneficiaryAddress,
          rationCardNumber: beneficiary.rationCardNumber,
          commodity: "Food Grains (Wheat / Rice)",
          quantity: Number(event.quantity),
          timestamp: event.timestamp,
          distributionMonth: monthYear,
          dealerName: null,
          fpsShopId: null,
          dealerLocation: null,
          transactionHash: event.transactionHash,
          receiptStatus: "Confirmed on Blockchain",
          hasPdf: false,
          pdfUnavailableReason: "PDF receipt not available for this historical transaction."
        });
      }
    });

    // 4. Also include any MongoDB receipts that might have been processed off-chain
    mongoReceipts.forEach((r) => {
      const txHashLower = (r.transactionHash || "").toLowerCase();
      if (!matchedTxHashes.has(txHashLower)) {
        combinedReceipts.push({
          receiptId: r.receiptId,
          blockchainReceiptId: r.blockchainReceiptId,
          beneficiaryAddress: r.beneficiaryWalletAddress,
          rationCardNumber: r.rationCardNumber,
          commodity: r.commodity || "Food Grains (Wheat / Rice)",
          quantity: r.quantity,
          timestamp: r.distributionDate,
          distributionMonth: r.distributionMonth,
          dealerName: r.dealerName,
          fpsShopId: r.fpsShopId,
          dealerLocation: r.dealerLocation,
          transactionHash: r.transactionHash,
          receiptStatus: r.receiptStatus || "Confirmed on Blockchain",
          hasPdf: true
        });
      }
    });

    // Sort newest first
    combinedReceipts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return res.status(200).json({
      success: true,
      message: "Digital receipts fetched successfully",
      data: combinedReceipts
    });

  } catch (error) {
    console.error(`[BENEFICIARY RECEIPTS ERROR]: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Server error retrieving digital receipts",
      error: error.message
    });
  }
};

/**
 * Downloads official PDF receipt for a beneficiary's own distribution.
 * @route GET /api/beneficiary/receipt/:receiptId/pdf
 */
const downloadBeneficiaryReceiptPdf = async (req, res) => {
  const { receiptId } = req.params;

  try {
    const beneficiary = await Beneficiary.findOne({ userId: req.user._id });
    if (!beneficiary) {
      return res.status(404).json({
        success: false,
        message: "Beneficiary profile not found"
      });
    }

    // Lookup receipt by receiptId or transactionHash
    const receipt = await Receipt.findOne({
      $and: [
        {
          $or: [
            { receiptId: receiptId.trim() },
            { transactionHash: receiptId.trim() }
          ]
        },
        {
          $or: [
            { beneficiaryId: beneficiary._id },
            { rationCardNumber: beneficiary.rationCardNumber }
          ]
        }
      ]
    });

    if (!receipt) {
      return res.status(404).json({
        success: false,
        message: "Receipt not found or you are not authorized to access this receipt"
      });
    }

    const pdfBuffer = await generateReceiptPdf(receipt);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${receipt.receiptId}.pdf"`);
    res.setHeader("Content-Length", pdfBuffer.length);

    return res.end(pdfBuffer);

  } catch (error) {
    console.error(`[BENEFICIARY RECEIPT PDF ERROR]: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Server error generating receipt PDF",
      error: error.message
    });
  }
};

module.exports = {
  getEntitlement,
  getReceipts,
  downloadBeneficiaryReceiptPdf
};
