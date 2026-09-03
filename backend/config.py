import os
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy.pool import StaticPool

# Load .env file from project root if present
basedir = Path(__file__).resolve().parent.parent
load_dotenv(basedir / '.env')

def resolve_database_url() -> str:
    """
    Resolve MySQL database connection string from standard DATABASE_URL
    or Railway MySQL specific environment variables.
    """
    # 1. Check direct DATABASE_URL
    db_url = os.getenv('DATABASE_URL')
    if db_url:
        if db_url.startswith('mysql://'):
            return db_url.replace('mysql://', 'mysql+pymysql://', 1)
        return db_url

    # 2. Check Railway MYSQL_URL
    mysql_url = os.getenv('MYSQL_URL')
    if mysql_url:
        if mysql_url.startswith('mysql://'):
            return mysql_url.replace('mysql://', 'mysql+pymysql://', 1)
        return mysql_url

    # 3. Check individual Railway MySQL variables
    host = os.getenv('MYSQLHOST')
    if host:
        user = os.getenv('MYSQLUSER', 'root')
        password = os.getenv('MYSQLPASSWORD', '')
        port = os.getenv('MYSQLPORT', '3306')
        database = os.getenv('MYSQLDATABASE', 'railway')
        return f"mysql+pymysql://{user}:{password}@{host}:{port}/{database}"

    # 4. Default local development fallback to SQLite
    return f"sqlite:///{basedir / 'smarthire.db'}"

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'smarthire-production-secure-key-2026')
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'smarthire-jwt-production-secret-2026')
    JWT_ACCESS_TOKEN_EXPIRES_HOURS = int(os.getenv('JWT_ACCESS_TOKEN_EXPIRES_HOURS', '24'))
    
    # Database resolution
    SQLALCHEMY_DATABASE_URI = resolve_database_url()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_SESSION_OPTIONS = {'expire_on_commit': False}
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_recycle': 280,
        'pool_pre_ping': True,
        'pool_size': 10,
        'max_overflow': 20
    } if 'mysql' in SQLALCHEMY_DATABASE_URI else {}

    # File uploads
    UPLOAD_FOLDER = os.getenv('UPLOAD_FOLDER', str(Path(__file__).resolve().parent / 'uploads'))
    MAX_RESUME_SIZE = int(os.getenv('MAX_RESUME_SIZE', 5 * 1024 * 1024)) # 5MB default
    ALLOWED_EXTENSIONS = {'pdf', 'doc', 'docx'}
    ALLOWED_MIME_TYPES = {
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/octet-stream'
    }

    # External API config
    EXTERNAL_API_URL = os.getenv('EXTERNAL_API_URL', 'https://geocoding-api.open-meteo.com/v1/search')
    EXTERNAL_API_TIMEOUT = int(os.getenv('EXTERNAL_API_TIMEOUT', '3'))

    # CORS configuration
    FRONTEND_URL = os.getenv('FRONTEND_URL', '*')

    # Environment
    ENV = os.getenv('FLASK_ENV', 'development')
    DEBUG = os.getenv('FLASK_DEBUG', '0') == '1' or (ENV == 'development' and os.getenv('FLASK_ENV') != 'production')

    @classmethod
    def get_masked_db_uri(cls):
        uri = cls.SQLALCHEMY_DATABASE_URI
        if '://' in uri and '@' in uri:
            prefix, rest = uri.split('://', 1)
            user_pass, host_db = rest.split('@', 1)
            if ':' in user_pass:
                user, _ = user_pass.split(':', 1)
                return f"{prefix}://{user}:****@{host_db}"
            return f"{prefix}://****@{host_db}"
        return uri

class TestConfig(Config):
    TESTING = True
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    SQLALCHEMY_SESSION_OPTIONS = {'expire_on_commit': False}
    SQLALCHEMY_ENGINE_OPTIONS = {
        'connect_args': {'check_same_thread': False},
        'poolclass': StaticPool
    }
    UPLOAD_FOLDER = str(Path(__file__).resolve().parent / 'test_uploads')
    MAX_RESUME_SIZE = 5 * 1024 * 1024
