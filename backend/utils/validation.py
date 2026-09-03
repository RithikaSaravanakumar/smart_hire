import re
import os
import uuid
from werkzeug.utils import secure_filename
from flask import current_app
from backend.services.storage import ResumeStorageService

EMAIL_REGEX = re.compile(r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$')
# Indian phone validation: supports +91, 91, or 10 digits starting with 6, 7, 8, 9
PHONE_REGEX = re.compile(r'^(?:\+91[\-\s]?|91[\-\s]?|0)?[6-9]\d{9}$')

def validate_email(email: str) -> bool:
    if not email or not isinstance(email, str):
        return False
    return bool(EMAIL_REGEX.match(email.strip()))

def validate_phone(phone: str) -> bool:
    if not phone or not isinstance(phone, str):
        return False
    clean_phone = re.sub(r'[\s\-]', '', phone.strip())
    return bool(PHONE_REGEX.match(clean_phone))

def validate_cgpa(cgpa) -> tuple[bool, float]:
    try:
        val = float(cgpa)
        if 0.0 <= val <= 10.0:
            return True, round(val, 2)
        return False, val
    except (ValueError, TypeError):
        return False, 0.0

def validate_graduation_year(year) -> tuple[bool, int]:
    try:
        val = int(year)
        if 1990 <= val <= 2035:
            return True, val
        return False, val
    except (ValueError, TypeError):
        return False, 0

def validate_password_strength(password: str) -> tuple[bool, str]:
    if not password or not isinstance(password, str):
        return False, "Password cannot be empty"
    if len(password) < 6:
        return False, "Password must be at least 6 characters long"
    return True, ""

def validate_resume_file(file_storage) -> tuple[bool, str, str]:
    """
    Validates uploaded resume file using the storage service.
    Returns (is_valid, error_message, saved_filename).
    """
    return ResumeStorageService.save_resume(file_storage)
