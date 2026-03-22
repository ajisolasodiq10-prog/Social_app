// models/User.js — Mongoose schema for a User
// Handles: authentication fields, followers/following arrays, timestamps

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema(
  {
    // Display name shown on posts and profile
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      minlength: [3, "Username must be at least 3 characters"],
    },

    // Used for login — must be unique
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
    },

    // Stored as a bcrypt hash — NEVER store plain text passwords
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
    },

    // Short bio shown on the user's profile page
    bio: {
      type: String,
      default: "",
      maxlength: [200, "Bio cannot exceed 200 characters"],
    },

    // Users who follow this user (array of User IDs)
    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // Users that this user follows (array of User IDs)
    following: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    // Automatically adds createdAt and updatedAt fields
    timestamps: true,
  }
);

// ─── Pre-save Hook: Hash password before saving ───────────────────────────────
// This runs automatically whenever a user document is saved.
// We only hash if the password field was changed (avoids double-hashing).
UserSchema.pre("save", async function (next) {
  // If password wasn't modified, skip hashing
  if (!this.isModified("password")) return next();

  // Generate a salt (10 rounds is a good balance of speed vs security)
  const salt = await bcrypt.genSalt(10);

  // Replace plain text password with the hashed version
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ─── Instance Method: Compare passwords at login ─────────────────────────────
// Called during login to check if the entered password matches the stored hash
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", UserSchema);
