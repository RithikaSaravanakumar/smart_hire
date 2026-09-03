/**
 * SmartHire — Student Registration Logic & Client-side Validation
 */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('registration-form');
  const submitBtn = document.getElementById('register-submit-btn') || document.getElementById('submit-btn');
  const btnText = document.getElementById('register-btn-text') || document.getElementById('btn-text');

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
    resume: document.getElementById('resume')
  };

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^(?:\+91[\-\s]?|91[\-\s]?|0)?[6-9]\d{9}$/;

  function validateField(name) {
    const el = fields[name];
    if (!el) return true;
    let isValid = true;
    switch (name) {
      case 'name':
        isValid = el.value.trim().length > 1;
        break;
      case 'email':
        isValid = emailRegex.test(el.value.trim());
        break;
      case 'phone':
        isValid = phoneRegex.test(el.value.replace(/[\s\-]/g, ''));
        break;
      case 'college':
      case 'department':
      case 'degree':
        isValid = el.value.trim().length > 0;
        break;
      case 'graduation_year':
        const yr = parseInt(el.value, 10);
        isValid = yr >= 1990 && yr <= 2035;
        break;
      case 'cgpa':
        const cg = parseFloat(el.value);
        isValid = !isNaN(cg) && cg >= 0 && cg <= 10.0;
        break;
      case 'skills':
        isValid = el.value.trim().length > 0;
        break;
      case 'password':
        isValid = el.value.length >= 6;
        break;
    }
    return isValid;
  }

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    let allValid = true;
    Object.keys(fields).forEach(key => {
      if (key !== 'resume' && !validateField(key)) {
        allValid = false;
      }
    });

    if (!allValid) {
      showToast('Please fill in all required fields accurately (Password min 6 chars, CGPA 0-10, valid 10-digit phone).', 'warning');
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

    if (fields.resume && fields.resume.files && fields.resume.files[0]) {
      formData.append('resume', fields.resume.files[0]);
    }

    // UI Loading state
    if (submitBtn) submitBtn.disabled = true;
    if (btnText) btnText.textContent = 'Creating Account...';

    try {
      const res = await apiCall('/register', {
        method: 'POST',
        data: formData,
        isFormData: true,
        requiresAuth: false
      });

      showToast(res.message || 'Registration successful! Please sign in.', 'success', 4000);
      form.reset();

      setTimeout(() => {
        window.location.href = '/login.html';
      }, 1200);

    } catch (err) {
      showToast(err.message || 'Registration failed. Please check your details.', 'error');
      if (submitBtn) submitBtn.disabled = false;
      if (btnText) btnText.textContent = 'Complete Student Enrollment →';
    }
  });
});
