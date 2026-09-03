from flask import Blueprint, request, jsonify
from backend.database import db
from backend.models import User, Student, Recruiter, Job, Application
from backend.utils.auth import role_required

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/stats', methods=['GET'])
@role_required('admin')
def get_admin_stats():
    """
    Get aggregated platform statistics for the Admin dashboard.
    """
    total_students = Student.query.count()
    total_recruiters = Recruiter.query.count()
    total_jobs = Job.query.count()
    total_applications = Application.query.count()
    selected_count = Application.query.filter_by(status='Selected').count()
    pending_count = Application.query.filter(Application.status.in_(['Applied', 'Under Review'])).count()

    return jsonify({
        'success': True,
        'message': 'Platform statistics retrieved',
        'data': {
            'total_students': total_students,
            'total_recruiters': total_recruiters,
            'total_jobs': total_jobs,
            'total_applications': total_applications,
            'selected_candidates': selected_count,
            'pending_applications': pending_count
        }
    }), 200


@admin_bp.route('/students', methods=['GET'])
@role_required('admin')
def get_all_students():
    """
    Admin: List and search all student profiles.
    """
    search = request.args.get('search', '').strip().lower()
    students = Student.query.order_by(Student.created_at.desc()).all()
    
    data = []
    for s in students:
        s_data = s.to_dict()
        if search:
            combined = f"{s.name} {s.college} {s.degree} {s.department} {s.skills} {s.user.email if s.user else ''}".lower()
            if search not in combined:
                continue
        data.append(s_data)

    return jsonify({
        'success': True,
        'message': f"Retrieved {len(data)} students",
        'data': data
    }), 200


@admin_bp.route('/students/<int:student_id>', methods=['DELETE'])
@role_required('admin')
def delete_student(student_id):
    """
    Admin: Remove a student profile and its user account.
    """
    student = db.session.get(Student, student_id)
    if not student:
        return jsonify({'success': False, 'message': 'Student not found', 'error_code': 'NOT_FOUND'}), 404

    try:
        user = student.user
        if user:
            db.session.delete(user)
        else:
            db.session.delete(student)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Student account deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e), 'error_code': 'DB_ERROR'}), 500


@admin_bp.route('/recruiters', methods=['GET'])
@role_required('admin')
def get_all_recruiters():
    """
    Admin: List all registered recruiters.
    """
    recruiters = Recruiter.query.order_by(Recruiter.created_at.desc()).all()
    data = [r.to_dict() for r in recruiters]
    return jsonify({
        'success': True,
        'message': f"Retrieved {len(data)} recruiters",
        'data': data
    }), 200


@admin_bp.route('/recruiters/<int:recruiter_id>', methods=['DELETE'])
@role_required('admin')
def delete_recruiter(recruiter_id):
    """
    Admin: Remove a recruiter profile and its user account.
    """
    recruiter = db.session.get(Recruiter, recruiter_id)
    if not recruiter:
        return jsonify({'success': False, 'message': 'Recruiter not found', 'error_code': 'NOT_FOUND'}), 404

    try:
        user = recruiter.user
        if user:
            db.session.delete(user)
        else:
            db.session.delete(recruiter)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Recruiter account deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e), 'error_code': 'DB_ERROR'}), 500


@admin_bp.route('/applications', methods=['GET'])
@role_required('admin')
def get_all_applications():
    """
    Admin: List all system applications with status filter.
    """
    status_filter = request.args.get('status', '').strip()
    query = Application.query.order_by(Application.application_date.desc())
    if status_filter:
        query = query.filter_by(status=status_filter)

    apps = query.all()
    data = [a.to_dict(include_job=True, include_student=True) for a in apps]

    return jsonify({
        'success': True,
        'message': f"Retrieved {len(data)} applications",
        'data': data
    }), 200
