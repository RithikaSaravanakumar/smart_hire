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
      document.getElementById('recruiter-title').textContent = `${profile.company || 'Recruiter'} Workspace`;
      document.getElementById('recruiter-subtitle').textContent = `Welcome, ${profile.name} (${profile.designation || 'Hiring Lead'})`;
    }

    // Load Recruiter Stats
    if (currentRecruiterId) {
      const statsRes = await apiCall(`/recruiters/${currentRecruiterId}/stats`);
      const s = statsRes.data || {};
      document.getElementById('rec-total-jobs').textContent = s.total_jobs || 0;
      document.getElementById('rec-total-apps').textContent = s.total_applications || 0;
      document.getElementById('rec-under-review').textContent = s.under_review || 0;
      document.getElementById('rec-shortlisted').textContent = (s.shortlisted || 0) + (s.interview || 0);
      document.getElementById('rec-selected').textContent = s.selected || 0;

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
            <h3 style="margin-bottom: 0.4rem;">No job listings posted yet</h3>
            <p style="margin-bottom: 1rem;">Create your first campus placement job to receive student applicants.</p>
            <button class="btn btn-primary btn-sm" onclick="openCreateJobModal()">Post a Job Now</button>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = jobs.map(job => `
    <tr>
      <td>
        <strong style="color: var(--text-main); font-size: 0.95rem;">${escapeHtml(job.job_title)}</strong>
        <div style="font-size: 0.8rem; color: var(--accent-cyan);">${escapeHtml(job.company)}</div>
      </td>
      <td><span style="font-size: 0.88rem; color: var(--text-muted);">📍 ${escapeHtml(job.location)}</span></td>
      <td><span class="status-badge applied">${escapeHtml(job.experience)}</span></td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="viewJobApplicants(${job.job_id}, '${escapeHtml(job.job_title)}')">
          👥 ${job.application_count || 0} Applicants
        </button>
      </td>
      <td><span style="font-size: 0.85rem; color: var(--text-dim);">${formatDate(job.created_at)}</span></td>
      <td>
        <div style="display: flex; gap: 0.4rem;">
          <button class="btn btn-secondary btn-sm" onclick="openEditJobModal(${job.job_id})">✏ Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteRecruiterJob(${job.job_id})">🗑 Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function openCreateJobModal() {
  document.getElementById('job-modal-heading').textContent = 'Post New Job Listing';
  document.getElementById('modal-job-id').value = '';
  document.getElementById('job-form').reset();
  openModal('job-modal');
}

function openEditJobModal(jobId) {
  const job = currentRecruiterJobs.find(j => j.job_id === jobId);
  if (!job) return;

  document.getElementById('job-modal-heading').textContent = 'Edit Job Listing';
  document.getElementById('modal-job-id').value = job.job_id;
  document.getElementById('job-title-input').value = job.job_title;
  document.getElementById('job-location-input').value = job.location;
  document.getElementById('job-exp-input').value = job.experience;
  document.getElementById('job-skills-input').value = job.skills;
  document.getElementById('job-desc-input').value = job.description;

  openModal('job-modal');
}

async function deleteRecruiterJob(jobId) {
  if (!confirm('Are you sure you want to delete this job listing and its applications?')) return;
  try {
    await apiCall(`/jobs/${jobId}`, { method: 'DELETE' });
    showToast('Job listing deleted successfully', 'success');
    loadRecruiterDashboard();
  } catch (err) {
    showToast('Failed to delete job: ' + err.message, 'error');
  }
}

async function viewJobApplicants(jobId, jobTitle) {
  try {
    document.getElementById('applicants-modal-title').textContent = `Applicants for "${jobTitle}"`;
    const tbody = document.getElementById('applicants-table-body');
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 2rem;"><div class="spinner"></div></td></tr>`;
    openModal('applicants-modal');

    const res = await apiCall(`/jobs/${jobId}/applications`);
    const applicants = res.data || [];

    if (applicants.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><p>No students have applied for this drive yet.</p></div></td></tr>`;
      return;
    }

    tbody.innerHTML = applicants.map(app => {
      const student = app.student || {};
      return `
        <tr>
          <td>
            <div style="font-weight: 700; color: var(--text-main);">${escapeHtml(student.name || 'Student')}</div>
            <div style="font-size: 0.8rem; color: var(--accent-cyan);">${escapeHtml(student.email || '')} &bull; ${escapeHtml(student.phone || '')}</div>
          </td>
          <td>
            <div style="font-size: 0.88rem;">${escapeHtml(student.college || 'N/A')}</div>
            <div style="font-size: 0.8rem; color: #34d399; font-weight: 600;">CGPA: ${student.cgpa ? parseFloat(student.cgpa).toFixed(2) : 'N/A'}</div>
          </td>
          <td>
            <div class="skill-tags" style="max-width: 220px;">
              ${renderSkillBadges(student.skills)}
            </div>
          </td>
          <td>
            ${student.resume ? `
              <a href="/uploads/${escapeHtml(student.resume)}" target="_blank" class="btn btn-secondary btn-sm" style="font-size: 0.78rem;">
                📄 Resume
              </a>
            ` : `<span style="color: var(--text-dim); font-size: 0.8rem;">None</span>`}
          </td>
          <td>
            <select class="form-control" style="padding: 0.35rem 0.6rem; font-size: 0.82rem;" onchange="updateApplicantStatus(${app.application_id}, this.value)">
              <option value="Applied" ${app.status === 'Applied' ? 'selected' : ''}>Applied</option>
              <option value="Under Review" ${app.status === 'Under Review' ? 'selected' : ''}>Under Review</option>
              <option value="Shortlisted" ${app.status === 'Shortlisted' ? 'selected' : ''}>Shortlisted</option>
              <option value="Interview" ${app.status === 'Interview' ? 'selected' : ''}>Interview</option>
              <option value="Selected" ${app.status === 'Selected' ? 'selected' : ''}>Selected</option>
              <option value="Rejected" ${app.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
            </select>
          </td>
        </tr>
      `;
    }).join('');

  } catch (err) {
    showToast('Failed to load applicants: ' + err.message, 'error');
  }
}

async function updateApplicantStatus(applicationId, newStatus) {
  try {
    const res = await apiCall(`/applications/${applicationId}/status`, {
      method: 'PUT',
      data: { status: newStatus }
    });
    showToast(`Status updated to '${newStatus}'`, 'success');
    loadRecruiterDashboard(); // refresh counter
  } catch (err) {
    showToast('Failed to update status: ' + err.message, 'error');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadRecruiterDashboard();

  // Job Form Handler (Create or Edit)
  const jobForm = document.getElementById('job-form');
  jobForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const jobId = document.getElementById('modal-job-id').value;

    const payload = {
      job_title: document.getElementById('job-title-input').value.trim(),
      location: document.getElementById('job-location-input').value.trim(),
      experience: document.getElementById('job-exp-input').value.trim(),
      skills: document.getElementById('job-skills-input').value.trim(),
      description: document.getElementById('job-desc-input').value.trim()
    };

    try {
      if (jobId) {
        // Edit existing job
        await apiCall(`/jobs/${jobId}`, { method: 'PUT', data: payload });
        showToast('Job listing updated successfully', 'success');
      } else {
        // Create new job
        await apiCall(`/recruiters/${currentRecruiterId}/jobs`, { method: 'POST', data: payload });
        showToast('New job posted successfully', 'success');
      }
      closeModal('job-modal');
      loadRecruiterDashboard();
    } catch (err) {
      showToast('Error saving job: ' + err.message, 'error');
    }
  });
});
