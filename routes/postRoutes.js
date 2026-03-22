// routes/postRoutes.js — Post CRUD, Like Toggle, and Feed
//
// GET    /api/posts              — All posts (paginated)
// GET    /api/feed               — Posts from followed users (paginated)
// POST   /api/posts              — Create a post (auth)
// PUT    /api/posts/:id          — Edit a post (auth, owner only)
// DELETE /api/posts/:id          — Delete a post (auth, owner only)
// POST   /api/posts/:id/like     — Toggle like/unlike (auth)

const express = require("express");
const router = express.Router();
const Post = require("../models/Post");
const User = require("../models/User");
const Comment = require("../models/Comment");
const { protect } = require("../middleware/authMiddleware");

// ─── GET /api/feed ────────────────────────────────────────────────────────────
// Returns posts ONLY from users that the logged-in user follows
// Sorted newest first, with pagination
router.get("/feed", protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get the list of user IDs this user follows from their profile
    const currentUser = await User.findById(req.user._id);
    const followingIds = currentUser.following;

    // Find posts where the author is in the following list
    const totalPosts = await Post.countDocuments({ author: { $in: followingIds } });

    const posts = await Post.find({ author: { $in: followingIds } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("author", "username");

    res.json({
      posts,
      currentPage: page,
      totalPages: Math.ceil(totalPosts / limit),
      totalPosts,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── GET /api/posts ───────────────────────────────────────────────────────────
// Returns all posts, newest first, with pagination
// Query params: ?page=1&limit=10
router.get("/", async (req, res) => {
  try {
    // Parse pagination params with sensible defaults
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit; // How many documents to skip

    const totalPosts = await Post.countDocuments();

    const posts = await Post.find()
      .sort({ createdAt: -1 })         // Newest first
      .skip(skip)
      .limit(limit)
      .populate("author", "username");  // Replace author ID with username field

    res.json({
      posts,
      currentPage: page,
      totalPages: Math.ceil(totalPosts / limit),
      totalPosts,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});



// ─── POST /api/posts ──────────────────────────────────────────────────────────
// Create a new post (auth required)
router.post("/", protect, async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || content.trim() === "") {
      return res.status(400).json({ message: "Post content is required" });
    }

    // Author is taken from the verified JWT — users can't fake this
    const post = await Post.create({
      content,
      author: req.user._id,
    });

    // Populate author info before sending back to frontend
    await post.populate("author", "username");

    res.status(201).json(post);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── PUT /api/posts/:id ───────────────────────────────────────────────────────
// Edit a post — only the original author can do this
router.put("/:id", protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Authorization check: compare post's author ID to logged-in user ID
    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to edit this post" });
    }

    const { content } = req.body;

    if (!content || content.trim() === "") {
      return res.status(400).json({ message: "Post content cannot be empty" });
    }

    post.content = content;
    await post.save();
    await post.populate("author", "username");

    res.json(post);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── DELETE /api/posts/:id ────────────────────────────────────────────────────
// Delete a post and all its comments — only the owner can do this
router.delete("/:id", protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Only the author can delete their post
    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to delete this post" });
    }

    // Delete all comments that belong to this post first
    await Comment.deleteMany({ post: req.params.id });

    // Now delete the post itself
    await Post.findByIdAndDelete(req.params.id);

    res.json({ message: "Post deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── POST /api/posts/:id/like ─────────────────────────────────────────────────
// Toggle like/unlike on a post
// If user already liked → unlike; if not liked → like
router.post("/:id/like", protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const userId = req.user._id;

    // Check if this user already liked the post
    const alreadyLiked = post.likes.includes(userId);

    if (alreadyLiked) {
      // Remove the like (unlike)
      post.likes = post.likes.filter((id) => id.toString() !== userId.toString());
    } else {
      // Add the like
      post.likes.push(userId);
    }

    await post.save();

    res.json({
      likes: post.likes.length,
      liked: !alreadyLiked, // true = now liked, false = now unliked
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
