from flask import Blueprint, request, jsonify, g
from backend.database import db
from backend.models import Job, Application, Student, Recruiter
from backend.utils.auth import token_required, role_required, get_auth_token_from_request, decode_token
from backend.services.recommendation import calculate_skill_match, rank_jobs_for_student
from backend.services.external_api import get_location_insights

jobs_bp = Blueprint('jobs', __name__)

def _get_optional_student_skills():
    """Helper to safely extract student skills if a valid token is provided."""
    token = get_auth_token_from_request()
    if token:
        payload = decode_token(token)
        if payload and 'sub' in payload and payload.get('role') == 'student':
            user_id = int(payload['sub']) if str(payload['sub']).isdigit() else payload['sub']
            student = Student.query.filter_by(user_id=user_id).first()
            if student:
                return student.skills
    return None

@jobs_bp.route('', methods=['GET'])
@jobs_bp.route('/', methods=['GET'])
def get_jobs():
    """
    List all available jobs with real-time search & filter parameters.
    """
    search_query = request.args.get('search', '').strip().lower()
    location_filter = request.args.get('location', '').strip().lower()
    exp_filter = request.args.get('experience', '').strip().lower()
    skill_filter = request.args.get('skill', '').strip().lower()
    company_filter = request.args.get('company', '').strip().lower()
    limit = request.args.get('limit', type=int)

    query = Job.query.order_by(Job.created_at.desc())
    all_jobs = query.all()

    filtered_jobs = []
    for job in all_jobs:
        if company_filter and company_filter not in job.company.lower():
            continue
        if location_filter and location_filter not in job.location.lower():
            continue
        if exp_filter and exp_filter not in job.experience.lower():
            continue
        if skill_filter and skill_filter not in job.skills.lower():
            continue
        if search_query:
            combined = f"{job.job_title} {job.company} {job.skills} {job.location} {job.description}".lower()
            if search_query not in combined:
                continue

        filtered_jobs.append(job)

    student_skills = _get_optional_student_skills()
    if student_skills:
        result = rank_jobs_for_student(student_skills, filtered_jobs, limit=limit)
    else:
        result = [j.to_dict() for j in (filtered_jobs[:limit] if limit else filtered_jobs)]

    return jsonify({
        'success': True,
        'message': f"Retrieved {len(result)} jobs",
        'data': result,
        'count': len(result)
    }), 200


@jobs_bp.route('/<int:job_id>', methods=['GET'])
def get_job_by_id(job_id):
    """
    Get detailed information about a single job, including external location insights.
    """
    job = db.session.get(Job, job_id)
    if not job:
        return jsonify({
            'success': False,
            'message': f"Job with ID {job_id} not found",
            'error_code': 'NOT_FOUND'
        }), 404

    job_data = job.to_dict()
    job_data['location_insights'] = get_location_insights(job.location)

    student_skills = _get_optional_student_skills()
    if student_skills:
        job_data['skill_match'] = calculate_skill_match(student_skills, job.skills)

    return jsonify({
        'success': True,
        'message': 'Job details retrieved successfully',
        'data': job_data
    }), 200


@jobs_bp.route('/recommendations', methods=['GET'])
@token_required
def get_job_recommendations():
    """
    Retrieve jobs ranked specifically for the authenticated student using skill matching algorithm.
    """
    current_user = g.current_user
    if current_user.role != 'student' or not current_user.student_profile:
        return jsonify({
            'success': False,
            'message': 'Only registered students can access personalized recommendations',
            'error_code': 'FORBIDDEN'
        }), 403

    limit = request.args.get('limit', default=10, type=int)
    student = current_user.student_profile
    all_jobs = Job.query.order_by(Job.created_at.desc()).all()

    ranked = rank_jobs_for_student(student.skills, all_jobs, limit=limit)

    return jsonify({
        'success': True,
        'message': f"Calculated recommendations for {student.name}",
        'data': ranked
    }), 200


@jobs_bp.route('/<int:job_id>/apply', methods=['POST'])
@token_required
def apply_for_job(job_id):
    """
    Submit an application for a job.
    """
    current_user = g.current_user
    if current_user.role != 'student':
        return jsonify({
            'success': False,
            'message': 'Only student accounts can submit job applications',
            'error_code': 'FORBIDDEN'
        }), 403

    student = current_user.student_profile
    if not student:
        return jsonify({
            'success': False,
            'message': 'Student profile not found. Please complete your registration profile.',
            'error_code': 'PROFILE_NOT_FOUND'
        }), 404

    job = db.session.get(Job, job_id)
    if not job:
        return jsonify({
            'success': False,
            'message': f"Job with ID {job_id} not found",
            'error_code': 'JOB_NOT_FOUND'
        }), 404

    existing_app = Application.query.filter_by(
        student_id=student.student_id,
        job_id=job_id
    ).first()

    if existing_app:
        return jsonify({
            'success': False,
            'message': 'You have already applied for this job.',
            'error_code': 'DUPLICATE_APPLICATION'
        }), 409

    try:
        new_app = Application(
            student_id=student.student_id,
            job_id=job.job_id,
            status='Applied'
        )
        db.session.add(new_app)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Application submitted successfully',
            'data': new_app.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f"Could not submit application: {str(e)}",
            'error_code': 'DB_ERROR'
        }), 500


@jobs_bp.route('/<int:job_id>', methods=['PUT'])
@token_required
def update_job(job_id):
    """
    Update a job listing.
    """
    current_user = g.current_user
    job = db.session.get(Job, job_id)
    if not job:
        return jsonify({'success': False, 'message': f"Job with ID {job_id} not found", 'error_code': 'NOT_FOUND'}), 404

    if current_user.role == 'recruiter':
        recruiter = current_user.recruiter_profile
        if not recruiter or job.recruiter_id != recruiter.recruiter_id:
            return jsonify({
                'success': False,
                'message': 'You can only edit jobs that you created',
                'error_code': 'FORBIDDEN'
            }), 403
    elif current_user.role != 'admin':
        return jsonify({'success': False, 'message': 'Access denied', 'error_code': 'FORBIDDEN'}), 403

    data = request.get_json() or {}
    for field in ['job_title', 'company', 'location', 'experience', 'skills', 'description']:
        if field in data and data[field] is not None:
            setattr(job, field, str(data[field]).strip())

    try:
        db.session.commit()
        return jsonify({
            'success': True,
            'message': 'Job updated successfully',
            'data': job.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e), 'error_code': 'DB_ERROR'}), 500


@jobs_bp.route('/<int:job_id>', methods=['DELETE'])
@token_required
def delete_job(job_id):
    """
    Delete a job listing.
    """
    current_user = g.current_user
    job = db.session.get(Job, job_id)
    if not job:
        return jsonify({'success': False, 'message': f"Job with ID {job_id} not found", 'error_code': 'NOT_FOUND'}), 404

    if current_user.role == 'recruiter':
        recruiter = current_user.recruiter_profile
        if not recruiter or job.recruiter_id != recruiter.recruiter_id:
            return jsonify({
                'success': False,
                'message': 'You can only delete jobs that you created',
                'error_code': 'FORBIDDEN'
            }), 403
    elif current_user.role != 'admin':
        return jsonify({'success': False, 'message': 'Access denied', 'error_code': 'FORBIDDEN'}), 403

    try:
        db.session.delete(job)
        db.session.commit()
        return jsonify({
            'success': True,
            'message': 'Job deleted successfully'
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e), 'error_code': 'DB_ERROR'}), 500


@jobs_bp.route('/<int:job_id>/applications', methods=['GET'])
@token_required
def get_job_applications(job_id):
    """
    Get all applications submitted for a particular job.
    """
    current_user = g.current_user
    job = db.session.get(Job, job_id)
    if not job:
        return jsonify({'success': False, 'message': f"Job with ID {job_id} not found", 'error_code': 'NOT_FOUND'}), 404

    if current_user.role == 'recruiter':
        recruiter = current_user.recruiter_profile
        if not recruiter or job.recruiter_id != recruiter.recruiter_id:
            return jsonify({
                'success': False,
                'message': 'You are not authorized to view applicants for this job',
                'error_code': 'FORBIDDEN'
            }), 403
    elif current_user.role != 'admin':
        return jsonify({'success': False, 'message': 'Access denied', 'error_code': 'FORBIDDEN'}), 403

    apps = Application.query.filter_by(job_id=job_id).order_by(Application.application_date.desc()).all()
    data = [a.to_dict(include_job=False, include_student=True) for a in apps]

    return jsonify({
        'success': True,
        'message': f"Retrieved {len(data)} applicants",
        'data': data
    }), 200
