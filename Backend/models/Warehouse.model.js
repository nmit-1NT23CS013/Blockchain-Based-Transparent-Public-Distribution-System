const mongoose = require("mongoose");

const warehouseSchema = new mongoose.Schema({
  stock: {
    type: Number,
    required: true,
    default: () => Number(process.env.INITIAL_WAREHOUSE_STOCK) || 100000
  }
});

module.exports = mongoose.model("Warehouse", warehouseSchema);
