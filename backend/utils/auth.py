from functools import wraps
from datetime import datetime, timezone, timedelta
import jwt
from flask import request, jsonify, current_app, g
from backend.database import db
from backend.models import User, Student, Recruiter

def generate_token(user: User) -> str:
    """Generate a signed JWT token containing user_id, email, and role."""
    payload = {
        'sub': str(user.user_id),
        'email': user.email,
        'role': user.role,
        'iat': datetime.now(timezone.utc),
        'exp': datetime.now(timezone.utc) + timedelta(hours=current_app.config.get('JWT_ACCESS_TOKEN_EXPIRES_HOURS', 24))
    }
    return jwt.encode(payload, current_app.config['JWT_SECRET_KEY'], algorithm='HS256')

def decode_token(token: str):
    """Decode and validate a JWT token."""
    try:
        payload = jwt.decode(token, current_app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return {'error': 'TOKEN_EXPIRED', 'message': 'Authentication token has expired. Please log in again.'}
    except jwt.InvalidTokenError:
        return {'error': 'INVALID_TOKEN', 'message': 'Invalid authentication token.'}

def get_auth_token_from_request():
    """Extract Bearer token from Authorization header."""
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return None
    parts = auth_header.split()
    if len(parts) == 2 and parts[0].lower() == 'bearer':
        return parts[1]
    return None

def token_required(f):
    """Decorator to require a valid JWT token on protected routes."""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = get_auth_token_from_request()
        if not token:
            return jsonify({
                'success': False,
                'message': 'Authentication token is required',
                'error_code': 'UNAUTHORIZED'
            }), 401

        payload = decode_token(token)
        if 'error' in payload:
            return jsonify({
                'success': False,
                'message': payload['message'],
                'error_code': payload['error']
            }), 401

        user_id = int(payload['sub']) if 'sub' in payload else None
        user = db.session.get(User, user_id) if user_id is not None else None
        if not user:
            return jsonify({
                'success': False,
                'message': 'User associated with token does not exist',
                'error_code': 'USER_NOT_FOUND'
            }), 401

        # Store in flask g for convenient access
        g.current_user = user
        g.token_payload = payload
        return f(*args, **kwargs)
    return decorated

def role_required(*roles):
    """Decorator to restrict endpoint access to specific roles."""
    def decorator(f):
        @wraps(f)
        @token_required
        def decorated(*args, **kwargs):
            if g.current_user.role not in roles:
                return jsonify({
                    'success': False,
                    'message': f"Access denied. Requires one of roles: {', '.join(roles)}",
                    'error_code': 'FORBIDDEN'
                }), 403
            return f(*args, **kwargs)
        return decorated
    return decorator

def student_or_admin(f):
    """Allow access to Students or Admins."""
    return role_required('student', 'admin')(f)

def recruiter_or_admin(f):
    """Allow access to Recruiters or Admins."""
    return role_required('recruiter', 'admin')(f)
