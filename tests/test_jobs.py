from unittest.mock import patch
import requests
from backend.services.recommendation import calculate_skill_match, rank_jobs_for_student
from backend.services.external_api import get_location_insights
from backend.models import Job
from backend.database import db

def test_tc006_search_python_job(client, sample_job):
    """TC006: Searching for 'Python' returns jobs requiring Python skills."""
    res = client.get('/api/jobs?search=Python')
    assert res.status_code == 200
    data = res.get_json()['data']
    assert len(data) >= 1
    assert 'Python' in data[0]['skills']

def test_tc021_student_can_view_jobs(client, student_user, sample_job, auth_header):
    """TC021: Student can view job listings with skill match calculation attached."""
    headers = auth_header(student_user)
    res = client.get('/api/jobs', headers=headers)
    assert res.status_code == 200
    data = res.get_json()['data']
    assert len(data) >= 1
    assert 'skill_match' in data[0]

def test_tc022_recruiter_can_create_job(client, recruiter_user, auth_header):
    """TC022: Recruiter can post a new placement job."""
    headers = auth_header(recruiter_user)
    rec_id = recruiter_user.recruiter_profile.recruiter_id
    payload = {
        'job_title': 'Full Stack Developer',
        'location': 'Hyderabad, Telangana',
        'experience': '0-1 Year',
        'skills': 'React, Python, SQL',
        'description': 'Develop cloud web apps.'
    }
    res = client.post(f'/api/recruiters/{rec_id}/jobs', json=payload, headers=headers)
    assert res.status_code == 201
    data = res.get_json()['data']
    assert data['job_title'] == 'Full Stack Developer'
    assert data['recruiter_id'] == rec_id

def test_tc023_recruiter_can_edit_own_job(client, recruiter_user, sample_job, auth_header):
    """TC023: Recruiter can edit their own posted job."""
    headers = auth_header(recruiter_user)
    payload = {'job_title': 'Senior Python Backend Engineer', 'experience': '2-4 Years'}
    res = client.put(f'/api/jobs/{sample_job.job_id}', json=payload, headers=headers)
    assert res.status_code == 200
    data = res.get_json()['data']
    assert data['job_title'] == 'Senior Python Backend Engineer'
    assert data['experience'] == '2-4 Years'

def test_tc024_recruiter_cannot_edit_other_recruiter_job(client, other_recruiter_user, sample_job, auth_header):
    """TC024: Recruiter cannot edit another recruiter's job (403 Forbidden)."""
    headers = auth_header(other_recruiter_user)
    res = client.put(f'/api/jobs/{sample_job.job_id}', json={'job_title': 'Hacked Title'}, headers=headers)
    assert res.status_code == 403
    assert res.get_json()['error_code'] == 'FORBIDDEN'

def test_tc025_admin_can_delete_job(client, admin_user, sample_job, auth_header):
    """TC025: Admin can delete any job listing."""
    headers = auth_header(admin_user)
    res = client.delete(f'/api/jobs/{sample_job.job_id}', headers=headers)
    assert res.status_code == 200
    assert db.session.get(Job, sample_job.job_id) is None

# --- Recommendation Unit Tests ---

def test_tc032_100_percent_skill_match():
    """TC032: 100% skill match calculation."""
    student_skills = 'Python, SQL, Flask'
    job_skills = 'Python, SQL, Flask'
    res = calculate_skill_match(student_skills, job_skills)
    assert res['match_percentage'] == 100.0
    assert res['category'] == 'Highly Recommended'
    assert len(res['missing_skills']) == 0

def test_tc033_partial_skill_match():
    """TC033: Partial skill match calculation (2 of 3 = 66.67%)."""
    student_skills = 'Python, SQL, HTML, CSS'
    job_skills = 'Python, SQL, Flask'
    res = calculate_skill_match(student_skills, job_skills)
    assert res['match_percentage'] == 66.67
    assert res['category'] == 'Recommended'
    assert 'python' in res['matching_skills']
    assert 'sql' in res['matching_skills']
    assert res['missing_skills'] == ['flask']

def test_tc034_zero_percent_skill_match():
    """TC034: 0% skill match calculation."""
    student_skills = 'HTML, CSS, Photoshop'
    job_skills = 'Java, Spring Boot, Kubernetes'
    res = calculate_skill_match(student_skills, job_skills)
    assert res['match_percentage'] == 0.0
    assert res['category'] == 'Low Match'

def test_tc035_missing_skills_detection():
    """TC035: Missing skills identified properly."""
    student_skills = 'Python'
    job_skills = 'Python, Flask, Docker, AWS'
    res = calculate_skill_match(student_skills, job_skills)
    assert set(res['missing_skills']) == {'flask', 'docker', 'aws'}

def test_tc036_recommendation_sorting():
    """TC036: Jobs sorted descending by highest skill match."""
    student_skills = 'Python, SQL, Flask'
    jobs = [
        {'job_id': 1, 'job_title': 'Low Match Job', 'skills': 'Java, Kotlin, Android'},
        {'job_id': 2, 'job_title': 'High Match Job', 'skills': 'Python, SQL, Flask'},
        {'job_id': 3, 'job_title': 'Partial Match Job', 'skills': 'Python, SQL, React, Node'}
    ]
    ranked = rank_jobs_for_student(student_skills, jobs)
    assert ranked[0]['job_id'] == 2 # 100%
    assert ranked[1]['job_id'] == 3 # 50%
    assert ranked[2]['job_id'] == 1 # 0%

# --- External API Unit & Fallback Tests ---

def test_tc041_external_api_success():
    """TC041: External location API success mock."""
    mock_response = {
        'results': [{
            'name': 'Bengaluru',
            'admin1': 'Karnataka',
            'country': 'India',
            'country_code': 'IN',
            'latitude': 12.97,
            'longitude': 77.59,
            'timezone': 'Asia/Kolkata'
        }]
    }
    with patch('requests.get') as mock_get:
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = mock_response

        insights = get_location_insights('Bengaluru, Karnataka')
        assert insights['name'] == 'Bengaluru'
        assert insights['country'] == 'India'

def test_tc042_external_api_timeout():
    """TC042: External API timeout handled gracefully with fallback."""
    with patch('requests.get', side_effect=requests.Timeout):
        insights = get_location_insights('Hyderabad, Telangana')
        assert insights is not None
        assert insights['name'] == 'Hyderabad'
        assert 'latitude' in insights

def test_tc043_external_api_failure():
    """TC043: External API HTTP error 500 handled gracefully."""
    with patch('requests.get', side_effect=requests.RequestException):
        insights = get_location_insights('Pune, Maharashtra')
        assert insights is not None
        assert insights['name'] == 'Pune'

def test_tc044_fallback_response():
    """TC044: Fallback response contains safe expected fields."""
    insights = get_location_insights('NonExistentCityXYZ')
    assert 'name' in insights
    assert 'country' in insights
    assert 'timezone' in insights
