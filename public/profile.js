// public/profile.js — Profile page logic
// Handles: loading profile data, follow/unfollow, edit profile, user posts

requireAuth();

// ─── State ────────────────────────────────────────────────────────────────────
const urlParams = new URLSearchParams(window.location.search);
const profileUserId = urlParams.get("id");
const myId = getCurrentUserId();
const isOwnProfile = profileUserId === myId;

let currentPage = 1;
let totalPages = 1;
let profileData = null;

// ─── Page Init ────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("nav-username").textContent = getCurrentUsername();

  if (!profileUserId) {
    window.location.href = `/profile.html?id=${myId}`;
    return;
  }

  loadProfile();
  loadUserPosts();
});

// ─── Load Profile ─────────────────────────────────────────────────────────────
async function loadProfile() {
  try {
    const res = await fetch(`/api/users/${profileUserId}`, {
      headers: authHeaders(),
    });
    const user = await res.json();
    if (!res.ok) {
      document.getElementById("profile-header").innerHTML =
        `<div class="alert alert-error">${user.message}</div>`;
      return;
    }

    profileData = user;
    renderProfileHeader(user);
  } catch (err) {
    console.error("Load profile error:", err);
  }
}

function renderProfileHeader(user) {
  const isFollowing = user.followers.some((id) =>
    id === myId || id._id === myId || id.toString() === myId
  );

  document.getElementById("profile-header").innerHTML = `
    <div class="profile-header-card">
      <div class="profile-top">
        <div class="profile-avatar-large">${getInitial(user.username)}</div>
        <div>
          ${isOwnProfile
            ? `<button class="btn btn-secondary btn-sm" onclick="showEditForm()">✏️ Edit Profile</button>`
            : `<button
                class="btn btn-follow ${isFollowing ? "following" : ""}"
                id="follow-btn"
                onclick="toggleFollow('${user._id}')"
              >${isFollowing ? "Following" : "Follow"}</button>`
          }
        </div>
      </div>

      <div class="profile-username">${escapeHtml(user.username)}</div>
      <div class="profile-bio">${escapeHtml(user.bio || "No bio yet.")}</div>

      <div class="profile-stats">
        <div class="stat-item">
          <span class="stat-number" id="stat-followers">${user.followers.length}</span>
          <span class="stat-label">Followers</span>
        </div>
        <div class="stat-item">
          <span class="stat-number">${user.following.length}</span>
          <span class="stat-label">Following</span>
        </div>
      </div>
    </div>
  `;

  // Pre-fill edit form fields if it's the user's own profile
  if (isOwnProfile) {
    document.getElementById("edit-username").value = user.username;
    document.getElementById("edit-bio").value = user.bio || "";
  }
}

// ─── Follow / Unfollow ────────────────────────────────────────────────────────
async function toggleFollow(userId) {
  const btn = document.getElementById("follow-btn");
  try {
    const res = await fetch(`/api/users/${userId}/follow`, {
      method: "POST",
      headers: authHeaders(),
    });
    const data = await res.json();
    if (!res.ok) { alert(data.message); return; }

    if (data.following) {
      btn.textContent = "Following";
      btn.classList.add("following");
      const statEl = document.getElementById("stat-followers");
      if (statEl) statEl.textContent = parseInt(statEl.textContent) + 1;
    } else {
      btn.textContent = "Follow";
      btn.classList.remove("following");
      const statEl = document.getElementById("stat-followers");
      if (statEl) statEl.textContent = Math.max(0, parseInt(statEl.textContent) - 1);
    }
  } catch (err) {
    console.error("Follow error:", err);
  }
}

// ─── Edit Profile ─────────────────────────────────────────────────────────────
function showEditForm() {
  document.getElementById("edit-form").classList.remove("hidden");
}

function cancelEdit() {
  document.getElementById("edit-form").classList.add("hidden");
}

async function saveProfile() {
  const username = document.getElementById("edit-username").value.trim();
  const bio = document.getElementById("edit-bio").value.trim();
  const alertBox = document.getElementById("profile-alert");

  if (!username) {
    showAlert(alertBox, "Username cannot be empty.");
    return;
  }

  try {
    const res = await fetch(`/api/users/${myId}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ username, bio }),
    });
    const data = await res.json();
    if (!res.ok) {
      showAlert(alertBox, data.message || "Update failed.");
      return;
    }

    // Update localStorage with new username
    localStorage.setItem("username", data.username);
    document.getElementById("nav-username").textContent = data.username;

    showAlert(alertBox, "Profile updated! ✓", "success");
    cancelEdit();
    loadProfile(); // Re-render profile header
    setTimeout(() => (alertBox.innerHTML = ""), 3000);
  } catch (err) {
    showAlert(alertBox, "Network error.");
  }
}

// ─── Load User's Posts ────────────────────────────────────────────────────────
async function loadUserPosts() {
  const container = document.getElementById("user-posts-container");
  container.innerHTML = '<div class="spinner"></div>';

  try {
    // Fetch all posts then filter by author (simple approach for this project)
    const res = await fetch(
      `/api/posts?page=${currentPage}&limit=50`,
      { headers: authHeaders() }
    );
    const data = await res.json();

    // Filter posts that belong to this profile's user
    const userPosts = (data.posts || []).filter(
      (p) => p.author._id === profileUserId
    );

    document.getElementById("posts-heading").textContent =
      `${isOwnProfile ? "Your" : "Posts"} (${userPosts.length})`;

    renderPosts(container, userPosts);
  } catch (err) {
    console.error("Load user posts error:", err);
    container.innerHTML = `<div class="alert alert-error">Failed to load posts.</div>`;
  }
}
