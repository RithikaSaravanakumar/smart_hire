from datetime import datetime, timezone
from werkzeug.security import generate_password_hash, check_password_hash
from backend.database import db

class User(db.Model):
    __tablename__ = 'users'

    user_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    email = db.Column(db.String(191), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.Enum('student', 'recruiter', 'admin', name='user_roles'), nullable=False, default='student', index=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    student_profile = db.relationship('Student', backref='user', uselist=False, cascade='all, delete-orphan')
    recruiter_profile = db.relationship('Recruiter', backref='user', uselist=False, cascade='all, delete-orphan')

    def set_password(self, password: str):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'user_id': self.user_id,
            'email': self.email,
            'role': self.role,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Student(db.Model):
    __tablename__ = 'students'

    student_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False, unique=True, index=True)
    name = db.Column(db.String(150), nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    college = db.Column(db.String(200), nullable=False, index=True)
    degree = db.Column(db.String(100), nullable=False)
    department = db.Column(db.String(100), nullable=False)
    graduation_year = db.Column(db.Integer, nullable=False, index=True)
    skills = db.Column(db.Text, nullable=False)
    cgpa = db.Column(db.Float, nullable=False)
    resume = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    applications = db.relationship('Application', backref='student', cascade='all, delete-orphan', lazy='dynamic')

    def to_dict(self, include_user_info=True):
        data = {
            'student_id': self.student_id,
            'user_id': self.user_id,
            'name': self.name,
            'phone': self.phone,
            'college': self.college,
            'degree': self.degree,
            'department': self.department,
            'graduation_year': self.graduation_year,
            'skills': self.skills,
            'cgpa': float(self.cgpa) if self.cgpa is not None else 0.0,
            'resume': self.resume,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
        if include_user_info and self.user:
            data['email'] = self.user.email
            data['role'] = self.user.role
        return data


class Recruiter(db.Model):
    __tablename__ = 'recruiters'

    recruiter_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False, unique=True, index=True)
    name = db.Column(db.String(150), nullable=False)
    company = db.Column(db.String(150), nullable=False, index=True)
    designation = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    jobs = db.relationship('Job', backref='recruiter', lazy='dynamic')

    def to_dict(self, include_user_info=True):
        data = {
            'recruiter_id': self.recruiter_id,
            'user_id': self.user_id,
            'name': self.name,
            'company': self.company,
            'designation': self.designation,
            'phone': self.phone,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
        if include_user_info and self.user:
            data['email'] = self.user.email
            data['role'] = self.user.role
        return data


class Job(db.Model):
    __tablename__ = 'jobs'

    job_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    recruiter_id = db.Column(db.Integer, db.ForeignKey('recruiters.recruiter_id', ondelete='SET NULL'), nullable=True, index=True)
    company = db.Column(db.String(150), nullable=False, index=True)
    job_title = db.Column(db.String(150), nullable=False, index=True)
    location = db.Column(db.String(150), nullable=False, index=True)
    experience = db.Column(db.String(50), nullable=False)
    skills = db.Column(db.Text, nullable=False)
    description = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    applications = db.relationship('Application', backref='job', cascade='all, delete-orphan', lazy='dynamic')

    def to_dict(self):
        return {
            'job_id': self.job_id,
            'recruiter_id': self.recruiter_id,
            'company': self.company,
            'job_title': self.job_title,
            'location': self.location,
            'experience': self.experience,
            'skills': self.skills,
            'description': self.description,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'application_count': self.applications.count() if hasattr(self, 'applications') else 0
        }


class Application(db.Model):
    __tablename__ = 'applications'

    application_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.student_id', ondelete='CASCADE'), nullable=False, index=True)
    job_id = db.Column(db.Integer, db.ForeignKey('jobs.job_id', ondelete='CASCADE'), nullable=False, index=True)
    application_date = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    status = db.Column(
        db.Enum('Applied', 'Under Review', 'Shortlisted', 'Interview', 'Selected', 'Rejected', name='application_status'),
        nullable=False,
        default='Applied',
        index=True
    )
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Unique constraint to prevent duplicate applications
    __table_args__ = (
        db.UniqueConstraint('student_id', 'job_id', name='uq_student_job'),
    )

    def to_dict(self, include_job=True, include_student=True):
        data = {
            'application_id': self.application_id,
            'student_id': self.student_id,
            'job_id': self.job_id,
            'application_date': self.application_date.isoformat() if self.application_date else None,
            'status': self.status,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        if include_job and self.job:
            data['job'] = {
                'job_id': self.job.job_id,
                'job_title': self.job.job_title,
                'company': self.job.company,
                'location': self.job.location,
                'experience': self.job.experience,
                'skills': self.job.skills,
                'recruiter_id': self.job.recruiter_id
            }
        if include_student and self.student:
            data['student'] = {
                'student_id': self.student.student_id,
                'name': self.student.name,
                'email': self.student.user.email if self.student.user else None,
                'phone': self.student.phone,
                'college': self.student.college,
                'degree': self.student.degree,
                'department': self.student.department,
                'graduation_year': self.student.graduation_year,
                'skills': self.student.skills,
                'cgpa': float(self.student.cgpa) if self.student.cgpa is not None else 0.0,
                'resume': self.student.resume
            }
        return data
