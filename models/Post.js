// models/Post.js — Mongoose schema for a Post
// Includes: content, author reference, likes array, timestamps

const mongoose = require("mongoose");

const PostSchema = new mongoose.Schema(
  {
    // The text content of the post
    content: {
      type: String,
      required: [true, "Post content is required"],
      trim: true,
      maxlength: [500, "Post cannot exceed 500 characters"],
    },

    // Reference to the User who created this post
    // Using ObjectId + ref allows Mongoose to "populate" (join) user data
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Array of User IDs who have liked this post.
    // We store IDs so we can:
    //   1. Count likes (likes.length)
    //   2. Check if the current user already liked it (prevent duplicates)
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    // Adds createdAt and updatedAt automatically
    timestamps: true,
  }
);

module.exports = mongoose.model("Post", PostSchema);
