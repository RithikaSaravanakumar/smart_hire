import os
from flask import Blueprint, request, jsonify, current_app, g
from backend.database import db
from backend.models import User, Student, Recruiter
from backend.utils.auth import generate_token, token_required, role_required
from backend.utils.validation import (
    validate_email,
    validate_phone,
    validate_cgpa,
    validate_graduation_year,
    validate_password_strength,
    validate_resume_file
)

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register_student():
    """
    Register a new student account.
    Supports both JSON and multipart/form-data (with resume file upload).
    Public registration strictly creates 'student' role.
    """
    if request.is_json:
        data = request.get_json() or {}
        resume_file = None
    else:
        data = request.form.to_dict()
        resume_file = request.files.get('resume')

    # Required fields verification
    required_fields = ['name', 'email', 'password', 'phone', 'college', 'degree', 'department', 'graduation_year', 'skills', 'cgpa']
    missing_fields = [f for f in required_fields if not data.get(f)]
    if missing_fields:
        return jsonify({
            'success': False,
            'message': f"Missing required fields: {', '.join(missing_fields)}",
            'error_code': 'VALIDATION_ERROR'
        }), 400

    email = data['email'].strip().lower()
    name = data['name'].strip()
    password = data['password']
    phone = data['phone'].strip()
    college = data['college'].strip()
    degree = data['degree'].strip()
    department = data['department'].strip()
    skills = data['skills'].strip()

    # 1. Validate email format
    if not validate_email(email):
        return jsonify({
            'success': False,
            'message': 'Invalid email address format',
            'error_code': 'INVALID_EMAIL'
        }), 400

    # 2. Check duplicate email
    if User.query.filter_by(email=email).first():
        return jsonify({
            'success': False,
            'message': 'An account with this email already exists',
            'error_code': 'DUPLICATE_EMAIL'
        }), 409

    # 3. Validate phone number
    if not validate_phone(phone):
        return jsonify({
            'success': False,
            'message': 'Invalid Indian phone number. Must be a valid 10-digit mobile number.',
            'error_code': 'INVALID_PHONE'
        }), 400

    # 4. Validate password strength
    is_valid_pw, pw_err = validate_password_strength(password)
    if not is_valid_pw:
        return jsonify({
            'success': False,
            'message': pw_err,
            'error_code': 'WEAK_PASSWORD'
        }), 400

    # 5. Validate CGPA
    is_valid_cgpa, cgpa_val = validate_cgpa(data.get('cgpa'))
    if not is_valid_cgpa:
        return jsonify({
            'success': False,
            'message': 'CGPA must be a valid number between 0.0 and 10.0',
            'error_code': 'INVALID_CGPA'
        }), 400

    # 6. Validate Graduation Year
    is_valid_grad, grad_val = validate_graduation_year(data.get('graduation_year'))
    if not is_valid_grad:
        return jsonify({
            'success': False,
            'message': 'Graduation year must be a valid year between 1990 and 2035',
            'error_code': 'INVALID_GRADUATION_YEAR'
        }), 400

    # 7. Handle Resume Upload (if provided)
    saved_resume_name = None
    if resume_file and resume_file.filename != '':
        is_valid_file, file_err, saved_filename = validate_resume_file(resume_file)
        if not is_valid_file:
            return jsonify({
                'success': False,
                'message': file_err,
                'error_code': 'INVALID_RESUME'
            }), 400
        saved_resume_name = saved_filename

    try:
        # Create User entity
        user = User(
            email=email,
            role='student'
        )
        user.set_password(password)
        db.session.add(user)
        db.session.flush() # obtain user_id

        # Create Student profile
        student = Student(
            user_id=user.user_id,
            name=name,
            phone=phone,
            college=college,
            degree=degree,
            department=department,
            graduation_year=grad_val,
            skills=skills,
            cgpa=cgpa_val,
            resume=saved_resume_name
        )
        db.session.add(student)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Registration successful! Please login.',
            'data': {
                'user_id': user.user_id,
                'student_id': student.student_id,
                'name': student.name,
                'email': user.email,
                'role': user.role
            }
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f"Database error during registration: {str(e)}",
            'error_code': 'DB_ERROR'
        }), 500


@auth_bp.route('/login', methods=['POST'])
def login():
    """
    Authenticate a user (Student, Recruiter, Admin) and issue a signed JWT.
    """
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({
            'success': False,
            'message': 'Both email and password are required',
            'error_code': 'MISSING_CREDENTIALS'
        }), 400

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({
            'success': False,
            'message': 'Invalid email or password',
            'error_code': 'INVALID_CREDENTIALS'
        }), 401

    token = generate_token(user)

    profile_data = {}
    if user.role == 'student' and user.student_profile:
        profile_data = user.student_profile.to_dict(include_user_info=False)
    elif user.role == 'recruiter' and user.recruiter_profile:
        profile_data = user.recruiter_profile.to_dict(include_user_info=False)

    return jsonify({
        'success': True,
        'message': 'Login successful',
        'data': {
            'token': token,
            'user': {
                'user_id': user.user_id,
                'email': user.email,
                'role': user.role,
                'profile': profile_data
            }
        }
    }), 200


@auth_bp.route('/me', methods=['GET'])
@token_required
def get_current_user_profile():
    """
    Get profile information of the currently authenticated user based on JWT.
    """
    user = g.current_user
    user_data = user.to_dict()

    if user.role == 'student' and user.student_profile:
        user_data['profile'] = user.student_profile.to_dict()
    elif user.role == 'recruiter' and user.recruiter_profile:
        user_data['profile'] = user.recruiter_profile.to_dict()
    else:
        user_data['profile'] = {'role': user.role, 'email': user.email}

    return jsonify({
        'success': True,
        'message': 'User profile retrieved successfully',
        'data': user_data
    }), 200


@auth_bp.route('/recruiters', methods=['POST'])
@role_required('admin')
def create_recruiter():
    """
    Admin-only endpoint to provision new recruiter accounts.
    """
    data = request.get_json() or {}
    required = ['email', 'password', 'name', 'company', 'designation', 'phone']
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({
            'success': False,
            'message': f"Missing required fields: {', '.join(missing)}",
            'error_code': 'VALIDATION_ERROR'
        }), 400

    email = data['email'].strip().lower()
    if not validate_email(email):
        return jsonify({'success': False, 'message': 'Invalid email format', 'error_code': 'INVALID_EMAIL'}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({'success': False, 'message': 'User with this email already exists', 'error_code': 'DUPLICATE_EMAIL'}), 409

    try:
        user = User(email=email, role='recruiter')
        user.set_password(data['password'])
        db.session.add(user)
        db.session.flush()

        recruiter = Recruiter(
            user_id=user.user_id,
            name=data['name'].strip(),
            company=data['company'].strip(),
            designation=data['designation'].strip(),
            phone=data['phone'].strip()
        )
        db.session.add(recruiter)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Recruiter account created successfully',
            'data': recruiter.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e), 'error_code': 'DB_ERROR'}), 500
