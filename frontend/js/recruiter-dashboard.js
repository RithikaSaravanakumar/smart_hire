/**
 * SmartHire — Recruiter Dashboard Logic
 * Manages Jobs, Applicants, and Real-time Status Changes
 */

let currentRecruiterId = null;
let currentRecruiterJobs = [];

async function loadRecruiterDashboard() {
  if (!isAuthenticated()) {
    window.location.href = '/login.html';
    return;
  }

  try {
    const meRes = await apiCall('/me');
    const user = meRes.data;
    const profile = user.profile || {};

    if (user.role !== 'recruiter' && user.role !== 'admin') {
      showToast('Unauthorized role. Redirecting to student dashboard.', 'warning');
      window.location.href = '/dashboard.html';
      return;
    }

    currentRecruiterId = profile.recruiter_id;
    if (document.getElementById('recruiter-title')) {
      document.getElementById('recruiter-title').textContent = `${profile.company || 'Recruiter'} Hub`;
      document.getElementById('recruiter-subtitle').textContent = `Welcome, ${profile.name || user.email} (${profile.designation || 'Corporate Hiring Lead'})`;
    }

    // Load Recruiter Stats
    if (currentRecruiterId) {
      const statsRes = await apiCall(`/recruiters/${currentRecruiterId}/stats`);
      const s = statsRes.data || {};
      const elJobs = document.getElementById('rec-total-jobs');
      const elApps = document.getElementById('rec-total-apps');
      const elReview = document.getElementById('rec-under-review');
      const elSelected = document.getElementById('rec-selected');

      if (elJobs) elJobs.textContent = s.total_jobs || 0;
      if (elApps) elApps.textContent = s.total_applications || 0;
      if (elReview) elReview.textContent = s.under_review || 0;
      if (elSelected) elSelected.textContent = s.selected || 0;

      // Load Recruiter Jobs
      const jobsRes = await apiCall(`/recruiters/${currentRecruiterId}/jobs`);
      currentRecruiterJobs = jobsRes.data || [];
      renderRecruiterJobs(currentRecruiterJobs);
    }

  } catch (err) {
    showToast('Failed to load recruiter workspace: ' + err.message, 'error');
  }
}

function renderRecruiterJobs(jobs) {
  const tbody = document.getElementById('recruiter-jobs-body');
  if (!tbody) return;

  if (jobs.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="empty-state">
            <div class="empty-state-icon">💼</div>
            <h4 class="empty-state-title">No Placement Drives Posted Yet</h4>
            <p class="empty-state-desc">Post your company's first placement drive to begin evaluating candidate applications.</p>
            <button class="btn btn-primary btn-sm" onclick="openCreateJobModal()">+ Post Placement Drive</button>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = jobs.map(job => `
    <tr>
      <td>
        <div style="font-weight: 600; color: var(--text-primary); font-size: 0.95rem;">${escapeHtml(job.job_title)}</div>
        <div style="font-size: 0.825rem; color: var(--brand-cyan);">${escapeHtml(job.company)}</div>
      </td>
      <td><span style="font-size: 0.875rem; color: var(--text-secondary);">📍 ${escapeHtml(job.location)}</span></td>
      <td><span class="badge" style="background: var(--bg-surface-elevated); border: 1px solid var(--border-default);">${escapeHtml(job.experience)}</span></td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="viewJobApplicants(${job.job_id}, '${escapeHtml(job.job_title)}')">
          👥 ${job.application_count || 0} Candidates
        </button>
      </td>
      <td><span style="font-size: 0.85rem; color: var(--text-muted);">${formatDate(job.created_at)}</span></td>
      <td style="text-align: right;">
        <div style="display: inline-flex; gap: 0.4rem;">
          <button class="btn btn-secondary btn-sm" onclick="openEditJobModal(${job.job_id})">✏ Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteRecruiterJob(${job.job_id})">🗑 Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function openCreateJobModal() {
  document.getElementById('job-modal-title').textContent = 'Post New Placement Drive';
  document.getElementById('edit-job-id').value = '';
  document.getElementById('job-form').reset();
  openModal('job-modal');
}

function openEditJobModal(jobId) {
  const job = currentRecruiterJobs.find(j => j.job_id === jobId);
  if (!job) return;

  document.getElementById('job-modal-title').textContent = 'Edit Placement Drive';
  document.getElementById('edit-job-id').value = job.job_id;
  document.getElementById('job-title').value = job.job_title;
  document.getElementById('job-location').value = job.location;
  document.getElementById('job-experience').value = job.experience;
  document.getElementById('job-skills').value = job.skills;
  document.getElementById('job-description').value = job.description;

  openModal('job-modal');
}

async function submitJobForm() {
  const jobId = document.getElementById('edit-job-id').value;
  const job_title = document.getElementById('job-title').value.trim();
  const location = document.getElementById('job-location').value.trim();
  const experience = document.getElementById('job-experience').value.trim();
  const skills = document.getElementById('job-skills').value.trim();
  const description = document.getElementById('job-description').value.trim();

  if (!job_title || !location || !experience || !skills || !description) {
    showToast('Please fill in all required job fields', 'warning');
    return;
  }

  const saveBtn = document.getElementById('save-job-btn');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
  }

  const payload = { job_title, location, experience, skills, description };

  try {
    if (jobId) {
      // Update existing job
      await apiCall(`/jobs/${jobId}`, { method: 'PUT', data: payload });
      showToast('Placement drive updated successfully', 'success');
    } else {
      // Create new job
      await apiCall(`/recruiters/${currentRecruiterId}/jobs`, { method: 'POST', data: payload });
      showToast('New placement drive posted successfully!', 'success');
    }

    closeModal('job-modal');
    loadRecruiterDashboard();

  } catch (err) {
    showToast('Failed to save job: ' + err.message, 'error');
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Job Posting →';
    }
  }
}

async function deleteRecruiterJob(jobId) {
  if (!confirm('Are you sure you want to delete this placement drive? All associated candidate applications will be removed.')) {
    return;
  }

  try {
    await apiCall(`/jobs/${jobId}`, { method: 'DELETE' });
    showToast('Job posting deleted', 'info');
    loadRecruiterDashboard();
  } catch (err) {
    showToast('Failed to delete job: ' + err.message, 'error');
  }
}

async function viewJobApplicants(jobId, jobTitle) {
  const section = document.getElementById('applicants-section');
  const titleEl = document.getElementById('applicants-section-title');
  const tbody = document.getElementById('applicants-table-body');

  section.style.display = 'block';
  titleEl.textContent = `Candidate Applicants: ${jobTitle}`;
  tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 2rem;"><div class="skeleton" style="height: 30px; width: 60%; margin: 0 auto;"></div></td></tr>`;
  section.scrollIntoView({ behavior: 'smooth' });

  try {
    const res = await apiCall(`/jobs/${jobId}/applications`);
    const applicants = res.data || [];

    if (applicants.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6">
            <div class="empty-state">
              <div class="empty-state-icon">👥</div>
              <h4 class="empty-state-title">No Applicants Yet</h4>
              <p class="empty-state-desc">No students have applied for this drive yet. Candidate applications will appear here in real time.</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = applicants.map(app => {
      const student = app.student || {};
      const statusOptions = ['Applied', 'Under Review', 'Shortlisted', 'Interview', 'Selected', 'Rejected'];

      return `
        <tr>
          <td>
            <div style="font-weight: 600; color: var(--text-primary);">${escapeHtml(student.name || 'Candidate')}</div>
            <div style="font-size: 0.825rem; color: var(--text-secondary);">${escapeHtml(student.college || 'College')} &bull; ${escapeHtml(student.degree || 'Degree')}</div>
          </td>
          <td>
            <div style="font-size: 0.875rem;"><strong>CGPA:</strong> ${student.cgpa || 'N/A'}</div>
            <div style="font-size: 0.825rem; color: var(--text-muted);">Class of ${student.graduation_year || '2026'}</div>
          </td>
          <td style="max-width: 240px;">
            ${renderSkillBadges(student.skills)}
          </td>
          <td>
            ${student.resume ? `
              <a href="/uploads/${escapeHtml(student.resume)}" target="_blank" class="btn btn-secondary btn-sm">
                📄 View Resume ↗
              </a>
            ` : `<span style="color: var(--text-muted); font-size: 0.85rem;">No resume attached</span>`}
          </td>
          <td>
            ${renderStatusBadge(app.status)}
          </td>
          <td style="text-align: right;">
            <select class="form-control" style="padding: 0.35rem 0.65rem; font-size: 0.85rem; width: auto; display: inline-block;" onchange="updateApplicantStatus(${app.application_id}, this.value)">
              ${statusOptions.map(opt => `<option value="${opt}" ${app.status === opt ? 'selected' : ''}>${opt}</option>`).join('')}
            </select>
          </td>
        </tr>
      `;
    }).join('');

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--status-danger); padding: 1.5rem;">Failed to load applicants: ${escapeHtml(err.message)}</td></tr>`;
  }
}

function closeApplicantsSection() {
  const section = document.getElementById('applicants-section');
  if (section) section.style.display = 'none';
}

async function updateApplicantStatus(applicationId, newStatus) {
  try {
    await apiCall(`/applications/${applicationId}/status`, {
      method: 'PUT',
      data: { status: newStatus }
    });
    showToast(`Applicant status updated to '${newStatus}'`, 'success');
    loadRecruiterDashboard();
  } catch (err) {
    showToast('Failed to update applicant status: ' + err.message, 'error');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadRecruiterDashboard();
});
