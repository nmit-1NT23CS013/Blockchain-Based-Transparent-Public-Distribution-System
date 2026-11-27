const express = require("express");
const cors = require("cors");
const path = require("path");
const dotenv = require("dotenv");
const connectDB = require("./config/db");

// Load environment configurations explicitly from Backend directory
dotenv.config({ path: path.join(__dirname, ".env") });

// Establish connection to MongoDB database
connectDB();

const app = express();

// Middleware Configurations
app.use(cors());
app.use(express.json());

// Bind Router Handlers
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/admin", require("./routes/admin.routes"));
app.use("/api/dealer", require("./routes/dealer.routes"));
app.use("/api/beneficiary", require("./routes/beneficiary.routes"));
app.use("/api/dashboard", require("./routes/dashboard.routes"));

// Default Root Check Route
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Blockchain-Powered PDS Backend is running successfully"
  });
});

// Centralized Request Error Handler Middleware
app.use((err, req, res, next) => {
  console.error(`[GLOBAL EXCEPTION HANDLER]: ${err.stack}`);
  res.status(500).json({
    success: false,
    message: "An internal server error occurred in the request pipeline",
    error: err.message
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`[SUCCESS] Express Server listening on port: ${PORT}`);
});
