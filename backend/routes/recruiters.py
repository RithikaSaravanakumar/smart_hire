from flask import Blueprint, request, jsonify, g
from backend.database import db
from backend.models import Recruiter, Job, Application, User
from backend.utils.auth import token_required, role_required

recruiters_bp = Blueprint('recruiters', __name__)

@recruiters_bp.route('/<int:recruiter_id>', methods=['GET'])
@token_required
def get_recruiter_profile(recruiter_id):
    """
    Get recruiter profile details.
    """
    current_user = g.current_user
    recruiter = db.session.get(Recruiter, recruiter_id)
    if not recruiter:
        return jsonify({'success': False, 'message': f"Recruiter {recruiter_id} not found", 'error_code': 'NOT_FOUND'}), 404

    if current_user.role == 'recruiter':
        if not current_user.recruiter_profile or current_user.recruiter_profile.recruiter_id != recruiter_id:
            return jsonify({'success': False, 'message': 'Access denied', 'error_code': 'FORBIDDEN'}), 403

    return jsonify({
        'success': True,
        'message': 'Recruiter profile retrieved',
        'data': recruiter.to_dict()
    }), 200


@recruiters_bp.route('/<int:recruiter_id>/jobs', methods=['GET'])
@token_required
def get_recruiter_jobs(recruiter_id):
    """
    Get all jobs created by this recruiter.
    """
    current_user = g.current_user
    recruiter = db.session.get(Recruiter, recruiter_id)
    if not recruiter:
        return jsonify({'success': False, 'message': f"Recruiter {recruiter_id} not found", 'error_code': 'NOT_FOUND'}), 404

    if current_user.role == 'recruiter':
        if not current_user.recruiter_profile or current_user.recruiter_profile.recruiter_id != recruiter_id:
            return jsonify({'success': False, 'message': 'Access denied', 'error_code': 'FORBIDDEN'}), 403

    jobs = Job.query.filter_by(recruiter_id=recruiter_id).order_by(Job.created_at.desc()).all()
    data = [j.to_dict() for j in jobs]

    return jsonify({
        'success': True,
        'message': f"Retrieved {len(data)} jobs",
        'data': data
    }), 200


@recruiters_bp.route('/<int:recruiter_id>/jobs', methods=['POST'])
@token_required
def create_recruiter_job(recruiter_id):
    """
    Create a new job posting for this recruiter.
    """
    current_user = g.current_user
    recruiter = db.session.get(Recruiter, recruiter_id)
    if not recruiter:
        return jsonify({'success': False, 'message': f"Recruiter {recruiter_id} not found", 'error_code': 'NOT_FOUND'}), 404

    if current_user.role == 'recruiter':
        if not current_user.recruiter_profile or current_user.recruiter_profile.recruiter_id != recruiter_id:
            return jsonify({'success': False, 'message': 'You can only post jobs under your own recruiter profile', 'error_code': 'FORBIDDEN'}), 403
    elif current_user.role != 'admin':
        return jsonify({'success': False, 'message': 'Access denied', 'error_code': 'FORBIDDEN'}), 403

    data = request.get_json() or {}
    required = ['job_title', 'location', 'experience', 'skills', 'description']
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({'success': False, 'message': f"Missing required fields: {', '.join(missing)}", 'error_code': 'VALIDATION_ERROR'}), 400

    company = data.get('company', recruiter.company).strip()

    try:
        new_job = Job(
            recruiter_id=recruiter.recruiter_id,
            company=company,
            job_title=data['job_title'].strip(),
            location=data['location'].strip(),
            experience=data['experience'].strip(),
            skills=data['skills'].strip(),
            description=data['description'].strip()
        )
        db.session.add(new_job)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Job posted successfully',
            'data': new_job.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e), 'error_code': 'DB_ERROR'}), 500


@recruiters_bp.route('/<int:recruiter_id>/stats', methods=['GET'])
@token_required
def get_recruiter_stats(recruiter_id):
    """
    Get dynamic statistical counters for recruiter dashboard.
    """
    current_user = g.current_user
    recruiter = db.session.get(Recruiter, recruiter_id)
    if not recruiter:
        return jsonify({'success': False, 'message': 'Recruiter not found', 'error_code': 'NOT_FOUND'}), 404

    if current_user.role == 'recruiter':
        if not current_user.recruiter_profile or current_user.recruiter_profile.recruiter_id != recruiter_id:
            return jsonify({'success': False, 'message': 'Access denied', 'error_code': 'FORBIDDEN'}), 403

    job_ids = [j.job_id for j in recruiter.jobs.all()]
    if not job_ids:
        return jsonify({
            'success': True,
            'data': {
                'total_jobs': 0,
                'total_applications': 0,
                'applied': 0,
                'under_review': 0,
                'shortlisted': 0,
                'interview': 0,
                'selected': 0,
                'rejected': 0
            }
        }), 200

    apps = Application.query.filter(Application.job_id.in_(job_ids)).all()
    stats = {
        'total_jobs': len(job_ids),
        'total_applications': len(apps),
        'applied': sum(1 for a in apps if a.status == 'Applied'),
        'under_review': sum(1 for a in apps if a.status == 'Under Review'),
        'shortlisted': sum(1 for a in apps if a.status == 'Shortlisted'),
        'interview': sum(1 for a in apps if a.status == 'Interview'),
        'selected': sum(1 for a in apps if a.status == 'Selected'),
        'rejected': sum(1 for a in apps if a.status == 'Rejected')
    }

    return jsonify({
        'success': True,
        'message': 'Recruiter statistics retrieved',
        'data': stats
    }), 200
