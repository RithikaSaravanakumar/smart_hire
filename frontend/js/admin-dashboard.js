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
    document.getElementById('adm-students').textContent = s.total_students || 0;
    document.getElementById('adm-recruiters').textContent = s.total_recruiters || 0;
    document.getElementById('adm-jobs').textContent = s.total_jobs || 0;
    document.getElementById('adm-applications').textContent = s.total_applications || 0;
    document.getElementById('adm-selected').textContent = s.selected_candidates || 0;

    switchAdminTab(activeTab);
  } catch (err) {
    showToast('Failed to load admin stats: ' + err.message, 'error');
  }
}

function switchAdminTab(tabName) {
  activeTab = tabName;
  ['students', 'recruiters', 'jobs', 'apps'].forEach(t => {
    const btn = document.getElementById(`tab-btn-${t}`);
    if (btn) btn.classList.toggle('btn-primary', t === tabName);
    if (btn) btn.classList.toggle('btn-secondary', t !== tabName);
  });

  const content = document.getElementById('admin-tab-content');
  content.innerHTML = `<div class="empty-state"><div class="spinner"></div><p style="margin-top:0.5rem;">Loading data...</p></div>`;

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
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <h3 style="font-size: 1.25rem;">Enrolled Students (${students.length})</h3>
      </div>
      <div class="table-responsive">
        <table class="table-custom">
          <thead>
            <tr>
              <th>Student Name</th>
              <th>Email & Phone</th>
              <th>College & Branch</th>
              <th>CGPA</th>
              <th>Skills</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${students.length === 0 ? `<tr><td colspan="6" style="text-align:center;">No students found</td></tr>` : 
              students.map(s => `
                <tr>
                  <td><strong>${escapeHtml(s.name)}</strong></td>
                  <td><div style="font-size:0.85rem;">${escapeHtml(s.email)}<br/>${escapeHtml(s.phone)}</div></td>
                  <td><div style="font-size:0.85rem;">${escapeHtml(s.college)}<br/>${escapeHtml(s.degree)} - ${escapeHtml(s.department)}</div></td>
                  <td><span style="color:#34d399; font-weight:700;">${parseFloat(s.cgpa).toFixed(2)}</span></td>
                  <td><div class="skill-tags" style="max-width:200px;">${renderSkillBadges(s.skills)}</div></td>
                  <td>
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
    content.innerHTML = `<div class="empty-state"><p style="color:var(--accent-rose);">Failed to load students: ${err.message}</p></div>`;
  }
}

async function loadRecruitersTab() {
  const content = document.getElementById('admin-tab-content');
  try {
    const res = await apiCall('/admin/recruiters');
    const recruiters = res.data || [];

    content.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <h3 style="font-size: 1.25rem;">Registered Recruiters (${recruiters.length})</h3>
        <button class="btn btn-primary btn-sm" onclick="openCreateRecruiterModal()">➕ Add Recruiter</button>
      </div>
      <div class="table-responsive">
        <table class="table-custom">
          <thead>
            <tr>
              <th>Recruiter Name</th>
              <th>Company</th>
              <th>Email</th>
              <th>Designation</th>
              <th>Phone</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${recruiters.length === 0 ? `<tr><td colspan="6" style="text-align:center;">No recruiters found</td></tr>` : 
              recruiters.map(r => `
                <tr>
                  <td><strong>${escapeHtml(r.name)}</strong></td>
                  <td><span style="color:var(--accent-cyan); font-weight:600;">${escapeHtml(r.company)}</span></td>
                  <td>${escapeHtml(r.email)}</td>
                  <td>${escapeHtml(r.designation)}</td>
                  <td>${escapeHtml(r.phone)}</td>
                  <td>
                    <button class="btn btn-danger btn-sm" onclick="deleteRecruiterAccount(${r.recruiter_id})">Delete</button>
                  </td>
                </tr>
              `).join('')
            }
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    content.innerHTML = `<div class="empty-state"><p style="color:var(--accent-rose);">Failed to load recruiters: ${err.message}</p></div>`;
  }
}

async function loadJobsTab() {
  const content = document.getElementById('admin-tab-content');
  try {
    const res = await apiCall('/jobs');
    const jobs = res.data || [];

    content.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <h3 style="font-size: 1.25rem;">System Placement Jobs (${jobs.length})</h3>
      </div>
      <div class="table-responsive">
        <table class="table-custom">
          <thead>
            <tr>
              <th>Job Title</th>
              <th>Company</th>
              <th>Location</th>
              <th>Experience</th>
              <th>Applicants</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${jobs.map(j => `
              <tr>
                <td><strong>${escapeHtml(j.job_title)}</strong></td>
                <td><span style="color:var(--accent-cyan); font-weight:600;">${escapeHtml(j.company)}</span></td>
                <td>${escapeHtml(j.location)}</td>
                <td><span class="status-badge applied">${escapeHtml(j.experience)}</span></td>
                <td>${j.application_count || 0}</td>
                <td>
                  <button class="btn btn-danger btn-sm" onclick="adminDeleteJob(${j.job_id})">Delete</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    content.innerHTML = `<div class="empty-state"><p style="color:var(--accent-rose);">Failed to load jobs</p></div>`;
  }
}

async function loadApplicationsTab() {
  const content = document.getElementById('admin-tab-content');
  try {
    const res = await apiCall('/admin/applications');
    const apps = res.data || [];

    content.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <h3 style="font-size: 1.25rem;">All Placement Applications (${apps.length})</h3>
      </div>
      <div class="table-responsive">
        <table class="table-custom">
          <thead>
            <tr>
              <th>Candidate</th>
              <th>Applied Position</th>
              <th>Applied Date</th>
              <th>Status</th>
              <th>Update Status</th>
            </tr>
          </thead>
          <tbody>
            ${apps.map(a => `
              <tr>
                <td>
                  <strong>${escapeHtml(a.student ? a.student.name : 'N/A')}</strong>
                  <div style="font-size:0.8rem; color:var(--text-muted);">${escapeHtml(a.student ? a.student.email : '')}</div>
                </td>
                <td>
                  <strong>${escapeHtml(a.job ? a.job.job_title : 'N/A')}</strong>
                  <div style="font-size:0.8rem; color:var(--accent-cyan);">${escapeHtml(a.job ? a.job.company : '')}</div>
                </td>
                <td>${formatDate(a.application_date)}</td>
                <td>${renderStatusBadge(a.status)}</td>
                <td>
                  <select class="form-control" style="padding: 0.3rem 0.5rem; font-size: 0.8rem;" onchange="adminUpdateStatus(${a.application_id}, this.value)">
                    <option value="Applied" ${a.status === 'Applied' ? 'selected' : ''}>Applied</option>
                    <option value="Under Review" ${a.status === 'Under Review' ? 'selected' : ''}>Under Review</option>
                    <option value="Shortlisted" ${a.status === 'Shortlisted' ? 'selected' : ''}>Shortlisted</option>
                    <option value="Interview" ${a.status === 'Interview' ? 'selected' : ''}>Interview</option>
                    <option value="Selected" ${a.status === 'Selected' ? 'selected' : ''}>Selected</option>
                    <option value="Rejected" ${a.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
                  </select>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    content.innerHTML = `<div class="empty-state"><p style="color:var(--accent-rose);">Failed to load applications</p></div>`;
  }
}

function openCreateRecruiterModal() {
  document.getElementById('create-recruiter-form').reset();
  openModal('recruiter-modal');
}

async function deleteStudentAccount(studentId) {
  if (!confirm('Are you sure you want to delete this student account?')) return;
  try {
    await apiCall(`/admin/students/${studentId}`, { method: 'DELETE' });
    showToast('Student deleted successfully', 'success');
    loadAdminDashboard();
  } catch (err) {
    showToast('Failed to delete student: ' + err.message, 'error');
  }
}

async function deleteRecruiterAccount(recruiterId) {
  if (!confirm('Are you sure you want to delete this recruiter?')) return;
  try {
    await apiCall(`/admin/recruiters/${recruiterId}`, { method: 'DELETE' });
    showToast('Recruiter deleted successfully', 'success');
    loadAdminDashboard();
  } catch (err) {
    showToast('Failed to delete recruiter: ' + err.message, 'error');
  }
}

async function adminDeleteJob(jobId) {
  if (!confirm('Delete this job?')) return;
  try {
    await apiCall(`/jobs/${jobId}`, { method: 'DELETE' });
    showToast('Job deleted', 'success');
    loadJobsTab();
  } catch (err) {
    showToast('Failed to delete job: ' + err.message, 'error');
  }
}

async function adminUpdateStatus(appId, newStatus) {
  try {
    await apiCall(`/applications/${appId}/status`, { method: 'PUT', data: { status: newStatus } });
    showToast(`Status updated to ${newStatus}`, 'success');
    loadAdminDashboard();
  } catch (err) {
    showToast('Failed to update status: ' + err.message, 'error');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadAdminDashboard();

  // Create recruiter form handler
  const form = document.getElementById('create-recruiter-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      name: document.getElementById('rec-name').value.trim(),
      email: document.getElementById('rec-email').value.trim().toLowerCase(),
      password: document.getElementById('rec-password').value,
      company: document.getElementById('rec-company').value.trim(),
      designation: document.getElementById('rec-designation').value.trim(),
      phone: document.getElementById('rec-phone').value.trim()
    };

    try {
      await apiCall('/recruiters', { method: 'POST', data: payload });
      showToast('Recruiter created successfully', 'success');
      closeModal('recruiter-modal');
      loadAdminDashboard();
    } catch (err) {
      showToast('Error creating recruiter: ' + err.message, 'error');
    }
  });
});
