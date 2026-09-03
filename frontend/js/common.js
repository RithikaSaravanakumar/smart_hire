/**
 * SmartHire — Enterprise Violet SaaS Client Core Module
 * Features: Dark/Light Mode Engine, JWT Auth, Modals, Status Badges, Toast Alerts & Skeletons
 */

const API_BASE_URL = window.SMART_HIRE_API_URL || '/api';
const API_BASE = API_BASE_URL;

// --- Theme Management (Dark & Light Mode) ---
function getSavedTheme() {
  return localStorage.getItem('smarthire_theme') || 'dark';
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('smarthire_theme', theme);
  updateThemeToggleButtons();
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  applyTheme(newTheme);
  showToast(`Switched to ${newTheme.toUpperCase()} mode`, 'info', 2000);
}

function updateThemeToggleButtons() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
  const buttons = document.querySelectorAll('.theme-toggle-btn');
  buttons.forEach(btn => {
    if (currentTheme === 'light') {
      btn.innerHTML = '🌙 Dark';
      btn.setAttribute('title', 'Switch to Dark Mode');
      btn.setAttribute('aria-label', 'Switch to Dark Mode');
    } else {
      btn.innerHTML = '☀️ Light';
      btn.setAttribute('title', 'Switch to Light Mode');
      btn.setAttribute('aria-label', 'Switch to Light Mode');
    }
  });
}

// Immediately apply saved theme to avoid FOUC
(function () {
  const savedTheme = localStorage.getItem('smarthire_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
})();

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
      options.body = data;
    } else {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(data);
    }
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`, options);
    const result = await response.json();

    if (!response.ok) {
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
    container.setAttribute('aria-live', 'polite');
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : type === 'warning' ? '⚠' : 'ℹ';
  toast.innerHTML = `<strong style="font-size: 1.1rem;">${icon}</strong> <span>${escapeHtml(message)}</span>`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.25s ease';
    setTimeout(() => toast.remove(), 250);
  }, duration);
}

// --- Strict Role-Based Navbar with Theme Toggle ---
function updateNavbar() {
  const navContainer = document.getElementById('nav-links-container');
  if (!navContainer) return;

  const auth = isAuthenticated();
  const user = getUser();
  const role = user ? user.role : null;
  const currentPath = window.location.pathname;

  const themeToggleHtml = `
    <li>
      <button class="theme-toggle-btn" onclick="toggleTheme()" aria-label="Toggle Light / Dark Theme">
        ☀️ Light
      </button>
    </li>
  `;

  let links = '';

  if (!auth || !user) {
    // Public / Visitor
    links = `
      <li><a href="/index.html" class="nav-link ${currentPath === '/' || currentPath.endsWith('index.html') ? 'active' : ''}">Home</a></li>
      <li><a href="/index.html#about" class="nav-link">About</a></li>
      <li><a href="/jobs.html" class="nav-link ${currentPath.includes('jobs') ? 'active' : ''}">Jobs</a></li>
      <li><a href="/index.html#features" class="nav-link">Features</a></li>
      <li><a href="/index.html#how-it-works" class="nav-link">Workflow</a></li>
      <li><a href="/index.html#categories" class="nav-link">Categories</a></li>
      <li><a href="/index.html#employers" class="nav-link">Employers</a></li>
      <li><a href="/login.html" class="btn btn-secondary btn-sm">Sign In</a></li>
      <li><a href="/register.html" class="btn btn-primary btn-sm">Register</a></li>
      ${themeToggleHtml}
    `;
  } else if (role === 'student') {
    // Student
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
      ${themeToggleHtml}
      <li><button onclick="logout()" class="btn btn-secondary btn-sm">Sign Out</button></li>
    `;
  } else if (role === 'recruiter') {
    // Recruiter
    links = `
      <li><a href="/recruiter-dashboard.html" class="nav-link ${currentPath.includes('recruiter') ? 'active' : ''}">Dashboard</a></li>
      <li><a href="javascript:void(0)" onclick="openCreateJobModal()" class="btn btn-primary btn-sm">+ Post Job</a></li>
      <li>
        <span class="nav-user-badge" style="background: rgba(147, 51, 234, 0.12); border-color: rgba(147, 51, 234, 0.3); color: var(--brand-magenta);">
          <span>🏢</span> ${escapeHtml(user.email.split('@')[0])}
        </span>
      </li>
      ${themeToggleHtml}
      <li><button onclick="logout()" class="btn btn-secondary btn-sm">Sign Out</button></li>
    `;
  } else if (role === 'admin') {
    // Admin
    links = `
      <li><a href="/admin-dashboard.html" class="nav-link ${currentPath.includes('admin') ? 'active' : ''}">Dashboard</a></li>
      <li><a href="/api/docs" target="_blank" class="nav-link" style="color: var(--brand-accent);">API Docs ↗</a></li>
      <li>
        <span class="nav-user-badge" style="background: rgba(245, 158, 11, 0.15); border-color: rgba(245, 158, 11, 0.3); color: var(--status-warning);">
          <span>👑</span> Admin Control
        </span>
      </li>
      ${themeToggleHtml}
      <li><button onclick="logout()" class="btn btn-secondary btn-sm">Sign Out</button></li>
    `;
  }

  navContainer.innerHTML = links;
  updateThemeToggleButtons();
}

// Mobile Toggle Handler
function toggleMobileNav() {
  const navLinks = document.getElementById('nav-links-container');
  if (navLinks) {
    navLinks.classList.toggle('mobile-open');
  }
}

// --- Modal Management & Keyboard Accessibility ---
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// Close modal on ESC key or background click
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const activeModals = document.querySelectorAll('.modal-overlay.active');
    activeModals.forEach(m => m.classList.remove('active'));
    document.body.style.overflow = '';
  }
});

window.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('active');
    document.body.style.overflow = '';
  }
});

// --- Password Visibility Toggle ---
function togglePasswordVisibility(inputId, buttonEl) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    buttonEl.innerHTML = '👁️‍🗨️';
    buttonEl.setAttribute('aria-label', 'Hide password');
  } else {
    input.type = 'password';
    buttonEl.innerHTML = '👁️';
    buttonEl.setAttribute('aria-label', 'Show password');
  }
}

// --- Skeleton Loaders & Empty State Utilities ---
function renderSkeletonCards(count = 3) {
  let html = '';
  for (let i = 0; i < count; i++) {
    html += `<div class="card skeleton skeleton-card"></div>`;
  }
  return html;
}

function renderEmptyState(title, description, actionBtnHtml = '') {
  return `
    <div class="empty-state">
      <div class="empty-state-icon">📂</div>
      <h4 class="empty-state-title">${escapeHtml(title)}</h4>
      <p class="empty-state-desc">${escapeHtml(description)}</p>
      ${actionBtnHtml}
    </div>
  `;
}

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
  const pct = Math.round(skillMatch.match_percentage || 0);
  let pillClass = 'low';
  if (pct >= 80) pillClass = 'high';
  else if (pct >= 60) pillClass = 'medium';
  else if (pct >= 40) pillClass = 'potential';

  return `
    <span class="match-pill ${pillClass}">
      ⚡ ${pct}% Fit &bull; ${escapeHtml(skillMatch.category || '')}
    </span>
  `;
}

function renderSkillBadges(skillsStr, matchedList = [], missingList = []) {
  if (!skillsStr) return '<span class="text-muted">None listed</span>';
  const matchedSet = new Set((matchedList || []).map(s => s.toLowerCase()));
  const missingSet = new Set((missingList || []).map(s => s.toLowerCase()));

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

// --- Animated Counters Engine ---
function initCounterAnimation() {
  const counterElements = document.querySelectorAll('[data-counter-target]');
  if (!counterElements.length) return;

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseFloat(el.getAttribute('data-counter-target'));
        const prefix = el.getAttribute('data-counter-prefix') || '';
        const suffix = el.getAttribute('data-counter-suffix') || '';
        const decimals = parseInt(el.getAttribute('data-counter-decimals') || '0', 10);
        const duration = 1800; // ms
        const startTime = performance.now();

        function updateCount(currentTime) {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);
          // Ease-out cubic
          const easeOut = 1 - Math.pow(1 - progress, 3);
          const currentVal = (target * easeOut).toFixed(decimals);
          
          el.textContent = `${prefix}${Number(currentVal).toLocaleString()}${suffix}`;

          if (progress < 1) {
            requestAnimationFrame(updateCount);
          } else {
            el.textContent = `${prefix}${target.toLocaleString()}${suffix}`;
          }
        }

        requestAnimationFrame(updateCount);
        obs.unobserve(el);
      }
    });
  }, { threshold: 0.2 });

  counterElements.forEach(el => observer.observe(el));
}

// --- Navbar Glass Scroll Enhancer ---
function initNavbarScrollEffect() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
      navbar.classList.add('navbar-scrolled');
    } else {
      navbar.classList.remove('navbar-scrolled');
    }
  }, { passive: true });
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  updateNavbar();
  updateThemeToggleButtons();
  initCounterAnimation();
  initNavbarScrollEffect();
});
