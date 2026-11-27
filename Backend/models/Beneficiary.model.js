const mongoose = require("mongoose");

const beneficiarySchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  name: { 
    type: String, 
    required: true,
    trim: true 
  },
  rationCardNumber: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true 
  },
  walletAddress: { 
    type: String, 
    required: true,
    unique: true 
  },
  monthlyEntitlement: { 
    type: Number, 
    required: true 
  },
  registeredDealer: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Dealer", 
    required: true 
  },
  isRegisteredOnChain: { 
    type: Boolean, 
    default: false 
  }
});

module.exports = mongoose.model("Beneficiary", beneficiarySchema);
