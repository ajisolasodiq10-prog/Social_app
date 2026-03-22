// routes/authRoutes.js — Authentication Routes
// POST /api/auth/register — Create a new account
// POST /api/auth/login    — Login and receive a JWT

const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// ─── Helper: Generate a JWT for a given user ID ───────────────────────────────
// The token encodes the user's _id and expires in 7 days
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

// ─── POST /api/auth/register ──────────────────────────────────────────────────
// Creates a new user account. Password hashing happens in the User model (pre-save hook).
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Basic validation — all fields are required
    if (!username || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check if email is already in use
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // Check if username is taken
    const usernameExists = await User.findOne({ username });
    if (usernameExists) {
      return res.status(400).json({ message: "Username already taken" });
    }

    // Create the user — password gets hashed by the pre-save hook in User.js
    const user = await User.create({ username, email, password });

    // Respond with the new user's data and a JWT
    res.status(201).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
// Validates credentials and returns a JWT if correct
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Find the user by email
    const user = await User.findOne({ email });

    // Check if user exists AND password matches
    // matchPassword() is defined on the User model
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Credentials are valid — return user info + token
    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
