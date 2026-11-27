const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const {
  registerDealer,
  registerBeneficiary,
  allocateEntitlement,
  transferGrain,
  getDealers,
  getBeneficiaries,
  getStats,
  resetMonthlyCycle
} = require("../controllers/adminController");

// Apply protection and Admin-role enforcement to all Admin routes
router.use(protect);
router.use(authorize("Admin"));

// @route GET /api/admin/stats
router.get("/stats", getStats);

// @route GET /api/admin/dealers
router.get("/dealers", getDealers);

// @route GET /api/admin/beneficiaries
router.get("/beneficiaries", getBeneficiaries);

// @route POST /api/admin/register-dealer
router.post("/register-dealer", registerDealer);

// @route POST /api/admin/register-beneficiary
router.post("/register-beneficiary", registerBeneficiary);

// @route POST /api/admin/allocate
router.post("/allocate", allocateEntitlement);

// @route POST /api/admin/transfer
router.post("/transfer", transferGrain);

// @route POST /api/admin/reset-cycle
router.post("/reset-cycle", resetMonthlyCycle);

module.exports = router;
