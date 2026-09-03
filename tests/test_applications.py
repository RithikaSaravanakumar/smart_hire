from backend.models import Application, User, Student, Recruiter, Job
from backend.database import db

def test_tc007_and_tc026_valid_application(client, student_user, sample_job, auth_header):
    """TC007 & TC026: Student applies for a job successfully."""
    headers = auth_header(student_user)
    res = client.post(f'/api/jobs/{sample_job.job_id}/apply', headers=headers)
    assert res.status_code == 201
    data = res.get_json()
    assert data['success'] is True
    assert data['data']['status'] == 'Applied'

def test_tc008_and_tc027_duplicate_application_prevention(client, student_user, sample_job, auth_header):
    """TC008 & TC027: Duplicate job application by same student is rejected with 409 Conflict."""
    headers = auth_header(student_user)
    res1 = client.post(f'/api/jobs/{sample_job.job_id}/apply', headers=headers)
    assert res1.status_code == 201

    res2 = client.post(f'/api/jobs/{sample_job.job_id}/apply', headers=headers)
    assert res2.status_code == 409
    data = res2.get_json()
    assert data['success'] is False
    assert data['error_code'] == 'DUPLICATE_APPLICATION'
    assert 'already applied' in data['message'].lower()

def test_tc017_student_cannot_update_application_status(client, student_user, sample_job, auth_header):
    """TC017: Student cannot update application status (403 Forbidden)."""
    headers = auth_header(student_user)
    client.post(f'/api/jobs/{sample_job.job_id}/apply', headers=headers)
    app = Application.query.first()

    res = client.put(f'/api/applications/{app.application_id}/status', json={'status': 'Selected'}, headers=headers)
    assert res.status_code == 403
    data = res.get_json()
    assert data['error_code'] == 'FORBIDDEN'

def test_tc018_and_tc010_recruiter_can_update_own_job_application(client, student_user, recruiter_user, sample_job, auth_header):
    """TC018 & TC010: Recruiter who posted the job can update candidate status."""
    client.post(f'/api/jobs/{sample_job.job_id}/apply', headers=auth_header(student_user))
    app = Application.query.first()

    rec_headers = auth_header(recruiter_user)
    res = client.put(f'/api/applications/{app.application_id}/status', json={'status': 'Shortlisted'}, headers=rec_headers)
    assert res.status_code == 200
    data = res.get_json()['data']
    assert data['status'] == 'Shortlisted'

def test_tc019_recruiter_cannot_update_other_recruiter_application(client, student_user, other_recruiter_user, sample_job, auth_header):
    """TC019: Recruiter cannot update application for another recruiter's job."""
    client.post(f'/api/jobs/{sample_job.job_id}/apply', headers=auth_header(student_user))
    app = Application.query.first()

    other_rec_headers = auth_header(other_recruiter_user)
    res = client.put(f'/api/applications/{app.application_id}/status', json={'status': 'Selected'}, headers=other_rec_headers)
    assert res.status_code == 403
    assert res.get_json()['error_code'] == 'FORBIDDEN'

def test_tc020_admin_can_update_any_application(client, student_user, admin_user, sample_job, auth_header):
    """TC020: Admin can update status of any application."""
    client.post(f'/api/jobs/{sample_job.job_id}/apply', headers=auth_header(student_user))
    app = Application.query.first()

    admin_headers = auth_header(admin_user)
    res = client.put(f'/api/applications/{app.application_id}/status', json={'status': 'Selected'}, headers=admin_headers)
    assert res.status_code == 200
    assert res.get_json()['data']['status'] == 'Selected'

def test_tc028_student_can_withdraw_own_application(client, student_user, sample_job, auth_header):
    """TC028: Student can withdraw their own application."""
    headers = auth_header(student_user)
    client.post(f'/api/jobs/{sample_job.job_id}/apply', headers=headers)
    app = Application.query.first()

    res = client.delete(f'/api/applications/{app.application_id}', headers=headers)
    assert res.status_code == 200
    assert db.session.get(Application, app.application_id) is None

def test_tc029_student_cannot_delete_other_student_application(client, student_user, other_student_user, sample_job, auth_header):
    """TC029: Student cannot delete another student's application (403 Forbidden)."""
    client.post(f'/api/jobs/{sample_job.job_id}/apply', headers=auth_header(student_user))
    app = Application.query.first()

    res = client.delete(f'/api/applications/{app.application_id}', headers=auth_header(other_student_user))
    assert res.status_code == 403
    assert res.get_json()['error_code'] == 'FORBIDDEN'

def test_tc030_recruiter_can_view_applicants(client, student_user, recruiter_user, sample_job, auth_header):
    """TC030: Recruiter can view list of applicants for their job."""
    client.post(f'/api/jobs/{sample_job.job_id}/apply', headers=auth_header(student_user))

    res = client.get(f'/api/jobs/{sample_job.job_id}/applications', headers=auth_header(recruiter_user))
    assert res.status_code == 200
    data = res.get_json()['data']
    assert len(data) == 1
    assert data[0]['student']['name'] == 'Arjun Sharma'

def test_tc031_unauthorized_applicant_access(client, student_user, other_recruiter_user, sample_job, auth_header):
    """TC031: Another recruiter cannot view applicants for a job they don't own."""
    client.post(f'/api/jobs/{sample_job.job_id}/apply', headers=auth_header(student_user))

    res = client.get(f'/api/jobs/{sample_job.job_id}/applications', headers=auth_header(other_recruiter_user))
    assert res.status_code == 403
    assert res.get_json()['error_code'] == 'FORBIDDEN'

# --- Complete Integration Workflows ---

def test_complete_student_workflow(client):
    """
    Test complete Student lifecycle:
    Register -> Login -> Get JWT -> Get Profile -> Get Jobs -> Get Recommendations -> Apply -> Check Status -> Withdraw
    """
    reg_payload = {
        'name': 'Integration Student',
        'email': 'integration.student@test.com',
        'password': 'Student@123456',
        'phone': '9811002233',
        'college': 'Test Institute',
        'degree': 'B.Tech',
        'department': 'CS',
        'graduation_year': 2026,
        'skills': 'Python, SQL, Flask',
        'cgpa': 9.0
    }
    r1 = client.post('/api/register', json=reg_payload)
    assert r1.status_code == 201

    r2 = client.post('/api/login', json={'email': 'integration.student@test.com', 'password': 'Student@123456'})
    assert r2.status_code == 200
    token = r2.get_json()['data']['token']
    headers = {'Authorization': f'Bearer {token}'}

    r3 = client.get('/api/me', headers=headers)
    assert r3.status_code == 200
    student_id = r3.get_json()['data']['profile']['student_id']

    job = Job(company='Acme Corp', job_title='Junior Python Dev', location='Bengaluru', experience='0-1', skills='Python, Flask', description='Test')
    db.session.add(job)
    db.session.commit()

    r4 = client.get('/api/jobs/recommendations', headers=headers)
    assert r4.status_code == 200
    assert len(r4.get_json()['data']) >= 1

    r5 = client.post(f'/api/jobs/{job.job_id}/apply', headers=headers)
    assert r5.status_code == 201

    r6 = client.get(f'/api/students/{student_id}/applications', headers=headers)
    assert r6.status_code == 200
    apps = r6.get_json()['data']
    assert len(apps) == 1
    app_id = apps[0]['application_id']

    r7 = client.delete(f'/api/applications/{app_id}', headers=headers)
    assert r7.status_code == 200

def test_complete_recruiter_and_admin_workflow(client, admin_user, auth_header):
    """
    Test complete Recruiter & Admin lifecycle:
    Admin creates recruiter -> Recruiter logs in -> Posts job -> Student applies -> Recruiter reviews & selects -> Admin verifies stats
    """
    admin_headers = auth_header(admin_user)
    rec_payload = {
        'name': 'Workforce Lead',
        'email': 'recruiter.flow@test.com',
        'password': 'Recruiter@123456',
        'company': 'GlobalTech Solutions',
        'designation': 'Campus Talent Lead',
        'phone': '9899001122'
    }
    r1 = client.post('/api/recruiters', json=rec_payload, headers=admin_headers)
    assert r1.status_code == 201
    recruiter_id = r1.get_json()['data']['recruiter_id']

    r2 = client.post('/api/login', json={'email': 'recruiter.flow@test.com', 'password': 'Recruiter@123456'})
    assert r2.status_code == 200
    rec_token = r2.get_json()['data']['token']
    rec_headers = {'Authorization': f'Bearer {rec_token}'}

    job_payload = {
        'job_title': 'Cloud DevOps Intern',
        'location': 'Pune, Maharashtra',
        'experience': '0-1 Year',
        'skills': 'Docker, Kubernetes, Linux, AWS',
        'description': 'DevOps position.'
    }
    r3 = client.post(f'/api/recruiters/{recruiter_id}/jobs', json=job_payload, headers=rec_headers)
    assert r3.status_code == 201
    job_id = r3.get_json()['data']['job_id']

    client.post('/api/register', json={
        'name': 'Candidate One',
        'email': 'candidate.one@test.com',
        'password': 'Password@123',
        'phone': '9877112233',
        'college': 'College',
        'degree': 'B.Tech',
        'department': 'IT',
        'graduation_year': 2026,
        'skills': 'Docker, Linux',
        'cgpa': 8.7
    })
    st_login = client.post('/api/login', json={'email': 'candidate.one@test.com', 'password': 'Password@123'})
    st_token = st_login.get_json()['data']['token']
    client.post(f'/api/jobs/{job_id}/apply', headers={'Authorization': f'Bearer {st_token}'})

    r4 = client.get(f'/api/jobs/{job_id}/applications', headers=rec_headers)
    assert r4.status_code == 200
    apps = r4.get_json()['data']
    assert len(apps) == 1
    app_id = apps[0]['application_id']

    r5 = client.put(f'/api/applications/{app_id}/status', json={'status': 'Selected'}, headers=rec_headers)
    assert r5.status_code == 200
    assert r5.get_json()['data']['status'] == 'Selected'

    r6 = client.get('/api/admin/stats', headers=admin_headers)
    assert r6.status_code == 200
    stats = r6.get_json()['data']
    assert stats['selected_candidates'] >= 1
