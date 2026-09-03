/**
 * SmartHire — Jobs Search, Filtering, and Application Flow
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
  if (searchInput.value.trim()) params.append('search', searchInput.value.trim());
  if (locationFilter.value) params.append('location', locationFilter.value);
  if (expFilter.value) params.append('experience', expFilter.value);
  if (skillFilter.value) params.append('skill', skillFilter.value);
  if (companyFilter.value) params.append('company', companyFilter.value);

  const grid = document.getElementById('jobs-grid');
  const countText = document.getElementById('jobs-count-text');

  try {
    const res = await apiCall(`/jobs?${params.toString()}`, { requiresAuth: isAuthenticated() });
    allJobsCache = res.data || [];
    
    countText.textContent = `Showing ${allJobsCache.length} job${allJobsCache.length === 1 ? '' : 's'}`;
    renderJobsList(allJobsCache);

  } catch (err) {
    grid.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1;"><p style="color: var(--accent-rose);">Failed to load jobs: ${err.message}</p></div>`;
  }
}

function renderJobsList(jobs) {
  const grid = document.getElementById('jobs-grid');
  if (!grid) return;

  if (jobs.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-state-icon">🔍</div>
        <h3 style="margin-bottom: 0.4rem;">No matching placement drives found</h3>
        <p>Try clearing your search query or adjusting your filters.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = jobs.map(job => {
    const match = job.skill_match || null;
    return `
      <div class="card" style="display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
            <div>
              <h3 style="font-size: 1.25rem; margin-bottom: 0.25rem;">${escapeHtml(job.job_title)}</h3>
              <div style="color: var(--accent-cyan); font-weight: 600; font-size: 0.95rem;">${escapeHtml(job.company)}</div>
            </div>
            <span class="status-badge applied">💼 ${escapeHtml(job.experience)}</span>
          </div>

          <p style="color: var(--text-muted); font-size: 0.88rem; margin-bottom: 0.75rem;">
            📍 <a href="javascript:void(0)" onclick="viewJobInsights(${job.job_id})" style="color: var(--text-muted); text-decoration: underline;">
              ${escapeHtml(job.location)}
            </a>
          </p>

          ${match ? renderMatchPill(match) : ''}

          <p style="font-size: 0.9rem; color: var(--text-muted); margin: 0.75rem 0; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
            ${escapeHtml(job.description)}
          </p>

          <div class="skill-tags">
            ${renderSkillBadges(job.skills, match ? match.matching_skills : [], match ? match.missing_skills : [])}
          </div>
        </div>

        <div style="margin-top: 1.25rem; pt: 1rem; border-top: 1px solid var(--border-subtle); display: flex; justify-content: space-between; align-items: center;">
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

function promptApplyJob(jobId) {
  if (!isAuthenticated()) {
    showToast('Please sign in as a student to apply for placement opportunities', 'warning');
    setTimeout(() => { window.location.href = '/login.html'; }, 1200);
    return;
  }

  const user = getUser();
  if (user && user.role !== 'student') {
    showToast('Only student accounts can submit job applications', 'warning');
    return;
  }

  const job = allJobsCache.find(j => j.job_id === jobId);
  if (!job) return;

  pendingApplyJob = job;
  const modalBody = document.getElementById('apply-modal-content');
  
  modalBody.innerHTML = `
    <p style="color: var(--text-muted); margin-bottom: 1rem;">
      Are you sure you want to submit your verified profile and resume for this position?
    </p>
    <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 1rem;">
      <div style="font-weight: 700; font-size: 1.1rem; color: var(--text-main);">${escapeHtml(job.job_title)}</div>
      <div style="color: var(--accent-cyan); font-weight: 600; font-size: 0.92rem; margin-bottom: 0.5rem;">${escapeHtml(job.company)}</div>
      <div style="font-size: 0.85rem; color: var(--text-muted);">📍 ${escapeHtml(job.location)} &bull; 💼 ${escapeHtml(job.experience)}</div>
    </div>
  `;

  openModal('apply-modal');
}

async function viewJobInsights(jobId) {
  try {
    const res = await apiCall(`/jobs/${jobId}`, { requiresAuth: isAuthenticated() });
    const job = res.data;
    const geo = job.location_insights || {};

    document.getElementById('details-modal-title').textContent = `${job.job_title} @ ${job.company}`;
    
    const body = document.getElementById('details-modal-body');
    body.innerHTML = `
      <div style="margin-bottom: 1rem;">
        <div style="font-size: 0.82rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">Job Description</div>
        <p style="color: var(--text-main); font-size: 0.95rem; margin-top: 0.3rem; line-height: 1.6;">
          ${escapeHtml(job.description)}
        </p>
      </div>

      <div style="margin-bottom: 1rem;">
        <div style="font-size: 0.82rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">Required Skills</div>
        <div class="skill-tags" style="margin-top: 0.4rem;">
          ${renderSkillBadges(job.skills)}
        </div>
      </div>

      <!-- External API Location Insights Box -->
      <div style="background: rgba(99, 102, 241, 0.08); border: 1px solid rgba(99, 102, 241, 0.25); border-radius: var(--radius-md); padding: 1.25rem; margin-top: 1.25rem;">
        <div style="font-size: 0.85rem; font-weight: 700; color: var(--accent-cyan); margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.4rem;">
          <span>🌐 Location Intelligence (External Geocoding Service)</span>
        </div>
        <div style="font-size: 0.88rem; color: var(--text-muted); display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
          <div><strong>City:</strong> ${escapeHtml(geo.name || job.location)}</div>
          <div><strong>Region/State:</strong> ${escapeHtml(geo.region || 'India')}</div>
          <div><strong>Country:</strong> ${escapeHtml(geo.country || 'India')}</div>
          <div><strong>Timezone:</strong> ${escapeHtml(geo.timezone || 'Asia/Kolkata')}</div>
          ${geo.latitude ? `<div><strong>Coordinates:</strong> ${geo.latitude.toFixed(2)}°, ${geo.longitude.toFixed(2)}°</div>` : ''}
          <div><strong>Data Source:</strong> ${escapeHtml(geo.source || 'Standard Geo')}</div>
        </div>
      </div>

      <div style="margin-top: 1.5rem; display: flex; justify-content: flex-end;">
        <button class="btn btn-primary btn-sm" onclick="closeModal('job-details-modal'); promptApplyJob(${job.job_id})">Apply for this Job</button>
      </div>
    `;

    openModal('job-details-modal');
  } catch (err) {
    showToast('Failed to load job details: ' + err.message, 'error');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  fetchJobs();

  // Search input with debounce
  const searchInput = document.getElementById('search-input');
  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(fetchJobs, 250);
  });

  // Filter dropdowns
  ['filter-location', 'filter-experience', 'filter-skill', 'filter-company'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', fetchJobs);
  });

  // Reset filters
  document.getElementById('reset-filters-btn').addEventListener('click', () => {
    searchInput.value = '';
    document.getElementById('filter-location').value = '';
    document.getElementById('filter-experience').value = '';
    document.getElementById('filter-skill').value = '';
    document.getElementById('filter-company').value = '';
    fetchJobs();
  });

  // Confirm Application Handler
  const confirmApplyBtn = document.getElementById('confirm-apply-btn');
  const applyBtnText = document.getElementById('apply-btn-text');
  const applyBtnSpinner = document.getElementById('apply-btn-spinner');

  confirmApplyBtn.addEventListener('click', async () => {
    if (!pendingApplyJob) return;

    confirmApplyBtn.disabled = true;
    applyBtnText.textContent = 'Submitting...';
    applyBtnSpinner.style.display = 'inline-block';

    try {
      const res = await apiCall(`/jobs/${pendingApplyJob.job_id}/apply`, { method: 'POST' });
      showToast(res.message || 'Application submitted successfully!', 'success', 4000);
      closeModal('apply-modal');
      fetchJobs(); // refresh
    } catch (err) {
      showToast(err.message || 'Could not submit application', 'error', 4500);
    } finally {
      confirmApplyBtn.disabled = false;
      applyBtnText.textContent = 'Confirm Application';
      applyBtnSpinner.style.display = 'none';
      pendingApplyJob = null;
    }
  });
});
