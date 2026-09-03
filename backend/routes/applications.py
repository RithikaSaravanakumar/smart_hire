from flask import Blueprint, request, jsonify, g
from backend.database import db
from backend.models import Application, Job, Student
from backend.utils.auth import token_required

applications_bp = Blueprint('applications', __name__)

ALLOWED_STATUSES = {'Applied', 'Under Review', 'Shortlisted', 'Interview', 'Selected', 'Rejected'}

@applications_bp.route('/<int:application_id>/status', methods=['PUT'])
@token_required
def update_application_status(application_id):
    """
    Update the status of an application.
    """
    current_user = g.current_user
    application = db.session.get(Application, application_id)

    if not application:
        return jsonify({
            'success': False,
            'message': f"Application with ID {application_id} not found",
            'error_code': 'NOT_FOUND'
        }), 404

    if current_user.role == 'student':
        return jsonify({
            'success': False,
            'message': 'Students are not authorized to update application statuses',
            'error_code': 'FORBIDDEN'
        }), 403

    if current_user.role == 'recruiter':
        recruiter = current_user.recruiter_profile
        job = application.job
        if not recruiter or not job or job.recruiter_id != recruiter.recruiter_id:
            return jsonify({
                'success': False,
                'message': 'You can only update application statuses for your own job listings',
                'error_code': 'FORBIDDEN'
            }), 403

    data = request.get_json() or {}
    new_status = data.get('status')
    if not new_status or new_status not in ALLOWED_STATUSES:
        return jsonify({
            'success': False,
            'message': f"Invalid status. Allowed values are: {', '.join(sorted(list(ALLOWED_STATUSES)))}",
            'error_code': 'INVALID_STATUS'
        }), 400

    try:
        application.status = new_status
        db.session.commit()

        return jsonify({
            'success': True,
            'message': f"Application status updated to '{new_status}'",
            'data': application.to_dict(include_job=True, include_student=True)
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f"Could not update status: {str(e)}",
            'error_code': 'DB_ERROR'
        }), 500


@applications_bp.route('/<int:application_id>', methods=['DELETE'])
@token_required
def withdraw_application(application_id):
    """
    Withdraw / delete an application.
    """
    current_user = g.current_user
    application = db.session.get(Application, application_id)

    if not application:
        return jsonify({
            'success': False,
            'message': f"Application with ID {application_id} not found",
            'error_code': 'NOT_FOUND'
        }), 404

    if current_user.role == 'student':
        student = current_user.student_profile
        if not student or application.student_id != student.student_id:
            return jsonify({
                'success': False,
                'message': 'You are not authorized to withdraw another student’s application',
                'error_code': 'FORBIDDEN'
            }), 403
    elif current_user.role != 'admin':
        return jsonify({
            'success': False,
            'message': 'Access denied',
            'error_code': 'FORBIDDEN'
        }), 403

    try:
        db.session.delete(application)
        db.session.commit()
        return jsonify({
            'success': True,
            'message': 'Application withdrawn successfully'
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f"Could not withdraw application: {str(e)}",
            'error_code': 'DB_ERROR'
        }), 500
