const mongoose = require("mongoose");

const receiptSchema = new mongoose.Schema({
  receiptId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  beneficiaryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Beneficiary",
    required: true,
    index: true
  },
  dealerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Dealer",
    required: true,
    index: true
  },
  beneficiaryName: {
    type: String,
    required: true,
    trim: true
  },
  rationCardNumber: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  mobileNumber: {
    type: String,
    trim: true,
    default: "N/A"
  },
  beneficiaryWalletAddress: {
    type: String,
    required: true,
    trim: true
  },
  dealerName: {
    type: String,
    required: true,
    trim: true
  },
  fpsShopId: {
    type: String,
    required: true,
    trim: true
  },
  dealerLocation: {
    type: String,
    required: true,
    trim: true
  },
  dealerWalletAddress: {
    type: String,
    required: true,
    trim: true
  },
  distributionDate: {
    type: Date,
    default: Date.now,
    required: true
  },
  distributionMonth: {
    type: String,
    required: true // e.g., "November 2026"
  },
  commodity: {
    type: String,
    default: "Food Grains (Wheat / Rice)",
    required: true
  },
  quantity: {
    type: Number,
    required: true // Quantity issued in kg
  },
  blockchainReceiptId: {
    type: String,
    default: null
  },
  blockchainBeneficiaryId: {
    type: String,
    default: null
  },
  transactionHash: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  blockNumber: {
    type: Number,
    default: null
  },
  contractAddress: {
    type: String,
    default: () => process.env.RECEIPT_MANAGER_ADDRESS || ""
  },
  receiptStatus: {
    type: String,
    default: "Confirmed on Blockchain"
  },
  verificationUrl: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Receipt", receiptSchema);
