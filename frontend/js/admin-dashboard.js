/**
 * SmartHire — Admin Dashboard Logic
 * System Stats, Entity Management, Recruiter Provisioning
 */

let activeTab = 'students';

async function loadAdminDashboard() {
  if (!isAuthenticated()) {
    window.location.href = '/login.html';
    return;
  }

  const user = getUser();
  if (!user || user.role !== 'admin') {
    showToast('Admin privilege required', 'error');
    window.location.href = '/dashboard.html';
    return;
  }

  try {
    const statsRes = await apiCall('/admin/stats');
    const s = statsRes.data || {};
    
    const elStudents = document.getElementById('adm-students');
    const elRecruiters = document.getElementById('adm-recruiters');
    const elJobs = document.getElementById('adm-jobs');
    const elSelected = document.getElementById('adm-selected');

    if (elStudents) elStudents.textContent = s.total_students || 0;
    if (elRecruiters) elRecruiters.textContent = s.total_recruiters || 0;
    if (elJobs) elJobs.textContent = s.total_jobs || 0;
    if (elSelected) elSelected.textContent = s.selected_candidates || 0;

    switchAdminTab(activeTab);
  } catch (err) {
    showToast('Failed to load admin stats: ' + err.message, 'error');
  }
}

function switchAdminTab(tabName) {
  activeTab = tabName;
  ['students', 'recruiters', 'jobs', 'apps'].forEach(t => {
    const btn = document.getElementById(`tab-btn-${t}`);
    if (btn) {
      btn.classList.toggle('active', t === tabName);
      if (t === tabName) {
        btn.style.background = 'var(--brand-primary)';
        btn.style.color = '#ffffff';
      } else {
        btn.style.background = 'var(--bg-surface-elevated)';
        btn.style.color = 'var(--text-primary)';
      }
    }
  });

  const content = document.getElementById('admin-tab-content');
  if (content) {
    content.innerHTML = `<div class="skeleton" style="height: 140px;"></div>`;
  }

  if (tabName === 'students') loadStudentsTab();
  else if (tabName === 'recruiters') loadRecruitersTab();
  else if (tabName === 'jobs') loadJobsTab();
  else if (tabName === 'apps') loadApplicationsTab();
}

async function loadStudentsTab() {
  const content = document.getElementById('admin-tab-content');
  try {
    const res = await apiCall('/admin/students');
    const students = res.data || [];

    content.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
        <h3 style="font-size: 1.25rem;">Enrolled Candidate Profiles (${students.length})</h3>
      </div>
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Candidate Name</th>
              <th>Email & Contact</th>
              <th>Institution & Degree</th>
              <th>CGPA</th>
              <th>Skills</th>
              <th style="text-align: right;">Action</th>
            </tr>
          </thead>
          <tbody>
            ${students.length === 0 ? `<tr><td colspan="6" style="text-align: center; padding: 2rem;">No students registered yet</td></tr>` : 
              students.map(s => `
                <tr>
                  <td><strong style="color: var(--text-primary);">${escapeHtml(s.name)}</strong></td>
                  <td style="font-size: 0.85rem; color: var(--text-secondary);">
                    <div>${escapeHtml(s.email)}</div>
                    <div style="color: var(--text-muted);">${escapeHtml(s.phone || 'N/A')}</div>
                  </td>
                  <td style="font-size: 0.85rem; color: var(--text-secondary);">
                    <div style="font-weight: 500;">${escapeHtml(s.college)}</div>
                    <div style="color: var(--text-muted);">${escapeHtml(s.degree)} &bull; ${escapeHtml(s.department)}</div>
                  </td>
                  <td><span style="color: var(--status-success); font-weight: 700;">${parseFloat(s.cgpa).toFixed(2)}</span></td>
                  <td style="max-width: 220px;">${renderSkillBadges(s.skills)}</td>
                  <td style="text-align: right;">
                    <button class="btn btn-danger btn-sm" onclick="deleteStudentAccount(${s.student_id})">Delete</button>
                  </td>
                </tr>
              `).join('')
            }
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    content.innerHTML = `<div class="empty-state"><p style="color: var(--status-danger);">Failed to load students: ${escapeHtml(err.message)}</p></div>`;
  }
}

async function loadRecruitersTab() {
  const content = document.getElementById('admin-tab-content');
  try {
    const res = await apiCall('/admin/recruiters');
    const recruiters = res.data || [];

    content.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
        <h3 style="font-size: 1.25rem;">Provisioned Corporate Recruiters (${recruiters.length})</h3>
        <button class="btn btn-primary btn-sm" onclick="openCreateRecruiterModal()">+ Provision Recruiter</button>
      </div>
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Recruiter Name</th>
              <th>Company & Designation</th>
              <th>Contact Email</th>
              <th>Active Drives</th>
              <th style="text-align: right;">Action</th>
            </tr>
          </thead>
          <tbody>
            ${recruiters.length === 0 ? `<tr><td colspan="5" style="text-align: center; padding: 2rem;">No recruiters provisioned yet</td></tr>` : 
              recruiters.map(r => `
                <tr>
                  <td><strong style="color: var(--text-primary);">${escapeHtml(r.name)}</strong></td>
                  <td>
                    <div style="color: var(--brand-magenta); font-weight: 600;">${escapeHtml(r.company)}</div>
                    <div style="font-size: 0.825rem; color: var(--text-muted);">${escapeHtml(r.designation || 'Talent Lead')}</div>
                  </td>
                  <td style="font-size: 0.85rem; color: var(--text-secondary);">${escapeHtml(r.email)}</td>
                  <td><span class="badge" style="background: var(--bg-surface-elevated); border: 1px solid var(--border-default);">${r.total_jobs || 0} Drives</span></td>
                  <td style="text-align: right;">
                    <button class="btn btn-danger btn-sm" onclick="deleteRecruiterAccount(${r.recruiter_id})">Revoke Access</button>
                  </td>
                </tr>
              `).join('')
            }
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    content.innerHTML = `<div class="empty-state"><p style="color: var(--status-danger);">Failed to load recruiters: ${escapeHtml(err.message)}</p></div>`;
  }
}

async function loadJobsTab() {
  const content = document.getElementById('admin-tab-content');
  try {
    const res = await apiCall('/jobs', { requiresAuth: false });
    const jobs = res.data || [];

    content.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
        <h3 style="font-size: 1.25rem;">All Placement Drives (${jobs.length})</h3>
      </div>
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Job Title</th>
              <th>Company</th>
              <th>Location</th>
              <th>Required Skills</th>
              <th style="text-align: right;">Action</th>
            </tr>
          </thead>
          <tbody>
            ${jobs.length === 0 ? `<tr><td colspan="5" style="text-align: center; padding: 2rem;">No placement drives found</td></tr>` : 
              jobs.map(j => `
                <tr>
                  <td><strong style="color: var(--text-primary);">${escapeHtml(j.job_title)}</strong></td>
                  <td style="color: var(--brand-magenta); font-weight: 600;">${escapeHtml(j.company)}</td>
                  <td style="font-size: 0.85rem; color: var(--text-secondary);">📍 ${escapeHtml(j.location)}</td>
                  <td style="max-width: 220px;">${renderSkillBadges(j.skills)}</td>
                  <td style="text-align: right;">
                    <button class="btn btn-danger btn-sm" onclick="deleteAdminJob(${j.job_id})">Delete Drive</button>
                  </td>
                </tr>
              `).join('')
            }
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    content.innerHTML = `<div class="empty-state"><p style="color: var(--status-danger);">Failed to load jobs: ${escapeHtml(err.message)}</p></div>`;
  }
}

async function loadApplicationsTab() {
  const content = document.getElementById('admin-tab-content');
  try {
    const res = await apiCall('/admin/applications');
    const apps = res.data || [];

    content.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
        <h3 style="font-size: 1.25rem;">Global Application Pipeline (${apps.length})</h3>
      </div>
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Applicant</th>
              <th>Job Position & Company</th>
              <th>Date</th>
              <th>Status</th>
              <th style="text-align: right;">Force Status</th>
            </tr>
          </thead>
          <tbody>
            ${apps.length === 0 ? `<tr><td colspan="5" style="text-align: center; padding: 2rem;">No applications recorded</td></tr>` : 
              apps.map(a => `
                <tr>
                  <td>
                    <div style="font-weight: 600; color: var(--text-primary);">${escapeHtml(a.student_name || 'Student')}</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">${escapeHtml(a.student_email || '')}</div>
                  </td>
                  <td>
                    <div style="font-weight: 600;">${escapeHtml(a.job_title || 'Position')}</div>
                    <div style="font-size: 0.825rem; color: var(--brand-magenta);">${escapeHtml(a.company || '')}</div>
                  </td>
                  <td style="font-size: 0.85rem; color: var(--text-muted);">${formatDate(a.application_date)}</td>
                  <td>${renderStatusBadge(a.status)}</td>
                  <td style="text-align: right;">
                    <select class="form-control" style="padding: 0.35rem 0.65rem; font-size: 0.85rem; width: auto; display: inline-block;" onchange="adminUpdateAppStatus(${a.application_id}, this.value)">
                      ${['Applied', 'Under Review', 'Shortlisted', 'Interview', 'Selected', 'Rejected'].map(opt => `<option value="${opt}" ${a.status === opt ? 'selected' : ''}>${opt}</option>`).join('')}
                    </select>
                  </td>
                </tr>
              `).join('')
            }
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    content.innerHTML = `<div class="empty-state"><p style="color: var(--status-danger);">Failed to load applications: ${escapeHtml(err.message)}</p></div>`;
  }
}

function openCreateRecruiterModal() {
  document.getElementById('recruiter-form').reset();
  openModal('recruiter-modal');
}

async function submitRecruiterForm() {
  const name = document.getElementById('rec-name').value.trim();
  const email = document.getElementById('rec-email').value.trim();
  const password = document.getElementById('rec-password').value;
  const phone = document.getElementById('rec-phone').value.trim();
  const company = document.getElementById('rec-company').value.trim();
  const designation = document.getElementById('rec-designation').value.trim();

  if (!name || !email || !password || !company) {
    showToast('Please fill in all required fields', 'warning');
    return;
  }

  const saveBtn = document.getElementById('save-rec-btn');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Provisioning Account...';
  }

  try {
    await apiCall('/admin/recruiters', {
      method: 'POST',
      data: { name, email, password, phone, company, designation }
    });
    showToast(`Recruiter account created for ${name}!`, 'success');
    closeModal('recruiter-modal');
    loadAdminDashboard();
  } catch (err) {
    showToast('Failed to provision recruiter: ' + err.message, 'error');
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Create Recruiter Account →';
    }
  }
}

async function deleteStudentAccount(studentId) {
  if (!confirm('Are you sure you want to permanently delete this student account?')) return;
  try {
    await apiCall(`/admin/students/${studentId}`, { method: 'DELETE' });
    showToast('Student account deleted', 'info');
    loadStudentsTab();
  } catch (err) {
    showToast('Failed to delete student: ' + err.message, 'error');
  }
}

async function deleteRecruiterAccount(recruiterId) {
  if (!confirm('Are you sure you want to revoke this recruiter access and delete associated records?')) return;
  try {
    await apiCall(`/admin/recruiters/${recruiterId}`, { method: 'DELETE' });
    showToast('Recruiter account revoked', 'info');
    loadRecruitersTab();
  } catch (err) {
    showToast('Failed to revoke recruiter: ' + err.message, 'error');
  }
}

async function deleteAdminJob(jobId) {
  if (!confirm('Are you sure you want to delete this placement drive?')) return;
  try {
    await apiCall(`/jobs/${jobId}`, { method: 'DELETE' });
    showToast('Placement drive deleted', 'info');
    loadJobsTab();
  } catch (err) {
    showToast('Failed to delete job: ' + err.message, 'error');
  }
}

async function adminUpdateAppStatus(applicationId, newStatus) {
  try {
    await apiCall(`/applications/${applicationId}/status`, {
      method: 'PUT',
      data: { status: newStatus }
    });
    showToast(`Application status updated to '${newStatus}'`, 'success');
    loadApplicationsTab();
  } catch (err) {
    showToast('Failed to update status: ' + err.message, 'error');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadAdminDashboard();
});
