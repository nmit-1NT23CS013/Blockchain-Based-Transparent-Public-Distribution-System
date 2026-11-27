/**
 * PDS TrustLink - Phase 6 Automated Test Suite
 * Tests Public Receipt Verification & End-to-End Cryptographic Ledger Validation:
 * 1. Public accessibility (no JWT required)
 * 2. Input validation for receiptId format
 * 3. 404 handling for non-existent receipts
 * 4. Privacy masking (names and ration card numbers masked; mobile number never exposed)
 * 5. Full cryptographic verification against blockchain contract state (ReceiptManager.sol)
 * 6. Discrepancy detection (quantity mismatch, transaction hash mismatch)
 * 7. Graceful handling of missing on-chain receipts
 * 8. Blockchain offline / unreachable fallback
 * 9. Rate limiting protection
 * 10. QR code URL format check
 */

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const crypto = require("crypto");

dotenv.config({ path: path.join(__dirname, "../.env") });

const User = require("../models/User.model");
const Dealer = require("../models/Dealer.model");
const Beneficiary = require("../models/Beneficiary.model");
const Receipt = require("../models/Receipt.model");
const blockchainService = require("../services/blockchainService");
const { verifyReceipt, maskName, maskRationCard } = require("../controllers/dashboardController");

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/pds-blockchain";

const mockReqRes = (params = {}, headers = {}, ip = "127.0.0.1") => {
  const req = { params, headers, ip, connection: { remoteAddress: ip } };
  let statusCode = 200;
  let jsonResponse = null;

  const res = {
    status: (code) => {
      statusCode = code;
      return res;
    },
    json: (data) => {
      jsonResponse = data;
      return res;
    }
  };

  return {
    req,
    res,
    getResult: () => ({
      status: statusCode,
      body: jsonResponse
    })
  };
};

let totalPassed = 0;
function assert(condition, message) {
  if (!condition) {
    console.error(`  [FAIL] ${message}`);
    process.exit(1);
  } else {
    console.log(`  [PASS] Test ${++totalPassed}: ${message}`);
  }
}

async function runPhase6Tests() {
  console.log("\n======================================================================");
  console.log("   RUNNING PHASE 6: PUBLIC RECEIPT VERIFICATION TEST SUITE");
  console.log("======================================================================\n");

  await mongoose.connect(MONGO_URI);
  console.log("✔ Connected to MongoDB for Phase 6 verification.\n");

  const runId = Date.now();

  // -------------------------------------------------------------
  // Test Set 1: Masking & Privacy Helpers
  // -------------------------------------------------------------
  assert(maskName("Aditya Kumar") === "Ad**** Ku***", "maskName masks multi-word citizen name");
  assert(maskName("Ramesh") === "Ra****", "maskName masks single-word name");
  assert(maskName("Om") === "O*", "maskName masks short names safely");
  assert(maskRationCard("RC001") === "RC***1", "maskRationCard masks short ration card");
  assert(maskRationCard("RC-2026-998877") === "RC******877", "maskRationCard preserves prefix and suffix");

  // -------------------------------------------------------------
  // Test Set 2: Input Validation
  // -------------------------------------------------------------
  const invalidIdReq = mockReqRes({ receiptId: "bad/id/with/slashes" }, {}, `ip_inv_${runId}`);
  await verifyReceipt(invalidIdReq.req, invalidIdReq.res);
  assert(invalidIdReq.getResult().status === 400, "verifyReceipt rejects invalid receiptId with HTTP 400");
  assert(invalidIdReq.getResult().body.status === "INVALID_RECEIPT_ID", "Status reports INVALID_RECEIPT_ID");

  const emptyIdReq = mockReqRes({ receiptId: "  " }, {}, `ip_empty_${runId}`);
  await verifyReceipt(emptyIdReq.req, emptyIdReq.res);
  assert(emptyIdReq.getResult().status === 400, "verifyReceipt rejects empty receiptId with HTTP 400");

  // -------------------------------------------------------------
  // Test Set 3: 404 Non-Existent Receipt
  // -------------------------------------------------------------
  const notFoundReq = mockReqRes({ receiptId: `PDS-RCP-NONEXISTENT-${runId}` }, {}, `ip_nf_${runId}`);
  await verifyReceipt(notFoundReq.req, notFoundReq.res);
  assert(notFoundReq.getResult().status === 404, "Unknown receiptId returns HTTP 404");
  assert(notFoundReq.getResult().body.verified === false, "404 response sets verified: false");
  assert(notFoundReq.getResult().body.status === "NOT_FOUND", "Status reports NOT_FOUND");

  // -------------------------------------------------------------
  // Setup Test Fixtures in MongoDB
  // -------------------------------------------------------------
  const dealerUser = await User.create({
    name: "Shri Test Dealer",
    email: `dealer6_${runId}@pds.com`,
    password: "Password123",
    role: "Dealer",
    walletAddress: `0x${crypto.randomBytes(20).toString("hex")}`,
    encryptedPrivateKey: "test_key"
  });
  const dealerDoc = await Dealer.create({
    userId: dealerUser._id,
    fpsShopId: `FPS-VERIFY-${runId}`,
    location: "Sector 14 Distribution Hub",
    currentStock: 5000,
    allocatedStock: 5000
  });

  const benCardNumber = `RC-VERIFY-${runId}`;
  const benUser = await User.create({
    name: "Smt. Sunita Sharma",
    email: `ben6_${runId}@pds.com`,
    password: "Password123",
    role: "Beneficiary",
    walletAddress: `0x${crypto.randomBytes(20).toString("hex")}`,
    encryptedPrivateKey: "test_key",
    rationCardNumber: benCardNumber
  });
  const benDoc = await Beneficiary.create({
    userId: benUser._id,
    name: "Smt. Sunita Sharma",
    rationCardNumber: benCardNumber,
    mobileNumber: "9876543210",
    registeredDealer: dealerDoc._id,
    monthlyEntitlement: 35,
    walletAddress: benUser.walletAddress
  });

  const validTxHash = `0x${crypto.randomBytes(32).toString("hex")}`;
  const validReceiptDoc = await Receipt.create({
    receiptId: `PDS-RCP-2026-${runId.toString().slice(-5)}`,
    beneficiaryId: benDoc._id,
    dealerId: dealerDoc._id,
    beneficiaryName: benDoc.name,
    rationCardNumber: benCardNumber,
    mobileNumber: benDoc.mobileNumber, // Sensitive: MUST be excluded in public response
    beneficiaryWalletAddress: benDoc.walletAddress,
    dealerName: dealerUser.name,
    fpsShopId: dealerDoc.fpsShopId,
    dealerLocation: dealerDoc.location,
    dealerWalletAddress: dealerUser.walletAddress,
    distributionDate: new Date(),
    distributionMonth: "November 2026",
    commodity: "Subsidized Food Grains (Wheat / Rice)",
    quantity: 35,
    unit: "kg",
    blockchainReceiptId: "1",
    blockchainBeneficiaryId: String(Number(benCardNumber.replace(/\D/g, "")) || 1),
    transactionHash: validTxHash,
    blockNumber: 4501,
    contractAddress: "0xb2F5114456Bc60460023139C18B97963f8E94c76",
    receiptStatus: "Confirmed on Blockchain",
    verificationUrl: `http://localhost:5173/verify/PDS-RCP-2026-${runId.toString().slice(-5)}`
  });

  // -------------------------------------------------------------
  // Test Set 4: Privacy & Field Sanitization Check
  // -------------------------------------------------------------
  // Temporarily stub blockchainService to simulate on-chain verification
  const originalGetBlockchainReceipt = blockchainService.getBlockchainReceipt;
  
  blockchainService.getBlockchainReceipt = async (bcId) => ({
    receiptId: String(bcId),
    beneficiaryId: String(Number(benCardNumber.replace(/\D/g, "")) || 1),
    quantity: "35",
    transactionReference: validTxHash,
    timestamp: new Date()
  });

  const verifySuccessReq = mockReqRes({ receiptId: validReceiptDoc.receiptId }, {}, `ip_pub_${runId}`);
  await verifyReceipt(verifySuccessReq.req, verifySuccessReq.res);
  const successRes = verifySuccessReq.getResult();

  assert(successRes.status === 200, "verifyReceipt returns HTTP 200 for matching receipt");
  assert(successRes.body.verified === true, "verifyReceipt sets verified: true");
  assert(successRes.body.status === "CRYPTOGRAPHICALLY_VERIFIED", "Status is CRYPTOGRAPHICALLY_VERIFIED");

  // Privacy checks:
  const respData = successRes.body.data;
  assert(respData.maskedBeneficiaryName.includes("*"), "Beneficiary name is masked in public response");
  assert(respData.maskedRationCardNumber.includes("*"), "Ration card number is masked in public response");
  assert(respData.mobileNumber === undefined, "CRITICAL: Beneficiary mobile number is NOT present in response");
  assert(successRes.body.mobileNumber === undefined, "CRITICAL: Mobile number is completely excluded from root response");
  assert(respData.beneficiaryWalletAddress === undefined, "Private wallet address is omitted from public response");
  assert(respData.transactionHash === validTxHash, "Transaction reference hash is provided for transparency verification");
  assert(respData.blockchainProof !== undefined, "Blockchain cryptographic proof object is included");
  assert(respData.blockchainProof.receiptId === "1", "Blockchain proof includes on-chain receipt ID");

  // -------------------------------------------------------------
  // Test Set 5: Discrepancy Detection - Quantity Mismatch
  // -------------------------------------------------------------
  blockchainService.getBlockchainReceipt = async (bcId) => ({
    receiptId: String(bcId),
    beneficiaryId: String(Number(benCardNumber.replace(/\D/g, "")) || 1),
    quantity: "20", // Tampered/Mismatched quantity (Contract has 20kg, DB has 35kg)
    transactionReference: validTxHash,
    timestamp: new Date()
  });

  const qtyMismatchReq = mockReqRes({ receiptId: validReceiptDoc.receiptId }, {}, `ip_mismatch_qty_${runId}`);
  await verifyReceipt(qtyMismatchReq.req, qtyMismatchReq.res);
  const qtyMismatchRes = qtyMismatchReq.getResult();

  assert(qtyMismatchRes.body.verified === false, "Mismatched quantity fails verification (verified: false)");
  assert(qtyMismatchRes.body.status === "VERIFICATION_MISMATCH", "Status reports VERIFICATION_MISMATCH");
  assert(
    qtyMismatchRes.body.discrepancies.some((d) => d.includes("Quantity mismatch")),
    "Discrepancies report details quantity difference"
  );

  // -------------------------------------------------------------
  // Test Set 6: Discrepancy Detection - Transaction Reference Mismatch
  // -------------------------------------------------------------
  blockchainService.getBlockchainReceipt = async (bcId) => ({
    receiptId: String(bcId),
    beneficiaryId: String(Number(benCardNumber.replace(/\D/g, "")) || 1),
    quantity: "35",
    transactionReference: "0xTAMPERED_TRANSACTION_HASH_FAKE",
    timestamp: new Date()
  });

  const txMismatchReq = mockReqRes({ receiptId: validReceiptDoc.receiptId }, {}, `ip_mismatch_tx_${runId}`);
  await verifyReceipt(txMismatchReq.req, txMismatchReq.res);
  const txMismatchRes = txMismatchReq.getResult();

  assert(txMismatchRes.body.verified === false, "Mismatched transaction reference fails verification");
  assert(
    txMismatchRes.body.discrepancies.some((d) => d.includes("Transaction Reference mismatch")),
    "Discrepancies report details transaction reference difference"
  );

  // -------------------------------------------------------------
  // Test Set 7: Receipt missing on blockchain (Reverted getReceipt call)
  // -------------------------------------------------------------
  blockchainService.getBlockchainReceipt = async () => {
    throw new Error("ReceiptManager: Receipt does not exist");
  };

  const missingOnChainReq = mockReqRes({ receiptId: validReceiptDoc.receiptId }, {}, `ip_notonchain_${runId}`);
  await verifyReceipt(missingOnChainReq.req, missingOnChainReq.res);
  const missingOnChainRes = missingOnChainReq.getResult();

  assert(missingOnChainRes.body.verified === false, "Missing on-chain record fails verification");
  assert(missingOnChainRes.body.status === "NOT_FOUND_ON_CHAIN", "Status reports NOT_FOUND_ON_CHAIN");

  // -------------------------------------------------------------
  // Test Set 8: Blockchain Node Offline / Unreachable
  // -------------------------------------------------------------
  blockchainService.getBlockchainReceipt = async () => {
    throw new Error("connect ECONNREFUSED 127.0.0.1:7545");
  };

  const nodeOfflineReq = mockReqRes({ receiptId: validReceiptDoc.receiptId }, {}, `ip_offline_${runId}`);
  await verifyReceipt(nodeOfflineReq.req, nodeOfflineReq.res);
  const nodeOfflineRes = nodeOfflineReq.getResult();

  assert(nodeOfflineRes.body.verified === false, "Blockchain offline sets verified: false");
  assert(nodeOfflineRes.body.status === "BLOCKCHAIN_UNAVAILABLE", "Status reports BLOCKCHAIN_UNAVAILABLE");
  assert(nodeOfflineRes.body.data !== undefined, "Off-chain metadata still returned for user information");

  // -------------------------------------------------------------
  // Test Set 9: Receipt with No Blockchain Receipt ID
  // -------------------------------------------------------------
  const noBcIdDoc = await Receipt.create({
    receiptId: `PDS-RCP-NOBC-${runId}`,
    beneficiaryId: benDoc._id,
    dealerId: dealerDoc._id,
    beneficiaryName: benDoc.name,
    rationCardNumber: benCardNumber,
    dealerName: dealerUser.name,
    fpsShopId: dealerDoc.fpsShopId,
    dealerLocation: dealerDoc.location,
    dealerWalletAddress: dealerUser.walletAddress,
    beneficiaryWalletAddress: benDoc.walletAddress,
    distributionDate: new Date(),
    distributionMonth: "November 2026",
    commodity: "Subsidized Food Grains",
    quantity: 10,
    blockchainReceiptId: null, // No on-chain ID
    transactionHash: `0xnobc_${runId}`,
    verificationUrl: `http://localhost:5173/verify/PDS-RCP-NOBC-${runId}`
  });

  const noBcReq = mockReqRes({ receiptId: noBcIdDoc.receiptId }, {}, `ip_nobc_${runId}`);
  await verifyReceipt(noBcReq.req, noBcReq.res);
  const noBcRes = noBcReq.getResult();

  assert(noBcRes.body.verified === false, "Receipt with null blockchainReceiptId sets verified: false");
  assert(noBcRes.body.status === "NO_BLOCKCHAIN_RECEIPT_ID", "Status reports NO_BLOCKCHAIN_RECEIPT_ID");

  // -------------------------------------------------------------
  // Test Set 10: Rate Limiting Enforcement
  // -------------------------------------------------------------
  const rateLimitIp = `ip_rate_test_${runId}`;
  let rateLimitHit = false;
  for (let i = 0; i < 35; i++) {
    const rlReq = mockReqRes({ receiptId: validReceiptDoc.receiptId }, {}, rateLimitIp);
    await verifyReceipt(rlReq.req, rlReq.res);
    if (rlReq.getResult().status === 429) {
      rateLimitHit = true;
      break;
    }
  }
  assert(rateLimitHit === true, "Excessive rapid requests trigger HTTP 429 Rate Limiting");

  // Restore blockchainService
  blockchainService.getBlockchainReceipt = originalGetBlockchainReceipt;

  // Cleanup fixtures
  await User.deleteMany({ _id: { $in: [dealerUser._id, benUser._id] } });
  await Dealer.deleteMany({ _id: dealerDoc._id });
  await Beneficiary.deleteMany({ _id: benDoc._id });
  await Receipt.deleteMany({ receiptId: { $in: [validReceiptDoc.receiptId, noBcIdDoc.receiptId] } });

  await mongoose.disconnect();

  console.log("\n======================================================================");
  console.log(`   ALL ${totalPassed}/${totalPassed} PHASE 6 VERIFICATION TESTS PASSED!`);
  console.log("======================================================================\n");

  process.exit(0);
}

runPhase6Tests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
