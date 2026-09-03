/**
 * SmartHire — Login Logic & Role Redirection
 */

function quickFill(role) {
  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');

  if (!emailInput || !passwordInput) return;

  if (role === 'student') {
    emailInput.value = 'arjun.sharma@example.com';
    passwordInput.value = 'Student@123456';
  } else if (role === 'recruiter') {
    emailInput.value = 'recruiter.tech@innovatex.com';
    passwordInput.value = 'Recruiter@123456';
  } else if (role === 'admin') {
    emailInput.value = 'admin@smarthire.com';
    passwordInput.value = 'Admin@123456';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('login-form');
  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');
  const submitBtn = document.getElementById('login-submit-btn');
  const btnText = document.getElementById('login-btn-text');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = emailInput ? emailInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value : '';

    if (!email || !password) {
      showToast('Please enter both email and password', 'warning');
      return;
    }

    if (submitBtn) submitBtn.disabled = true;
    if (btnText) btnText.textContent = 'Authenticating...';

    try {
      const res = await apiCall('/login', {
        method: 'POST',
        data: { email, password },
        requiresAuth: false
      });

      const token = res.data.token;
      const user = res.data.user;

      setToken(token);
      setUser(user);

      showToast(`Welcome back, ${user.email}!`, 'success', 2000);

      setTimeout(() => {
        if (user.role === 'student') {
          window.location.href = '/dashboard.html';
        } else if (user.role === 'recruiter') {
          window.location.href = '/recruiter-dashboard.html';
        } else if (user.role === 'admin') {
          window.location.href = '/admin-dashboard.html';
        } else {
          window.location.href = '/index.html';
        }
      }, 500);

    } catch (err) {
      showToast(err.message || 'Invalid email or password. Please try again.', 'error');
      if (submitBtn) submitBtn.disabled = false;
      if (btnText) btnText.textContent = 'Sign In →';
    }
  });
});
