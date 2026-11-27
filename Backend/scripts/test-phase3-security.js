const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const crypto = require("crypto");

dotenv.config({ path: path.join(__dirname, "../.env") });

const User = require("../models/User.model");
const Dealer = require("../models/Dealer.model");
const Beneficiary = require("../models/Beneficiary.model");
const OtpSession = require("../models/OtpSession.model");
const {
  generateOtp,
  verifyOtp,
  registerBeneficiary,
  allocateEntitlement,
  getBeneficiaries,
  getDealers
} = require("../controllers/adminController");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

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

async function runPhase3Tests() {
  console.log("======================================================================");
  console.log("   RUNNING PHASE 3: BENEFICIARY REGISTRATION SECURITY TEST SUITE");
  console.log("======================================================================\n");

  const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/pds-blockchain";
  await mongoose.connect(mongoUri);
  console.log("✔ Connected to MongoDB for security testing.\n");

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
    // Setup test Dealer
    // -------------------------------------------------------------
    let testDealer = await Dealer.findOne();
    if (!testDealer) {
      const dummyUser = new User({
        name: "Test Dealer User",
        email: "testdealer@pds.com",
        password: "Password123",
        role: "Dealer",
        walletAddress: "0x1111111111111111111111111111111111111111",
        encryptedPrivateKey: "dummy_encrypted_key"
      });
      await dummyUser.save();
      testDealer = new Dealer({
        userId: dummyUser._id,
        fpsShopId: "FPS-TEST-999",
        location: "Test Distribution Center"
      });
      await testDealer.save();
    }

    const testCard = `RC-SEC-${Date.now()}`;
    const testMobile = "9876543210";
    const testPassword = "CitizenPassword123";

    // -------------------------------------------------------------
    // Test 1: Registration without verificationToken is rejected
    // -------------------------------------------------------------
    {
      const { req, res, getResult } = mockReqRes({
        name: "Aaditya Sharma",
        rationCardNumber: testCard,
        mobileNumber: testMobile,
        password: testPassword,
        monthlyEntitlement: 35,
        registeredDealerId: testDealer._id
      });
      await registerBeneficiary(req, res);
      const result = getResult();
      assert(result.status === 400 && result.body.message.includes("Missing OTP verification token"),
        "Registration without verificationToken is rejected (HTTP 400)");
    }

    // -------------------------------------------------------------
    // Test 2: Registration with an invalid/forged token is rejected
    // -------------------------------------------------------------
    {
      const fakeToken = crypto.randomBytes(32).toString("hex");
      const { req, res, getResult } = mockReqRes({
        name: "Aaditya Sharma",
        rationCardNumber: testCard,
        mobileNumber: testMobile,
        password: testPassword,
        monthlyEntitlement: 35,
        registeredDealerId: testDealer._id,
        verificationToken: fakeToken
      });
      await registerBeneficiary(req, res);
      const result = getResult();
      assert(result.status === 400 && result.body.message.includes("Invalid or forged verification token"),
        "Registration with invalid token is rejected (HTTP 400)");
    }

    // -------------------------------------------------------------
    // Helper: Generate and verify OTP legitimately
    // -------------------------------------------------------------
    async function getLegitimateToken(card, mobile) {
      const { req: gReq, res: gRes, getResult: getGRes } = mockReqRes({ mobileNumber: mobile, rationCardNumber: card });
      await generateOtp(gReq, gRes);
      const sessionId = getGRes().body.data.otpSessionId;

      const session = await OtpSession.findById(sessionId);
      let correctOtp;
      for (let i = 100000; i <= 999999; i++) {
        if (crypto.createHash("sha256").update(i.toString() + session.salt).digest("hex") === session.otpHash) {
          correctOtp = i.toString();
          break;
        }
      }

      const { req: vReq, res: vRes, getResult: getVRes } = mockReqRes({ otpSessionId: sessionId, otp: correctOtp });
      await verifyOtp(vReq, vRes);
      const vResult = getVRes();
      return { token: vResult.body.data.verificationToken, sessionId };
    }

    // -------------------------------------------------------------
    // Test 3: Token stored in MongoDB is hashed, NEVER plaintext
    // -------------------------------------------------------------
    const { token: validToken, sessionId } = await getLegitimateToken(testCard, testMobile);
    {
      const sessionInDb = await OtpSession.findById(sessionId);
      assert(sessionInDb.verificationToken === undefined, "Plaintext token field does not exist in MongoDB document");
      assert(sessionInDb.verificationTokenHash !== undefined, "MongoDB document contains verificationTokenHash");
      assert(sessionInDb.verificationTokenHash !== validToken, "Stored token hash does not match plaintext token");
      const expectedHash = crypto.createHash("sha256").update(validToken).digest("hex");
      assert(sessionInDb.verificationTokenHash === expectedHash, "Stored hash is exact SHA-256 of the issued token");
    }

    // -------------------------------------------------------------
    // Test 4: Registration with token belonging to another Ration Card is rejected
    // -------------------------------------------------------------
    {
      const { req, res, getResult } = mockReqRes({
        name: "Aaditya Sharma",
        rationCardNumber: "RC-TAMPERED-CARD-999",
        mobileNumber: testMobile,
        password: testPassword,
        monthlyEntitlement: 35,
        registeredDealerId: testDealer._id,
        verificationToken: validToken
      });
      await registerBeneficiary(req, res);
      const result = getResult();
      assert(result.status === 400 && result.body.message.includes("different Ration Card Number"),
        "Registration with mismatched Ration Card is rejected (HTTP 400)");
    }

    // -------------------------------------------------------------
    // Test 5: Registration with token belonging to another Mobile Number is rejected
    // -------------------------------------------------------------
    {
      const { req, res, getResult } = mockReqRes({
        name: "Aaditya Sharma",
        rationCardNumber: testCard,
        mobileNumber: "9123456789", // Different mobile
        password: testPassword,
        monthlyEntitlement: 35,
        registeredDealerId: testDealer._id,
        verificationToken: validToken
      });
      await registerBeneficiary(req, res);
      const result = getResult();
      assert(result.status === 400 && result.body.message.includes("different mobile number"),
        "Registration with mismatched mobile number is rejected (HTTP 400)");
    }

    // -------------------------------------------------------------
    // Test 6: Registration with an expired token is rejected
    // -------------------------------------------------------------
    {
      const expiredCard = `RC-EXP-${Date.now()}`;
      const { token: expToken, sessionId: expSessionId } = await getLegitimateToken(expiredCard, testMobile);
      // Manually backdate token expiry
      await OtpSession.findByIdAndUpdate(expSessionId, { tokenExpiresAt: new Date(Date.now() - 1000) });

      const { req, res, getResult } = mockReqRes({
        name: "Expired Cardholder",
        rationCardNumber: expiredCard,
        mobileNumber: testMobile,
        password: testPassword,
        monthlyEntitlement: 35,
        registeredDealerId: testDealer._id,
        verificationToken: expToken
      });
      await registerBeneficiary(req, res);
      const result = getResult();
      assert(result.status === 400 && result.body.message.includes("token has expired"),
        "Registration with expired token is rejected (HTTP 400)");
    }

    // -------------------------------------------------------------
    // Test 7: Correctly verified registration succeeds
    // -------------------------------------------------------------
    let registeredBeneficiaryId;
    let registeredWalletAddress;
    {
      const { req, res, getResult } = mockReqRes({
        name: "Aaditya Sharma",
        rationCardNumber: testCard,
        mobileNumber: testMobile,
        password: testPassword,
        monthlyEntitlement: 35,
        registeredDealerId: testDealer._id,
        verificationToken: validToken
      });
      await registerBeneficiary(req, res);
      const result = getResult();

      assert(result.status === 201 && result.body.success === true, "Valid registration succeeds with HTTP 201 Created");
      assert(result.body.data.name === "Aaditya Sharma", "Response data contains cardholder name");
      assert(result.body.data.rationCardNumber === testCard, "Response data contains card number");
      assert(result.body.data.mobileNumber === testMobile, "Response data contains verified mobile number");
      assert(result.body.data.walletAddress && result.body.data.walletAddress.startsWith("0x"), "Ethereum wallet address generated");

      registeredBeneficiaryId = result.body.data.beneficiaryId;
      registeredWalletAddress = result.body.data.walletAddress;

      // Verify MongoDB persistence
      const benInDb = await Beneficiary.findById(registeredBeneficiaryId);
      assert(benInDb !== null, "Beneficiary saved in MongoDB");
      assert(benInDb.mobileNumber === testMobile, "Verified mobile number stored in Beneficiary document");
      assert(benInDb.walletAddress === registeredWalletAddress, "Wallet address stored in Beneficiary document");

      const userInDb = await User.findById(benInDb.userId);
      assert(userInDb !== null, "User credentials saved in MongoDB");
      assert(userInDb.role === "Beneficiary", "User role assigned as 'Beneficiary'");
      assert(userInDb.walletAddress === registeredWalletAddress, "User has matching wallet address");
    }

    // -------------------------------------------------------------
    // Test 8: Token cannot be reused (Single-use enforcement)
    // -------------------------------------------------------------
    {
      const { req, res, getResult } = mockReqRes({
        name: "Aaditya Sharma Replay",
        rationCardNumber: testCard,
        mobileNumber: testMobile,
        password: testPassword,
        monthlyEntitlement: 35,
        registeredDealerId: testDealer._id,
        verificationToken: validToken
      });
      await registerBeneficiary(req, res);
      const result = getResult();
      assert(result.status === 400 && result.body.message.includes("already been used"),
        "Replay attempt with used token is rejected (Single-use verified)");
    }

    // -------------------------------------------------------------
    // Test 9: Concurrency safety - simultaneous requests cannot consume the same token
    // -------------------------------------------------------------
    {
      const concCard = `RC-CONC-${Date.now()}`;
      const { token: concToken } = await getLegitimateToken(concCard, testMobile);

      const makeReq = () => {
        const { req, res, getResult } = mockReqRes({
          name: "Concurrent Test User",
          rationCardNumber: concCard,
          mobileNumber: testMobile,
          password: testPassword,
          monthlyEntitlement: 35,
          registeredDealerId: testDealer._id,
          verificationToken: concToken
        });
        return registerBeneficiary(req, res).then(() => getResult());
      };

      // Fire 3 simultaneous requests with identical token
      const [r1, r2, r3] = await Promise.all([makeReq(), makeReq(), makeReq()]);
      const successCount = [r1, r2, r3].filter(r => r.status === 201).length;
      const rejectCount = [r1, r2, r3].filter(r => r.status === 400).length;

      assert(successCount === 1, "Exactly one concurrent registration request consumes the token");
      assert(rejectCount === 2, "All other concurrent registration requests are atomically rejected");

      // Cleanup conc card
      await Beneficiary.deleteMany({ rationCardNumber: concCard });
    }

    // -------------------------------------------------------------
    // Test 10: Role-based Authorization & Authentication
    // -------------------------------------------------------------
    {
      // A. Missing token -> 401
      const noTokenReq = { headers: {} };
      let noTokenStatus = 200;
      const noTokenRes = {
        status: (s) => { noTokenStatus = s; return noTokenRes; },
        json: () => noTokenRes
      };
      await protect(noTokenReq, noTokenRes, () => {});
      assert(noTokenStatus === 401, "Protect middleware rejects unauthenticated registration requests (HTTP 401)");

      // B. Dealer role -> 403
      const dealerReq = { user: { role: "Dealer" } };
      let dealerStatus = 200;
      const dealerRes = {
        status: (s) => { dealerStatus = s; return dealerRes; },
        json: () => dealerRes
      };
      const adminAuth = authorize("Admin");
      adminAuth(dealerReq, dealerRes, () => {});
      assert(dealerStatus === 403, "Authorize middleware rejects Dealer attempting to register beneficiary (HTTP 403)");
    }

    // -------------------------------------------------------------
    // Test 11: Backward compatibility with legacy beneficiaries
    // -------------------------------------------------------------
    {
      // Query beneficiaries containing existing legacy cardholders without mobileNumber
      const { req, res, getResult } = mockReqRes({}, { role: "Admin" });
      await getBeneficiaries(req, res);
      const result = getResult();
      assert(result.status === 200 && result.body.success === true, "getBeneficiaries loads legacy beneficiaries cleanly");

      // Test allocateEntitlement on a legacy beneficiary (e.g. RC001)
      const legacyBen = await Beneficiary.findOne({ mobileNumber: { $exists: false } });
      if (legacyBen) {
        const { req: aReq, res: aRes, getResult: getARes } = mockReqRes({
          rationCardNumber: legacyBen.rationCardNumber,
          newEntitlement: 40
        });
        await allocateEntitlement(aReq, aRes);
        const aResult = getARes();
        assert(aResult.status === 200, "allocateEntitlement executes on legacy beneficiary without mobileNumber without schema crash");
      } else {
        console.log("  (Legacy beneficiary check: no legacy record in DB)");
      }
    }

    // -------------------------------------------------------------
    // Test 12: Dealer listing regression check
    // -------------------------------------------------------------
    {
      const { req, res, getResult } = mockReqRes({}, { role: "Admin" });
      await getDealers(req, res);
      const result = getResult();
      assert(result.status === 200 && Array.isArray(result.body.data), "getDealers dropdown continues to function (HTTP 200)");
    }

    // Clean up test card beneficiary and sessions
    await Beneficiary.deleteMany({ rationCardNumber: testCard });
    await OtpSession.deleteMany({ rationCardNumber: testCard });

    console.log("\n======================================================================");
    console.log(`   ALL ${passedTests}/${totalTests} PHASE 3 SECURITY TESTS PASSED!`);
    console.log("======================================================================\n");
    process.exit(0);

  } catch (err) {
    console.error("\n❌ PHASE 3 TEST SUITE FAILED WITH ERROR:", err.message);
    process.exit(1);
  }
}

runPhase3Tests();
