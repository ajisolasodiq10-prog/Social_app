// server.js — Entry point for the Social Media App
// Loads environment variables, connects to MongoDB, sets up middleware and routes

require("dotenv").config(); // Load .env variables first

const express = require("express");
const path = require("path");
const connectDB = require("./config/db");

// Import route files
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const postRoutes = require("./routes/postRoutes");
const commentRoutes = require("./routes/commentRoutes");

const app = express();

// ─── Connect to MongoDB ───────────────────────────────────────────────────────
connectDB();

// ─── Global Middleware ────────────────────────────────────────────────────────

// Parse incoming JSON request bodies
app.use(express.json());


// ─── API Routes ───────────────────────────────────────────────────────────────

app.use("/api/auth", authRoutes);       // Register & Login
app.use("/api/users", userRoutes);      // Profile, Follow/Unfollow

app.use("/api/comments", commentRoutes); // Add & Delete Comments
app.use("/api/posts", postRoutes);      // CRUD, Like, Feed

// Serve all files inside /public as static assets (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, "public")));

// ─── Fallback: Serve index.html for any unknown route ────────────────────────
// This ensures the frontend handles routing for non-API paths
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});


// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
