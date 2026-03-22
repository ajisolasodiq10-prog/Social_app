// public/auth.js — Shared frontend authentication utilities
// Handles token storage, user data, and auth state checks.
// Imported by all pages that need to know if the user is logged in.

// ─── Token & User Storage ──────────────────────────────────────────────────────
// We store the JWT and basic user info in localStorage so it persists across page refreshes

/**
 * Save the user's login data to localStorage after a successful login/register.
 * @param {Object} userData - The response from the server (includes token)
 */
function saveAuthData(userData) {
  localStorage.setItem("token", userData.token);
  localStorage.setItem("userId", userData._id);
  localStorage.setItem("username", userData.username);
  localStorage.setItem("email", userData.email);
}

/**
 * Clear all stored login data (used on logout).
 */
function clearAuthData() {
  localStorage.removeItem("token");
  localStorage.removeItem("userId");
  localStorage.removeItem("username");
  localStorage.removeItem("email");
}

/**
 * Get the stored JWT token.
 * @returns {string|null}
 */
function getToken() {
  return localStorage.getItem("token");
}

/**
 * Get the stored user ID.
 * @returns {string|null}
 */
function getCurrentUserId() {
  return localStorage.getItem("userId");
}

/**
 * Get the stored username.
 * @returns {string|null}
 */
function getCurrentUsername() {
  return localStorage.getItem("username");
}

/**
 * Check if the user is currently logged in (has a token in localStorage).
 * @returns {boolean}
 */
function isLoggedIn() {
  return !!getToken();
}

/**
 * Redirect to login page if the user is not authenticated.
 * Use this at the top of any protected page.
 */
function requireAuth() {
  if (!isLoggedIn()) {
    window.location.href = "/login.html";
  }
}

/**
 * Redirect to the main feed if the user IS already authenticated.
 * Use this on login/register pages to avoid showing them to logged-in users.
 */
function redirectIfLoggedIn() {
  if (isLoggedIn()) {
    window.location.href = "/index.html";
  }
}

/**
 * Log the user out — clear data and redirect to login page.
 */
function logout() {
  clearAuthData();
  window.location.href = "/login.html";
}

/**
 * Build the standard Authorization header object for fetch() calls.
 * @returns {Object} - Headers object with Bearer token
 */
function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };
}

/**
 * Format a date string into a readable relative or absolute format.
 * @param {string} dateStr - ISO date string from MongoDB
 * @returns {string}
 */
function formatDate(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Get the first letter of a username for avatar display.
 * @param {string} username
 * @returns {string}
 */
function getInitial(username) {
  return username ? username.charAt(0).toUpperCase() : "?";
}

/**
 * Show an alert message in a container element.
 * @param {HTMLElement} container
 * @param {string} message
 * @param {string} type - 'error' or 'success'
 */
function showAlert(container, message, type = "error") {
  container.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
}
