/**
 * SmartHire — Student Registration Logic & Client-side Validation
 */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('registration-form');
  const submitBtn = document.getElementById('submit-btn');
  const btnText = document.getElementById('btn-text');
  const btnSpinner = document.getElementById('btn-spinner');

  const fields = {
    name: document.getElementById('name'),
    email: document.getElementById('email'),
    phone: document.getElementById('phone'),
    college: document.getElementById('college'),
    degree: document.getElementById('degree'),
    department: document.getElementById('department'),
    graduation_year: document.getElementById('graduation_year'),
    cgpa: document.getElementById('cgpa'),
    skills: document.getElementById('skills'),
    password: document.getElementById('password'),
    confirm_password: document.getElementById('confirm_password'),
    resume: document.getElementById('resume')
  };

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^(?:\+91[\-\s]?|91[\-\s]?|0)?[6-9]\d{9}$/;

  function setFieldError(field, errorId, show, message = null) {
    const errorEl = document.getElementById(errorId);
    if (!errorEl) return;
    if (show) {
      field.classList.add('is-invalid');
      errorEl.classList.add('active');
      if (message) errorEl.textContent = message;
    } else {
      field.classList.remove('is-invalid');
      errorEl.classList.remove('active');
    }
  }

  function validateField(name) {
    let isValid = true;
    switch (name) {
      case 'name':
        isValid = fields.name.value.trim().length > 1;
        setFieldError(fields.name, 'name-error', !isValid);
        break;

      case 'email':
        isValid = emailRegex.test(fields.email.value.trim());
        setFieldError(fields.email, 'email-error', !isValid);
        break;

      case 'phone':
        const cleanPhone = fields.phone.value.replace(/[\s\-]/g, '');
        isValid = phoneRegex.test(cleanPhone);
        setFieldError(fields.phone, 'phone-error', !isValid);
        break;

      case 'college':
        isValid = fields.college.value.trim().length > 2;
        setFieldError(fields.college, 'college-error', !isValid);
        break;

      case 'degree':
        isValid = fields.degree.value !== '';
        setFieldError(fields.degree, 'degree-error', !isValid);
        break;

      case 'department':
        isValid = fields.department.value.trim().length > 1;
        setFieldError(fields.department, 'department-error', !isValid);
        break;

      case 'graduation_year':
        const year = parseInt(fields.graduation_year.value, 10);
        isValid = !isNaN(year) && year >= 1990 && year <= 2035;
        setFieldError(fields.graduation_year, 'graduation_year-error', !isValid);
        break;

      case 'cgpa':
        const cgpa = parseFloat(fields.cgpa.value);
        isValid = !isNaN(cgpa) && cgpa >= 0.0 && cgpa <= 10.0;
        setFieldError(fields.cgpa, 'cgpa-error', !isValid);
        break;

      case 'skills':
        isValid = fields.skills.value.trim().length > 0;
        setFieldError(fields.skills, 'skills-error', !isValid);
        break;

      case 'password':
        isValid = fields.password.value.length >= 6;
        setFieldError(fields.password, 'password-error', !isValid);
        // Also re-validate confirm_password if already typed
        if (fields.confirm_password.value) {
          validateField('confirm_password');
        }
        break;

      case 'confirm_password':
        isValid = fields.confirm_password.value === fields.password.value && fields.confirm_password.value.length > 0;
        setFieldError(fields.confirm_password, 'confirm_password-error', !isValid);
        break;

      case 'resume':
        if (fields.resume.files && fields.resume.files[0]) {
          const file = fields.resume.files[0];
          const ext = file.name.split('.').pop().toLowerCase();
          const allowed = ['pdf', 'doc', 'docx'];
          const maxBytes = 5 * 1024 * 1024;
          if (!allowed.includes(ext)) {
            setFieldError(fields.resume, 'resume-error', true, 'Only PDF, DOC, or DOCX files are allowed');
            isValid = false;
          } else if (file.size > maxBytes) {
            setFieldError(fields.resume, 'resume-error', true, 'File size must not exceed 5MB');
            isValid = false;
          } else {
            setFieldError(fields.resume, 'resume-error', false);
          }
        }
        break;
    }
    return isValid;
  }

  // Attach live input / change validation listeners
  Object.keys(fields).forEach(key => {
    const el = fields[key];
    if (el) {
      el.addEventListener('input', () => validateField(key));
      el.addEventListener('blur', () => validateField(key));
      el.addEventListener('change', () => validateField(key));
    }
  });

  // Handle Form Submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    let allValid = true;
    Object.keys(fields).forEach(key => {
      const valid = validateField(key);
      if (!valid) allValid = false;
    });

    if (!allValid) {
      showToast('Please correct the errors in the form before submitting.', 'error');
      return;
    }

    // Build FormData payload
    const formData = new FormData();
    formData.append('name', fields.name.value.trim());
    formData.append('email', fields.email.value.trim().toLowerCase());
    formData.append('phone', fields.phone.value.trim());
    formData.append('college', fields.college.value.trim());
    formData.append('degree', fields.degree.value);
    formData.append('department', fields.department.value.trim());
    formData.append('graduation_year', fields.graduation_year.value);
    formData.append('cgpa', fields.cgpa.value);
    formData.append('skills', fields.skills.value.trim());
    formData.append('password', fields.password.value);

    if (fields.resume.files && fields.resume.files[0]) {
      formData.append('resume', fields.resume.files[0]);
    }

    // UI Loading state
    submitBtn.disabled = true;
    btnText.textContent = 'Creating Account...';
    btnSpinner.style.display = 'inline-block';

    try {
      const res = await apiCall('/register', {
        method: 'POST',
        data: formData,
        isFormData: true,
        requiresAuth: false
      });

      showToast(res.message || 'Registration successful! Please login.', 'success', 4000);
      form.reset();

      setTimeout(() => {
        window.location.href = '/login.html';
      }, 1500);

    } catch (err) {
      showToast(err.message || 'Registration failed. Please check your details.', 'error');
    } finally {
      submitBtn.disabled = false;
      btnText.textContent = 'Register as Student';
      btnSpinner.style.display = 'none';
    }
  });
});
