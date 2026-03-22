// models/Comment.js — Mongoose schema for a Comment
// Links a comment to both a User and a Post

const mongoose = require("mongoose");

const CommentSchema = new mongoose.Schema(
  {
    // Text content of the comment
    content: {
      type: String,
      required: [true, "Comment content is required"],
      trim: true,
      maxlength: [300, "Comment cannot exceed 300 characters"],
    },

    // Which user wrote this comment
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Which post this comment belongs to
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
    },
  },
  {
    // Adds createdAt and updatedAt automatically
    timestamps: true,
  }
);

module.exports = mongoose.model("Comment", CommentSchema);
