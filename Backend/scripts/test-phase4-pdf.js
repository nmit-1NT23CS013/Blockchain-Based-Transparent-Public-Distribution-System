const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const crypto = require("crypto");

dotenv.config({ path: path.join(__dirname, "../.env") });

const User = require("../models/User.model");
const Dealer = require("../models/Dealer.model");
const Beneficiary = require("../models/Beneficiary.model");
const Receipt = require("../models/Receipt.model");
const { generateReceiptPdf } = require("../services/pdfService");
const { generateReceipt, downloadReceiptPdf } = require("../controllers/dealerController");
const { downloadBeneficiaryReceiptPdf } = require("../controllers/beneficiaryController");

// Helper to mock Express req and res
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

async function runPhase4Tests() {
  console.log("======================================================================");
  console.log("   RUNNING PHASE 4: PDF RECEIPT GENERATION AUTOMATED TEST SUITE");
  console.log("======================================================================\n");

  const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/pds-blockchain";
  await mongoose.connect(mongoUri);
  console.log("✔ Connected to MongoDB for Receipt testing.\n");

  let totalTests = 0;
  let passedTests = 0;

  function assert(condition, testName) {
    totalTests++;
    if (condition) {
      console.log(`  [PASS] Test ${totalTests}: ${testName}`);
      passedTests++;
    } else {
      console.error(`  [FAIL] Test ${totalTests}: ${testName}`);
      throw new Error(`Test failed: ${testName}`);
    }
  }

  try {
    // -------------------------------------------------------------
    // Setup test Dealer 1, Dealer 2, and Beneficiary
    // -------------------------------------------------------------
    let dealerUser1 = await User.findOne({ email: "dealer1_test@pds.com" });
    if (!dealerUser1) {
      dealerUser1 = new User({
        name: "Shri Rameshwar (Dealer 1)",
        email: "dealer1_test@pds.com",
        password: "Password123",
        role: "Dealer",
        walletAddress: "0x2222222222222222222222222222222222222222",
        encryptedPrivateKey: "dummy_key_1"
      });
      await dealerUser1.save();
    }

    let dealer1 = await Dealer.findOne({ userId: dealerUser1._id });
    if (!dealer1) {
      dealer1 = new Dealer({
        userId: dealerUser1._id,
        fpsShopId: "FPS-SOUTH-001",
        location: "South Delhi Distribution Center",
        currentStock: 5000,
        allocatedStock: 5000
      });
      await dealer1.save();
    }

    let dealerUser2 = await User.findOne({ email: "dealer2_test@pds.com" });
    if (!dealerUser2) {
      dealerUser2 = new User({
        name: "Smt. Sunita Devi (Dealer 2)",
        email: "dealer2_test@pds.com",
        password: "Password123",
        role: "Dealer",
        walletAddress: "0x3333333333333333333333333333333333333333",
        encryptedPrivateKey: "dummy_key_2"
      });
      await dealerUser2.save();
    }

    let dealer2 = await Dealer.findOne({ userId: dealerUser2._id });
    if (!dealer2) {
      dealer2 = new Dealer({
        userId: dealerUser2._id,
        fpsShopId: "FPS-NORTH-002",
        location: "North Delhi Distribution Center",
        currentStock: 5000,
        allocatedStock: 5000
      });
      await dealer2.save();
    }

    let benUser = await User.findOne({ walletAddress: "0x4444444444444444444444444444444444444444" });
    if (!benUser) {
      benUser = new User({
        name: "Kailash Chand Verma",
        password: "Password123",
        role: "Beneficiary",
        walletAddress: "0x4444444444444444444444444444444444444444",
        encryptedPrivateKey: "dummy_ben_key"
      });
      await benUser.save();
    }

    let beneficiary = await Beneficiary.findOne({ rationCardNumber: "RC-PHASE4-TEST" });
    if (!beneficiary) {
      beneficiary = new Beneficiary({
        userId: benUser._id,
        name: "Kailash Chand Verma",
        rationCardNumber: "RC-PHASE4-TEST",
        mobileNumber: "9811223344",
        walletAddress: benUser.walletAddress,
        monthlyEntitlement: 35,
        registeredDealer: dealer1._id,
        isRegisteredOnChain: true
      });
      await beneficiary.save();
    }

    const testTxHash = `0x${crypto.randomBytes(32).toString("hex")}`;
    const testReceiptId = `PDS-RCP-${new Date().getFullYear()}-00042`;

    // Ensure clean state before running tests
    await Receipt.deleteMany({ receiptId: testReceiptId });

    // -------------------------------------------------------------
    // Test 1: Receipt model schema validation and persistence
    // -------------------------------------------------------------
    {
      const sampleReceipt = new Receipt({
        receiptId: testReceiptId,
        beneficiaryId: beneficiary._id,
        dealerId: dealer1._id,
        beneficiaryName: beneficiary.name,
        rationCardNumber: beneficiary.rationCardNumber,
        mobileNumber: beneficiary.mobileNumber,
        beneficiaryWalletAddress: beneficiary.walletAddress,
        dealerName: dealerUser1.name,
        fpsShopId: dealer1.fpsShopId,
        dealerLocation: dealer1.location,
        dealerWalletAddress: dealerUser1.walletAddress,
        distributionDate: new Date(),
        distributionMonth: "November 2026",
        commodity: "Food Grains (Wheat / Rice)",
        quantity: 35,
        blockchainReceiptId: "42",
        transactionHash: testTxHash,
        blockNumber: 105,
        contractAddress: "0xb2F5114456Bc60460023139C18B97963f8E94c76",
        receiptStatus: "Confirmed on Blockchain",
        verificationUrl: `http://localhost:5173/verify/${testReceiptId}`
      });

      await sampleReceipt.save();
      assert(sampleReceipt._id !== null, "Receipt document saved successfully in MongoDB");

      const fetched = await Receipt.findOne({ receiptId: testReceiptId });
      assert(fetched !== null && fetched.quantity === 35, "Receipt retrieved from MongoDB with correct quantity");
      assert(fetched.commodity === "Food Grains (Wheat / Rice)", "Commodity reflects actual food grains without fictional breakdown");
    }

    // -------------------------------------------------------------
    // Test 2: Unique receiptId constraint enforced
    // -------------------------------------------------------------
    {
      let duplicateError = false;
      try {
        const dupReceipt = new Receipt({
          receiptId: testReceiptId, // Duplicate ID
          beneficiaryId: beneficiary._id,
          dealerId: dealer1._id,
          beneficiaryName: beneficiary.name,
          rationCardNumber: beneficiary.rationCardNumber,
          beneficiaryWalletAddress: beneficiary.walletAddress,
          dealerName: dealerUser1.name,
          fpsShopId: dealer1.fpsShopId,
          dealerLocation: dealer1.location,
          dealerWalletAddress: dealerUser1.walletAddress,
          distributionDate: new Date(),
          distributionMonth: "November 2026",
          commodity: "Food Grains (Wheat / Rice)",
          quantity: 35,
          transactionHash: `0x${crypto.randomBytes(32).toString("hex")}`,
          verificationUrl: `http://localhost:5173/verify/${testReceiptId}`
        });
        await dupReceipt.save();
      } catch (err) {
        duplicateError = true;
      }
      assert(duplicateError === true, "Duplicate receiptId is strictly rejected by MongoDB unique constraint");
    }

    // -------------------------------------------------------------
    // Test 3: PDF Generation Service generates valid binary PDF buffer
    // -------------------------------------------------------------
    let generatedPdfBuffer;
    {
      const receiptDoc = await Receipt.findOne({ receiptId: testReceiptId });
      generatedPdfBuffer = await generateReceiptPdf(receiptDoc);

      assert(Buffer.isBuffer(generatedPdfBuffer), "generateReceiptPdf returns a binary Buffer");
      assert(generatedPdfBuffer.length > 1000, `PDF size is substantial (${generatedPdfBuffer.length} bytes)`);

      // Verify PDF Magic Header (%PDF-1.)
      const headerString = generatedPdfBuffer.subarray(0, 8).toString();
      assert(headerString.startsWith("%PDF-"), "Generated buffer begins with valid PDF magic bytes (%PDF-)");
    }

    // -------------------------------------------------------------
    // Test 4: PDF contains embedded QR code and uses configurable FRONTEND_URL
    // -------------------------------------------------------------
    {
      const pdfRaw = generatedPdfBuffer.toString("latin1");
      const toHex = (str) => Buffer.from(str, "utf8").toString("hex");

      assert(pdfRaw.includes("PDS Receipt - " + testReceiptId), "PDF metadata contains Receipt ID title");
      assert(pdfRaw.includes("E-Ration Distribution Receipt"), "PDF metadata contains official Subject description");
      assert(pdfRaw.includes(toHex("PUBLIC")), "PDF contains hex-encoded official header");
      assert(pdfRaw.includes(toHex("RC-PHASE4")), "PDF contains hex-encoded Beneficiary Ration Card Number");
      assert(pdfRaw.includes(toHex("FPS-SOUTH")), "PDF contains hex-encoded Fair Price Shop ID");
      assert(pdfRaw.includes(toHex("35 kg")), "PDF contains hex-encoded issued grain quantity");
      assert(pdfRaw.includes("/XObject"), "PDF contains embedded image resource for verification QR code");
    }

    // -------------------------------------------------------------
    // Test 5: Dealer PDF Download API endpoint with Authorization
    // -------------------------------------------------------------
    {
      // Case A: Dealer 1 downloads their own receipt -> 200 OK with PDF attachment
      const { req, res, getResult } = mockReqRes({}, { _id: dealerUser1._id, role: "Dealer" }, { receiptId: testReceiptId });
      await downloadReceiptPdf(req, res);
      const result = getResult();

      assert(result.status === 200, "Dealer 1 downloads own receipt with HTTP 200");
      assert(result.headers["Content-Type"] === "application/pdf", "Response Content-Type is application/pdf");
      assert(result.headers["Content-Disposition"].includes(`attachment; filename="${testReceiptId}.pdf"`), "Response headers specify attachment disposition with receipt filename");
      assert(Buffer.isBuffer(result.buffer) && result.buffer.length > 1000, "Response body contains full PDF binary data");

      // Case B: Dealer 2 attempts to download Dealer 1's receipt -> 403 Forbidden
      const { req: d2Req, res: d2Res, getResult: getD2Result } = mockReqRes({}, { _id: dealerUser2._id, role: "Dealer" }, { receiptId: testReceiptId });
      await downloadReceiptPdf(d2Req, d2Res);
      const d2Result = getD2Result();

      assert(d2Result.status === 403, "Dealer 2 is rejected with HTTP 403 Forbidden when requesting Dealer 1's receipt");
    }

    // -------------------------------------------------------------
    // Test 6: Beneficiary PDF Download API endpoint with Authorization
    // -------------------------------------------------------------
    {
      // Case A: Beneficiary downloads their own receipt -> 200 OK with PDF attachment
      const { req, res, getResult } = mockReqRes({}, { _id: benUser._id, role: "Beneficiary" }, { receiptId: testReceiptId });
      await downloadBeneficiaryReceiptPdf(req, res);
      const result = getResult();

      assert(result.status === 200, "Beneficiary downloads own receipt with HTTP 200");
      assert(result.headers["Content-Type"] === "application/pdf", "Response Content-Type is application/pdf");
      assert(Buffer.isBuffer(result.buffer) && result.buffer.length > 1000, "Response body contains full PDF binary data");

      // Case B: Another beneficiary user attempts to download this receipt -> 404/403
      const unauthorizedBenUser = new User({
        name: "Unauthorized Citizen",
        password: "Password123",
        role: "Beneficiary",
        walletAddress: "0x5555555555555555555555555555555555555555",
        encryptedPrivateKey: "dummy_unauth"
      });
      await unauthorizedBenUser.save();
      const unauthBen = new Beneficiary({
        userId: unauthorizedBenUser._id,
        name: "Unauthorized Citizen",
        rationCardNumber: "RC-UNAUTH-88",
        walletAddress: unauthorizedBenUser.walletAddress,
        monthlyEntitlement: 20,
        registeredDealer: dealer1._id
      });
      await unauthBen.save();

      const { req: uReq, res: uRes, getResult: getUResult } = mockReqRes({}, { _id: unauthorizedBenUser._id, role: "Beneficiary" }, { receiptId: testReceiptId });
      await downloadBeneficiaryReceiptPdf(uReq, uRes);
      const uResult = getUResult();

      assert(uResult.status === 404, "Unauthorized Beneficiary cannot download another citizen's receipt (HTTP 404)");

      // Cleanup unauthorized beneficiary
      await Beneficiary.findByIdAndDelete(unauthBen._id);
      await User.findByIdAndDelete(unauthorizedBenUser._id);
    }

    // -------------------------------------------------------------
    // Test 7: Idempotency check - No duplicate receipts created
    // -------------------------------------------------------------
    {
      const { req, res, getResult } = mockReqRes(
        {
          beneficiaryId: 42,
          quantity: 35,
          transactionReference: testTxHash,
          rationCardNumber: beneficiary.rationCardNumber
        },
        { _id: dealerUser1._id, role: "Dealer" }
      );
      await generateReceipt(req, res);
      const result = getResult();

      assert(result.status === 200 && result.body.success === true, "Subsequent receipt request on same transactionReference returns existing receipt");
      assert(result.body.data.receiptId === testReceiptId, "Returned receipt matches existing receipt ID");

      const count = await Receipt.countDocuments({ transactionHash: testTxHash });
      assert(count === 1, "Exactly one Receipt record exists in MongoDB (No duplicate created)");
    }

    // Clean up test receipt
    await Receipt.deleteMany({ receiptId: testReceiptId });

    console.log("\n======================================================================");
    console.log(`   ALL ${passedTests}/${totalTests} PHASE 4 TESTS PASSED!`);
    console.log("======================================================================\n");
    process.exit(0);

  } catch (err) {
    console.error("\n❌ PHASE 4 TEST SUITE FAILED WITH ERROR:", err.message);
    process.exit(1);
  }
}

runPhase4Tests();
