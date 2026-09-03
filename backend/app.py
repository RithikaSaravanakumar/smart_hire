import os
import sys
import logging
from pathlib import Path

# Ensure workspace root is in sys.path
basedir = Path(__file__).resolve().parent.parent
if str(basedir) not in sys.path:
    sys.path.insert(0, str(basedir))

from flask import Flask, jsonify, send_from_directory, render_template_string
from flask_cors import CORS
from sqlalchemy import text
from backend.config import Config
from backend.database import db
from backend.routes.auth import auth_bp
from backend.routes.students import students_bp
from backend.routes.jobs import jobs_bp
from backend.routes.applications import applications_bp
from backend.routes.recruiters import recruiters_bp
from backend.routes.admin import admin_bp

# OpenAPI Specification for SmartHire REST API
OPENAPI_SPEC = {
    "openapi": "3.0.3",
    "info": {
        "title": "SmartHire Placement Portal REST API",
        "description": "Production-grade REST API for SmartHire Student Placement Portal with 3-tier Role-Based Access Control (Student, Recruiter, Admin), Smart Skill Matching, and Resilient External API Integrations.",
        "version": "2.0.0"
    },
    "servers": [
        {"url": "/api", "description": "API Server"}
    ],
    "components": {
        "securitySchemes": {
            "BearerAuth": {
                "type": "http",
                "scheme": "bearer",
                "bearerFormat": "JWT",
                "description": "Provide valid JWT token: Bearer <token>"
            }
        }
    },
    "paths": {
        "/health": {
            "get": {
                "summary": "Application & Database Health Check",
                "description": "Returns operational status and verifies database connectivity.",
                "responses": {
                    "200": {"description": "Service is healthy"},
                    "503": {"description": "Database connectivity degraded"}
                }
            }
        },
        "/register": {
            "post": {
                "summary": "Register a new Student",
                "description": "Public registration creating a Student user profile and saving resume.",
                "responses": {"201": {"description": "Student registered successfully"}, "400": {"description": "Validation error"}, "409": {"description": "Duplicate email"}}
            }
        },
        "/login": {
            "post": {
                "summary": "Authenticate User",
                "description": "Authenticates student, recruiter, or admin and issues JWT.",
                "responses": {"200": {"description": "JWT token issued"}, "401": {"description": "Invalid credentials"}}
            }
        },
        "/me": {
            "get": {
                "summary": "Get Current Authenticated User",
                "security": [{"BearerAuth": []}],
                "responses": {"200": {"description": "Current profile details"}}
            }
        },
        "/jobs": {
            "get": {
                "summary": "List & Search Jobs",
                "parameters": [
                    {"name": "search", "in": "query", "schema": {"type": "string"}},
                    {"name": "location", "in": "query", "schema": {"type": "string"}},
                    {"name": "experience", "in": "query", "schema": {"type": "string"}},
                    {"name": "skill", "in": "query", "schema": {"type": "string"}},
                    {"name": "company", "in": "query", "schema": {"type": "string"}}
                ],
                "responses": {"200": {"description": "List of jobs"}}
            }
        },
        "/jobs/{id}": {
            "get": {
                "summary": "Get Job Details with External Location Insights",
                "parameters": [{"name": "id", "in": "path", "required": True, "schema": {"type": "integer"}}],
                "responses": {"200": {"description": "Job details"}, "404": {"description": "Job not found"}}
            },
            "put": {
                "summary": "Update Job (Recruiter Owner / Admin)",
                "security": [{"BearerAuth": []}],
                "responses": {"200": {"description": "Job updated"}, "403": {"description": "Forbidden"}}
            },
            "delete": {
                "summary": "Delete Job (Recruiter Owner / Admin)",
                "security": [{"BearerAuth": []}],
                "responses": {"200": {"description": "Job deleted"}}
            }
        },
        "/jobs/{id}/apply": {
            "post": {
                "summary": "Apply to a Job",
                "security": [{"BearerAuth": []}],
                "responses": {"201": {"description": "Application submitted"}, "409": {"description": "Already applied"}}
            }
        },
        "/jobs/recommendations": {
            "get": {
                "summary": "Get Skill-Ranked Recommendations for Student",
                "security": [{"BearerAuth": []}],
                "responses": {"200": {"description": "Ranked job list with skill match %"}}
            }
        },
        "/students/{id}": {
            "get": {
                "summary": "Get Student Profile",
                "security": [{"BearerAuth": []}],
                "responses": {"200": {"description": "Student profile"}, "403": {"description": "Forbidden"}}
            }
        },
        "/students/{id}/profile": {
            "put": {
                "summary": "Update Student Profile",
                "security": [{"BearerAuth": []}],
                "responses": {"200": {"description": "Profile updated"}}
            }
        },
        "/students/{id}/applications": {
            "get": {
                "summary": "List Student Applications",
                "security": [{"BearerAuth": []}],
                "responses": {"200": {"description": "List of student applications"}}
            }
        },
        "/applications/{id}/status": {
            "put": {
                "summary": "Update Application Status (Recruiter/Admin)",
                "security": [{"BearerAuth": []}],
                "responses": {"200": {"description": "Status updated"}, "403": {"description": "Forbidden"}}
            }
        },
        "/applications/{id}": {
            "delete": {
                "summary": "Withdraw Application (Student/Admin)",
                "security": [{"BearerAuth": []}],
                "responses": {"200": {"description": "Application deleted"}}
            }
        },
        "/admin/stats": {
            "get": {
                "summary": "Get Aggregated Admin Platform Statistics",
                "security": [{"BearerAuth": []}],
                "responses": {"200": {"description": "System statistics"}, "403": {"description": "Admin only"}}
            }
        }
    }
}

SWAGGER_UI_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>SmartHire API Documentation</title>
    <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css" />
    <style>
        body { margin: 0; background: #0f172a; color: #f8fafc; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        .swagger-ui { filter: invert(88%) hue-rotate(180deg); }
        .top-banner { background: #1e293b; padding: 15px 30px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #334155; }
        .top-banner h1 { margin: 0; font-size: 1.3rem; color: #6366f1; }
        .top-banner a { color: #38bdf8; text-decoration: none; font-weight: 600; }
    </style>
</head>
<body>
    <div class="top-banner">
        <h1>SmartHire &bull; OpenAPI Documentation</h1>
        <a href="/">Back to SmartHire App &rarr;</a>
    </div>
    <div id="swagger-ui"></div>
    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
        window.onload = () => {
            window.ui = SwaggerUIBundle({
                url: '/api/swagger.json',
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIBundle.SwaggerUIStandalonePreset
                ],
                layout: "BaseLayout"
            });
        };
    </script>
</body>
</html>
"""

def create_app(config_class=Config):
    app = Flask(__name__, static_folder=None)
    app.config.from_object(config_class)

    # Initialize CORS
    cors_origins = app.config.get('FRONTEND_URL', '*')
    if cors_origins == '*':
        CORS(app, resources={r"/api/*": {"origins": "*"}})
    else:
        CORS(app, resources={r"/api/*": {"origins": cors_origins.split(',')}})

    # Initialize Database
    db.init_app(app)

    # Logging database mode
    masked_db = config_class.get_masked_db_uri() if hasattr(config_class, 'get_masked_db_uri') else 'Configured Database'
    app.logger.setLevel(logging.INFO)
    app.logger.info(f"[SmartHire] Database Mode Initialized: {masked_db}")

    # Ensure uploads directory exists
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

    # Register API Blueprints
    app.register_blueprint(auth_bp, url_prefix='/api')
    app.register_blueprint(students_bp, url_prefix='/api/students')
    app.register_blueprint(jobs_bp, url_prefix='/api/jobs')
    app.register_blueprint(applications_bp, url_prefix='/api/applications')
    app.register_blueprint(recruiters_bp, url_prefix='/api/recruiters')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')

    # Health Check Endpoint
    @app.route('/api/health', methods=['GET'])
    def health_check():
        db_healthy = True
        try:
            db.session.execute(text('SELECT 1'))
        except Exception as e:
            app.logger.warning(f"Database health check warning: {e}")
            db_healthy = False

        status_code = 200 if db_healthy else 503
        return jsonify({
            'success': db_healthy,
            'message': 'SmartHire API is running' if db_healthy else 'SmartHire API is degraded',
            'data': {
                'status': 'healthy' if db_healthy else 'degraded',
                'database': 'connected' if db_healthy else 'disconnected',
                'environment': app.config.get('ENV', 'development')
            }
        }), status_code

    # Swagger / OpenAPI Documentation Routes
    @app.route('/api/swagger.json', methods=['GET'])
    def swagger_json():
        return jsonify(OPENAPI_SPEC)

    @app.route('/api/docs', methods=['GET'])
    def swagger_docs():
        return render_template_string(SWAGGER_UI_HTML)

    # Static file serving for Frontend & Resumes
    frontend_dir = Path(__file__).resolve().parent.parent / 'frontend'

    @app.route('/', methods=['GET'])
    def serve_index():
        return send_from_directory(frontend_dir, 'index.html')

    @app.route('/<path:filename>', methods=['GET'])
    def serve_frontend_files(filename):
        # Prevent accessing sensitive files
        if filename.startswith('backend') or filename.startswith('.env') or filename.startswith('database'):
            return jsonify({'success': False, 'message': 'Access denied'}), 403

        target_path = frontend_dir / filename
        if target_path.exists() and not target_path.is_dir():
            return send_from_directory(frontend_dir, filename)

        if not filename.startswith('api/'):
            return send_from_directory(frontend_dir, 'index.html')

        return jsonify({'success': False, 'message': 'Resource not found', 'error_code': 'NOT_FOUND'}), 404

    @app.route('/uploads/<path:filename>', methods=['GET'])
    def serve_upload(filename):
        safe_filename = os.path.basename(filename)
        return send_from_directory(app.config['UPLOAD_FOLDER'], safe_filename)

    # Centralized JSON Error Handlers (never leak internal stack traces)
    @app.errorhandler(400)
    def bad_request(e):
        return jsonify({'success': False, 'message': str(e.description) if hasattr(e, 'description') else 'Bad request', 'error_code': 'BAD_REQUEST'}), 400

    @app.errorhandler(401)
    def unauthorized(e):
        return jsonify({'success': False, 'message': 'Unauthorized request. Please provide valid authentication credentials.', 'error_code': 'UNAUTHORIZED'}), 401

    @app.errorhandler(403)
    def forbidden(e):
        return jsonify({'success': False, 'message': 'Access denied. You do not have permission for this action.', 'error_code': 'FORBIDDEN'}), 403

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({'success': False, 'message': 'Requested resource was not found.', 'error_code': 'NOT_FOUND'}), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify({'success': False, 'message': 'HTTP method not allowed on this endpoint.', 'error_code': 'METHOD_NOT_ALLOWED'}), 405

    @app.errorhandler(409)
    def conflict(e):
        return jsonify({'success': False, 'message': 'A conflict occurred with existing resource state.', 'error_code': 'CONFLICT'}), 409

    @app.errorhandler(500)
    def internal_error(e):
        app.logger.error(f"Internal server error: {e}")
        return jsonify({'success': False, 'message': 'An internal server error occurred. Please try again later.', 'error_code': 'INTERNAL_SERVER_ERROR'}), 500

    with app.app_context():
        try:
            # Safe table creation (never drops existing data in production)
            db.create_all()
        except Exception as err:
            app.logger.warning(f"Note: db.create_all() skipped or handled: {err}")

    return app

# Expose top-level application instance for Gunicorn
app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"\n=======================================================")
    print(f"[*] SmartHire Placement Portal Server is running!")
    print(f"[*] Host Binding:  0.0.0.0:{port}")
    print(f"[*] Frontend App:  http://127.0.0.1:{port}/")
    print(f"[*] Health Check:  http://127.0.0.1:{port}/api/health")
    print(f"[*] API Swagger:   http://127.0.0.1:{port}/api/docs")
    print(f"=======================================================\n")
    app.run(host='0.0.0.0', port=port, debug=False)
