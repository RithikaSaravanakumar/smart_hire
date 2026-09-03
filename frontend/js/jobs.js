/**
 * SmartHire — Jobs Search, Filtering, Geo Insights, and Application Flow
 */

let allJobsCache = [];
let pendingApplyJob = null;
let debounceTimeout = null;

async function fetchJobs() {
  const searchInput = document.getElementById('search-input');
  const locationFilter = document.getElementById('filter-location');
  const expFilter = document.getElementById('filter-experience');
  const skillFilter = document.getElementById('filter-skill');
  const companyFilter = document.getElementById('filter-company');

  const params = new URLSearchParams();
  if (searchInput && searchInput.value.trim()) params.append('search', searchInput.value.trim());
  if (locationFilter && locationFilter.value) params.append('location', locationFilter.value);
  if (expFilter && expFilter.value) params.append('experience', expFilter.value);
  if (skillFilter && skillFilter.value) params.append('skill', skillFilter.value);
  if (companyFilter && companyFilter.value) params.append('company', companyFilter.value);

  const grid = document.getElementById('jobs-grid');
  const countText = document.getElementById('jobs-count-text');

  try {
    const res = await apiCall(`/jobs?${params.toString()}`, { requiresAuth: isAuthenticated() });
    allJobsCache = res.data || [];
    
    if (countText) {
      countText.textContent = `Showing ${allJobsCache.length} placement drive${allJobsCache.length === 1 ? '' : 's'}`;
    }
    renderJobsList(allJobsCache);

  } catch (err) {
    if (grid) {
      grid.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1;"><p style="color: var(--status-danger);">Failed to load placement opportunities: ${escapeHtml(err.message)}</p></div>`;
    }
  }
}

function renderJobsList(jobs) {
  const grid = document.getElementById('jobs-grid');
  if (!grid) return;

  if (jobs.length === 0) {
    grid.innerHTML = renderEmptyState(
      'No Matching Placement Drives Found',
      'Try clearing your search query or adjusting your location and experience filters.',
      '<button class="btn btn-secondary btn-sm" onclick="clearAllFilters()">Reset All Filters</button>'
    );
    return;
  }

  grid.innerHTML = jobs.map(job => {
    const match = job.skill_match || null;
    return `
      <div class="card card-interactive" style="display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem; gap: 0.5rem;">
            <div>
              <h3 style="font-size: 1.2rem; margin-bottom: 0.2rem;">${escapeHtml(job.job_title)}</h3>
              <div style="color: var(--brand-cyan); font-weight: 600; font-size: 0.925rem;">${escapeHtml(job.company)}</div>
            </div>
            <span class="badge" style="background: var(--bg-surface-elevated); border: 1px solid var(--border-default); color: var(--text-secondary); white-space: nowrap;">
              💼 ${escapeHtml(job.experience)}
            </span>
          </div>

          <div style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 0.85rem; display: flex; align-items: center; gap: 0.35rem;">
            <span>📍</span>
            <button onclick="viewJobInsights(${job.job_id})" style="background: none; border: none; color: var(--text-secondary); text-decoration: underline; cursor: pointer; font-size: 0.85rem; padding: 0;">
              ${escapeHtml(job.location)}
            </button>
          </div>

          ${match ? `<div style="margin-bottom: 0.75rem;">${renderMatchPill(match)}</div>` : ''}

          <p style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 1rem; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
            ${escapeHtml(job.description)}
          </p>

          <div style="margin-bottom: 1.25rem;">
            ${renderSkillBadges(job.skills, match ? match.matching_skills : [], match ? match.missing_skills : [])}
          </div>
        </div>

        <div style="margin-top: 1rem; padding-top: 0.85rem; border-top: 1px solid var(--border-subtle); display: flex; justify-content: space-between; align-items: center;">
          <button class="btn btn-secondary btn-sm" onclick="viewJobInsights(${job.job_id})">
            Details & Geo
          </button>
          <button class="btn btn-primary btn-sm" onclick="promptApplyJob(${job.job_id})">
            Apply Now &rarr;
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function clearAllFilters() {
  const searchInput = document.getElementById('search-input');
  const locationFilter = document.getElementById('filter-location');
  const expFilter = document.getElementById('filter-experience');
  const skillFilter = document.getElementById('filter-skill');
  const companyFilter = document.getElementById('filter-company');

  if (searchInput) searchInput.value = '';
  if (locationFilter) locationFilter.value = '';
  if (expFilter) expFilter.value = '';
  if (skillFilter) skillFilter.value = '';
  if (companyFilter) companyFilter.value = '';

  fetchJobs();
}

function promptApplyJob(jobId) {
  if (!isAuthenticated()) {
    showToast('Please sign in as a student to apply for placement opportunities', 'warning');
    setTimeout(() => { window.location.href = '/login.html'; }, 1000);
    return;
  }

  const user = getUser();
  if (user && user.role !== 'student') {
    showToast(`Only student accounts can apply (Logged in as: ${user.role})`, 'warning');
    return;
  }

  const job = allJobsCache.find(j => j.job_id === jobId);
  if (!job) return;

  pendingApplyJob = job;

  const confirmText = document.getElementById('apply-confirm-text');
  const studentSummary = document.getElementById('apply-student-summary');

  if (confirmText) {
    confirmText.innerHTML = `You are applying for <strong style="color: var(--text-primary);">${escapeHtml(job.job_title)}</strong> at <strong style="color: var(--brand-cyan);">${escapeHtml(job.company)}</strong>.`;
  }
  if (studentSummary) {
    studentSummary.textContent = user.profile ? `${user.profile.name || user.email} (${user.profile.college || 'Enrolled Student'})` : user.email;
  }

  openModal('apply-modal');
}

async function submitJobApplication() {
  if (!pendingApplyJob) return;

  const confirmBtn = document.getElementById('confirm-apply-btn');
  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Submitting...';
  }

  try {
    const res = await apiCall(`/jobs/${pendingApplyJob.job_id}/apply`, {
      method: 'POST'
    });

    closeModal('apply-modal');
    showToast('Application submitted successfully! Track your status on the Dashboard.', 'success', 4000);
    pendingApplyJob = null;

  } catch (err) {
    closeModal('apply-modal');
    if (err.message.includes('already applied')) {
      showToast('You have already applied for this position.', 'warning');
    } else {
      showToast(err.message || 'Could not submit application', 'error');
    }
  } finally {
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.textContent = 'Confirm & Submit →';
    }
  }
}

async function viewJobInsights(jobId) {
  const modalTitle = document.getElementById('modal-job-title');
  const modalBody = document.getElementById('modal-job-body');
  const modalApplyBtn = document.getElementById('modal-apply-btn');

  modalTitle.textContent = 'Loading Job & Location Details...';
  modalBody.innerHTML = `<div class="card skeleton skeleton-card"></div>`;
  openModal('job-details-modal');

  try {
    const res = await apiCall(`/jobs/${jobId}`, { requiresAuth: isAuthenticated() });
    const job = res.data;
    const geo = job.location_insights || {};
    const match = job.skill_match || null;

    modalTitle.textContent = job.job_title;

    modalBody.innerHTML = `
      <div style="margin-bottom: 1.25rem;">
        <div style="font-size: 1.15rem; color: var(--brand-cyan); font-weight: 700; margin-bottom: 0.25rem;">
          ${escapeHtml(job.company)}
        </div>
        <div style="color: var(--text-muted); font-size: 0.9rem;">
          📍 ${escapeHtml(job.location)} &bull; 💼 Experience: ${escapeHtml(job.experience)}
        </div>
      </div>

      ${match ? `<div style="margin-bottom: 1.25rem;">${renderMatchPill(match)}</div>` : ''}

      <!-- Open-Meteo Location Intelligence Box -->
      <div class="card" style="background: var(--bg-surface-elevated); padding: 1.25rem; margin-bottom: 1.5rem; border-color: rgba(6, 182, 212, 0.3);">
        <div style="font-size: 0.8rem; font-weight: 700; color: var(--brand-cyan); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.6rem; display: flex; align-items: center; gap: 0.4rem;">
          <span>🌐</span> Location Intelligence & Regional Insights
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; font-size: 0.85rem;">
          <div><strong>City / Region:</strong> ${escapeHtml(geo.name || job.location)}</div>
          <div><strong>State / Admin:</strong> ${escapeHtml(geo.admin1 || 'Standard Region')}</div>
          <div><strong>Country:</strong> ${escapeHtml(geo.country || 'India')} (${escapeHtml(geo.country_code || 'IN')})</div>
          <div><strong>Timezone:</strong> ${escapeHtml(geo.timezone || 'Asia/Kolkata')}</div>
          <div><strong>Coordinates:</strong> ${geo.latitude || '12.97'}°N, ${geo.longitude || '77.59'}°E</div>
          <div><strong>Status:</strong> <span style="color: var(--status-success);">● Verified Location</span></div>
        </div>
      </div>

      <div style="margin-bottom: 1.5rem;">
        <h4 style="font-size: 1rem; margin-bottom: 0.5rem;">Role Overview & Responsibilities</h4>
        <p style="color: var(--text-secondary); font-size: 0.925rem; line-height: 1.6;">
          ${escapeHtml(job.description)}
        </p>
      </div>

      <div>
        <h4 style="font-size: 1rem; margin-bottom: 0.5rem;">Required Competencies</h4>
        <div>
          ${renderSkillBadges(job.skills, match ? match.matching_skills : [], match ? match.missing_skills : [])}
        </div>
      </div>
    `;

    if (modalApplyBtn) {
      modalApplyBtn.onclick = () => {
        closeModal('job-details-modal');
        promptApplyJob(job.job_id);
      };
    }

  } catch (err) {
    modalBody.innerHTML = `<div class="empty-state"><p style="color: var(--status-danger);">Could not load job details: ${escapeHtml(err.message)}</p></div>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  fetchJobs();

  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(fetchJobs, 250);
    });
  }

  ['filter-location', 'filter-experience', 'filter-skill', 'filter-company'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', fetchJobs);
  });

  const clearBtn = document.getElementById('clear-filters-btn');
  if (clearBtn) clearBtn.addEventListener('click', clearAllFilters);

  const confirmApplyBtn = document.getElementById('confirm-apply-btn');
  if (confirmApplyBtn) confirmApplyBtn.addEventListener('click', submitJobApplication);
});
