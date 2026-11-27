const jwt = require("jsonwebtoken");
const User = require("../models/User.model");

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // Extract token from Bearer token string
      token = req.headers.authorization.split(" ")[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "pds_blockchain_super_secret_jwt_key_2026_final_year_project");

      // Get user from the database (exclude password)
      const user = await User.findById(decoded.id).select("-password");
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Not authorized, user not found"
        });
      }

      req.user = user;
      next();
    } catch (error) {
      console.error(`[AUTH ERROR] JWT verify failed: ${error.message}`);
      return res.status(401).json({
        success: false,
        message: "Not authorized, token failed"
      });
    }
  } else {
    return res.status(401).json({
      success: false,
      message: "Not authorized, no token provided"
    });
  }
};

module.exports = { protect };
