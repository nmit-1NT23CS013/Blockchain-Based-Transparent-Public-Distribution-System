const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const { Wallet } = require("ethers");

const User = require("../models/User.model");
const walletUtil = require("../utils/wallet");

// Configure dotenv path relative to scripts folder
dotenv.config({ path: path.join(__dirname, "../.env") });

const seedAdmin = async () => {
  try {
    // Connect to database using configuration
    const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/pds-blockchain";
    await mongoose.connect(mongoUri);
    console.log("[SEED] Connected to MongoDB...");

    // Check if admin is already registered
    const adminEmail = "admin@pds.com";
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      console.log("[SEED] Central Admin user already exists in database. Skipping seed.");
      process.exit(0);
    }

    let walletAddress;
    let encryptedPrivateKey;

    // Align admin user wallet with configured ADMIN_PRIVATE_KEY for on-chain validations
    if (process.env.ADMIN_PRIVATE_KEY) {
      const privateKey = process.env.ADMIN_PRIVATE_KEY;
      try {
        const wallet = new Wallet(privateKey);
        walletAddress = wallet.address;
        encryptedPrivateKey = walletUtil.encryptPrivateKey(privateKey);
        console.log(`[SEED] Derived Admin wallet from .env private key. Address: ${walletAddress}`);
      } catch (err) {
        console.error("[SEED ERROR] Provided private key format is invalid. Auto-generating wallet.");
      }
    }

    // Fallback to random generation if not defined or invalid
    if (!walletAddress) {
      const wallet = walletUtil.createWallet();
      walletAddress = wallet.address;
      encryptedPrivateKey = walletUtil.encryptPrivateKey(wallet.privateKey);
      console.log(`[SEED] Auto-generated random Admin wallet address: ${walletAddress}`);
    }

    // Create the Admin User
    const admin = new User({
      name: "PDS Central Administrator",
      email: adminEmail,
      password: "AdminPassword123", // Will be hashed automatically by userSchema pre-save hook
      role: "Admin",
      walletAddress,
      encryptedPrivateKey
    });

    await admin.save();

    console.log("====================================================");
    console.log("ADMIN USER SEEDED SUCCESSFULLY!");
    console.log("====================================================");
    console.log(`Email:      ${adminEmail}`);
    console.log(`Password:   AdminPassword123`);
    console.log(`Role:       Admin`);
    console.log(`Wallet Addr: ${walletAddress}`);
    console.log("====================================================");

    process.exit(0);

  } catch (error) {
    console.error(`[SEED ERROR] Failed to seed database: ${error.message}`);
    process.exit(1);
  }
};

seedAdmin();
