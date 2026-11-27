const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");

/**
 * Generates an official Government PDS-inspired PDF receipt for ration distributions.
 * Embeds distribution metadata, blockchain proof, and verification QR code.
 * @param {Object} receiptData - The MongoDB Receipt document/object
 * @returns {Promise<Buffer>} - Resolves with the PDF file binary buffer
 */
const generateReceiptPdf = async (receiptData) => {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margin: 40,
        compress: false, // Ensures uncompressed text streams for verification and fast rendering
        info: {
          Title: `PDS Receipt - ${receiptData.receiptId}`,
          Author: "PDS TrustLink Blockchain System",
          Subject: "E-Ration Distribution Receipt"
        }
      });

      const buffers = [];
      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", reject);

      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
      // Construct verification URL dynamically from current FRONTEND_URL environment variable
      // This ensures LAN IP or custom domain changes immediately apply to all generated PDFs
      const verificationUrl = `${frontendUrl.replace(/\/+$/, "")}/verify/${receiptData.receiptId}`;

      // Generate QR Code PNG Buffer
      const qrBuffer = await QRCode.toBuffer(verificationUrl, {
        type: "png",
        width: 140,
        margin: 1,
        color: {
          dark: "#0f172a",
          light: "#ffffff"
        }
      });

      const primaryColor = "#022448";   // Navy
      const darkColor = "#1e293b";      // Slate 800
      const mutedColor = "#64748b";     // Slate 500
      const borderLineColor = "#cbd5e1"; // Slate 300
      const lightBg = "#f8fafc";        // Slate 50
      const greenColor = "#047857";     // Emerald 700

      // ----------------------------------------------------
      // 1. TOP HEADER & EMBLEM BAR
      // ----------------------------------------------------
      doc.rect(40, 40, 515, 65).fill(primaryColor);

      doc.fillColor("#ffffff")
         .fontSize(14)
         .font("Helvetica-Bold")
         .text("PUBLIC DISTRIBUTION SYSTEM (PDS) TRUSTLINK", 40, 52, { align: "center", width: 515 });

      doc.fontSize(9)
         .font("Helvetica")
         .text("MINISTRY OF CONSUMER AFFAIRS, FOOD & PUBLIC DISTRIBUTION", 40, 70, { align: "center", width: 515 });

      doc.fontSize(8)
         .font("Helvetica-Bold")
         .text("BLOCKCHAIN-POWERED IMMUTABLE E-RATION DISTRIBUTION RECEIPT", 40, 84, { align: "center", width: 515 });

      // ----------------------------------------------------
      // 2. RECEIPT META INFO STRIP
      // ----------------------------------------------------
      const metaY = 115;
      doc.rect(40, metaY, 515, 45).fill(lightBg).stroke(borderLineColor);

      doc.fillColor(primaryColor)
         .fontSize(9)
         .font("Helvetica-Bold")
         .text("RECEIPT ID:", 52, metaY + 10);
      doc.fillColor(darkColor)
         .fontSize(10)
         .font("Helvetica-Bold")
         .text(receiptData.receiptId, 52, metaY + 23);

      doc.fillColor(mutedColor)
         .fontSize(8)
         .font("Helvetica-Bold")
         .text("DISTRIBUTION DATE:", 210, metaY + 10);
      doc.fillColor(darkColor)
         .fontSize(9)
         .font("Helvetica")
         .text(new Date(receiptData.distributionDate).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }), 210, metaY + 23);

      doc.fillColor(mutedColor)
         .fontSize(8)
         .font("Helvetica-Bold")
         .text("CYCLE PERIOD:", 380, metaY + 10);
      doc.fillColor(primaryColor)
         .fontSize(9)
         .font("Helvetica-Bold")
         .text(receiptData.distributionMonth || "Current Cycle", 380, metaY + 23);

      // ----------------------------------------------------
      // 3. BENEFICIARY & DEALER 2-COLUMN CARDS
      // ----------------------------------------------------
      const panelY = 170;
      const colWidth = 250;
      const panelHeight = 110;

      // Left Column: Beneficiary Card
      doc.rect(40, panelY, colWidth, panelHeight).fill("#ffffff").stroke(borderLineColor);
      doc.rect(40, panelY, colWidth, 22).fill("#f1f5f9");
      doc.fillColor(primaryColor).fontSize(8.5).font("Helvetica-Bold").text("BENEFICIARY (CARDHOLDER) DETAILS", 50, panelY + 6);

      const maskMobile = (phone) => {
        if (!phone || phone === "N/A") return "N/A";
        const clean = phone.toString().trim();
        if (clean.length === 10) return `${clean.substring(0, 2)}XXXXXX${clean.substring(8)}`;
        return clean;
      };

      doc.fillColor(mutedColor).fontSize(8).font("Helvetica").text("Full Name:", 50, panelY + 30);
      doc.fillColor(darkColor).font("Helvetica-Bold").text(receiptData.beneficiaryName, 130, panelY + 30);

      doc.fillColor(mutedColor).font("Helvetica").text("Ration Card No:", 50, panelY + 46);
      doc.fillColor(darkColor).font("Helvetica-Bold").text(receiptData.rationCardNumber, 130, panelY + 46);

      doc.fillColor(mutedColor).font("Helvetica").text("Registered Mobile:", 50, panelY + 62);
      doc.fillColor(darkColor).font("Helvetica").text(maskMobile(receiptData.mobileNumber), 130, panelY + 62);

      doc.fillColor(mutedColor).font("Helvetica").text("Ledger Wallet:", 50, panelY + 78);
      const shortBenWallet = receiptData.beneficiaryWalletAddress 
        ? `${receiptData.beneficiaryWalletAddress.substring(0, 10)}...${receiptData.beneficiaryWalletAddress.slice(-8)}`
        : "N/A";
      doc.fillColor(darkColor).fontSize(7.5).font("Courier").text(shortBenWallet, 130, panelY + 78);

      // Right Column: Fair Price Shop Dealer Card
      const rightColX = 305;
      doc.rect(rightColX, panelY, colWidth, panelHeight).fill("#ffffff").stroke(borderLineColor);
      doc.rect(rightColX, panelY, colWidth, 22).fill("#f1f5f9");
      doc.fillColor(primaryColor).fontSize(8.5).font("Helvetica-Bold").text("FAIR PRICE SHOP (FPS DEALER) DETAILS", rightColX + 10, panelY + 6);

      doc.fillColor(mutedColor).fontSize(8).font("Helvetica").text("FPS Licensee:", rightColX + 10, panelY + 30);
      doc.fillColor(darkColor).font("Helvetica-Bold").text(receiptData.dealerName || "Licensed Dealer", rightColX + 90, panelY + 30);

      doc.fillColor(mutedColor).font("Helvetica").text("Shop License ID:", rightColX + 10, panelY + 46);
      doc.fillColor(darkColor).font("Helvetica-Bold").text(receiptData.fpsShopId || "N/A", rightColX + 90, panelY + 46);

      doc.fillColor(mutedColor).font("Helvetica").text("Shop Location:", rightColX + 10, panelY + 62);
      doc.fillColor(darkColor).font("Helvetica").text(receiptData.dealerLocation || "Distribution Center", rightColX + 90, panelY + 62);

      doc.fillColor(mutedColor).font("Helvetica").text("Dealer Wallet:", rightColX + 10, panelY + 78);
      const shortDealerWallet = receiptData.dealerWalletAddress 
        ? `${receiptData.dealerWalletAddress.substring(0, 10)}...${receiptData.dealerWalletAddress.slice(-8)}`
        : "N/A";
      doc.fillColor(darkColor).fontSize(7.5).font("Courier").text(shortDealerWallet, rightColX + 90, panelY + 78);

      // ----------------------------------------------------
      // 4. COMMODITY DISTRIBUTION TABLE
      // ----------------------------------------------------
      const tableY = 295;
      doc.rect(40, tableY, 515, 22).fill(primaryColor);
      doc.fillColor("#ffffff").fontSize(8.5).font("Helvetica-Bold");
      doc.text("S.NO", 50, tableY + 6);
      doc.text("COMMODITY DESCRIPTION", 95, tableY + 6);
      doc.text("SCHEME TYPE", 280, tableY + 6);
      doc.text("ISSUED QUANTITY", 420, tableY + 6);

      // Table Row
      const rowY = tableY + 22;
      doc.rect(40, rowY, 515, 32).fill(lightBg).stroke(borderLineColor);
      doc.fillColor(darkColor).fontSize(9).font("Helvetica-Bold");
      doc.text("1", 55, rowY + 10);
      doc.text(receiptData.commodity || "Food Grains (Wheat / Rice)", 95, rowY + 10);
      doc.font("Helvetica").fontSize(8).fillColor(mutedColor).text("National Food Security Act (NFSA)", 280, rowY + 10);
      doc.fillColor(primaryColor).fontSize(11).font("Helvetica-Bold").text(`${receiptData.quantity} kg`, 430, rowY + 9);

      // ----------------------------------------------------
      // 5. BLOCKCHAIN LEDGER VERIFICATION BOX & QR CODE
      // ----------------------------------------------------
      const blockY = 365;
      doc.rect(40, blockY, 515, 145).fill("#ffffff").stroke(borderLineColor);
      doc.rect(40, blockY, 515, 24).fill("#ecfdf5").stroke("#a7f3d0");

      doc.fillColor(greenColor).fontSize(9).font("Helvetica-Bold").text("ETHEREUM BLOCKCHAIN LEDGER AUDIT PROOF", 52, blockY + 7);
      doc.fillColor("#065f46").fontSize(8).font("Helvetica-Bold").text("STATUS: CONFIRMED & IMMUTABLE", 370, blockY + 7);

      // Left block: Blockchain details
      const bDetailsY = blockY + 34;
      doc.fillColor(mutedColor).fontSize(8).font("Helvetica").text("Smart Contract (ReceiptManager):", 52, bDetailsY);
      doc.fillColor(darkColor).fontSize(8).font("Courier").text(receiptData.contractAddress || process.env.RECEIPT_MANAGER_ADDRESS || "", 52, bDetailsY + 11);

      doc.fillColor(mutedColor).fontSize(8).font("Helvetica").text("On-Chain Receipt ID:", 52, bDetailsY + 26);
      doc.fillColor(primaryColor).fontSize(8.5).font("Helvetica-Bold").text(`#${receiptData.blockchainReceiptId || "1"}`, 160, bDetailsY + 26);

      doc.fillColor(mutedColor).fontSize(8).font("Helvetica").text("Block Number:", 220, bDetailsY + 26);
      doc.fillColor(darkColor).fontSize(8.5).font("Helvetica-Bold").text(`#${receiptData.blockNumber || "Confirmed"}`, 280, bDetailsY + 26);

      doc.fillColor(mutedColor).fontSize(8).font("Helvetica").text("Ledger Transaction Hash (Cryptographic Proof):", 52, bDetailsY + 42);
      doc.fillColor(darkColor).fontSize(7.5).font("Courier").text(receiptData.transactionHash || "N/A", 52, bDetailsY + 53, { width: 320 });

      doc.fillColor(mutedColor).fontSize(7.5).font("Helvetica-Oblique")
         .text("* This transaction hash is permanently anchored to the distributed Ethereum ledger. Tampering with this printed receipt can be immediately detected by scanning the verification QR code.", 52, bDetailsY + 75, { width: 320 });

      // Right block: QR Code
      const qrX = 405;
      const qrY = blockY + 30;
      doc.image(qrBuffer, qrX, qrY, { width: 95, height: 95 });
      doc.fillColor(primaryColor).fontSize(7).font("Helvetica-Bold").text("SCAN TO VERIFY", qrX - 5, qrY + 98, { width: 105, align: "center" });

      // ----------------------------------------------------
      // 6. OFFICIAL FOOTER & DISCLAIMER
      // ----------------------------------------------------
      const footerY = 530;
      doc.moveTo(40, footerY).lineTo(555, footerY).stroke(borderLineColor);

      doc.fillColor(mutedColor).fontSize(7.5).font("Helvetica")
         .text("Verification URL: " + verificationUrl, 40, footerY + 8, { align: "center", width: 515 });

      doc.fontSize(7).font("Helvetica")
         .text("This is an authenticated, tamper-proof electronic ration distribution receipt generated via PDS TrustLink.", 40, footerY + 20, { align: "center", width: 515 });

      doc.fontSize(6.5).font("Helvetica-Oblique")
         .text("Physical signature is not required. Verification is publicly auditable on the Ethereum network.", 40, footerY + 30, { align: "center", width: 515 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = { generateReceiptPdf };
