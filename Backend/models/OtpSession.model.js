const mongoose = require("mongoose");

const otpSessionSchema = new mongoose.Schema({
  mobileNumber: {
    type: String,
    required: true,
    trim: true
  },
  rationCardNumber: {
    type: String,
    required: true,
    trim: true
  },
  otpHash: {
    type: String,
    required: true
  },
  salt: {
    type: String,
    required: true
  },
  attempts: {
    type: Number,
    default: 0
  },
  maxAttempts: {
    type: Number,
    default: 3
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationTokenHash: {
    type: String,
    default: null,
    index: true
  },
  tokenExpiresAt: {
    type: Date,
    default: null
  },
  isUsed: {
    type: Boolean,
    default: false
  },
  usedAt: {
    type: Date,
    default: null
  },
  expiresAt: {
    type: Date,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600 // Auto-purge expired session documents from MongoDB after 10 minutes
  }
});

module.exports = mongoose.model("OtpSession", otpSessionSchema);
