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

    if (user.role !== 'student' || !profile.student_id) {
      showToast('Profile management is only available for student accounts', 'warning');
      setTimeout(() => { window.location.href = '/index.html'; }, 1000);
      return;
    }

    currentStudentId = profile.student_id;

    document.getElementById('profile-name').value = profile.name || '';
    document.getElementById('profile-email').value = user.email || '';
    document.getElementById('profile-phone').value = profile.phone || '';
    document.getElementById('profile-college').value = profile.college || '';
    document.getElementById('profile-degree').value = profile.degree || 'B.Tech';
    document.getElementById('profile-department').value = profile.department || '';
    document.getElementById('profile-grad-year').value = profile.graduation_year || 2026;
    document.getElementById('profile-cgpa').value = profile.cgpa || '';
    document.getElementById('profile-skills').value = profile.skills || '';

    const resumeInfo = document.getElementById('current-resume-info');
    if (profile.resume) {
      resumeInfo.innerHTML = `
        <span style="color: #34d399;">✓ Current resume uploaded:</span> 
        <a href="/uploads/${escapeHtml(profile.resume)}" target="_blank" style="color: var(--accent-cyan); font-weight: 600; text-decoration: underline;">
          View / Download Resume
        </a>
      `;
    } else {
      resumeInfo.innerHTML = `<span style="color: var(--accent-amber);">⚠ No resume currently uploaded.</span>`;
    }

  } catch (err) {
    showToast('Failed to load profile data: ' + err.message, 'error');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadProfile();

  const form = document.getElementById('profile-edit-form');
  const saveBtn = document.getElementById('save-profile-btn');
  const btnText = document.getElementById('save-btn-text');
  const btnSpinner = document.getElementById('save-btn-spinner');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentStudentId) return;

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
    if (resumeInput.files && resumeInput.files[0]) {
      formData.append('resume', resumeInput.files[0]);
    }

    saveBtn.disabled = true;
    btnText.textContent = 'Saving...';
    btnSpinner.style.display = 'inline-block';

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
      saveBtn.disabled = false;
      btnText.textContent = 'Save Changes';
      btnSpinner.style.display = 'none';
    }
  });
});
