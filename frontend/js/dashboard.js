/**
 * SmartHire — Student Dashboard Logic
 * Loads Profile Card, Dynamic Statistics, Recommendation Feed, and Applications Table
 */

let pendingWithdrawId = null;

async function loadStudentDashboard() {
  if (!isAuthenticated()) {
    window.location.href = '/login.html';
    return;
  }

  const user = getUser();
  if (user && user.role !== 'student') {
    if (user.role === 'recruiter') window.location.href = '/recruiter-dashboard.html';
    else if (user.role === 'admin') window.location.href = '/admin-dashboard.html';
    return;
  }

  try {
    // 1. Fetch current profile
    const meRes = await apiCall('/me');
    const profile = meRes.data.profile || {};
    renderProfileCard(profile);

    // 2. Fetch all jobs count
    const jobsRes = await apiCall('/jobs', { requiresAuth: false });
    const totalJobs = jobsRes.count || (jobsRes.data ? jobsRes.data.length : 0);
    document.getElementById('stat-total-jobs').textContent = totalJobs;

    // 3. Fetch student applications
    if (profile.student_id) {
      const appsRes = await apiCall(`/students/${profile.student_id}/applications`);
      const applications = appsRes.data || [];
      renderApplicationsTable(applications);
      calculateStats(totalJobs, applications);
    }

    // 4. Fetch AI recommendations
    loadRecommendations();

  } catch (err) {
    showToast('Failed to load dashboard data: ' + err.message, 'error');
  }
}

function renderProfileCard(profile) {
  const container = document.getElementById('profile-summary-card');
  if (!container) return;

  const skillsList = profile.skills ? profile.skills.split(',').map(s => s.trim()) : [];

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1.5rem;">
      <div style="display: flex; gap: 1.25rem; align-items: center;">
        <div style="width: 64px; height: 64px; border-radius: var(--radius-md); background: var(--grad-primary); display: flex; align-items: center; justify-content: center; font-size: 1.8rem; font-weight: 800; color: #fff; box-shadow: var(--shadow-glow);">
          ${escapeHtml((profile.name || 'S')[0].toUpperCase())}
        </div>
        <div>
          <h2 style="font-size: 1.45rem; margin-bottom: 0.2rem;">${escapeHtml(profile.name || 'Student')}</h2>
          <div style="color: var(--text-muted); font-size: 0.9rem;">
            🏫 ${escapeHtml(profile.college || 'College')} &bull; ${escapeHtml(profile.degree || 'Degree')} in ${escapeHtml(profile.department || 'Department')} (Class of ${escapeHtml(profile.graduation_year || '2026')})
          </div>
        </div>
      </div>

      <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
        <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.25); padding: 0.5rem 1rem; border-radius: var(--radius-md); text-align: center;">
          <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">Current CGPA</div>
          <div style="font-size: 1.25rem; font-weight: 800; color: #34d399;">${profile.cgpa ? parseFloat(profile.cgpa).toFixed(2) : 'N/A'} / 10.0</div>
        </div>

        ${profile.resume ? `
          <a href="/uploads/${escapeHtml(profile.resume)}" target="_blank" class="btn btn-secondary btn-sm" style="display: inline-flex; align-items: center; gap: 0.4rem;">
            📄 View Resume
          </a>
        ` : `
          <a href="/profile.html" class="btn btn-outline btn-sm">📎 Upload Resume</a>
        `}
      </div>
    </div>

    <div style="margin-top: 1.25rem; padding-top: 1rem; border-top: 1px solid var(--border-subtle);">
      <div style="font-size: 0.82rem; font-weight: 600; color: var(--text-muted); margin-bottom: 0.5rem; text-transform: uppercase;">
        Registered Competencies & Skills:
      </div>
      <div class="skill-tags">
        ${skillsList.map(skill => `<span class="skill-badge matched">✓ ${escapeHtml(skill)}</span>`).join('')}
      </div>
    </div>
  `;
}

function calculateStats(totalJobs, applications) {
  const appliedCount = applications.length;
  const underReviewCount = applications.filter(a => a.status === 'Under Review').length;
  const shortlistedCount = applications.filter(a => a.status === 'Shortlisted' || a.status === 'Interview').length;
  const selectedCount = applications.filter(a => a.status === 'Selected').length;

  document.getElementById('stat-applied').textContent = appliedCount;
  document.getElementById('stat-under-review').textContent = underReviewCount;
  document.getElementById('stat-shortlisted').textContent = shortlistedCount;
  document.getElementById('stat-selected').textContent = selectedCount;
}

function renderApplicationsTable(applications) {
  const tbody = document.getElementById('applications-table-body');
  const countBadge = document.getElementById('applications-count-badge');
  if (!tbody) return;

  countBadge.textContent = `${applications.length} Application${applications.length === 1 ? '' : 's'}`;

  if (applications.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5">
          <div class="empty-state">
            <div class="empty-state-icon">📋</div>
            <h3 style="margin-bottom: 0.4rem;">No applications yet</h3>
            <p style="margin-bottom: 1rem;">Explore available placement drives and start applying!</p>
            <a href="/jobs.html" class="btn btn-primary btn-sm">Browse Active Jobs &rarr;</a>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = applications.map(app => {
    const job = app.job || {};
    return `
      <tr>
        <td>
          <strong style="color: var(--text-main); font-size: 0.95rem;">${escapeHtml(job.job_title || 'Unknown Position')}</strong>
          <div style="font-size: 0.8rem; color: var(--text-muted);">📍 ${escapeHtml(job.location || 'N/A')}</div>
        </td>
        <td>
          <span style="font-weight: 600; color: var(--accent-cyan);">${escapeHtml(job.company || 'N/A')}</span>
        </td>
        <td>
          <span style="color: var(--text-muted); font-size: 0.88rem;">${formatDate(app.application_date)}</span>
        </td>
        <td>
          ${renderStatusBadge(app.status)}
        </td>
        <td>
          <button class="btn btn-danger btn-sm" onclick="promptWithdraw(${app.application_id}, '${escapeHtml(job.job_title)}')">
            Withdraw
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

async function loadRecommendations() {
  const container = document.getElementById('recommendations-container');
  if (!container) return;

  try {
    const res = await apiCall('/jobs/recommendations?limit=3');
    const jobs = res.data || [];

    if (jobs.length === 0) {
      container.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1;"><p>No recommendations available. Update your skills to discover matching jobs.</p></div>`;
      return;
    }

    container.innerHTML = jobs.map(job => {
      const match = job.skill_match || {};
      return `
        <div class="card" style="display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
              <div>
                <h3 style="font-size: 1.15rem; margin-bottom: 0.2rem;">${escapeHtml(job.job_title)}</h3>
                <div style="color: var(--accent-cyan); font-weight: 600; font-size: 0.9rem;">${escapeHtml(job.company)}</div>
              </div>
              <span class="status-badge applied">${escapeHtml(job.experience)}</span>
            </div>

            <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 0.6rem;">
              📍 ${escapeHtml(job.location)}
            </p>

            ${renderMatchPill(match)}

            <div style="margin: 0.75rem 0 0.5rem;">
              <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.3rem;">SKILL BREAKDOWN:</div>
              <div class="skill-tags">
                ${renderSkillBadges(job.skills, match.matching_skills || [], match.missing_skills || [])}
              </div>
            </div>
          </div>

          <div style="margin-top: 1rem; pt: 0.75rem; border-top: 1px solid var(--border-subtle); display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 0.78rem; color: var(--text-dim);">Match score: ${match.match_percentage || 0}%</span>
            <a href="/jobs.html?job_id=${job.job_id}" class="btn btn-primary btn-sm">Apply Now &rarr;</a>
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    container.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1;"><p style="color: var(--accent-rose);">Could not load recommendations.</p></div>`;
  }
}

function promptWithdraw(applicationId, jobTitle) {
  pendingWithdrawId = applicationId;
  const textEl = document.getElementById('withdraw-modal-text');
  if (textEl) {
    textEl.innerHTML = `Are you sure you want to withdraw your application for <strong>${jobTitle}</strong>?`;
  }
  openModal('withdraw-modal');
}

document.addEventListener('DOMContentLoaded', () => {
  loadStudentDashboard();

  const confirmBtn = document.getElementById('confirm-withdraw-btn');
  if (confirmBtn) {
    confirmBtn.addEventListener('click', async () => {
      if (!pendingWithdrawId) return;
      try {
        confirmBtn.disabled = true;
        await apiCall(`/applications/${pendingWithdrawId}`, { method: 'DELETE' });
        showToast('Application withdrawn successfully', 'success');
        closeModal('withdraw-modal');
        loadStudentDashboard(); // reload table and statistics
      } catch (err) {
        showToast(err.message || 'Failed to withdraw application', 'error');
      } finally {
        confirmBtn.disabled = false;
        pendingWithdrawId = null;
      }
    });
  }
});
