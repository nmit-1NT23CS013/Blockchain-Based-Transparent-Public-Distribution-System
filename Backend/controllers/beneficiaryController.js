const Beneficiary = require("../models/Beneficiary.model");
const blockchainService = require("../services/blockchainService");

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
 * Retrieve blockchain-verifiable digital receipts (events) of all distributions to this beneficiary.
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

    // Query on-chain logs for events related to this beneficiary's wallet address
    console.log(`[ON-CHAIN] Loading digital receipts for wallet: ${beneficiary.walletAddress}`);
    const digitalReceipts = await blockchainService.getDistributionsForBeneficiary(beneficiary.walletAddress);

    return res.status(200).json({
      success: true,
      message: "Digital receipts fetched successfully from blockchain",
      data: digitalReceipts
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

module.exports = {
  getEntitlement,
  getReceipts
};
