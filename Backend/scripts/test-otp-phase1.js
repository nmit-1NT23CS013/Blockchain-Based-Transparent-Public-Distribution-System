const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

dotenv.config({ path: path.join(__dirname, "../.env") });

const User = require("../models/User.model");
const Beneficiary = require("../models/Beneficiary.model");
const OtpSession = require("../models/OtpSession.model");
const { generateOtp, verifyOtp } = require("../controllers/adminController");

// Helper to mock Express req and res
const mockReqRes = (body = {}, user = null, headers = {}) => {
  const req = { body, user, headers };
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

  return { req, res, getResult: () => ({ status: statusCode, body: jsonResponse }) };
};

async function runTests() {
  console.log("======================================================================");
  console.log("   RUNNING PHASE 1: OTP BACKEND AUTOMATED VERIFICATION SUITE");
  console.log("======================================================================\n");

  const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/pds-blockchain";
  await mongoose.connect(mongoUri);
  console.log("✔ Connected to MongoDB for testing.\n");

  let passedTests = 0;
  let totalTests = 0;

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
    // Clean test data
    const testCard = "RC-TEST-998877";
    const testMobile = "9876543210";
    await OtpSession.deleteMany({ rationCardNumber: testCard });

    // -------------------------------------------------------------
    // Test 1: Validation - missing fields
    // -------------------------------------------------------------
    {
      const { req, res, getResult } = mockReqRes({ mobileNumber: "" });
      await generateOtp(req, res);
      const result = getResult();
      assert(result.status === 400 && result.body.success === false, "generateOtp rejects missing inputs");
    }

    // -------------------------------------------------------------
    // Test 2: Validation - invalid mobile number format
    // -------------------------------------------------------------
    {
      const { req, res, getResult } = mockReqRes({ mobileNumber: "12345", rationCardNumber: testCard });
      await generateOtp(req, res);
      const result = getResult();
      assert(result.status === 400 && result.body.message.includes("valid 10-digit mobile"), "generateOtp rejects invalid mobile format");
    }

    // -------------------------------------------------------------
    // Test 3: OTP Generation produces exactly 6 digits & saves secure hash
    // -------------------------------------------------------------
    let sessionId;
    let actualOtpFromDb;
    {
      const { req, res, getResult } = mockReqRes({ mobileNumber: testMobile, rationCardNumber: testCard });
      await generateOtp(req, res);
      const result = getResult();

      assert(result.status === 200 && result.body.success === true, "generateOtp returns status 200 with success: true");
      assert(result.body.data && result.body.data.otpSessionId, "Response contains otpSessionId");
      assert(result.body.data.otp === undefined, "CRITICAL: OTP is NEVER returned in API response");
      assert(result.body.data.otpHash === undefined, "CRITICAL: OTP hash is NEVER exposed in API response");

      sessionId = result.body.data.otpSessionId;
      const sessionInDb = await OtpSession.findById(sessionId);
      assert(sessionInDb !== null, "OtpSession successfully persisted in MongoDB");
      assert(sessionInDb.otpHash && sessionInDb.salt, "OtpSession contains secure hash and salt");
      assert(sessionInDb.isVerified === false, "New OtpSession defaults to isVerified: false");
      assert(sessionInDb.attempts === 0, "New OtpSession defaults to 0 attempts");

      // Verify stored hash matches a 6-digit number
      // We test hashing candidate 6-digit numbers against salt
      for (let i = 100000; i <= 999999; i++) {
        const testHash = crypto.createHash("sha256").update(i.toString() + sessionInDb.salt).digest("hex");
        if (testHash === sessionInDb.otpHash) {
          actualOtpFromDb = i.toString();
          break;
        }
      }
      assert(actualOtpFromDb && actualOtpFromDb.length === 6, "OTP was verified to be a cryptographically valid 6-digit integer");
    }

    // -------------------------------------------------------------
    // Test 4: Incorrect OTP is rejected with remaining attempts decrementing
    // -------------------------------------------------------------
    {
      const { req, res, getResult } = mockReqRes({ otpSessionId: sessionId, otp: "000000" });
      await verifyOtp(req, res);
      const result = getResult();

      assert(result.status === 400 && result.body.success === false, "Incorrect OTP is rejected with HTTP 400");
      assert(result.body.data.attemptsRemaining === 2, "Attempts remaining decrements to 2");

      const sessionInDb = await OtpSession.findById(sessionId);
      assert(sessionInDb.attempts === 1, "Session in DB reflects attempt count 1");
    }

    // -------------------------------------------------------------
    // Test 5: Second incorrect attempt
    // -------------------------------------------------------------
    {
      const { req, res, getResult } = mockReqRes({ otpSessionId: sessionId, otp: "111111" });
      await verifyOtp(req, res);
      const result = getResult();

      assert(result.status === 400, "Second incorrect OTP rejected");
      assert(result.body.data.attemptsRemaining === 1, "Attempts remaining decrements to 1");
    }

    // -------------------------------------------------------------
    // Test 6: Third incorrect attempt locks and invalidates session
    // -------------------------------------------------------------
    {
      const { req, res, getResult } = mockReqRes({ otpSessionId: sessionId, otp: "222222" });
      await verifyOtp(req, res);
      const result = getResult();

      assert(result.status === 400, "Third incorrect OTP rejected");
      assert(result.body.message.includes("Maximum attempts exceeded"), "Session is locked upon 3rd failure");
      assert(result.body.data.attemptsRemaining === 0, "Attempts remaining is 0");
    }

    // -------------------------------------------------------------
    // Test 7: Subsequent attempt on locked session is rejected immediately
    // -------------------------------------------------------------
    {
      const { req, res, getResult } = mockReqRes({ otpSessionId: sessionId, otp: actualOtpFromDb });
      await verifyOtp(req, res);
      const result = getResult();

      assert(result.status === 400 && result.body.message.includes("Maximum verification attempts exceeded"), "Even valid OTP is rejected once session is locked");
    }

    // -------------------------------------------------------------
    // Test 8: Expired OTP is rejected
    // -------------------------------------------------------------
    {
      // Create an expired session
      const salt = crypto.randomBytes(16).toString("hex");
      const otp = "654321";
      const otpHash = crypto.createHash("sha256").update(otp + salt).digest("hex");
      const expiredSession = new OtpSession({
        mobileNumber: testMobile,
        rationCardNumber: "RC-EXPIRED-TEST",
        otpHash,
        salt,
        attempts: 0,
        maxAttempts: 3,
        isVerified: false,
        expiresAt: new Date(Date.now() - 1000) // 1 second in the past
      });
      await expiredSession.save();

      const { req, res, getResult } = mockReqRes({ otpSessionId: expiredSession._id, otp: "654321" });
      await verifyOtp(req, res);
      const result = getResult();

      assert(result.status === 400 && result.body.message.includes("expired"), "Expired OTP is strictly rejected");
      await OtpSession.findByIdAndDelete(expiredSession._id);
    }

    // -------------------------------------------------------------
    // Test 9: Correct OTP succeeds & issues single-use verificationToken
    // -------------------------------------------------------------
    let validVerificationToken;
    let validSessionId;
    {
      // Generate fresh OTP
      const { req: genReq, res: genRes, getResult: getGenResult } = mockReqRes({ mobileNumber: testMobile, rationCardNumber: testCard });
      await generateOtp(genReq, genRes);
      validSessionId = getGenResult().body.data.otpSessionId;

      const sessionInDb = await OtpSession.findById(validSessionId);
      // Find actual OTP
      let freshOtp;
      for (let i = 100000; i <= 999999; i++) {
        if (crypto.createHash("sha256").update(i.toString() + sessionInDb.salt).digest("hex") === sessionInDb.otpHash) {
          freshOtp = i.toString();
          break;
        }
      }

      // Verify with the correct OTP
      const { req: vReq, res: vRes, getResult: getVResult } = mockReqRes({ otpSessionId: validSessionId, otp: freshOtp });
      await verifyOtp(vReq, vRes);
      const vResult = getVResult();

      assert(vResult.status === 200 && vResult.body.success === true, "Valid OTP verification succeeds with HTTP 200");
      assert(vResult.body.data.verificationToken && vResult.body.data.verificationToken.length === 64, "Issued verificationToken is 64 hex characters (32 random bytes)");
      assert(vResult.body.data.rationCardNumber === testCard, "Verification response confirms bound rationCardNumber");

      validVerificationToken = vResult.body.data.verificationToken;

      const updatedDb = await OtpSession.findById(validSessionId);
      assert(updatedDb.isVerified === true, "Session in MongoDB is marked isVerified: true");
      const expectedTokenHash = crypto.createHash("sha256").update(validVerificationToken).digest("hex");
      assert(updatedDb.verificationTokenHash === expectedTokenHash, "Session in MongoDB holds verificationTokenHash (SHA-256)");
    }

    // -------------------------------------------------------------
    // Test 10: Reusing a verified OTP session is rejected
    // -------------------------------------------------------------
    {
      const { req, res, getResult } = mockReqRes({ otpSessionId: validSessionId, otp: "123456" });
      await verifyOtp(req, res);
      const result = getResult();

      assert(result.status === 400 && result.body.message.includes("already been verified"), "Re-verifying an already verified OTP session is rejected");
    }

    // -------------------------------------------------------------
    // Test 11: Role-based protection test
    // -------------------------------------------------------------
    {
      const { protect } = require("../middleware/authMiddleware");
      const { authorize } = require("../middleware/roleMiddleware");

      // Case A: No token -> 401
      const noTokenReq = { headers: {} };
      let noTokenStatus = 200;
      let noTokenBody = {};
      const noTokenRes = {
        status: (s) => { noTokenStatus = s; return noTokenRes; },
        json: (b) => { noTokenBody = b; return noTokenRes; }
      };
      await protect(noTokenReq, noTokenRes, () => {});
      assert(noTokenStatus === 401, "Protect middleware rejects requests without JWT token");

      // Case B: Non-Admin role (Dealer) -> 403
      const dealerReq = { user: { role: "Dealer" } };
      let dealerStatus = 200;
      const dealerRes = {
        status: (s) => { dealerStatus = s; return dealerRes; },
        json: () => dealerRes
      };
      const authMiddleware = authorize("Admin");
      authMiddleware(dealerReq, dealerRes, () => {});
      assert(dealerStatus === 403, "Authorize middleware restricts OTP endpoints from Dealer role (HTTP 403)");

      // Case C: Admin role -> allowed (calls next)
      let nextCalled = false;
      const adminReq = { user: { role: "Admin" } };
      authMiddleware(adminReq, {}, () => { nextCalled = true; });
      assert(nextCalled === true, "Authorize middleware allows Admin role to proceed");
    }

    // Clean up test sessions
    await OtpSession.deleteMany({ rationCardNumber: testCard });

    console.log("\n======================================================================");
    console.log(`   ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
    console.log("======================================================================\n");
    process.exit(0);

  } catch (err) {
    console.error("\n❌ TEST SUITE FAILED WITH ERROR:", err.message);
    process.exit(1);
  }
}

runTests();
