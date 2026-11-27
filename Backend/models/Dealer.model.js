const mongoose = require("mongoose");

const dealerSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  fpsShopId: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true 
  },
  allocatedStock: { 
    type: Number, 
    default: 0 // Track total allocated grains from Admin (in kg)
  },
  currentStock: { 
    type: Number, 
    default: 0 // Physical grains remaining at shop (in kg)
  },
  location: { 
    type: String, 
    required: true,
    trim: true 
  }
});

module.exports = mongoose.model("Dealer", dealerSchema);
