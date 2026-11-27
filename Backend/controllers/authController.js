const User = require("../models/User.model");
const Beneficiary = require("../models/Beneficiary.model");
const jwt = require("jsonwebtoken");
const Dealer = require("../models/Dealer.model");
const Warehouse = require("../models/Warehouse.model");
const walletUtil = require("../utils/wallet");
const { Wallet, JsonRpcProvider } = require("ethers");
const mongoose = require("mongoose");

/**
 * Handles user login for Admin, Dealer, and Beneficiary.
 * @route POST /api/auth/login
 */
const login = async (req, res) => {
  const { email, rationCardNumber, password } = req.body;

  try {
    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Password is required"
      });
    }

    let user;

    // Check if logging in via email (Admin/Dealer) or Ration Card Number (Beneficiary)
    if (email) {
      user = await User.findOne({ email: email.toLowerCase().trim() });
    } else if (rationCardNumber) {
      const beneficiary = await Beneficiary.findOne({ rationCardNumber: rationCardNumber.trim() });
      if (beneficiary) {
        user = await User.findById(beneficiary.userId);
      }
    } else {
      return res.status(400).json({
        success: false,
        message: "Please provide email or rationCardNumber to log in"
      });
    }

    // Verify user exists and matches credentials
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    // Sign JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || "pds_blockchain_super_secret_jwt_key_2026_final_year_project",
      { expiresIn: "30d" }
    );

    // Fetch complementary profile data depending on user role
    let profileData = null;
    if (user.role === "Beneficiary") {
      profileData = await Beneficiary.findOne({ userId: user._id }).populate("registeredDealer");
    }

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          walletAddress: user.walletAddress
        },
        profile: profileData
      }
    });

  } catch (error) {
    console.error(`[LOGIN ERROR] Error logging in user: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Server error during authentication",
      error: error.message
    });
  }
};

/**
 * Resets the demo database and initializes the default Admin and Warehouse stock.
 * Performs pre-flight checks on MongoDB and the Blockchain contract deployment.
 * @route POST /api/auth/reset-demo
 */
const resetDemo = async (req, res) => {
  try {
    console.log("[DEMO RESET] Executing pre-flight checks...");

    // 1. MongoDB Readiness Check
    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({
        success: false,
        message: "Database Connection Error: MongoDB is not connected or is offline."
      });
    }

    // 2. Env Config Check
    const grainTransferAddr = process.env.GRAIN_TRANSFER_ADDRESS;
    const beneficiaryMgmtAddr = process.env.BENEFICIARY_MGMT_ADDRESS;
    const receiptManagerAddr = process.env.RECEIPT_MANAGER_ADDRESS;

    if (!grainTransferAddr || !beneficiaryMgmtAddr || !receiptManagerAddr) {
      return res.status(400).json({
        success: false,
        message: "Configuration Error: One or more deployed smart contract addresses are missing in backend .env file. Please deploy contracts first."
      });
    }

    // 3. Blockchain RPC Connection Check
    const providerUrl = process.env.GANACHE_RPC_URL || "http://127.0.0.1:8545";
    let provider;
    try {
      provider = new JsonRpcProvider(providerUrl);
      await provider.getBlockNumber();
    } catch (err) {
      console.error("[DEMO RESET] Blockchain connection failed:", err.message);
      return res.status(500).json({
        success: false,
        message: `Blockchain Connection Error: Could not connect to local blockchain network at ${providerUrl}. Make sure your local node (Ganache/Hardhat) is running.`
      });
    }

    // 4. Smart Contract Deployment (getCode) Check for all 3 contracts
    try {
      const [gtCode, bmCode, rmCode] = await Promise.all([
        provider.getCode(grainTransferAddr),
        provider.getCode(beneficiaryMgmtAddr),
        provider.getCode(receiptManagerAddr)
      ]);

      if (gtCode === "0x" || gtCode === "0x00" || bmCode === "0x" || bmCode === "0x00" || rmCode === "0x" || rmCode === "0x00") {
        return res.status(400).json({
          success: false,
          message: "One or more smart contracts are not deployed. Please redeploy all contracts before resetting demo data."
        });
      }
    } catch (err) {
      console.error("[DEMO RESET] Contract code check failed:", err.message);
      return res.status(500).json({
        success: false,
        message: "Contract Code Verification Failed: Error checking contract deployment status on-chain. Please redeploy contracts."
      });
    }

    console.log("[DEMO RESET] Pre-flight checks passed. Initiating reset...");

    const initialStock = Number(process.env.INITIAL_WAREHOUSE_STOCK) || 100000;
    const adminEmail = "admin@pds.com";

    // Recreate Admin wallet details from private key (similar to seed.js logic)
    let walletAddress;
    let encryptedPrivateKey;

    if (process.env.ADMIN_PRIVATE_KEY) {
      const privateKey = process.env.ADMIN_PRIVATE_KEY;
      try {
        const wallet = new Wallet(privateKey);
        walletAddress = wallet.address;
        encryptedPrivateKey = walletUtil.encryptPrivateKey(privateKey);
        console.log(`[DEMO RESET] Derived Admin wallet from .env. Address: ${walletAddress}`);
      } catch (err) {
        console.error("[DEMO RESET] Invalid ADMIN_PRIVATE_KEY in .env:", err.message);
      }
    }

    if (!walletAddress) {
      const wallet = walletUtil.createWallet();
      walletAddress = wallet.address;
      encryptedPrivateKey = walletUtil.encryptPrivateKey(wallet.privateKey);
      console.log(`[DEMO RESET] Auto-generated random Admin wallet address: ${walletAddress}`);
    }

    // Attempt using Mongoose Transactions, fallback to sequential logic if replica sets are not supported
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      await User.deleteMany({}, { session });
      await Dealer.deleteMany({}, { session });
      await Beneficiary.deleteMany({}, { session });
      await Warehouse.deleteMany({}, { session });

      const admin = new User({
        name: "PDS Central Administrator",
        email: adminEmail,
        password: "AdminPassword123",
        role: "Admin",
        walletAddress,
        encryptedPrivateKey
      });
      await admin.save({ session });

      const warehouse = new Warehouse({
        stock: initialStock
      });
      await warehouse.save({ session });

      await session.commitTransaction();
      console.log("[DEMO RESET] Transaction successfully committed.");
    } catch (txErr) {
      await session.abortTransaction();
      
      const isReplicaSetError = 
        txErr.message.includes("does not support retryable writes") || 
        txErr.message.includes("Transaction") || 
        txErr.message.includes("replica set");

      if (isReplicaSetError) {
        console.warn("[DEMO RESET] Transactions unsupported by MongoDB instance. Falling back to sequential queries...");
        
        // Safe Sequential Fallback
        await User.deleteMany({});
        await Dealer.deleteMany({});
        await Beneficiary.deleteMany({});
        await Warehouse.deleteMany({});

        const admin = new User({
          name: "PDS Central Administrator",
          email: adminEmail,
          password: "AdminPassword123",
          role: "Admin",
          walletAddress,
          encryptedPrivateKey
        });
        await admin.save();

        const warehouse = new Warehouse({
          stock: initialStock
        });
        await warehouse.save();
        
        console.log("[DEMO RESET] Sequential fallback successfully executed.");
      } else {
        throw txErr;
      }
    } finally {
      session.endSession();
    }

    return res.status(200).json({
      success: true,
      message: "Demo environment initialized successfully."
    });

  } catch (error) {
    console.error(`[DEMO RESET TRANSACTION FAILURE]: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred while resetting the demo environment.",
      error: error.message
    });
  }
};

module.exports = { login, resetDemo };

