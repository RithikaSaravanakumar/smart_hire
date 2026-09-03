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
    const totalJobsEl = document.getElementById('stat-total-jobs');
    if (totalJobsEl) totalJobsEl.textContent = totalJobs;

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

  const skillsList = profile.skills ? profile.skills.split(',').map(s => s.trim()).filter(Boolean) : [];

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1.5rem;">
      <div style="display: flex; gap: 1.25rem; align-items: center;">
        <div style="width: 58px; height: 58px; border-radius: var(--radius-md); background: var(--grad-brand); display: flex; align-items: center; justify-content: center; font-size: 1.6rem; font-weight: 800; color: #fff; box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4); flex-shrink: 0;">
          ${escapeHtml((profile.name || 'S')[0].toUpperCase())}
        </div>
        <div>
          <h2 style="font-size: 1.4rem; margin-bottom: 0.25rem;">${escapeHtml(profile.name || 'Student Applicant')}</h2>
          <div style="color: var(--text-secondary); font-size: 0.875rem;">
            🏫 ${escapeHtml(profile.college || 'Engineering College')} &bull; ${escapeHtml(profile.degree || 'B.Tech')} in ${escapeHtml(profile.department || 'Computer Science')} (Class of ${escapeHtml(profile.graduation_year || '2026')})
          </div>
        </div>
      </div>

      <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
        <div style="background: var(--status-success-bg); border: 1px solid var(--status-success-border); padding: 0.45rem 1rem; border-radius: var(--radius-md); text-align: center;">
          <div style="font-size: 0.725rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">Academic CGPA</div>
          <div style="font-size: 1.2rem; font-weight: 800; color: var(--status-success);">${profile.cgpa ? parseFloat(profile.cgpa).toFixed(2) : 'N/A'} / 10.0</div>
        </div>

        ${profile.resume ? `
          <a href="/uploads/${escapeHtml(profile.resume)}" target="_blank" class="btn btn-secondary btn-sm">
            📄 View Resume ↗
          </a>
        ` : `
          <a href="/profile.html" class="btn btn-outline btn-sm">📎 Upload Resume</a>
        `}
      </div>
    </div>

    <div style="margin-top: 1.25rem; padding-top: 1rem; border-top: 1px solid var(--border-subtle);">
      <div style="font-size: 0.775rem; font-weight: 700; color: var(--text-muted); margin-bottom: 0.45rem; text-transform: uppercase; letter-spacing: 0.05em;">
        Verified Technical Competencies:
      </div>
      <div>
        ${skillsList.map(skill => `<span class="skill-badge matched">✓ ${escapeHtml(skill)}</span>`).join('')}
      </div>
    </div>
  `;
}

function calculateStats(totalJobs, applications) {
  const appliedCount = applications.length;
  const underReviewCount = applications.filter(a => a.status === 'Under Review').length;
  const shortlistedCount = applications.filter(a => a.status === 'Shortlisted' || a.status === 'Interview').length;

  const statApplied = document.getElementById('stat-applied');
  const statUnderReview = document.getElementById('stat-under-review');
  const statShortlisted = document.getElementById('stat-shortlisted');

  if (statApplied) statApplied.textContent = appliedCount;
  if (statUnderReview) statUnderReview.textContent = underReviewCount;
  if (statShortlisted) statShortlisted.textContent = shortlistedCount;
}

async function loadRecommendations() {
  const container = document.getElementById('recommendations-container');
  if (!container) return;

  try {
    const res = await apiCall('/jobs/recommendations?limit=3');
    const jobs = res.data || [];

    if (jobs.length === 0) {
      container.innerHTML = renderEmptyState(
        'No AI Recommendations Available Yet',
        'Update your technical skills on the Profile page to receive ranked job matches.',
        '<a href="/profile.html" class="btn btn-primary btn-sm">Update Skills →</a>'
      );
      return;
    }

    container.innerHTML = jobs.map(job => {
      const match = job.skill_match || {};
      return `
        <div class="card card-interactive" style="display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.6rem; gap: 0.5rem;">
              <div>
                <h3 style="font-size: 1.15rem; margin-bottom: 0.2rem;">${escapeHtml(job.job_title)}</h3>
                <div style="color: var(--brand-magenta); font-weight: 600; font-size: 0.9rem;">${escapeHtml(job.company)}</div>
              </div>
              <span class="badge" style="background: var(--bg-surface-elevated); border: 1px solid var(--border-default); color: var(--text-secondary);">
                📍 ${escapeHtml(job.location.split(',')[0])}
              </span>
            </div>

            <div style="margin-bottom: 0.85rem;">
              ${renderMatchPill(match)}
            </div>

            <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1rem; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
              ${escapeHtml(job.description)}
            </p>

            <div style="margin-bottom: 1.25rem;">
              ${renderSkillBadges(job.skills, match.matching_skills || [], match.missing_skills || [])}
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-subtle); padding-top: 0.75rem;">
            <span style="font-size: 0.8rem; color: var(--text-muted);">Exp: ${escapeHtml(job.experience)}</span>
            <button class="btn btn-primary btn-sm" onclick="directApplyFromDashboard(${job.job_id}, '${escapeHtml(job.job_title)}')">
              Apply Now &rarr;
            </button>
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    container.innerHTML = renderEmptyState('Recommendations Unavailable', 'Could not compute skill match: ' + err.message);
  }
}

function renderApplicationsTable(applications) {
  const tbody = document.getElementById('applications-table-body');
  if (!tbody) return;

  if (applications.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 3rem 1rem;">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem; opacity: 0.6;">📝</div>
          <h4 style="font-size: 1.15rem; margin-bottom: 0.35rem;">No Active Applications</h4>
          <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1.25rem;">You have not submitted any placement applications yet.</p>
          <a href="/jobs.html" class="btn btn-primary btn-sm">Explore Open Placement Drives &rarr;</a>
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
          <div style="font-weight: 600; color: var(--text-primary);">${escapeHtml(job.job_title || 'Position')}</div>
          <div style="font-size: 0.85rem; color: var(--brand-magenta);">${escapeHtml(job.company || 'Company')}</div>
        </td>
        <td style="color: var(--text-secondary); font-size: 0.875rem;">
          📍 ${escapeHtml(job.location || 'N/A')}
        </td>
        <td style="color: var(--text-muted); font-size: 0.875rem;">
          ${formatDate(app.application_date)}
        </td>
        <td>
          ${renderStatusBadge(app.status)}
        </td>
        <td style="text-align: right;">
          <button class="btn btn-danger btn-sm" onclick="withdrawApplication(${app.application_id})">
            Withdraw
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

async function directApplyFromDashboard(jobId, jobTitle) {
  try {
    await apiCall(`/jobs/${jobId}/apply`, { method: 'POST' });
    showToast(`Application submitted successfully for ${jobTitle}!`, 'success');
    loadStudentDashboard();
  } catch (err) {
    showToast(err.message || 'Could not submit application', 'error');
  }
}

async function withdrawApplication(appId) {
  if (!confirm('Are you sure you want to withdraw this application? This action cannot be undone.')) {
    return;
  }

  try {
    await apiCall(`/applications/${appId}`, { method: 'DELETE' });
    showToast('Application withdrawn successfully', 'info');
    loadStudentDashboard();
  } catch (err) {
    showToast('Failed to withdraw application: ' + err.message, 'error');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadStudentDashboard();
});
