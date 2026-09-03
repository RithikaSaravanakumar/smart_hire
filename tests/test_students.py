from backend.models import Student
from backend.database import db

def test_student_get_own_profile(client, student_user, auth_header):
    """Student can retrieve their own profile."""
    headers = auth_header(student_user)
    st_id = student_user.student_profile.student_id
    res = client.get(f'/api/students/{st_id}', headers=headers)
    assert res.status_code == 200
    data = res.get_json()['data']
    assert data['name'] == 'Arjun Sharma'
    assert data['email'] == student_user.email

def test_student_cannot_access_other_student_profile(client, student_user, other_student_user, auth_header):
    """Student cannot access another student's profile (403 Forbidden)."""
    headers = auth_header(student_user)
    other_st_id = other_student_user.student_profile.student_id
    res = client.get(f'/api/students/{other_st_id}', headers=headers)
    assert res.status_code == 403
    data = res.get_json()
    assert data['success'] is False
    assert data['error_code'] == 'FORBIDDEN'

def test_admin_can_access_any_student_profile(client, admin_user, student_user, auth_header):
    """Admin can view any student profile."""
    headers = auth_header(admin_user)
    st_id = student_user.student_profile.student_id
    res = client.get(f'/api/students/{st_id}', headers=headers)
    assert res.status_code == 200
    data = res.get_json()['data']
    assert data['name'] == 'Arjun Sharma'

def test_tc016_student_cannot_access_admin_api(client, student_user, auth_header):
    """TC016: Student cannot access Admin platform stats API (403 Forbidden)."""
    headers = auth_header(student_user)
    res = client.get('/api/admin/stats', headers=headers)
    assert res.status_code == 403
    data = res.get_json()
    assert data['error_code'] == 'FORBIDDEN'

def test_update_student_profile_success(client, student_user, auth_header):
    """Student can update their own profile details."""
    headers = auth_header(student_user)
    st_id = student_user.student_profile.student_id
    payload = {
        'name': 'Arjun S. Sharma',
        'cgpa': 9.05,
        'skills': 'Python, SQL, React, FastAPI, AWS'
    }
    res = client.put(f'/api/students/{st_id}/profile', json=payload, headers=headers)
    assert res.status_code == 200
    data = res.get_json()['data']
    assert data['name'] == 'Arjun S. Sharma'
    assert data['cgpa'] == 9.05
    assert 'FastAPI' in data['skills']

def test_update_student_profile_invalid_cgpa(client, student_user, auth_header):
    """Rejection of invalid CGPA out of bounds."""
    headers = auth_header(student_user)
    st_id = student_user.student_profile.student_id
    res = client.put(f'/api/students/{st_id}/profile', json={'cgpa': 14.5}, headers=headers)
    assert res.status_code == 400
    data = res.get_json()
    assert data['error_code'] == 'INVALID_CGPA'
