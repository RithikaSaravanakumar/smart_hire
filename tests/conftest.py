import io
import os
import pytest
from backend.app import create_app
from backend.config import TestConfig
from backend.database import db
from backend.models import User, Student, Recruiter, Job, Application
from backend.utils.auth import generate_token

@pytest.fixture(scope='session')
def app():
    """Create Flask application instance for the test session."""
    test_app = create_app(TestConfig)
    return test_app

@pytest.fixture(scope='function')
def client(app):
    """Create test client with fresh database per test."""
    with app.app_context():
        db.create_all()
        yield app.test_client()
        db.session.remove()
        db.drop_all()

@pytest.fixture(autouse=True)
def app_ctx(app):
    """Keep app context active during each test."""
    ctx = app.app_context()
    ctx.push()
    yield
    ctx.pop()

@pytest.fixture
def auth_header(app):
    """Helper fixture to generate Authorization header for a given User."""
    def _auth_header(user):
        token = generate_token(user)
        return {'Authorization': f'Bearer {token}'}
    return _auth_header

@pytest.fixture
def admin_user():
    """Seed an Admin user."""
    admin = User(email='admin@smarthire.test', role='admin')
    admin.set_password('Admin@123456')
    db.session.add(admin)
    db.session.commit()
    return admin

@pytest.fixture
def recruiter_user():
    """Seed a Recruiter user and profile."""
    user = User(email='recruiter1@company.test', role='recruiter')
    user.set_password('Recruiter@123456')
    db.session.add(user)
    db.session.flush()

    rec = Recruiter(
        user_id=user.user_id,
        name='Vikram Recruiter',
        company='InnovateX Labs',
        designation='Lead Recruiter',
        phone='+91 9876543210'
    )
    db.session.add(rec)
    db.session.commit()
    return user

@pytest.fixture
def other_recruiter_user():
    """Seed a second Recruiter user and profile."""
    user = User(email='recruiter2@othercompany.test', role='recruiter')
    user.set_password('Recruiter@123456')
    db.session.add(user)
    db.session.flush()

    rec = Recruiter(
        user_id=user.user_id,
        name='Ananya Recruiter',
        company='CloudSphere Inc',
        designation='Talent Lead',
        phone='+91 9876543211'
    )
    db.session.add(rec)
    db.session.commit()
    return user

@pytest.fixture
def student_user():
    """Seed a Student user and profile."""
    user = User(email='student1@college.test', role='student')
    user.set_password('Student@123456')
    db.session.add(user)
    db.session.flush()

    st = Student(
        user_id=user.user_id,
        name='Arjun Sharma',
        phone='+91 9811223344',
        college='IIIT Delhi',
        degree='B.Tech',
        department='Computer Science',
        graduation_year=2026,
        skills='Python, SQL, Flask, React, Git',
        cgpa=8.85
    )
    db.session.add(st)
    db.session.commit()
    return user

@pytest.fixture
def other_student_user():
    """Seed a second Student user and profile."""
    user = User(email='student2@college.test', role='student')
    user.set_password('Student@123456')
    db.session.add(user)
    db.session.flush()

    st = Student(
        user_id=user.user_id,
        name='Priya Patel',
        phone='+91 9822334455',
        college='NIT Trichy',
        degree='B.Tech',
        department='Information Technology',
        graduation_year=2026,
        skills='Java, Spring Boot, SQL, Docker',
        cgpa=9.15
    )
    db.session.add(st)
    db.session.commit()
    return user

@pytest.fixture
def sample_job(recruiter_user):
    """Seed a sample Job owned by recruiter_user."""
    rec = recruiter_user.recruiter_profile
    job = Job(
        recruiter_id=rec.recruiter_id,
        company=rec.company,
        job_title='Python Backend Engineer',
        location='Bengaluru, Karnataka',
        experience='0-2 Years',
        skills='Python, SQL, Flask',
        description='Design high-performance REST APIs.'
    )
    db.session.add(job)
    db.session.commit()
    return job
