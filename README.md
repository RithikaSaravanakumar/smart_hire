# SmartHire — Smart Student Placement Portal 🚀

[![Pytest Tests](https://img.shields.io/badge/Pytest-47%20Passed-brightgreen)](tests/)
[![Python](https://img.shields.io/badge/Python-3.10%20%7C%203.11%20%7C%203.12-blue)](https://python.org)
[![Flask](https://img.shields.io/badge/Framework-Flask%203.x-lightgrey)](https://flask.palletsprojects.com/)
[![Database](https://img.shields.io/badge/Database-MySQL%20%7C%20SQLite-orange)](https://www.mysql.com/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

**SmartHire** is a modern full-stack web application demonstrating production-grade architecture across:
**Frontend → REST API → Backend → Database (MySQL / SQLite) → JWT Authentication → Role-Based Access Control (Student, Recruiter, Admin) → Skill-Matching Engine → External Geo API Integration → Pytest Automation → Railway Cloud Deployment**.

---

## 🏗️ System Architecture

```text
                                  GitHub
                                    │
                                    │ Automated Deploy
                                    ▼
                             ┌──────────────┐
                             │   Railway    │
                             │              │
                             │ Gunicorn WSGI│
                             │  Flask API   │
                             └──────┬───────┘
                                    │
                                    │ SQLAlchemy ORM (PyMySQL)
                                    ▼
                             ┌──────────────┐
                             │ MySQL (Cloud)│
                             │  Railway DB  │
                             └──────────────┘
                                    ▲
                                    │
                              REST API (JSON)
                                    │
                             ┌──────┴───────┐
                             │              │
                       SmartHire UI     Web Browser
                       (ZeAI Style)
```

```text
Frontend (Vanilla HTML5/CSS/JS)
  ├── ZeAI Modern Glassmorphic Theme
  ├── Debounced Job Search & Multi-Filters
  ├── Resume Upload & Dynamic Skill Fit
  └── 3-Tier Dynamic Navigation
       │
       ▼
REST API (Flask / Gunicorn)
  ├── 3-Tier RBAC (@role_required: Student, Recruiter, Admin)
  ├── Werkzeug Password Hashing + PyJWT
  ├── Skill Recommendation Algorithm (Normalized Parser)
  ├── Open-Meteo Geocoding API (3s Timeout + Fallback)
  ├── Resume Storage Abstraction (services/storage.py)
  └── Interactive OpenAPI / Swagger Docs (/api/docs)
       │
       ▼
Database Layer
  ├── Production: Railway MySQL (mysql+pymysql://)
  ├── Development/Testing: SQLite (smarthire.db / :memory:)
  └── Composite Uniqueness UNIQUE(student_id, job_id)
```

---

## 👥 3-Tier Role-Based Access Control (RBAC)

| Role | Permissions & Actions |
|---|---|
| **🎓 Student** | Register account, view/edit own profile, upload/replace resume, browse placement jobs, search & filter drives, get skill match recommendations, submit applications (duplicate prevented), track application status, withdraw application. |
| **🏢 Recruiter** | Sign in to Recruiter Hub, author new placement drives, edit/delete own company jobs, view applicant roster with resumes, update hiring status (`Applied`, `Under Review`, `Shortlisted`, `Interview`, `Selected`, `Rejected`), view hiring counters. |
| **👑 Admin** | Provision recruiter accounts (`POST /api/recruiters`), oversee all students, recruiters, jobs, and platform applications, access aggregated metrics (`/api/admin/stats`), view interactive Swagger documentation. |

---

## 📁 Repository Structure

```text
smarthire-placement-portal/
├── backend/
│   ├── routes/
│   │   ├── admin.py            # Master administration endpoints
│   │   ├── applications.py     # Application status & withdrawal
│   │   ├── auth.py             # Registration, login, JWT verification
│   │   ├── jobs.py             # Job catalog, filters, recommendations, apply
│   │   ├── recruiters.py       # Recruiter jobs & dashboard metrics
│   │   └── students.py         # Student profile & application history
│   ├── services/
│   │   ├── external_api.py     # Open-Meteo geocoding API + fallback
│   │   ├── recommendation.py   # Skill match calculation & ranker
│   │   └── storage.py          # Secure resume storage abstraction
│   ├── utils/
│   │   ├── auth.py             # JWT encode/decode & RBAC decorators
│   │   └── validation.py       # Regex validators (email, phone, CGPA, resume)
│   ├── uploads/
│   │   └── .gitkeep            # Upload directory tracking
│   ├── app.py                  # Flask app factory, health check, Swagger UI
│   ├── config.py               # Railway MySQL & local environment config
│   ├── database.py             # SQLAlchemy instance
│   └── models.py               # User, Student, Recruiter, Job, Application
├── database/
│   ├── schema.sql              # MySQL DDL schema
│   └── seed_data.py            # Idempotent database seeder
├── frontend/
│   ├── css/
│   │   └── style.css           # ZeAI-inspired glassmorphism design system
│   ├── js/
│   │   ├── admin-dashboard.js  # Admin management interface
│   │   ├── common.js           # Centralized API client & toast alerts
│   │   ├── dashboard.js        # Student dashboard & AI recommendations
│   │   ├── jobs.js             # Debounced job search, filters, apply modal
│   │   ├── login.js            # Login handler & 1-click demo filler
│   │   ├── profile.js          # Student profile & resume updater
│   │   ├── recruiter-dashboard.js # Recruiter job authoring & applicant reviews
│   │   └── register.js         # Student registration form validation
│   ├── admin-dashboard.html
│   ├── dashboard.html
│   ├── index.html              # Hero landing page
│   ├── jobs.html               # Job catalog & Geo dialogs
│   ├── login.html
│   ├── profile.html
│   ├── recruiter-dashboard.html
│   └── register.html
├── tests/
│   ├── conftest.py             # Fixtures for SQLite in-memory testing
│   ├── test_applications.py    # TC007-TC010, TC017-TC020, TC026-TC031
│   ├── test_auth.py            # TC001-TC005, TC011-TC015, TC037-TC040
│   ├── test_jobs.py            # TC006, TC021-TC025, TC032-TC036, TC041-TC044
│   └── test_students.py        # TC016, Profile & validation tests
├── .env.example                # Environment variables template
├── .gitignore                  # Git ignore rules
├── Procfile                    # Railway start command (Gunicorn)
├── pytest.ini                  # Pytest configuration
├── railway.json                # Railway build & deploy specification
├── requirements.txt            # Python dependencies (with Gunicorn)
└── README.md                   # Documentation
```

---

## 🛠️ Local Development Setup

### 1. Clone & Setup Environment
```bash
git clone https://github.com/<your-username>/smarthire-placement-portal.git
cd smarthire-placement-portal

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
*(For local SQLite development, no changes to `.env` are required).*

### 3. Initialize & Seed Database
```bash
python database/seed_data.py
```

### 4. Run Pytest Test Suite
```bash
pytest -v
```
All **47 test cases** will run in-memory and pass.

### 5. Start Local Application
```bash
python backend/app.py
```
Open [http://localhost:5000/](http://localhost:5000/) in your browser.

---

# 🚀 Deploying to Railway (GitHub + Railway MySQL)

Follow these step-by-step instructions to deploy SmartHire with Railway and Railway MySQL:

```text
Developer
   │
   ├── 1. git push origin main
   ▼
 GitHub Repository (smarthire-placement-portal)
   │
   ├── 2. Railway triggers automatic build
   ▼
 Railway Cloud Platform
   ├── Build: Nixpacks installs requirements.txt
   ├── Deploy: Gunicorn starts backend.app:app on assigned $PORT
   └── Connects to: Railway MySQL Database (mysql+pymysql://)
```

### Step 1: Push Repository to GitHub
1. Initialize Git and commit project files:
   ```bash
   git init
   git add .
   git commit -m "Initial SmartHire full-stack release"
   ```
2. Create a new repository named `smarthire-placement-portal` on GitHub.
3. Push your code:
   ```bash
   git remote add origin https://github.com/<your-username>/smarthire-placement-portal.git
   git branch -M main
   git push -u origin main
   ```

---

### Step 2: Create a Project on Railway
1. Sign in to [Railway.app](https://railway.app/).
2. Click **"+ New Project"** $\rightarrow$ **"Deploy from GitHub repo"**.
3. Select your repository `smarthire-placement-portal`.

---

### Step 3: Add a Railway MySQL Database
1. In your Railway project canvas, click **"+ Create"** or **"+ Add Service"**.
2. Select **"Database"** $\rightarrow$ **"Add MySQL"**.
3. Railway will provision a dedicated MySQL service.

---

### Step 4: Configure Railway Environment Variables
In your web service settings, navigate to the **Variables** tab and set the following environment variables:

| Variable Name | Recommended Value / Description |
|---|---|
| `FLASK_ENV` | `production` |
| `FLASK_DEBUG` | `0` |
| `DATABASE_URL` | `${{MySQL.MYSQL_URL}}` *(or Railway MySQL connection string: `mysql+pymysql://<user>:<pass>@<host>:<port>/<db>`)* |
| `JWT_SECRET_KEY` | *A strong random alphanumeric string (e.g., `a7c39f28e4d1b5...`)* |
| `SECRET_KEY` | *A strong random secret key* |
| `MAX_RESUME_SIZE` | `5242880` *(5MB)* |
| `FRONTEND_URL` | `*` *(or your generated Railway domain)* |
| `EXTERNAL_API_URL` | `https://geocoding-api.open-meteo.com/v1/search` |
| `EXTERNAL_API_TIMEOUT` | `3` |

> [!NOTE]
> Railway automatically injects `$PORT` and supplies MySQL variables (`MYSQLHOST`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE`, `MYSQLPORT`), which SmartHire natively detects and maps.

---

### Step 5: Seed the Production Database
Once deployed, seed the initial admin, recruiter, student, and job data:
1. In Railway, open your web service and click the **"CLI"** or **"Exec"** tab.
2. Run:
   ```bash
   python database/seed_data.py
   ```

---

### Step 6: Verify Deployment
1. **Health Check**: Open `https://<your-railway-domain>/api/health`
   - Should return: `{"success": true, "data": {"status": "healthy", "database": "connected"}}`
2. **API Documentation**: Open `https://<your-railway-domain>/api/docs`
3. **Frontend Application**: Open `https://<your-railway-domain>/` and sign in with the test accounts.

---

## 🔑 Demo & Test Credentials

| Role | Email | Password |
|---|---|---|
| **👑 Admin** | `admin@smarthire.com` | `Admin@123456` |
| **🏢 Recruiter** | `recruiter.tech@innovatex.com` | `Recruiter@123456` |
| **🎓 Student** | `arjun.sharma@example.com` | `Student@123456` |
| **🎓 Student** | `priya.patel@example.com` | `Student@123456` |

---

## 🛡️ Production Verification Checklist

- [x] **No Secrets Committed**: `.env`, passwords, local `.db` files ignored by `.gitignore`.
- [x] **Safe DB Initialization**: `db.create_all()` is safe; no `db.drop_all()` in startup.
- [x] **Railway Port Handled**: Binds dynamically to `0.0.0.0:$PORT`.
- [x] **WSGI Production Server**: Gunicorn specified in `Procfile` and `railway.json`.
- [x] **Health Check**: `GET /api/health` verifies database connectivity.
- [x] **Automated Tests**: 47 of 47 tests passed (TC001–TC044).
- [x] **Interactive OpenAPI**: Accessible at `/api/docs`.

---

## 📄 License
This project is licensed under the MIT License.
