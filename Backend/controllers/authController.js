const User = require("../models/User.model");
const Beneficiary = require("../models/Beneficiary.model");
const jwt = require("jsonwebtoken");

/**
 * Handles user login for Admin, Dealer, and Beneficiary.
 * @route POST /api/auth/login
 */
const login = async (req, res) => {
  const { email, rationCardNumber, password } = req.body;

  try {
    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Password is required"
      });
    }

    let user;

    // Check if logging in via email (Admin/Dealer) or Ration Card Number (Beneficiary)
    if (email) {
      user = await User.findOne({ email: email.toLowerCase().trim() });
    } else if (rationCardNumber) {
      const beneficiary = await Beneficiary.findOne({ rationCardNumber: rationCardNumber.trim() });
      if (beneficiary) {
        user = await User.findById(beneficiary.userId);
      }
    } else {
      return res.status(400).json({
        success: false,
        message: "Please provide email or rationCardNumber to log in"
      });
    }

    // Verify user exists and matches credentials
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    // Sign JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || "pds_blockchain_super_secret_jwt_key_2026_final_year_project",
      { expiresIn: "30d" }
    );

    // Fetch complementary profile data depending on user role
    let profileData = null;
    if (user.role === "Beneficiary") {
      profileData = await Beneficiary.findOne({ userId: user._id }).populate("registeredDealer");
    }

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          walletAddress: user.walletAddress
        },
        profile: profileData
      }
    });

  } catch (error) {
    console.error(`[LOGIN ERROR] Error logging in user: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Server error during authentication",
      error: error.message
    });
  }
};

module.exports = { login };
