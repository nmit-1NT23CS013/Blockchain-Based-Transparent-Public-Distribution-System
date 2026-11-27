const crypto = require("crypto");
const User = require("../models/User.model");
const Dealer = require("../models/Dealer.model");
const Beneficiary = require("../models/Beneficiary.model");
const OtpSession = require("../models/OtpSession.model");
const walletUtil = require("../utils/wallet");
const blockchainService = require("../services/blockchainService");

/**
 * Register a new Fair Price Shop Dealer.
 * Creates User and Dealer documents and generates an Ethereum wallet.
 * @route POST /api/admin/register-dealer
 */
const registerDealer = async (req, res) => {
  const { name, email, password, fpsShopId, location } = req.body;

  try {
    if (!name || !email || !password || !fpsShopId || !location) {
      return res.status(400).json({
        success: false,
        message: "Please provide name, email, password, fpsShopId, and location"
      });
    }

    // Verify email is unique
    const emailExists = await User.findOne({ email: email.toLowerCase().trim() });
    if (emailExists) {
      return res.status(400).json({
        success: false,
        message: "Email address is already in use"
      });
    }

    // Verify license ID is unique
    const shopExists = await Dealer.findOne({ fpsShopId: fpsShopId.trim() });
    if (shopExists) {
      return res.status(400).json({
        success: false,
        message: "FPS Shop License ID is already in use"
      });
    }

    // Programmatically generate Ethereum wallet
    const { address, privateKey } = walletUtil.createWallet();
    const encryptedPrivateKey = walletUtil.encryptPrivateKey(privateKey);

    // Save user credentials
    const user = new User({
      name,
      email: email.toLowerCase().trim(),
      password,
      role: "Dealer",
      walletAddress: address,
      encryptedPrivateKey
    });
    await user.save();

    // Save dealer inventory info
    const dealer = new Dealer({
      userId: user._id,
      fpsShopId: fpsShopId.trim(),
      allocatedStock: 0,
      currentStock: 0,
      location
    });
    await dealer.save();

    return res.status(201).json({
      success: true,
      message: "Dealer registered successfully",
      data: {
        dealerId: dealer._id,
        name: user.name,
        email: user.email,
        fpsShopId: dealer.fpsShopId,
        walletAddress: user.walletAddress
      }
    });

  } catch (error) {
    console.error(`[ADMIN REG DEALER ERROR]: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Server error registering dealer profile",
      error: error.message
    });
  }
};

/**
 * Register a new Beneficiary.
 * Creates User and Beneficiary documents, generates an Ethereum wallet, and registers on-chain.
 * @route POST /api/admin/register-beneficiary
 */
/**
 * Register a new Beneficiary.
 * Enforces backend OTP verification token validation, creates User and Beneficiary documents,
 * generates an Ethereum wallet, and registers on-chain.
 * @route POST /api/admin/register-beneficiary
 */
const registerBeneficiary = async (req, res) => {
  const {
    name,
    rationCardNumber,
    mobileNumber,
    password,
    monthlyEntitlement,
    registeredDealerId,
    verificationToken
  } = req.body;

  let createdUser = null;
  let createdBeneficiary = null;

  try {
    // 1. Mandatory input validation
    if (!name || !rationCardNumber || !mobileNumber || !password || !monthlyEntitlement || !registeredDealerId) {
      return res.status(400).json({
        success: false,
        message: "Please provide name, rationCardNumber, mobileNumber, password, monthlyEntitlement, and registeredDealerId"
      });
    }

    const trimmedCard = rationCardNumber.toString().trim();
    const trimmedMobile = mobileNumber.toString().trim();

    // 2. Mobile number Indian format validation
    if (!/^[6-9]\d{9}$/.test(trimmedMobile)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid 10-digit Indian mobile number"
      });
    }

    // 3. Security Check: Verification Token must be provided
    if (!verificationToken) {
      return res.status(400).json({
        success: false,
        message: "Beneficiary registration rejected: Missing OTP verification token. You must verify OTP first."
      });
    }

    // 4. Compute SHA-256 hash of submitted verification token
    const tokenHash = crypto.createHash("sha256").update(verificationToken.toString().trim()).digest("hex");

    // 5. Concurrency-safe atomic token verification & consumption
    // Finds verified, unused, unexpired session matching token hash, card, and mobile,
    // and atomically marks isUsed: true in a single atomic database operation.
    const consumedSession = await OtpSession.findOneAndUpdate(
      {
        verificationTokenHash: tokenHash,
        isVerified: true,
        isUsed: false,
        tokenExpiresAt: { $gt: new Date() },
        rationCardNumber: trimmedCard,
        mobileNumber: trimmedMobile
      },
      {
        $set: {
          isUsed: true,
          usedAt: new Date()
        }
      }
    );

    // If atomic consumption failed, determine the exact security reason
    if (!consumedSession) {
      const existingSession = await OtpSession.findOne({ verificationTokenHash: tokenHash });
      if (!existingSession) {
        return res.status(400).json({
          success: false,
          message: "Registration rejected: Invalid or forged verification token."
        });
      }
      if (!existingSession.isVerified) {
        return res.status(400).json({
          success: false,
          message: "Registration rejected: OTP session has not been verified."
        });
      }
      if (existingSession.isUsed) {
        return res.status(400).json({
          success: false,
          message: "Registration rejected: Verification token has already been used. Please generate a new OTP."
        });
      }
      if (existingSession.tokenExpiresAt && new Date() > new Date(existingSession.tokenExpiresAt)) {
        return res.status(400).json({
          success: false,
          message: "Registration rejected: Verification token has expired. Please generate a new OTP."
        });
      }
      if (existingSession.rationCardNumber !== trimmedCard) {
        return res.status(400).json({
          success: false,
          message: "Registration rejected: Verification token was issued for a different Ration Card Number."
        });
      }
      if (existingSession.mobileNumber !== trimmedMobile) {
        return res.status(400).json({
          success: false,
          message: "Registration rejected: Verification token was issued for a different mobile number."
        });
      }
      return res.status(400).json({
        success: false,
        message: "Registration rejected: OTP verification validation failed."
      });
    }

    // 6. Ensure dealer shop exists
    const dealer = await Dealer.findById(registeredDealerId);
    if (!dealer) {
      return res.status(404).json({
        success: false,
        message: "Associated Dealer shop not found"
      });
    }

    // 7. Ensure ration card number is unique
    const cardExists = await Beneficiary.findOne({ rationCardNumber: trimmedCard });
    if (cardExists) {
      return res.status(400).json({
        success: false,
        message: "Ration Card Number is already in use"
      });
    }

    // 8. Programmatically generate Ethereum wallet
    const { address, privateKey } = walletUtil.createWallet();
    const encryptedPrivateKey = walletUtil.encryptPrivateKey(privateKey);

    // 9. Save User credentials
    const user = new User({
      name: name.trim(),
      password,
      role: "Beneficiary",
      walletAddress: address,
      encryptedPrivateKey
    });
    await user.save();
    createdUser = user;

    // 10. Save Beneficiary details with verified mobile number
    const beneficiary = new Beneficiary({
      userId: user._id,
      name: name.trim(),
      rationCardNumber: trimmedCard,
      mobileNumber: trimmedMobile,
      walletAddress: address,
      monthlyEntitlement: Number(monthlyEntitlement),
      registeredDealer: dealer._id,
      isRegisteredOnChain: false
    });
    await beneficiary.save();
    createdBeneficiary = beneficiary;

    // 11. Register beneficiary on-chain (using Admin's signature)
    const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY;
    if (!adminPrivateKey) {
      throw new Error("Admin private key is missing in .env config");
    }

    try {
      console.log(`[ON-CHAIN] Registering beneficiary wallet address: ${address}`);
      await blockchainService.registerBeneficiary(address, monthlyEntitlement, adminPrivateKey);
      beneficiary.isRegisteredOnChain = true;
      await beneficiary.save();
    } catch (bcErr) {
      console.error(`[BLOCKCHAIN TX WARNING]: Failed to register on-chain: ${bcErr.message}`);
      // Continue without failing HTTP request - allows registration recovery later
      return res.status(201).json({
        success: true,
        message: "Beneficiary profile created in DB, but blockchain sync is pending",
        data: {
          beneficiaryId: beneficiary._id,
          name: beneficiary.name,
          rationCardNumber: beneficiary.rationCardNumber,
          mobileNumber: beneficiary.mobileNumber,
          walletAddress: address,
          isRegisteredOnChain: false
        }
      });
    }

    return res.status(201).json({
      success: true,
      message: "Beneficiary registered and synchronized on-chain successfully",
      data: {
        beneficiaryId: beneficiary._id,
        name: beneficiary.name,
        rationCardNumber: beneficiary.rationCardNumber,
        mobileNumber: beneficiary.mobileNumber,
        walletAddress: beneficiary.walletAddress,
        monthlyEntitlement: beneficiary.monthlyEntitlement,
        isRegisteredOnChain: true
      }
    });

  } catch (error) {
    console.error(`[ADMIN REG BENEFICIARY ERROR]: ${error.message}`);
    // Rollback: If user account was created but beneficiary document failed to save, remove orphaned user
    if (createdUser && createdUser._id && (!createdBeneficiary || !createdBeneficiary._id)) {
      try {
        await User.findByIdAndDelete(createdUser._id);
        console.log(`[ROLLBACK] Cleaned up orphaned User account ${createdUser._id}`);
      } catch (cleanupErr) {
        console.error(`[ROLLBACK ERROR]: ${cleanupErr.message}`);
      }
    }
    return res.status(500).json({
      success: false,
      message: "Server error registering beneficiary profile",
      error: error.message
    });
  }
};

/**
 * Modify monthly grain entitlement of a beneficiary.
 * Updates entitlement on-chain and updates off-chain MongoDB records.
 * @route POST /api/admin/allocate
 */
const allocateEntitlement = async (req, res) => {
  const { rationCardNumber, newEntitlement } = req.body;

  try {
    if (!rationCardNumber || !newEntitlement) {
      return res.status(400).json({
        success: false,
        message: "Please provide rationCardNumber and newEntitlement"
      });
    }

    const beneficiary = await Beneficiary.findOne({ rationCardNumber: rationCardNumber.trim() });
    if (!beneficiary) {
      return res.status(404).json({
        success: false,
        message: "Beneficiary profile not found"
      });
    }

    // Call blockchain update
    const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY;
    try {
      await blockchainService.updateEntitlement(beneficiary.walletAddress, newEntitlement, adminPrivateKey);
      beneficiary.isRegisteredOnChain = true;
    } catch (bcErr) {
      console.warn(`[BLOCKCHAIN TX WARNING]: Failed to sync entitlement on-chain: ${bcErr.message}`);
    }

    // Sync database
    beneficiary.monthlyEntitlement = Number(newEntitlement);
    await beneficiary.save();

    return res.status(200).json({
      success: true,
      message: "Monthly allocation updated successfully on DB and blockchain",
      data: {
        rationCardNumber: beneficiary.rationCardNumber,
        newEntitlement: beneficiary.monthlyEntitlement
      }
    });

  } catch (error) {
    console.error(`[ADMIN ALLOCATE ERROR]: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Server error allocating new entitlement",
      error: error.message
    });
  }
};

/**
 * Records a grain transfer from Central Admin storage to a Dealer.
 * Executes on-chain verification and increases Dealer current and allocated stock in DB.
 * @route POST /api/admin/transfer
 */
const transferGrain = async (req, res) => {
  const { dealerId, quantity } = req.body;

  try {
    if (!dealerId || !quantity) {
      return res.status(400).json({
        success: false,
        message: "Please provide dealerId and quantity"
      });
    }

    const dealer = await Dealer.findById(dealerId).populate("userId");
    if (!dealer) {
      return res.status(404).json({
        success: false,
        message: "Dealer profile not found"
      });
    }

    const targetWallet = dealer.userId.walletAddress;
    const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY;

    // Check central warehouse stock
    const Warehouse = require("../models/Warehouse.model");
    let warehouse = await Warehouse.findOne();
    if (!warehouse) {
      const initialStock = Number(process.env.INITIAL_WAREHOUSE_STOCK) || 100000;
      warehouse = new Warehouse({ stock: initialStock });
      await warehouse.save();
    }

    if (warehouse.stock < Number(quantity)) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock in Central Warehouse. Available: ${warehouse.stock} kg`
      });
    }

    // Call on-chain GrainTransfer
    const tx = await blockchainService.transferGrain(targetWallet, quantity, adminPrivateKey);

    // Decrement central stock
    warehouse.stock -= Number(quantity);
    await warehouse.save();

    // Sync database inventories
    dealer.allocatedStock += Number(quantity);
    dealer.currentStock += Number(quantity);
    await dealer.save();

    return res.status(200).json({
      success: true,
      message: "Grain transfer registered on blockchain and inventories updated",
      data: {
        dealerId: dealer._id,
        fpsShopId: dealer.fpsShopId,
        quantityTransferred: Number(quantity),
        allocatedStock: dealer.allocatedStock,
        currentStock: dealer.currentStock,
        transactionHash: tx.transactionHash,
        warehouseStock: warehouse.stock
      }
    });

  } catch (error) {
    console.error(`[ADMIN TRANSFER ERROR]: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Server error transferring grain allocation",
      error: error.message
    });
  }
};

const getDealers = async (req, res) => {
  try {
    const dealers = await Dealer.find().populate("userId", "name email walletAddress");
    return res.status(200).json({
      success: true,
      data: dealers
    });
  } catch (error) {
    console.error(`[ADMIN GET DEALERS ERROR]: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Server error retrieving dealers list",
      error: error.message
    });
  }
};

const getBeneficiaries = async (req, res) => {
  try {
    const beneficiaries = await Beneficiary.find().populate("registeredDealer");
    return res.status(200).json({
      success: true,
      data: beneficiaries
    });
  } catch (error) {
    console.error(`[ADMIN GET BENEFICIARIES ERROR]: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Server error retrieving beneficiaries list",
      error: error.message
    });
  }
};

const getStats = async (req, res) => {
  try {
    const dealersCount = await Dealer.countDocuments();
    const beneficiariesCount = await Beneficiary.countDocuments();

    let transfersCount = 0;
    let distributionsCount = 0;

    try {
      const transfers = await blockchainService.getAllGrainTransfers();
      transfersCount = transfers.length;
    } catch (e) {
      console.warn("Blockchain transfers read failed", e.message);
    }

    try {
      const distributions = await blockchainService.getAllDistributions();
      distributionsCount = distributions.length;
    } catch (e) {
      console.warn("Blockchain distributions read failed", e.message);
    }

    // Fetch warehouse stock
    const Warehouse = require("../models/Warehouse.model");
    let warehouse = await Warehouse.findOne();
    if (!warehouse) {
      const initialStock = Number(process.env.INITIAL_WAREHOUSE_STOCK) || 100000;
      warehouse = new Warehouse({ stock: initialStock });
      await warehouse.save();
    }

    return res.status(200).json({
      success: true,
      data: {
        totalDealers: dealersCount,
        totalBeneficiaries: beneficiariesCount,
        totalTransfers: transfersCount,
        totalDistributions: distributionsCount,
        warehouseStock: warehouse.stock
      }
    });
  } catch (error) {
    console.error(`[ADMIN STATS ERROR]: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Server error retrieving stats",
      error: error.message
    });
  }
};

const resetMonthlyCycle = async (req, res) => {
  try {
    const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY;
    if (!adminPrivateKey) {
      return res.status(500).json({
        success: false,
        message: "Server Configuration Error: Admin Private Key is missing."
      });
    }

    console.log("[ON-CHAIN] Triggering monthly collection status reset...");
    const tx = await blockchainService.resetMonthlyCollection(adminPrivateKey);

    return res.status(200).json({
      success: true,
      message: "Monthly cycle successfully reset. All cardholders can now collect ration for the new cycle.",
      data: {
        transactionHash: tx.transactionHash,
        blockNumber: tx.blockNumber
      }
    });
  } catch (error) {
    console.error(`[ADMIN RESET CYCLE ERROR]: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Server error resetting monthly cycle",
      error: error.message
    });
  }
};

/**
 * Generate a 6-digit OTP for beneficiary registration verification.
 * Displays OTP in backend terminal for demo, stores secure hash in MongoDB.
 * @route POST /api/admin/generate-otp
 */
const generateOtp = async (req, res) => {
  const { mobileNumber, rationCardNumber } = req.body;

  try {
    if (!mobileNumber || !rationCardNumber) {
      return res.status(400).json({
        success: false,
        message: "Please provide both mobileNumber and rationCardNumber"
      });
    }

    const trimmedCard = rationCardNumber.toString().trim();
    const trimmedMobile = mobileNumber.toString().trim();

    // Validate 10-digit mobile number format
    if (!/^\d{10}$/.test(trimmedMobile)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid 10-digit mobile number"
      });
    }

    // Check if ration card number is already registered in DB
    const cardExists = await Beneficiary.findOne({ rationCardNumber: trimmedCard });
    if (cardExists) {
      return res.status(400).json({
        success: false,
        message: "Ration Card Number is already in use by another beneficiary"
      });
    }

    // Generate cryptographically secure random 6-digit OTP (100000 - 999999)
    const otp = crypto.randomInt(100000, 1000000).toString();

    // Generate random salt and compute secure SHA-256 hash of OTP
    const salt = crypto.randomBytes(16).toString("hex");
    const otpHash = crypto.createHash("sha256").update(otp + salt).digest("hex");

    // Expiration time set to 5 minutes from now
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Invalidate any existing pending sessions for this card or mobile
    await OtpSession.deleteMany({
      $or: [{ rationCardNumber: trimmedCard }, { mobileNumber: trimmedMobile }],
      isVerified: false
    });

    // Create new OTP verification session
    const session = new OtpSession({
      mobileNumber: trimmedMobile,
      rationCardNumber: trimmedCard,
      otpHash,
      salt,
      attempts: 0,
      maxAttempts: 3,
      isVerified: false,
      expiresAt
    });

    await session.save();

    // Prominently print OTP to backend terminal for demonstration purposes
    console.log("\n======================================================================");
    console.log("   [PDS TRUSTLINK] BENEFICIARY REGISTRATION OTP - DEMO MODE");
    console.log("======================================================================");
    console.log(`   Ration Card Number : ${trimmedCard}`);
    console.log(`   Mobile Number      : ${trimmedMobile}`);
    console.log(`   One-Time Password  : >>>  ${otp}  <<<`);
    console.log(`   Validity           : 5 Minutes (Expires at: ${expiresAt.toLocaleTimeString()})`);
    console.log(`   Max Attempts       : 3`);
    console.log("======================================================================\n");

    return res.status(200).json({
      success: true,
      message: "Verification OTP generated successfully and displayed in server terminal",
      data: {
        otpSessionId: session._id,
        expiresAt: session.expiresAt
      }
    });

  } catch (error) {
    console.error(`[ADMIN GENERATE OTP ERROR]: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Server error generating registration OTP",
      error: error.message
    });
  }
};

/**
 * Verify 6-digit OTP entered by Admin.
 * Checks expiry, attempt limit, and constant-time hash equality.
 * Issues single-use verificationToken on success.
 * @route POST /api/admin/verify-otp
 */
const verifyOtp = async (req, res) => {
  const { otpSessionId, otp } = req.body;

  try {
    if (!otpSessionId || !otp) {
      return res.status(400).json({
        success: false,
        message: "Please provide otpSessionId and otp"
      });
    }

    const trimmedOtp = otp.toString().trim();
    if (trimmedOtp.length !== 6) {
      return res.status(400).json({
        success: false,
        message: "OTP must be exactly 6 digits"
      });
    }

    const session = await OtpSession.findById(otpSessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: "OTP verification session not found or has expired. Please generate a new OTP."
      });
    }

    // Check if session was already verified
    if (session.isVerified) {
      return res.status(400).json({
        success: false,
        message: "This OTP session has already been verified and cannot be reused"
      });
    }

    // Check if expired
    if (Date.now() > new Date(session.expiresAt).getTime()) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please generate a new OTP."
      });
    }

    // Check attempt limits
    if (session.attempts >= session.maxAttempts) {
      return res.status(400).json({
        success: false,
        message: "Maximum verification attempts exceeded. Please generate a new OTP."
      });
    }

    // Hash entered OTP with session salt
    const candidateHash = crypto.createHash("sha256").update(trimmedOtp + session.salt).digest("hex");

    // Constant-time buffer comparison to prevent timing side-channel attacks
    const candidateBuffer = Buffer.from(candidateHash, "hex");
    const storedBuffer = Buffer.from(session.otpHash, "hex");
    const isMatch = candidateBuffer.length === storedBuffer.length && crypto.timingSafeEqual(candidateBuffer, storedBuffer);

    if (!isMatch) {
      session.attempts += 1;
      await session.save();

      const attemptsRemaining = session.maxAttempts - session.attempts;
      if (attemptsRemaining <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid OTP. Maximum attempts exceeded. This session has been locked. Please generate a new OTP.",
          data: { attemptsRemaining: 0 }
        });
      }

      return res.status(400).json({
        success: false,
        message: `Invalid OTP. ${attemptsRemaining} attempt(s) remaining.`,
        data: { attemptsRemaining }
      });
    }

    // Successful verification: Issue cryptographic single-use verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenHash = crypto.createHash("sha256").update(verificationToken).digest("hex");

    session.isVerified = true;
    session.verificationTokenHash = verificationTokenHash;
    session.tokenExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // Token valid for 5 minutes
    session.isUsed = false;
    await session.save();

    console.log(`[PDS TRUSTLINK] OTP successfully verified for Ration Card: ${session.rationCardNumber}`);

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully. Beneficiary registration is authorized.",
      data: {
        verificationToken,
        rationCardNumber: session.rationCardNumber,
        mobileNumber: session.mobileNumber
      }
    });

  } catch (error) {
    console.error(`[ADMIN VERIFY OTP ERROR]: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Server error verifying OTP",
      error: error.message
    });
  }
};

module.exports = {
  registerDealer,
  registerBeneficiary,
  allocateEntitlement,
  transferGrain,
  getDealers,
  getBeneficiaries,
  getStats,
  resetMonthlyCycle,
  generateOtp,
  verifyOtp
};
