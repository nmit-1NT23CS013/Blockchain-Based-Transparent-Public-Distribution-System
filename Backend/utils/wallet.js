const crypto = require("crypto");
const { Wallet } = require("ethers");

// Helper to derive a 256-bit (32-byte) key from JWT_SECRET
const getEncryptionKey = () => {
  const secret = process.env.JWT_SECRET || "default_fallback_secret_key_32_bytes";
  return crypto.scryptSync(secret, "salt-pds-2026", 32);
};

/**
 * Generates a random Ethereum wallet.
 * @returns {Object} { address, privateKey }
 */
const createWallet = () => {
  const wallet = Wallet.createRandom();
  return {
    address: wallet.address,
    privateKey: wallet.privateKey
  };
};

/**
 * Encrypts a private key using AES-256-CBC.
 * @param {string} privateKey The raw private key string (hex)
 * @returns {string} iv:encryptedHex format
 */
const encryptPrivateKey = (privateKey) => {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(privateKey, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`;
};

/**
 * Decrypts an encrypted private key.
 * @param {string} encryptedKey iv:encryptedHex string
 * @returns {string} Raw private key
 */
const decryptPrivateKey = (encryptedKey) => {
  const key = getEncryptionKey();
  const parts = encryptedKey.split(":");
  const iv = Buffer.from(parts[0], "hex");
  const encryptedText = parts[1];
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
};

module.exports = {
  createWallet,
  encryptPrivateKey,
  decryptPrivateKey
};
