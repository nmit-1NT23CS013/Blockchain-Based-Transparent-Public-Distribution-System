const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const {
  getEntitlement,
  getReceipts,
  downloadBeneficiaryReceiptPdf
} = require("../controllers/beneficiaryController");

// Apply protection and Beneficiary-role enforcement to all Beneficiary routes
router.use(protect);
router.use(authorize("Beneficiary"));

// @route GET /api/beneficiary/entitlement
router.get("/entitlement", getEntitlement);

// @route GET /api/beneficiary/receipts
router.get("/receipts", getReceipts);

// @route GET /api/beneficiary/receipt/:receiptId/pdf
// @desc Download official PDF receipt for a beneficiary's distribution
router.get("/receipt/:receiptId/pdf", downloadBeneficiaryReceiptPdf);

module.exports = router;
