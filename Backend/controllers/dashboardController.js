const Receipt = require("../models/Receipt.model");
const blockchainService = require("../services/blockchainService");

/**
 * Masking helpers to ensure privacy of citizens on public verification portal.
 */
const maskName = (name) => {
  if (!name || typeof name !== "string") return "Citizen";
  return name
    .trim()
    .split(/\s+/)
    .map((part) => {
      if (part.length <= 2) return `${part[0]}*`;
      return `${part.slice(0, 2)}${"*".repeat(Math.min(4, part.length - 2))}`;
    })
    .join(" ");
};

const maskRationCard = (rc) => {
  if (!rc || typeof rc !== "string") return "N/A";
  const clean = rc.trim();
  if (clean.length <= 5) {
    return `${clean.slice(0, 2)}***${clean.slice(-1)}`;
  }
  const prefix = clean.slice(0, 2);
  const suffix = clean.slice(-3);
  const asterisks = "*".repeat(Math.min(6, Math.max(3, clean.length - 5)));
  return `${prefix}${asterisks}${suffix}`;
};

// In-memory sliding-window rate limiter for public verification endpoint
// Max 30 requests per minute per IP address
const ipRequestHistory = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 30;

const isRateLimited = (clientIp) => {
  const now = Date.now();
  const timestamps = ipRequestHistory.get(clientIp) || [];
  // Filter out timestamps outside the active window
  const activeTimestamps = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  
  if (activeTimestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    ipRequestHistory.set(clientIp, activeTimestamps);
    return true;
  }

  activeTimestamps.push(now);
  ipRequestHistory.set(clientIp, activeTimestamps);
  return false;
};

// Periodic garbage collection for rate limiter map
setInterval(() => {
  const now = Date.now();
  for (const [ip, timestamps] of ipRequestHistory.entries()) {
    const valid = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
    if (valid.length === 0) {
      ipRequestHistory.delete(ip);
    } else {
      ipRequestHistory.set(ip, valid);
    }
  }
}, 5 * 60 * 1000).unref();

/**
 * Public Receipt Verification Endpoint.
 * Validates off-chain metadata against on-chain smart contract state.
 * @route GET /api/dashboard/verify-receipt/:receiptId
 * @access Public (No JWT required)
 */
const verifyReceipt = async (req, res) => {
  const clientIp = req.ip || req.connection.remoteAddress || "unknown_client";

  if (isRateLimited(clientIp)) {
    return res.status(429).json({
      success: false,
      verified: false,
      status: "RATE_LIMITED",
      message: "Too many verification requests from this IP. Please wait a minute before retrying."
    });
  }

  const { receiptId } = req.params;

  // 1. Validate receiptId input format
  if (!receiptId || typeof receiptId !== "string" || !/^[a-zA-Z0-9_\-.:]{3,64}$/.test(receiptId.trim())) {
    return res.status(400).json({
      success: false,
      verified: false,
      status: "INVALID_RECEIPT_ID",
      message: "Invalid receipt identifier format. Receipt ID must be between 3 and 64 alphanumeric characters."
    });
  }

  try {
    // 2. Query MongoDB Receipt document
    const receiptDoc = await Receipt.findOne({ receiptId: receiptId.trim() });
    if (!receiptDoc) {
      return res.status(404).json({
        success: false,
        verified: false,
        status: "NOT_FOUND",
        message: `Distribution receipt '${receiptId}' was not found in the official PDS registry.`
      });
    }

    // Prepare privacy-safe baseline metadata
    const sanitizedData = {
      receiptId: receiptDoc.receiptId,
      blockchainReceiptId: receiptDoc.blockchainReceiptId || null,
      distributionDate: receiptDoc.distributionDate,
      distributionMonth: receiptDoc.distributionMonth,
      commodity: receiptDoc.commodity,
      quantity: receiptDoc.quantity,
      unit: receiptDoc.unit || "kg",
      fpsShopId: receiptDoc.fpsShopId,
      dealerName: receiptDoc.dealerName,
      dealerLocation: receiptDoc.dealerLocation,
      maskedBeneficiaryName: maskName(receiptDoc.beneficiaryName),
      maskedRationCardNumber: maskRationCard(receiptDoc.rationCardNumber),
      transactionHash: receiptDoc.transactionHash,
      blockNumber: receiptDoc.blockNumber,
      contractAddress: receiptDoc.contractAddress || process.env.RECEIPT_MANAGER_ADDRESS,
      verificationTimestamp: new Date().toISOString()
    };

    // 3. Verify existence of on-chain blockchain receipt ID
    if (!receiptDoc.blockchainReceiptId) {
      return res.status(200).json({
        success: false,
        verified: false,
        status: "NO_BLOCKCHAIN_RECEIPT_ID",
        message: "Receipt metadata exists in database, but no associated blockchain receipt ID was recorded.",
        data: sanitizedData
      });
    }

    // 4. Retrieve actual receipt from ReceiptManager.sol on-chain
    let onChainReceipt;
    try {
      onChainReceipt = await blockchainService.getBlockchainReceipt(receiptDoc.blockchainReceiptId);
    } catch (bcErr) {
      const errMsg = bcErr.message || "";
      console.warn(`[PUBLIC VERIFY BC LOOKUP WARNING]: ${errMsg}`);

      if (
        errMsg.includes("ECONNREFUSED") ||
        errMsg.includes("could not detect network") ||
        errMsg.includes("NETWORK_ERROR") ||
        errMsg.includes("failed to detect network")
      ) {
        return res.status(200).json({
          success: false,
          verified: false,
          status: "BLOCKCHAIN_UNAVAILABLE",
          message: "Ethereum blockchain node is currently unreachable. Cryptographic verification cannot be completed at this time.",
          data: sanitizedData
        });
      }

      if (errMsg.includes("Receipt does not exist") || errMsg.includes("execution reverted")) {
        return res.status(200).json({
          success: false,
          verified: false,
          status: "NOT_FOUND_ON_CHAIN",
          message: `Blockchain receipt ID #${receiptDoc.blockchainReceiptId} does not exist on the smart contract ledger.`,
          data: sanitizedData
        });
      }

      return res.status(200).json({
        success: false,
        verified: false,
        status: "BLOCKCHAIN_LOOKUP_ERROR",
        message: `Error querying blockchain: ${errMsg}`,
        data: sanitizedData
      });
    }

    // 5. Cross-examine blockchain record against MongoDB document
    const discrepancies = [];

    // Check A: Receipt ID matches
    if (String(onChainReceipt.receiptId) !== String(receiptDoc.blockchainReceiptId)) {
      discrepancies.push(
        `Blockchain Receipt ID mismatch: Contract reports '${onChainReceipt.receiptId}', DB has '${receiptDoc.blockchainReceiptId}'`
      );
    }

    // Check B: Distributed Quantity matches
    if (Number(onChainReceipt.quantity) !== Number(receiptDoc.quantity)) {
      discrepancies.push(
        `Quantity mismatch: Contract reports '${onChainReceipt.quantity} kg', DB has '${receiptDoc.quantity} kg'`
      );
    }

    // Check C: Transaction Reference matches
    if (
      onChainReceipt.transactionReference.trim().toLowerCase() !==
      receiptDoc.transactionHash.trim().toLowerCase()
    ) {
      discrepancies.push(
        `Transaction Reference mismatch: Contract has '${onChainReceipt.transactionReference}', DB has '${receiptDoc.transactionHash}'`
      );
    }

    // Check D: Beneficiary Numeric ID matches
    // Prefer exact stored blockchainBeneficiaryId; fallback to digits in rationCardNumber for backward compatibility
    const expectedBenId = receiptDoc.blockchainBeneficiaryId 
      ? String(receiptDoc.blockchainBeneficiaryId)
      : String(Number(receiptDoc.rationCardNumber.replace(/\D/g, "")) || 1);

    if (String(onChainReceipt.beneficiaryId) !== expectedBenId) {
      discrepancies.push(
        `Beneficiary ID mismatch: Contract reports beneficiary '${onChainReceipt.beneficiaryId}', expected '${expectedBenId}'`
      );
    }

    // Check E: Timestamp proximity (Allowing standard block time delta within 24 hours)
    const onChainTime = new Date(onChainReceipt.timestamp).getTime();
    const docTime = new Date(receiptDoc.distributionDate).getTime();
    const timeDeltaMs = Math.abs(onChainTime - docTime);
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;

    if (timeDeltaMs > ONE_DAY_MS) {
      discrepancies.push(
        `Timestamp deviation exceeds allowable threshold: Contract time (${onChainReceipt.timestamp.toISOString()}) vs DB time (${receiptDoc.distributionDate.toISOString()})`
      );
    }

    // 6. Final verification verdict
    if (discrepancies.length > 0) {
      return res.status(200).json({
        success: false,
        verified: false,
        status: "VERIFICATION_MISMATCH",
        message: "Verification failed: Discrepancy detected between database record and blockchain ledger.",
        discrepancies,
        data: {
          ...sanitizedData,
          onChainQuantity: `${onChainReceipt.quantity} ${receiptDoc.unit || "kg"}`,
          onChainTimestamp: onChainReceipt.timestamp
        }
      });
    }

    // All cryptographic and ledger parameters matched!
    return res.status(200).json({
      success: true,
      verified: true,
      status: "CRYPTOGRAPHICALLY_VERIFIED",
      message: "Authenticity cryptographically verified against the Ethereum blockchain smart contract.",
      data: {
        ...sanitizedData,
        onChainQuantity: `${onChainReceipt.quantity} ${receiptDoc.unit || "kg"}`,
        onChainTimestamp: onChainReceipt.timestamp,
        blockchainProof: {
          contract: sanitizedData.contractAddress,
          receiptId: onChainReceipt.receiptId,
          transactionReference: onChainReceipt.transactionReference,
          blockTime: onChainReceipt.timestamp
        }
      }
    });

  } catch (error) {
    console.error(`[PUBLIC VERIFICATION SERVER ERROR]: ${error.message}`);
    return res.status(500).json({
      success: false,
      verified: false,
      status: "SERVER_ERROR",
      message: "Internal server error during public receipt verification",
      error: error.message
    });
  }
};

module.exports = {
  verifyReceipt,
  maskName,
  maskRationCard
};
