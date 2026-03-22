// routes/userRoutes.js — User Profile & Follow System Routes
// GET    /api/users/:id         — Get a user's public profile
// PUT    /api/users/:id         — Update own profile (auth required)
// POST   /api/users/:id/follow  — Follow or unfollow a user (auth required)

const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { protect } = require("../middleware/authMiddleware");

// GET /api/users/search?username=bob
router.get("/search", async (req, res) => {
  try {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({ message: "Username query is required" });
    }

    // Case-insensitive partial match using regex
    const users = await User.find({
      username: { $regex: username, $options: "i" },
    })
      .select("_id username bio")
      .limit(10);

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── GET /api/users/:id ───────────────────────────────────────────────────────
// Returns public profile data for any user (no auth required)
router.get("/:id", async (req, res) => {
  try {
    // Exclude the password hash from the result
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── PUT /api/users/:id ───────────────────────────────────────────────────────
// Allows a logged-in user to update their own profile (username, bio)
router.put("/:id", protect, async (req, res) => {
  try {
    // Authorization: users can only edit their own profile
    if (req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ message: "Not authorized to edit this profile" });
    }

    const { username, bio } = req.body;

    // If a new username is provided, check it isn't taken by someone else
    if (username) {
      const taken = await User.findOne({
        username,
        _id: { $ne: req.params.id }, // exclude the current user from the check
      });
      if (taken) {
        return res.status(400).json({ message: "Username already taken" });
      }
    }

    // Apply updates (only fields that were sent)
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { username, bio } },
      { new: true, runValidators: true } // return the updated document
    ).select("-password");

    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── POST /api/users/:id/follow ───────────────────────────────────────────────
// Toggle follow/unfollow on another user
// If already following → unfollow; if not following → follow
router.post("/:id/follow", protect, async (req, res) => {
  try {
    const targetId = req.params.id;    // The user to follow/unfollow
    const currentUserId = req.user._id; // The logged-in user

    // Prevent following yourself
    if (targetId === currentUserId.toString()) {
      return res.status(400).json({ message: "You cannot follow yourself" });
    }

    const targetUser = await User.findById(targetId);
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if the current user is already following the target
    const isFollowing = targetUser.followers.includes(currentUserId);

    if (isFollowing) {
      // ── Unfollow ──
      // Remove currentUser from targetUser's followers list
      await User.findByIdAndUpdate(targetId, {
        $pull: { followers: currentUserId },
      });
      // Remove targetUser from currentUser's following list
      await User.findByIdAndUpdate(currentUserId, {
        $pull: { following: targetId },
      });
      res.json({ message: "Unfollowed successfully", following: false });
    } else {
      // ── Follow ──
      // Add currentUser to targetUser's followers list
      await User.findByIdAndUpdate(targetId, {
        $addToSet: { followers: currentUserId }, // $addToSet prevents duplicates
      });
      // Add targetUser to currentUser's following list
      await User.findByIdAndUpdate(currentUserId, {
        $addToSet: { following: targetId },
      });
      res.json({ message: "Followed successfully", following: true });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});



module.exports = router;
