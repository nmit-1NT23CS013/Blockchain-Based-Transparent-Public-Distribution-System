/**
 * PDS TrustLink - Phase 5 Integration Test Suite
 * Tests Beneficiary & Dealer Dashboard Integration:
 * 1. Beneficiary receipts list endpoint merges MongoDB Receipts and blockchain events
 * 2. Proper hasPdf flag determination (true for MongoDB records, false for legacy/unindexed)
 * 3. Dealer PDF download endpoint authorization & stream response
 * 4. Beneficiary PDF download endpoint authorization & stream response
 * 5. Isolation between different beneficiaries and dealers
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
const { getReceipts, downloadBeneficiaryReceiptPdf } = require("../controllers/beneficiaryController");
const { downloadReceiptPdf } = require("../controllers/dealerController");

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/pds-blockchain";

const mockReqRes = (body = {}, user = null, params = {}, headers = {}) => {
  const req = { body, user, params, headers };
  let statusCode = 200;
  let jsonResponse = null;
  let responseHeaders = {};
  let endBuffer = null;

  const res = {
    status: (code) => {
      statusCode = code;
      return res;
    },
    setHeader: (key, val) => {
      responseHeaders[key] = val;
      return res;
    },
    json: (data) => {
      jsonResponse = data;
      return res;
    },
    end: (buffer) => {
      endBuffer = buffer;
      return res;
    }
  };

  return {
    req,
    res,
    getResult: () => ({
      status: statusCode,
      body: jsonResponse,
      headers: responseHeaders,
      buffer: endBuffer
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

async function runPhase5Tests() {
  console.log("\n======================================================================");
  console.log("   RUNNING PHASE 5: RECEIPT DASHBOARD INTEGRATION TEST SUITE");
  console.log("======================================================================\n");

  await mongoose.connect(MONGO_URI);
  console.log("✔ Connected to MongoDB for Phase 5 verification.\n");

  const runId = Date.now();

  // Create Dealer 1 User & Dealer record
  const dealer1User = await User.create({
    name: `Dealer Test ${runId}`,
    email: `dealer5_${runId}@example.com`,
    password: "Password@123",
    role: "Dealer",
    walletAddress: `0x${crypto.randomBytes(20).toString("hex")}`,
    encryptedPrivateKey: "mock_encrypted_key"
  });
  const dealer1Doc = await Dealer.create({
    userId: dealer1User._id,
    fpsShopId: `FPS-P5-${runId}`,
    location: "City Center",
    currentStock: 5000,
    allocatedStock: 5000
  });

  // Create Dealer 2 User & Dealer record
  const dealer2User = await User.create({
    name: `Dealer 2 Test ${runId}`,
    email: `dealer5_other_${runId}@example.com`,
    password: "Password@123",
    role: "Dealer",
    walletAddress: `0x${crypto.randomBytes(20).toString("hex")}`,
    encryptedPrivateKey: "mock_encrypted_key"
  });
  const dealer2Doc = await Dealer.create({
    userId: dealer2User._id,
    fpsShopId: `FPS-OTHER-${runId}`,
    location: "Suburbs",
    currentStock: 5000,
    allocatedStock: 5000
  });

  // Create Beneficiary 1 User & Beneficiary record
  const ben1CardNumber = `RC-P5-${runId}`;
  const ben1User = await User.create({
    name: `Ben Citizen ${runId}`,
    email: `ben5_${runId}@example.com`,
    password: "Password@123",
    role: "Beneficiary",
    walletAddress: `0x${crypto.randomBytes(20).toString("hex")}`,
    encryptedPrivateKey: "mock_encrypted_key"
  });
  const ben1Doc = await Beneficiary.create({
    userId: ben1User._id,
    name: `Ben Citizen ${runId}`,
    rationCardNumber: ben1CardNumber,
    mobileNumber: "9876543210",
    registeredDealer: dealer1Doc._id,
    monthlyEntitlement: 35,
    walletAddress: ben1User.walletAddress
  });

  // Create Beneficiary 2 User & Beneficiary record
  const ben2CardNumber = `RC-OTHER-${runId}`;
  const ben2User = await User.create({
    name: `Other Citizen ${runId}`,
    email: `ben5_other_${runId}@example.com`,
    password: "Password@123",
    role: "Beneficiary",
    walletAddress: `0x${crypto.randomBytes(20).toString("hex")}`,
    encryptedPrivateKey: "mock_encrypted_key"
  });
  await Beneficiary.create({
    userId: ben2User._id,
    name: `Other Citizen ${runId}`,
    rationCardNumber: ben2CardNumber,
    mobileNumber: "9876543211",
    registeredDealer: dealer1Doc._id,
    monthlyEntitlement: 25,
    walletAddress: ben2User.walletAddress
  });

  // Seed a MongoDB receipt for Beneficiary 1 with Dealer 1
  const receiptDoc = await Receipt.create({
    receiptId: `REC-P5-${runId}-001`,
    beneficiaryId: ben1Doc._id,
    dealerId: dealer1Doc._id,
    beneficiaryName: ben1Doc.name,
    rationCardNumber: ben1CardNumber,
    mobileNumber: ben1Doc.mobileNumber,
    beneficiaryWalletAddress: ben1Doc.walletAddress,
    dealerName: dealer1User.name,
    fpsShopId: dealer1Doc.fpsShopId,
    dealerLocation: dealer1Doc.location,
    dealerWalletAddress: dealer1User.walletAddress,
    distributionDate: new Date(),
    distributionMonth: "November 2026",
    commodity: "Subsidized Food Grains (Rice/Wheat)",
    quantity: 35,
    unit: "kg",
    blockchainReceiptId: "991",
    transactionHash: `0xtxhash_p5_${runId}`,
    blockNumber: 12345,
    contractAddress: "0xb2F5114456Bc60460023139C18B97963f8E94c76",
    receiptStatus: "Confirmed on Blockchain",
    verificationUrl: `http://localhost:5173/verify/REC-P5-${runId}-001`
  });

  // TEST 1: Beneficiary getReceipts executes and returns merged records
  const ben1ReqRes = mockReqRes({}, { _id: ben1User._id, role: "Beneficiary" });
  await getReceipts(ben1ReqRes.req, ben1ReqRes.res);
  const receiptsResult = ben1ReqRes.getResult();

  assert(receiptsResult.status === 200, "Beneficiary getReceipts responds with HTTP 200");
  assert(receiptsResult.body.success === true, "Response contains success: true");
  assert(Array.isArray(receiptsResult.body.data), "Response contains data array");

  // TEST 2: Verify merged MongoDB receipt contains hasPdf: true and correct receiptId
  const matchingReceipt = receiptsResult.body.data.find(
    (r) => r.transactionReference === receiptDoc.transactionReference || r.receiptId === receiptDoc.receiptId
  );
  assert(matchingReceipt !== undefined, "Beneficiary receipt list contains seeded MongoDB receipt");
  assert(matchingReceipt.hasPdf === true, "Seeded receipt has hasPdf: true flag");
  assert(matchingReceipt.receiptId === receiptDoc.receiptId, "Receipt carries correct receiptId");
  assert(matchingReceipt.quantity === 35, "Receipt carries correct distributed quantity");

  // TEST 3: Dealer 1 can download PDF for receiptDoc
  const d1ReqRes = mockReqRes({}, { _id: dealer1User._id, fpsId: dealer1User.fpsId, role: "Dealer" }, { receiptId: receiptDoc.receiptId });
  await downloadReceiptPdf(d1ReqRes.req, d1ReqRes.res);
  const d1Result = d1ReqRes.getResult();

  assert(d1Result.status === 200, "Dealer 1 downloads PDF with HTTP 200");
  assert(d1Result.headers["Content-Type"] === "application/pdf", "Dealer receives application/pdf content type");
  assert(d1Result.buffer && d1Result.buffer.length > 5000, "Dealer receives full PDF binary stream (> 5KB)");

  // TEST 4: Dealer 2 cannot download Dealer 1's receipt (Authorization barrier)
  const d2ReqRes = mockReqRes({}, { _id: dealer2User._id, fpsId: dealer2User.fpsId, role: "Dealer" }, { receiptId: receiptDoc.receiptId });
  await downloadReceiptPdf(d2ReqRes.req, d2ReqRes.res);
  const d2Result = d2ReqRes.getResult();

  assert(d2Result.status === 403, "Dealer 2 is forbidden (HTTP 403) from downloading Dealer 1's receipt");

  // TEST 5: Beneficiary 1 can download own PDF receipt
  const b1DlReqRes = mockReqRes({}, { _id: ben1User._id, role: "Beneficiary" }, { receiptId: receiptDoc.receiptId });
  await downloadBeneficiaryReceiptPdf(b1DlReqRes.req, b1DlReqRes.res);
  const b1DlResult = b1DlReqRes.getResult();

  assert(b1DlResult.status === 200, "Beneficiary 1 downloads own PDF with HTTP 200");
  assert(b1DlResult.headers["Content-Type"] === "application/pdf", "Beneficiary 1 receives application/pdf content type");
  assert(
    b1DlResult.headers["Content-Disposition"].includes(receiptDoc.receiptId),
    "Content-Disposition header includes correct receiptId filename"
  );
  assert(b1DlResult.buffer && b1DlResult.buffer.length > 5000, "Beneficiary receives full PDF binary stream (> 5KB)");

  // TEST 6: Beneficiary 2 cannot download Beneficiary 1's receipt
  const b2DlReqRes = mockReqRes({}, { _id: ben2User._id, role: "Beneficiary" }, { receiptId: receiptDoc.receiptId });
  await downloadBeneficiaryReceiptPdf(b2DlReqRes.req, b2DlReqRes.res);
  const b2DlResult = b2DlReqRes.getResult();

  assert(b2DlResult.status === 404, "Beneficiary 2 cannot access Beneficiary 1's receipt (HTTP 404)");

  // TEST 7: Invalid receiptId is rejected with HTTP 404
  const invReqRes = mockReqRes({}, { _id: ben1User._id, role: "Beneficiary" }, { receiptId: "NON_EXISTENT_ID" });
  await downloadBeneficiaryReceiptPdf(invReqRes.req, invReqRes.res);
  const invResult = invReqRes.getResult();

  assert(invResult.status === 404, "Non-existent receiptId returns HTTP 404");

  // Cleanup test documents
  await User.deleteMany({ _id: { $in: [dealer1User._id, dealer2User._id, ben1User._id, ben2User._id] } });
  await Dealer.deleteMany({ _id: { $in: [dealer1Doc._id, dealer2Doc._id] } });
  await Beneficiary.deleteMany({ rationCardNumber: { $in: [ben1CardNumber, ben2CardNumber] } });
  await Receipt.deleteMany({ receiptId: receiptDoc.receiptId });

  await mongoose.disconnect();

  console.log("\n======================================================================");
  console.log(`   ALL ${totalPassed}/${totalPassed} PHASE 5 INTEGRATION TESTS PASSED!`);
  console.log("======================================================================\n");

  process.exit(0);
}

runPhase5Tests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
