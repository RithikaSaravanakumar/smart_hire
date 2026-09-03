import os
import uuid
from pathlib import Path
from werkzeug.utils import secure_filename
from flask import current_app

class ResumeStorageService:
    """
    Storage abstraction for resume uploads.
    Currently manages local filesystem storage with secure paths and unique naming.
    Designed with a clean interface for drop-in S3 / Cloud Object Storage integration.
    """

    @staticmethod
    def get_upload_folder() -> Path:
        folder = Path(current_app.config.get('UPLOAD_FOLDER', 'backend/uploads'))
        folder.mkdir(parents=True, exist_ok=True)
        return folder

    @classmethod
    def save_resume(cls, file_storage) -> tuple[bool, str, str]:
        """
        Saves uploaded file securely and returns (success, error_or_path, saved_filename).
        """
        if not file_storage or file_storage.filename == '':
            return False, "No file provided", ""

        original_name = secure_filename(file_storage.filename)
        if not original_name or '.' not in original_name:
            return False, "Invalid filename format", ""

        # Path traversal guard
        if '..' in original_name or '/' in original_name or '\\' in original_name:
            return False, "Dangerous path characters detected", ""

        ext = original_name.rsplit('.', 1)[1].lower()
        allowed_exts = current_app.config.get('ALLOWED_EXTENSIONS', {'pdf', 'doc', 'docx'})
        if ext not in allowed_exts:
            return False, f"Invalid format. Allowed extensions: {', '.join(allowed_exts).upper()}", ""

        # Check size
        file_storage.seek(0, os.SEEK_END)
        size = file_storage.tell()
        file_storage.seek(0)

        max_size = current_app.config.get('MAX_RESUME_SIZE', 5 * 1024 * 1024)
        if size > max_size:
            return False, f"File size exceeds maximum allowed limit of {max_size // (1024 * 1024)}MB", ""

        if size == 0:
            return False, "File is empty", ""

        if ext == 'pdf':
            header = file_storage.read(4)
            file_storage.seek(0)
            if header != b'%PDF':
                return False, "Corrupt or invalid PDF file header", ""

        saved_filename = f"resume_{uuid.uuid4().hex[:12]}_{original_name}"
        destination = cls.get_upload_folder() / saved_filename

        try:
            file_storage.save(str(destination))
            return True, str(destination), saved_filename
        except Exception as e:
            return False, f"Failed to save file: {str(e)}", ""

    @classmethod
    def delete_resume(cls, filename: str) -> bool:
        """Deletes a resume file if it exists."""
        if not filename:
            return False
        safe_name = os.path.basename(filename)
        target = cls.get_upload_folder() / safe_name
        if target.exists():
            try:
                target.unlink()
                return True
            except OSError:
                return False
        return False

    @classmethod
    def get_resume_path(cls, filename: str) -> Path | None:
        """Returns the full Path to a resume file if it exists."""
        if not filename:
            return None
        safe_name = os.path.basename(filename)
        target = cls.get_upload_folder() / safe_name
        return target if target.exists() else None
