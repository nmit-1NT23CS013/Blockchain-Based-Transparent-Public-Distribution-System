const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const {
  getEntitlement,
  getReceipts
} = require("../controllers/beneficiaryController");

// Apply protection and Beneficiary-role enforcement to all Beneficiary routes
router.use(protect);
router.use(authorize("Beneficiary"));

// @route GET /api/beneficiary/entitlement
router.get("/entitlement", getEntitlement);

// @route GET /api/beneficiary/receipts
router.get("/receipts", getReceipts);

module.exports = router;
