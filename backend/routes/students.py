import os
from flask import Blueprint, request, jsonify, current_app, g
from backend.database import db
from backend.models import Student, Application, User
from backend.utils.auth import token_required
from backend.utils.validation import (
    validate_phone,
    validate_cgpa,
    validate_graduation_year,
    validate_resume_file
)

students_bp = Blueprint('students', __name__)

@students_bp.route('/<int:student_id>', methods=['GET'])
@token_required
def get_student_profile(student_id):
    """
    Get student profile details.
    Authorization:
    - Students can ONLY access their own profile.
    - Admins can access any student profile.
    - Recruiters can view applicant profiles.
    """
    current_user = g.current_user
    student = db.session.get(Student, student_id)

    if not student:
        return jsonify({
            'success': False,
            'message': f"Student with ID {student_id} not found",
            'error_code': 'NOT_FOUND'
        }), 404

    # Permission check: if student, must be their own record
    if current_user.role == 'student':
        if not current_user.student_profile or current_user.student_profile.student_id != student_id:
            return jsonify({
                'success': False,
                'message': 'You are not authorized to view another student’s profile',
                'error_code': 'FORBIDDEN'
            }), 403

    return jsonify({
        'success': True,
        'message': 'Student profile retrieved successfully',
        'data': student.to_dict()
    }), 200


@students_bp.route('/<int:student_id>/profile', methods=['PUT'])
@token_required
def update_student_profile(student_id):
    """
    Update student profile details and optionally replace resume.
    Authorization: Student themselves or Admin.
    """
    current_user = g.current_user
    student = db.session.get(Student, student_id)

    if not student:
        return jsonify({
            'success': False,
            'message': f"Student with ID {student_id} not found",
            'error_code': 'NOT_FOUND'
        }), 404

    if current_user.role == 'student':
        if not current_user.student_profile or current_user.student_profile.student_id != student_id:
            return jsonify({
                'success': False,
                'message': 'You are not authorized to edit another student’s profile',
                'error_code': 'FORBIDDEN'
            }), 403

    if request.is_json:
        data = request.get_json() or {}
        resume_file = None
    else:
        data = request.form.to_dict()
        resume_file = request.files.get('resume')

    if 'name' in data and data['name'].strip():
        student.name = data['name'].strip()

    if 'phone' in data and data['phone'].strip():
        if not validate_phone(data['phone'].strip()):
            return jsonify({'success': False, 'message': 'Invalid phone number format', 'error_code': 'INVALID_PHONE'}), 400
        student.phone = data['phone'].strip()

    if 'college' in data and data['college'].strip():
        student.college = data['college'].strip()

    if 'degree' in data and data['degree'].strip():
        student.degree = data['degree'].strip()

    if 'department' in data and data['department'].strip():
        student.department = data['department'].strip()

    if 'graduation_year' in data:
        is_valid_grad, grad_val = validate_graduation_year(data['graduation_year'])
        if not is_valid_grad:
            return jsonify({'success': False, 'message': 'Invalid graduation year (1990-2035)', 'error_code': 'INVALID_GRADUATION_YEAR'}), 400
        student.graduation_year = grad_val

    if 'skills' in data:
        student.skills = data['skills'].strip()

    if 'cgpa' in data:
        is_valid_cgpa, cgpa_val = validate_cgpa(data['cgpa'])
        if not is_valid_cgpa:
            return jsonify({'success': False, 'message': 'CGPA must be between 0.0 and 10.0', 'error_code': 'INVALID_CGPA'}), 400
        student.cgpa = cgpa_val

    # Handle resume update if uploaded
    if resume_file and resume_file.filename != '':
        is_valid_file, file_err, saved_filename = validate_resume_file(resume_file)
        if not is_valid_file:
            return jsonify({'success': False, 'message': file_err, 'error_code': 'INVALID_RESUME'}), 400
        
        # Clean up old resume if present
        if student.resume:
            from backend.services.storage import ResumeStorageService
            ResumeStorageService.delete_resume(student.resume)
        
        student.resume = saved_filename

    try:
        db.session.commit()
        return jsonify({
            'success': True,
            'message': 'Profile updated successfully',
            'data': student.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e), 'error_code': 'DB_ERROR'}), 500


@students_bp.route('/<int:student_id>/applications', methods=['GET'])
@token_required
def get_student_applications(student_id):
    """
    Get all applications submitted by the student.
    Authorization: Student themselves or Admin.
    """
    current_user = g.current_user
    student = db.session.get(Student, student_id)

    if not student:
        return jsonify({
            'success': False,
            'message': f"Student with ID {student_id} not found",
            'error_code': 'NOT_FOUND'
        }), 404

    if current_user.role == 'student':
        if not current_user.student_profile or current_user.student_profile.student_id != student_id:
            return jsonify({
                'success': False,
                'message': 'You are not authorized to view another student’s applications',
                'error_code': 'FORBIDDEN'
            }), 403

    applications = Application.query.filter_by(student_id=student_id).order_by(Application.application_date.desc()).all()
    data = [app.to_dict(include_job=True, include_student=False) for app in applications]

    return jsonify({
        'success': True,
        'message': f"Retrieved {len(data)} applications",
        'data': data
    }), 200
