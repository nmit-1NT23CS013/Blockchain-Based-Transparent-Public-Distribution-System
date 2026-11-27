/**
 * Middleware to restrict access based on user role(s).
 * @param {...string} roles The allowed roles for the route (e.g. 'Admin', 'Dealer', 'Beneficiary')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, user context missing"
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted. Required roles: [${roles.join(", ")}]. Current role: ${req.user.role}`
      });
    }

    next();
  };
};

module.exports = { authorize };
