const express = require("express");
const router = express.Router();
const blockchainService = require("../services/blockchainService");

// @route GET /api/dashboard/transactions
// @desc Public route to fetch all blockchain events (grain transfers & ration collections) for transparency dashboard
// @access Public
router.get("/transactions", async (req, res) => {
  try {
    // 1. Fetch grain transfer events from Central Admin to Dealers
    const transfers = await blockchainService.getAllGrainTransfers();

    // 2. Fetch ration collection events from Dealers to Beneficiaries
    const distributions = await blockchainService.getAllDistributions();

    // 3. Format and normalize transfer events
    const formattedTransfers = transfers.map((t) => ({
      type: "Allocation Transfer",
      id: t.transferId,
      actor: "Central Storage (Admin)",
      recipient: t.dealerAddress,
      quantity: Number(t.quantity),
      timestamp: t.timestamp,
      transactionHash: t.transactionHash
    }));

    // 4. Format and normalize distribution events
    const formattedDistributions = distributions.map((d, index) => ({
      type: "Ration Distribution",
      id: `DIST-${index + 1}`,
      actor: "Fair Price Shop (Dealer)",
      recipient: d.beneficiaryAddress,
      quantity: Number(d.quantity),
      timestamp: d.timestamp,
      transactionHash: d.transactionHash
    }));

    // 5. Merge and sort transactions chronologically (newest first)
    const combinedLedger = [...formattedTransfers, ...formattedDistributions].sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );

    return res.status(200).json({
      success: true,
      message: "Public transaction ledger fetched successfully from blockchain",
      data: combinedLedger
    });

  } catch (error) {
    console.error(`[PUBLIC LEDGER ROUTE ERROR]: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Server error querying public blockchain transaction records",
      error: error.message
    });
  }
});

module.exports = router;
