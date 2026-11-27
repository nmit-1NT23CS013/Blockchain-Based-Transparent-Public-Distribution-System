const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const {
  getStock,
  distributeRation,
  generateReceipt,
  downloadReceiptPdf,
  searchBeneficiary,
  getDealerDistributions
} = require("../controllers/dealerController");

// Apply protection and Dealer-role enforcement to all Dealer routes
router.use(protect);
router.use(authorize("Dealer"));

// @route GET /api/dealer/stock
router.get("/stock", getStock);

// @route GET /api/dealer/beneficiary/:rationCardNumber
router.get("/beneficiary/:rationCardNumber", searchBeneficiary);

// @route GET /api/dealer/distributions
router.get("/distributions", getDealerDistributions);

// @route POST /api/dealer/distribute
router.post("/distribute", distributeRation);

// @route POST /api/dealer/receipt
router.post("/receipt", generateReceipt);

// @route GET /api/dealer/receipt/:receiptId/pdf
// @desc Download official PDF receipt for a distribution
router.get("/receipt/:receiptId/pdf", downloadReceiptPdf);

module.exports = router;
