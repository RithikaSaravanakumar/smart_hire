import io
import time
from datetime import datetime, timezone, timedelta
import jwt
from backend.models import User, Student

def test_tc001_valid_registration(client):
    """TC001: Valid student registration creates user and profile."""
    payload = {
        'name': 'Rahul Nair',
        'email': 'rahul.nair@example.com',
        'password': 'Password@123',
        'phone': '9876543210',
        'college': 'BITS Pilani',
        'degree': 'B.Tech',
        'department': 'Computer Science',
        'graduation_year': 2026,
        'skills': 'Python, SQL, Django',
        'cgpa': 9.20
    }
    response = client.post('/api/register', json=payload)
    assert response.status_code == 201
    data = response.get_json()
    assert data['success'] is True
    assert 'Registration successful' in data['message']
    assert data['data']['role'] == 'student'

    user = User.query.filter_by(email='rahul.nair@example.com').first()
    assert user is not None
    assert user.student_profile.name == 'Rahul Nair'

def test_tc002_invalid_email(client):
    """TC002: Rejection of invalid email format."""
    payload = {
        'name': 'Test User',
        'email': 'not-an-email-format',
        'password': 'Password@123',
        'phone': '9876543210',
        'college': 'College',
        'degree': 'B.Tech',
        'department': 'CSE',
        'graduation_year': 2026,
        'skills': 'Python',
        'cgpa': 8.5
    }
    response = client.post('/api/register', json=payload)
    assert response.status_code == 400
    data = response.get_json()
    assert data['success'] is False
    assert data['error_code'] == 'INVALID_EMAIL'

def test_tc003_duplicate_email(client, student_user):
    """TC003: Duplicate email registration rejected with 409 Conflict."""
    payload = {
        'name': 'Duplicate Arjun',
        'email': student_user.email,
        'password': 'Password@123',
        'phone': '9876543210',
        'college': 'College',
        'degree': 'B.Tech',
        'department': 'CSE',
        'graduation_year': 2026,
        'skills': 'Python',
        'cgpa': 8.5
    }
    response = client.post('/api/register', json=payload)
    assert response.status_code == 409
    data = response.get_json()
    assert data['success'] is False
    assert data['error_code'] == 'DUPLICATE_EMAIL'

def test_tc004_valid_login(client, student_user):
    """TC004: Valid login issues JWT token."""
    response = client.post('/api/login', json={
        'email': student_user.email,
        'password': 'Student@123456'
    })
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    assert 'token' in data['data']
    assert data['data']['user']['role'] == 'student'

def test_tc005_invalid_password(client, student_user):
    """TC005: Invalid password returns 401 Unauthorized."""
    response = client.post('/api/login', json={
        'email': student_user.email,
        'password': 'WrongPassword123'
    })
    assert response.status_code == 401
    data = response.get_json()
    assert data['success'] is False
    assert data['error_code'] == 'INVALID_CREDENTIALS'

def test_tc011_student_jwt_role(client, student_user, auth_header):
    """TC011: Verify Student JWT role and claims."""
    headers = auth_header(student_user)
    response = client.get('/api/me', headers=headers)
    assert response.status_code == 200
    data = response.get_json()['data']
    assert data['role'] == 'student'
    assert data['profile']['student_id'] == student_user.student_profile.student_id

def test_tc012_recruiter_jwt_role(client, recruiter_user, auth_header):
    """TC012: Verify Recruiter JWT role and claims."""
    headers = auth_header(recruiter_user)
    response = client.get('/api/me', headers=headers)
    assert response.status_code == 200
    data = response.get_json()['data']
    assert data['role'] == 'recruiter'
    assert data['profile']['company'] == recruiter_user.recruiter_profile.company

def test_tc013_admin_jwt_role(client, admin_user, auth_header):
    """TC013: Verify Admin JWT role and claims."""
    headers = auth_header(admin_user)
    response = client.get('/api/me', headers=headers)
    assert response.status_code == 200
    data = response.get_json()['data']
    assert data['role'] == 'admin'

def test_tc014_expired_jwt(client, app, student_user):
    """TC014: Expired JWT returns 401 TOKEN_EXPIRED."""
    expired_payload = {
        'sub': student_user.user_id,
        'email': student_user.email,
        'role': student_user.role,
        'iat': datetime.now(timezone.utc) - timedelta(hours=2),
        'exp': datetime.now(timezone.utc) - timedelta(hours=1)
    }
    expired_token = jwt.encode(expired_payload, app.config['JWT_SECRET_KEY'], algorithm='HS256')
    headers = {'Authorization': f'Bearer {expired_token}'}

    response = client.get('/api/me', headers=headers)
    assert response.status_code == 401
    data = response.get_json()
    assert data['error_code'] == 'TOKEN_EXPIRED'

def test_tc015_invalid_jwt(client):
    """TC015: Malformed or forged JWT returns 401 INVALID_TOKEN."""
    headers = {'Authorization': 'Bearer totally.invalid.forgedtoken'}
    response = client.get('/api/me', headers=headers)
    assert response.status_code == 401
    data = response.get_json()
    assert data['error_code'] in ['INVALID_TOKEN', 'UNAUTHORIZED']

def test_tc037_valid_pdf_upload(client):
    """TC037: Valid PDF resume upload during registration."""
    data = {
        'name': 'Pooja Hegde',
        'email': 'pooja.hegde@example.com',
        'password': 'Password@123',
        'phone': '9876543210',
        'college': 'IIT Madras',
        'degree': 'M.Tech',
        'department': 'Data Science',
        'graduation_year': '2026',
        'skills': 'Python, PyTorch',
        'cgpa': '9.4',
        'resume': (io.BytesIO(b'%PDF-1.4 sample pdf content for smart hire testing'), 'resume.pdf')
    }
    response = client.post('/api/register', data=data, content_type='multipart/form-data')
    assert response.status_code == 201
    user = User.query.filter_by(email='pooja.hegde@example.com').first()
    assert user is not None
    assert user.student_profile is not None
    assert user.student_profile.resume is not None
    assert user.student_profile.resume.endswith('.pdf')

def test_tc038_invalid_extension_upload(client):
    """TC038: Uploading executable or disallowed extension is rejected."""
    data = {
        'name': 'Hacker Bob',
        'email': 'hacker.bob@example.com',
        'password': 'Password@123',
        'phone': '9876543210',
        'college': 'College',
        'degree': 'B.Tech',
        'department': 'CSE',
        'graduation_year': '2026',
        'skills': 'Security',
        'cgpa': '8.0',
        'resume': (io.BytesIO(b'malicious script content'), 'exploit.exe')
    }
    response = client.post('/api/register', data=data, content_type='multipart/form-data')
    assert response.status_code == 400
    data = response.get_json()
    assert data['error_code'] == 'INVALID_RESUME'

def test_tc039_oversized_file_upload(client, app):
    """TC039: Oversized file exceeding MAX_RESUME_SIZE is rejected."""
    oversized_data = b'%PDF' + (b'0' * (6 * 1024 * 1024)) # 6MB
    data = {
        'name': 'Big File User',
        'email': 'big.file@example.com',
        'password': 'Password@123',
        'phone': '9876543210',
        'college': 'College',
        'degree': 'B.Tech',
        'department': 'CSE',
        'graduation_year': '2026',
        'skills': 'Python',
        'cgpa': '8.0',
        'resume': (io.BytesIO(oversized_data), 'large_resume.pdf')
    }
    response = client.post('/api/register', data=data, content_type='multipart/form-data')
    assert response.status_code == 400
    data = response.get_json()
    assert data['error_code'] == 'INVALID_RESUME'

def test_tc040_unsafe_filename_path_traversal(client):
    """TC040: Filename containing path traversal sequences is sanitized and safely handled."""
    data = {
        'name': 'Path Traversal User',
        'email': 'path.traversal@example.com',
        'password': 'Password@123',
        'phone': '9876543210',
        'college': 'College',
        'degree': 'B.Tech',
        'department': 'CSE',
        'graduation_year': '2026',
        'skills': 'Python',
        'cgpa': '8.0',
        'resume': (io.BytesIO(b'%PDF-1.4 test safe content'), '../../../../etc/passwd.pdf')
    }
    response = client.post('/api/register', data=data, content_type='multipart/form-data')
    assert response.status_code == 201
    user = User.query.filter_by(email='path.traversal@example.com').first()
    assert user is not None
    st = user.student_profile
    assert st is not None
    if st and st.resume:
        assert '..' not in st.resume
        assert '/' not in st.resume
        assert '\\' not in st.resume
