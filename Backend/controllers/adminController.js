const User = require("../models/User.model");
const Dealer = require("../models/Dealer.model");
const Beneficiary = require("../models/Beneficiary.model");
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
const registerBeneficiary = async (req, res) => {
  const { name, rationCardNumber, password, monthlyEntitlement, registeredDealerId } = req.body;

  try {
    if (!name || !rationCardNumber || !password || !monthlyEntitlement || !registeredDealerId) {
      return res.status(400).json({
        success: false,
        message: "Please provide name, rationCardNumber, password, monthlyEntitlement, and registeredDealerId"
      });
    }

    // Ensure dealer shop exists
    const dealer = await Dealer.findById(registeredDealerId);
    if (!dealer) {
      return res.status(404).json({
        success: false,
        message: "Associated Dealer shop not found"
      });
    }

    // Ensure ration card number is unique
    const cardExists = await Beneficiary.findOne({ rationCardNumber: rationCardNumber.trim() });
    if (cardExists) {
      return res.status(400).json({
        success: false,
        message: "Ration Card Number is already in use"
      });
    }

    // Programmatically generate Ethereum wallet
    const { address, privateKey } = walletUtil.createWallet();
    const encryptedPrivateKey = walletUtil.encryptPrivateKey(privateKey);

    // Save User credentials
    const user = new User({
      name,
      password,
      role: "Beneficiary",
      walletAddress: address,
      encryptedPrivateKey
    });
    await user.save();

    // Save Beneficiary details
    const beneficiary = new Beneficiary({
      userId: user._id,
      name,
      rationCardNumber: rationCardNumber.trim(),
      walletAddress: address,
      monthlyEntitlement: Number(monthlyEntitlement),
      registeredDealer: dealer._id,
      isRegisteredOnChain: false
    });
    await beneficiary.save();

    // Register beneficiary on-chain (using Admin's signature)
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
          rationCardNumber: beneficiary.rationCardNumber,
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
        walletAddress: beneficiary.walletAddress,
        monthlyEntitlement: beneficiary.monthlyEntitlement,
        isRegisteredOnChain: true
      }
    });

  } catch (error) {
    console.error(`[ADMIN REG BENEFICIARY ERROR]: ${error.message}`);
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
    await blockchainService.updateEntitlement(beneficiary.walletAddress, newEntitlement, adminPrivateKey);

    // Sync database
    beneficiary.monthlyEntitlement = Number(newEntitlement);
    beneficiary.isRegisteredOnChain = true;
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

    // Call on-chain GrainTransfer
    const tx = await blockchainService.transferGrain(targetWallet, quantity, adminPrivateKey);

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
        transactionHash: tx.transactionHash
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

    return res.status(200).json({
      success: true,
      data: {
        totalDealers: dealersCount,
        totalBeneficiaries: beneficiariesCount,
        totalTransfers: transfersCount,
        totalDistributions: distributionsCount
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

module.exports = {
  registerDealer,
  registerBeneficiary,
  allocateEntitlement,
  transferGrain,
  getDealers,
  getBeneficiaries,
  getStats,
  resetMonthlyCycle
};
