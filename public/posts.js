// public/posts.js — Reusable post rendering and interaction logic
// Handles: rendering post cards, likes, comments, edit, delete.
// Used by both index.html (feed) and profile.html (user posts).

/**
 * Build the HTML for a single post card.
 * @param {Object} post - Post data from the API (with populated author)
 * @returns {string} - HTML string for the post card
 */
function buildPostCard(post) {
  const myId = getCurrentUserId();
  const isOwner = post.author._id === myId;

  // Check if the current user already liked this post
  const liked = post.likes.includes(myId);

  return `
    <div class="post-card" id="post-${post._id}">
      <!-- Post Header: avatar, author name, time, edit/delete if owner -->
      <div class="post-header">
        <div class="post-author-info">
          <div class="avatar" onclick="visitProfile('${post.author._id}')">
            ${getInitial(post.author.username)}
          </div>
          <div>
            <div class="post-author-name" onclick="visitProfile('${post.author._id}')">
              ${escapeHtml(post.author.username)}
            </div>
            <div class="post-time">${formatDate(post.createdAt)}</div>
          </div>
        </div>

        <!-- Edit/Delete buttons — only shown to the post owner -->
        <div class="post-actions-menu">
          ${isOwner ? `
            <button class="btn btn-ghost btn-sm" onclick="startEditPost('${post._id}', this)">
              ✏️ Edit
            </button>
            <button class="btn btn-danger btn-sm" onclick="deletePost('${post._id}')">
              🗑️
            </button>
          ` : ""}
        </div>
      </div>

      <!-- Post Content (shown normally; hidden when editing) -->
      <div class="post-content" id="content-${post._id}">
        ${escapeHtml(post.content)}
      </div>

      <!-- Edit area (hidden by default; shown when Edit is clicked) -->
      <div class="edit-post-area hidden" id="edit-${post._id}">
        <textarea id="edit-textarea-${post._id}">${escapeHtml(post.content)}</textarea>
        <div class="edit-actions">
          <button class="btn btn-primary btn-sm" style="width:auto;" onclick="submitEditPost('${post._id}')">Save</button>
          <button class="btn btn-ghost btn-sm" onclick="cancelEditPost('${post._id}')">Cancel</button>
        </div>
      </div>

      <!-- Post Footer: Like button -->
      <div class="post-footer">
        <button
          class="btn btn-like ${liked ? "liked" : ""}"
          id="like-btn-${post._id}"
          onclick="toggleLike('${post._id}')"
        >
          ${liked ? "❤️" : "🤍"} <span id="like-count-${post._id}">${post.likes.length}</span>
        </button>

        <!-- Toggle comments visibility -->
        <button class="btn btn-ghost btn-sm" onclick="toggleComments('${post._id}')">
          💬 Comments
        </button>
      </div>

      <!-- Comments Section (hidden by default) -->
      <div class="comments-section hidden" id="comments-section-${post._id}">
        <div class="comment-list" id="comment-list-${post._id}">
          <!-- Comments loaded on demand -->
        </div>
        <!-- Add comment input -->
        <div class="add-comment">
          <input
            type="text"
            id="comment-input-${post._id}"
            placeholder="Write a comment…"
            maxlength="300"
          />
          <button
            class="comment-submit-btn"
            onclick="submitComment('${post._id}')"
            title="Post comment"
          >→</button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render a list of posts into a container element.
 * @param {HTMLElement} container
 * @param {Array} posts
 */
function renderPosts(container, posts) {
  if (!posts || posts.length === 0) {
    container.innerHTML = `
      <div class="feed-empty">
        <div class="empty-icon">📭</div>
        <p>No posts yet. Be the first to share something!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = posts.map(buildPostCard).join("");
}

// ─── Like Toggle ──────────────────────────────────────────────────────────────
/**
 * Toggle like/unlike on a post.
 * Sends POST /api/posts/:id/like and updates the button UI.
 */
async function toggleLike(postId) {
  try {
    const res = await fetch(`/api/posts/${postId}/like`, {
      method: "POST",
      headers: authHeaders(),
    });

    if (res.status === 401) return (window.location.href = "/login.html");

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Could not like post");
      return;
    }

    // Update like count in the UI
    const countEl = document.getElementById(`like-count-${postId}`);
    const btnEl = document.getElementById(`like-btn-${postId}`);

    countEl.textContent = data.likes;

    if (data.liked) {
      btnEl.classList.add("liked");
      btnEl.innerHTML = `❤️ <span id="like-count-${postId}">${data.likes}</span>`;
    } else {
      btnEl.classList.remove("liked");
      btnEl.innerHTML = `🤍 <span id="like-count-${postId}">${data.likes}</span>`;
    }
  } catch (err) {
    console.error("Like error:", err);
  }
}

// ─── Comments ─────────────────────────────────────────────────────────────────
/** Track which posts have already loaded their comments (avoid re-fetching) */
const loadedComments = new Set();

/**
 * Toggle the visibility of a post's comment section.
 * Loads comments from the API on first open.
 */
async function toggleComments(postId) {
  const section = document.getElementById(`comments-section-${postId}`);
  const isHidden = section.classList.contains("hidden");

  section.classList.toggle("hidden");

  // Load comments only once
  if (isHidden && !loadedComments.has(postId)) {
    await loadComments(postId);
  }
}

/**
 * Fetch and render comments for a given post.
 */
async function loadComments(postId) {
  try {
    const res = await fetch(`/api/comments/${postId}`, {
      headers: authHeaders(),
    });
    const comments = await res.json();

    loadedComments.add(postId);
    renderComments(postId, comments);
  } catch (err) {
    console.error("Load comments error:", err);
  }
}

/**
 * Render a list of comments into the comment list for a post.
 */
function renderComments(postId, comments) {
  const list = document.getElementById(`comment-list-${postId}`);
  const myId = getCurrentUserId();

  if (!comments.length) {
    list.innerHTML = `<p style="color:var(--text-dim);font-size:0.82rem;padding:8px 0;">No comments yet.</p>`;
    return;
  }

  list.innerHTML = comments.map((c) => `
   
 
          <div class="avatar" onclick="visitProfile('${(c.user._id)}')">
            ${getInitial(c.user.username)}
          </div>

      <div class="comment-body">
        <div class="comment-meta">
          <span class="comment-username">${escapeHtml(c.user.username)}</span>
          <span class="comment-time">${formatDate(c.createdAt)}</span>
        </div>
        <div class="comment-text">${escapeHtml(c.content)}</div>
      </div>
      <!-- Delete button — only shown to comment owner -->
      ${c.user._id === myId ? `
        <button class="comment-delete" onclick="deleteComment('${c._id}', '${postId}')" title="Delete comment">✕</button>
      ` : ""}
    </div>
  `).join("");
}

/**
 * Submit a new comment to a post.
 * Sends POST /api/comments/:postId
 */
async function submitComment(postId) {
  const input = document.getElementById(`comment-input-${postId}`);
  const content = input.value.trim();

  if (!content) return;

  try {
    const res = await fetch(`/api/comments/${postId}`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ content }),
    });

    if (res.status === 401) return (window.location.href = "/login.html");

    const comment = await res.json();

    if (!res.ok) {
      alert(comment.message || "Could not post comment");
      return;
    }

    // Clear the input
    input.value = "";

    // Re-fetch and re-render comments for this post
    loadedComments.delete(postId);
    await loadComments(postId);
  } catch (err) {
    console.error("Submit comment error:", err);
  }
}

/**
 * Delete a comment.
 * Sends DELETE /api/comments/:id
 */
async function deleteComment(commentId, postId) {
  if (!confirm("Delete this comment?")) return;

  try {
    const res = await fetch(`/api/comments/${commentId}`, {
      method: "DELETE",
      headers: authHeaders(),
    });

    if (!res.ok) {
      const data = await res.json();
      alert(data.message || "Could not delete comment");
      return;
    }

    // Remove the comment from the DOM
    const commentEl = document.getElementById(`comment-${commentId}`);
    if (commentEl) commentEl.remove();
  } catch (err) {
    console.error("Delete comment error:", err);
  }
}

// ─── Edit Post ────────────────────────────────────────────────────────────────
/**
 * Show the inline edit form for a post.
 */
function startEditPost(postId) {
  document.getElementById(`content-${postId}`).classList.add("hidden");
  document.getElementById(`edit-${postId}`).classList.remove("hidden");
}

/**
 * Hide the edit form without saving.
 */
function cancelEditPost(postId) {
  document.getElementById(`edit-${postId}`).classList.add("hidden");
  document.getElementById(`content-${postId}`).classList.remove("hidden");
}

/**
 * Submit the edited post content.
 * Sends PUT /api/posts/:id
 */
async function submitEditPost(postId) {
  const newContent = document.getElementById(`edit-textarea-${postId}`).value.trim();

  if (!newContent) {
    alert("Post content cannot be empty.");
    return;
  }

  try {
    const res = await fetch(`/api/posts/${postId}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ content: newContent }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Could not update post");
      return;
    }

    // Update the displayed content without re-fetching everything
    document.getElementById(`content-${postId}`).textContent = newContent;
    cancelEditPost(postId);
  } catch (err) {
    console.error("Edit post error:", err);
  }
}

/**
 * Delete a post.
 * Sends DELETE /api/posts/:id
 */
async function deletePost(postId) {
  if (!confirm("Are you sure you want to delete this post?")) return;

  try {
    const res = await fetch(`/api/posts/${postId}`, {
      method: "DELETE",
      headers: authHeaders(),
    });

    if (!res.ok) {
      const data = await res.json();
      alert(data.message || "Could not delete post");
      return;
    }

    // Remove the post card from the DOM
    const postEl = document.getElementById(`post-${postId}`);
    if (postEl) postEl.remove();
  } catch (err) {
    console.error("Delete post error:", err);
  }
}

// ─── Navigation helpers ───────────────────────────────────────────────────────
/**
 * Navigate to a user's profile page.
 */
function visitProfile(userId) {
  window.location.href = `/profile.html?id=${userId}`;
}

/**
 * Navigate to the current user's own profile.
 */
function goToMyProfile() {
  window.location.href = `/profile.html?id=${getCurrentUserId()}`;
}

// ─── Security: Escape HTML to prevent XSS ────────────────────────────────────
/**
 * Escape special HTML characters in user-generated content.
 * This prevents script injection attacks (XSS).
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
