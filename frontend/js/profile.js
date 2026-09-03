/**
 * SmartHire — Student Profile Edit Logic
 */

let currentStudentId = null;

async function loadProfile() {
  if (!isAuthenticated()) {
    window.location.href = '/login.html';
    return;
  }

  try {
    const res = await apiCall('/me');
    const user = res.data;
    const profile = user.profile || {};

    if (user.role !== 'student') {
      showToast('Profile view is for student accounts', 'info');
      window.location.href = '/dashboard.html';
      return;
    }

    currentStudentId = profile.student_id;

    if (document.getElementById('profile-name')) document.getElementById('profile-name').value = profile.name || '';
    if (document.getElementById('profile-email')) document.getElementById('profile-email').value = user.email || '';
    if (document.getElementById('profile-phone')) document.getElementById('profile-phone').value = profile.phone || '';
    if (document.getElementById('profile-college')) document.getElementById('profile-college').value = profile.college || '';
    if (document.getElementById('profile-degree')) document.getElementById('profile-degree').value = profile.degree || 'B.Tech';
    if (document.getElementById('profile-department')) document.getElementById('profile-department').value = profile.department || '';
    if (document.getElementById('profile-grad-year')) document.getElementById('profile-grad-year').value = profile.graduation_year || 2026;
    if (document.getElementById('profile-cgpa')) document.getElementById('profile-cgpa').value = profile.cgpa || '';
    if (document.getElementById('profile-skills')) document.getElementById('profile-skills').value = profile.skills || '';

    const resumeInfo = document.getElementById('current-resume-info');
    if (resumeInfo) {
      if (profile.resume) {
        resumeInfo.innerHTML = `
          <span style="color: var(--status-success);">✓ Current resume on file:</span> 
          <a href="/uploads/${escapeHtml(profile.resume)}" target="_blank" style="color: var(--brand-accent); font-weight: 600; text-decoration: underline;">
            View / Download Resume ↗
          </a>
        `;
      } else {
        resumeInfo.innerHTML = `<span style="color: var(--status-warning);">⚠ No resume currently uploaded.</span>`;
      }
    }

  } catch (err) {
    showToast('Failed to load profile data: ' + err.message, 'error');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadProfile();

  const form = document.getElementById('profile-edit-form');
  const saveBtn = document.getElementById('save-profile-btn') || document.getElementById('save-btn');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!currentStudentId) {
      showToast('Profile ID not loaded', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('name', document.getElementById('profile-name').value.trim());
    formData.append('phone', document.getElementById('profile-phone').value.trim());
    formData.append('college', document.getElementById('profile-college').value.trim());
    formData.append('degree', document.getElementById('profile-degree').value);
    formData.append('department', document.getElementById('profile-department').value.trim());
    formData.append('graduation_year', document.getElementById('profile-grad-year').value);
    formData.append('cgpa', document.getElementById('profile-cgpa').value);
    formData.append('skills', document.getElementById('profile-skills').value.trim());

    const resumeInput = document.getElementById('profile-resume');
    if (resumeInput && resumeInput.files && resumeInput.files[0]) {
      formData.append('resume', resumeInput.files[0]);
    }

    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving Changes...';
    }

    try {
      const res = await apiCall(`/students/${currentStudentId}/profile`, {
        method: 'PUT',
        data: formData,
        isFormData: true
      });

      showToast(res.message || 'Profile updated successfully!', 'success');
      loadProfile();
    } catch (err) {
      showToast(err.message || 'Failed to update profile', 'error');
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Profile Changes →';
      }
    }
  });
});
