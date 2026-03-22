// middleware/authMiddleware.js — JWT Authentication Middleware
// Extracts and verifies the JWT from the Authorization header.
// If valid, attaches the decoded user data to req.user so routes can use it.

const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  let token;

  // Check if the Authorization header exists and starts with "Bearer"
  // Frontend sends: Authorization: Bearer <token>
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // Extract just the token part (split "Bearer <token>" and take index 1)
      token = req.headers.authorization.split(" ")[1];

      // Verify the token using our JWT_SECRET from .env
      // If the token is expired or tampered with, this will throw an error
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Fetch the user from the database using the ID stored in the token.
      // We use .select("-password") to exclude the password hash from the result.
      req.user = await User.findById(decoded.id).select("-password");

      // If no user was found (e.g., account was deleted), deny access
      if (!req.user) {
        return res.status(401).json({ message: "User no longer exists" });
      }

      // All good — pass control to the next middleware or route handler
      next();
    } catch (error) {
      // Token was invalid or expired
      return res.status(401).json({ message: "Not authorized, token failed" });
    }
  } else {
    // No token was sent at all
    return res.status(401).json({ message: "Not authorized, no token" });
  }
};

module.exports = { protect };
