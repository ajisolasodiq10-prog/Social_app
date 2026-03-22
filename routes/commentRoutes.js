// routes/commentRoutes.js — Comment System Routes
//
// GET    /api/comments/:postId   — Get all comments for a post
// POST   /api/comments/:postId   — Add a comment to a post (auth)
// DELETE /api/comments/:id       — Delete a comment (auth, owner only)

const express = require("express");
const router = express.Router();
const Comment = require("../models/Comment");
const Post = require("../models/Post");
const { protect } = require("../middleware/authMiddleware");

// ─── GET /api/comments/:postId ────────────────────────────────────────────────
// Fetch all comments for a specific post, oldest first
router.get("/:postId", async (req, res) => {
  try {
    const comments = await Comment.find({ post: req.params.postId })
      .sort({ createdAt: 1 })          // Oldest first (chronological thread)
      .populate("user", "username");    // Fill in username from User collection

    res.json(comments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── POST /api/comments/:postId ───────────────────────────────────────────────
// Add a new comment to a post (auth required)
router.post("/:postId", protect, async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || content.trim() === "") {
      return res.status(400).json({ message: "Comment content is required" });
    }

    // Verify the post exists before creating the comment
    const post = await Post.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Create the comment — user ID comes from the verified JWT
    const comment = await Comment.create({
      content,
      user: req.user._id,
      post: req.params.postId,
    });

    // Populate user info so frontend has the username right away
    await comment.populate("user", "username");

    res.status(201).json(comment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── DELETE /api/comments/:id ─────────────────────────────────────────────────
// Delete a specific comment — only the comment's author can do this
router.delete("/:id", protect, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // Authorization: only the comment owner can delete it
    if (comment.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to delete this comment" });
    }

    await Comment.findByIdAndDelete(req.params.id);

    res.json({ message: "Comment deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
