const express = require("express");
const router = express.Router();
const { login, resetDemo } = require("../controllers/authController");

// @route POST /api/auth/login
// @desc Authenticate user (Admin/Dealer/Beneficiary) and get token
// @access Public
router.post("/login", login);

// @route POST /api/auth/reset-demo
// @desc Reset database demo data and seed default Admin + Warehouse Stock
// @access Public
router.post("/reset-demo", resetDemo);

module.exports = router;
