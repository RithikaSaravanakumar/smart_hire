/**
 * SmartHire — Common Frontend Client Module
 * Manages API calls, JWT authentication, UI Modals, Status Badges, and Toast Alerts
 */

// Centralized API configuration (supports local, same-origin, and custom Railway domain overrides)
const API_BASE_URL = window.SMART_HIRE_API_URL || '/api';
const API_BASE = API_BASE_URL;

// --- Authentication & Token Storage Helpers ---
function getToken() {
  return localStorage.getItem('smarthire_token');
}

function setToken(token) {
  if (token) {
    localStorage.setItem('smarthire_token', token);
  } else {
    localStorage.removeItem('smarthire_token');
  }
}

function getUser() {
  const userStr = localStorage.getItem('smarthire_user');
  try {
    return userStr ? JSON.parse(userStr) : null;
  } catch (e) {
    return null;
  }
}

function setUser(user) {
  if (user) {
    localStorage.setItem('smarthire_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('smarthire_user');
  }
}

function isAuthenticated() {
  return !!getToken();
}

function getRole() {
  const user = getUser();
  return user ? user.role : null;
}

function logout() {
  localStorage.removeItem('smarthire_token');
  localStorage.removeItem('smarthire_user');
  showToast('Logged out successfully', 'info');
  setTimeout(() => {
    window.location.href = '/login.html';
  }, 400);
}

// --- Universal API Client ---
async function apiCall(endpoint, { method = 'GET', data = null, isFormData = false, requiresAuth = true } = {}) {
  const headers = {};
  
  if (requiresAuth) {
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const options = { method, headers };

  if (data) {
    if (isFormData) {
      options.body = data; // Browser sets multipart boundary automatically
    } else {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(data);
    }
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`, options);
    const result = await response.json();

    if (!response.ok) {
      // Auto-logout if token expired or invalid
      if (response.status === 401 && requiresAuth && !endpoint.includes('/login')) {
        showToast(result.message || 'Session expired. Please log in again.', 'error');
        setToken(null);
        setUser(null);
        setTimeout(() => { window.location.href = '/login.html'; }, 1000);
      }
      throw new Error(result.message || `Request failed with status ${response.status}`);
    }

    return result;
  } catch (error) {
    console.error(`[API Error] ${method} ${endpoint}:`, error);
    throw error;
  }
}

// --- Toast Notification Engine ---
function showToast(message, type = 'info', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : type === 'warning' ? '⚠' : 'ℹ';
  toast.innerHTML = `<strong>${icon}</strong> <span>${message}</span>`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// --- Strict Role-Based Navbar ---
function updateNavbar() {
  const navContainer = document.getElementById('nav-links-container');
  if (!navContainer) return;

  const auth = isAuthenticated();
  const user = getUser();
  const role = user ? user.role : null;
  const currentPath = window.location.pathname;

  let links = '';

  if (!auth || !user) {
    // Guest / Public Visitor Navigation
    links = `
      <li><a href="/index.html" class="nav-link ${currentPath === '/' || currentPath.includes('index') ? 'active' : ''}">Home</a></li>
      <li><a href="/jobs.html" class="nav-link ${currentPath.includes('jobs') ? 'active' : ''}">Jobs</a></li>
      <li><a href="/login.html" class="btn btn-secondary btn-sm">Login</a></li>
      <li><a href="/register.html" class="btn btn-primary btn-sm">Register</a></li>
    `;
  } else if (role === 'student') {
    // Student Navigation
    links = `
      <li><a href="/index.html" class="nav-link ${currentPath === '/' || currentPath.includes('index') ? 'active' : ''}">Home</a></li>
      <li><a href="/jobs.html" class="nav-link ${currentPath.includes('jobs') ? 'active' : ''}">Jobs</a></li>
      <li><a href="/dashboard.html" class="nav-link ${currentPath.includes('dashboard.html') && !currentPath.includes('recruiter') && !currentPath.includes('admin') ? 'active' : ''}">Dashboard</a></li>
      <li><a href="/profile.html" class="nav-link ${currentPath.includes('profile') ? 'active' : ''}">Profile</a></li>
      <li>
        <span class="nav-user-badge">
          <span>●</span> ${escapeHtml(user.email.split('@')[0])}
        </span>
      </li>
      <li><button onclick="logout()" class="btn btn-secondary btn-sm">Logout</button></li>
    `;
  } else if (role === 'recruiter') {
    // Recruiter Navigation
    links = `
      <li><a href="/recruiter-dashboard.html" class="nav-link ${currentPath.includes('recruiter') ? 'active' : ''}">Dashboard</a></li>
      <li><a href="javascript:void(0)" onclick="openCreateJobModal()" class="nav-link">Post Job</a></li>
      <li>
        <span class="nav-user-badge" style="background: rgba(6, 182, 212, 0.15); border-color: rgba(6, 182, 212, 0.3); color: var(--accent-cyan);">
          <span>🏢</span> ${escapeHtml(user.email.split('@')[0])} (Recruiter)
        </span>
      </li>
      <li><button onclick="logout()" class="btn btn-secondary btn-sm">Logout</button></li>
    `;
  } else if (role === 'admin') {
    // Admin Navigation
    links = `
      <li><a href="/admin-dashboard.html" class="nav-link ${currentPath.includes('admin') ? 'active' : ''}">Dashboard</a></li>
      <li><a href="/api/docs" target="_blank" class="nav-link" style="color: var(--accent-purple);">API Docs</a></li>
      <li>
        <span class="nav-user-badge" style="background: rgba(245, 158, 11, 0.15); border-color: rgba(245, 158, 11, 0.3); color: var(--accent-amber);">
          <span>👑</span> Admin
        </span>
      </li>
      <li><button onclick="logout()" class="btn btn-secondary btn-sm">Logout</button></li>
    `;
  }

  navContainer.innerHTML = links;
}

// --- Modal Management ---
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
  }
}

// Close modal on background click
window.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('active');
  }
});

// --- UI Formatters & Renderers ---
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(isoString) {
  if (!isoString) return 'N/A';
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function renderStatusBadge(status) {
  const s = (status || 'applied').toLowerCase().replace(/\s+/g, '-');
  return `<span class="status-badge ${s}">● ${escapeHtml(status || 'Applied')}</span>`;
}

function renderMatchPill(skillMatch) {
  if (!skillMatch) return '';
  const pct = skillMatch.match_percentage || 0;
  let pillClass = 'low';
  if (pct >= 80) pillClass = 'high';
  else if (pct >= 60) pillClass = 'medium';
  else if (pct >= 40) pillClass = 'potential';

  return `
    <span class="match-pill ${pillClass}">
      ⚡ Skill Match: ${pct}% &bull; ${escapeHtml(skillMatch.category || '')}
    </span>
  `;
}

function renderSkillBadges(skillsStr, matchedList = [], missingList = []) {
  if (!skillsStr) return '<span class="text-muted">None listed</span>';
  const matchedSet = new Set(matchedList.map(s => s.toLowerCase()));
  const missingSet = new Set(missingList.map(s => s.toLowerCase()));

  const skills = skillsStr.split(',').map(s => s.trim()).filter(Boolean);
  return skills.map(skill => {
    const lower = skill.toLowerCase();
    let badgeClass = '';
    let suffix = '';
    if (matchedSet.has(lower)) {
      badgeClass = 'matched';
      suffix = ' ✓';
    } else if (missingSet.has(lower)) {
      badgeClass = 'missing';
      suffix = ' ✗';
    }
    return `<span class="skill-badge ${badgeClass}">${escapeHtml(skill)}${suffix}</span>`;
  }).join(' ');
}

// Initialize Navbar on page load
document.addEventListener('DOMContentLoaded', () => {
  updateNavbar();
});
