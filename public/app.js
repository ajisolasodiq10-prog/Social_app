// public/app.js — Main feed page logic
// Handles: auth guard, create post, load all/feed posts, pagination, user suggestions

// ─── Auth Guard ────────────────────────────────────────────────────────────────
// If not logged in, redirect to login page immediately
requireAuth();

// ─── State ────────────────────────────────────────────────────────────────────
let currentTab = "all";    // "all" or "feed"
let currentPage = 1;
let totalPages = 1;

// ─── Page Init ────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  // Display the logged-in username in the navbar
  document.getElementById("nav-username").textContent = getCurrentUsername();

  // Load initial posts
  loadPosts();

  // Load user suggestions for the sidebar
  loadSuggestions();

  // Character counter for the create post textarea
  const postContent = document.getElementById("post-content");
  const charCount = document.getElementById("char-count");

  postContent.addEventListener("input", () => {
    const len = postContent.value.length;
    charCount.textContent = `${len} / 500`;
    charCount.classList.toggle("warn", len > 450);
  });

  // Allow Ctrl+Enter to submit a post
  postContent.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.ctrlKey) {
      document.getElementById("post-btn").click();
    }
  });

  // Create post button handler
  document.getElementById("post-btn").addEventListener("click", createPost);
});

// ─── Tab Switching ─────────────────────────────────────────────────────────────
/**
 * Switch between "All Posts" and "My Feed" tabs.
 */
function switchTab(tab) {
  currentTab = tab;
  currentPage = 1;

  // Update active tab styling
  document.getElementById("tab-all").classList.toggle("active", tab === "all");
  document.getElementById("tab-feed").classList.toggle("active", tab === "feed");

  // Update feed heading
  document.getElementById("feed-title").textContent =
    tab === "all" ? "All Posts" : "My Feed";

  loadPosts();
}

// ─── Load Posts ────────────────────────────────────────────────────────────────
/**
 * Fetch and render posts.
 * Uses /api/posts for "all" tab, or /api/feed for "feed" tab.
 */
async function loadPosts() {
  const container = document.getElementById("posts-container");
  container.innerHTML = '<div class="spinner"></div>';

  // Pick the correct endpoint based on the active tab
  const endpoint =
    currentTab === "all"
      ? `/api/posts?page=${currentPage}&limit=10`
      : `/api/posts/feed?page=${currentPage}&limit=10`;

  try {
    const res = await fetch(endpoint, {
      headers: authHeaders(),
    });

    // If token is invalid or expired, force re-login
    if (res.status === 401) {
      return (window.location.href = "/login.html");
    }

    const data = await res.json();

    if (!res.ok) {
      container.innerHTML = `<div class="alert alert-error">${data.message}</div>`;
      return;
    }

    // If "My Feed" is empty (no one followed), show a helpful message
    if (currentTab === "feed" && data.posts.length === 0) {
      container.innerHTML = `
        <div class="feed-empty">
          <div class="empty-icon">📡</div>
          <p>Your feed is empty. Follow some users to see their posts here!</p>
          <p style="margin-top:8px;"><button class="btn btn-secondary btn-sm" onclick="switchTab('all')">Browse all posts</button></p>
        </div>
      `;
      document.getElementById("pagination").innerHTML = "";
      return;
    }

    renderPosts(container, data.posts);

    totalPages = data.totalPages;
    renderPagination();
  } catch (err) {
    console.error("Load posts error:", err);
    container.innerHTML = `<div class="alert alert-error">Failed to load posts.</div>`;
  }
}
// ─── Search ────────────────────────────────────────────────────────────────────
const searchInput = document.getElementById("search-input");
const searchResults = document.getElementById("search-results");
let searchTimeout = null;

searchInput.addEventListener("input", () => {
  const query = searchInput.value.trim();

  // Clear previous debounce timer
  clearTimeout(searchTimeout);

  if (!query) {
    searchResults.classList.add("hidden");
    searchResults.innerHTML = "";
    return;
  }

  // Debounce — wait 300ms after user stops typing before sending request
  searchTimeout = setTimeout(async () => {
    try {
      const res = await fetch(`/api/users/search?username=${encodeURIComponent(query)}`, {
        headers: authHeaders(),
      });
      const users = await res.json();

      if (!users.length) {
        searchResults.innerHTML = `<div class="search-no-results">No users found.</div>`;
      } else {
        searchResults.innerHTML = users.map((u) => `
          <div class="search-result-item" onclick="visitProfile('${u._id}')">
            <div class="avatar" style="width:30px;height:30px;font-size:0.75rem;">
              ${getInitial(u.username)}
            </div>
            <span class="search-result-name">${escapeHtml(u.username)}</span>
          </div>
        `).join("");
      }

      searchResults.classList.remove("hidden");
    } catch (err) {
      console.error("Search error:", err);
    }
  }, 300);
});

// Close search results when clicking outside
document.addEventListener("click", (e) => {
  if (!e.target.closest(".search-bar")) {
    searchResults.classList.add("hidden");
  }
});


// ─── Create Post ───────────────────────────────────────────────────────────────
/**
 * Submit a new post to /api/posts
 */
async function createPost() {
  const textarea = document.getElementById("post-content");
  const alertBox = document.getElementById("post-alert");
  const btn = document.getElementById("post-btn");
  const content = textarea.value.trim();

  if (!content) {
    showAlert(alertBox, "Please write something first.", "error");
    return;
  }

  btn.textContent = "Posting…";
  btn.disabled = true;
  alertBox.innerHTML = "";

  try {
    const res = await fetch("/api/posts", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ content }),
    });

    const data = await res.json();

    if (!res.ok) {
      showAlert(alertBox, data.message || "Failed to create post.", "error");
      return;
    }

    // Clear the textarea
    textarea.value = "";
    document.getElementById("char-count").textContent = "0 / 500";

    // Add the new post to the top of the feed (no full page reload needed)
    if (currentTab === "all") {
      const container = document.getElementById("posts-container");

      // Remove empty state if present
      const emptyEl = container.querySelector(".feed-empty");
      if (emptyEl) emptyEl.remove();

      // Prepend the new post card
      container.insertAdjacentHTML("afterbegin", buildPostCard(data));
    }

    showAlert(alertBox, "Post published! ✓", "success");
    setTimeout(() => (alertBox.innerHTML = ""), 2500);
  } catch (err) {
    showAlert(alertBox, "Network error. Please try again.", "error");
  } finally {
    btn.textContent = "Post";
    btn.disabled = false;
  }
}

// ─── Pagination ────────────────────────────────────────────────────────────────
/**
 * Render previous/next pagination controls below the post list.
 */
function renderPagination() {
  const container = document.getElementById("pagination");

  if (totalPages <= 1) {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = `
    <button
      class="btn btn-secondary btn-sm"
      onclick="changePage(${currentPage - 1})"
      ${currentPage <= 1 ? "disabled" : ""}
    >← Prev</button>

    <span class="page-info">Page ${currentPage} of ${totalPages}</span>

    <button
      class="btn btn-secondary btn-sm"
      onclick="changePage(${currentPage + 1})"
      ${currentPage >= totalPages ? "disabled" : ""}
    >Next →</button>
  `;
}

/**
 * Go to a specific page and scroll to top.
 */
function changePage(page) {
  if (page < 1 || page > totalPages) return;
  currentPage = page;
  loadPosts();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ─── Discover People Sidebar ───────────────────────────────────────────────────
/**
 * Load a list of all users and display them as follow suggestions in the sidebar.
 * Simple implementation: fetch all posts and collect unique authors not yet followed.
 */
async function loadSuggestions() {
  const container = document.getElementById("suggestions-container");

  try {
    // Fetch recent posts to extract unique users from
    const res = await fetch("/api/postspage=1&limit=50", {
      headers: authHeaders(),
    });
    const data = await res.json();

    const myId = getCurrentUserId();

    // Get current user's following list
    const meRes = await fetch(`/api/users/${myId}`, { headers: authHeaders() });
    const me = await meRes.json();
    const followingSet = new Set(me.following.map((id) => id.toString()));

    // Collect unique users from posts (excluding ourselves)
    const seen = new Set();
    const users = [];

    for (const post of data.posts || []) {
      const authorId = post.author._id;
      if (authorId !== myId && !seen.has(authorId)) {
        seen.add(authorId);
        users.push({
          _id: authorId,
          username: post.author.username,
          isFollowing: followingSet.has(authorId),
        });
      }
      if (users.length >= 8) break;
    }

    if (!users.length) {
      container.innerHTML = `<p style="color:var(--text-dim);font-size:0.82rem;">No suggestions yet. Check back after more users sign up!</p>`;
      return;
    }

    container.innerHTML = users.map((u) => `
      <div class="suggestion-item" id="suggestion-${u._id}">
        <div class="suggestion-info">
          <div class="avatar" style="width:32px;height:32px;font-size:0.75rem;" onclick="visitProfile('${u._id}')">
            ${getInitial(u.username)}
          </div>
          <span class="suggestion-name" onclick="visitProfile('${u._id}')">${escapeHtml(u.username)}</span>
        </div>
        <button
          class="btn btn-follow ${u.isFollowing ? "following" : ""}"
          id="follow-btn-${u._id}"
          onclick="toggleFollowSuggestion('${u._id}', this)"
        >
          ${u.isFollowing ? "Following" : "Follow"}
        </button>
      </div>
    `).join("");
  } catch (err) {
    console.error("Suggestions error:", err);
    container.innerHTML = "";
  }
}

/**
 * Toggle follow/unfollow from the sidebar suggestion list.
 */
async function toggleFollowSuggestion(userId, btn) {
  try {
    const res = await fetch(`/api/users/${userId}/follow`, {
      method: "POST",
      headers: authHeaders(),
    });

    const data = await res.json();
    if (!res.ok) { alert(data.message); return; }

    // Update button state
    if (data.following) {
      btn.textContent = "Following";
      btn.classList.add("following");
    } else {
      btn.textContent = "Follow";
      btn.classList.remove("following");
    }
  } catch (err) {
    console.error("Follow error:", err);
  }
}

