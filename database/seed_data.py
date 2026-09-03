import os
import sys
from pathlib import Path

# Ensure project root is in sys.path
project_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(project_root))

from backend.app import create_app
from backend.database import db
from backend.models import User, Student, Recruiter, Job, Application

def seed_database(drop_existing=False):
    """
    Idempotent database seeder.
    Populates sample admin, recruiters, students, placement jobs, and initial applications.
    """
    app = create_app()
    with app.app_context():
        if drop_existing:
            print("[*] Dropping existing database tables (drop_existing=True)...")
            db.drop_all()

        print("[*] Ensuring database tables exist...")
        db.create_all()

        # 1. Admin Account
        admin_email = "admin@smarthire.com"
        admin = User.query.filter_by(email=admin_email).first()
        if not admin:
            print(f"[*] Creating Admin: {admin_email}")
            admin = User(email=admin_email, role="admin")
            admin.set_password("Admin@123456")
            db.session.add(admin)
            db.session.commit()
        else:
            print(f"[+] Admin already exists: {admin_email}")

        # 2. Recruiter Accounts
        recruiter_users = [
            {
                "email": "recruiter.tech@innovatex.com",
                "password": "Recruiter@123456",
                "name": "Vikram Malhotra",
                "company": "InnovateX Solutions",
                "designation": "Lead Technical Recruiter",
                "phone": "+91 9876543210"
            },
            {
                "email": "hiring@cloudsphere.io",
                "password": "Recruiter@123456",
                "name": "Ananya Sen",
                "company": "CloudSphere Inc",
                "designation": "Talent Acquisition Specialist",
                "phone": "+91 9876543211"
            },
            {
                "email": "careers@neuraledge.ai",
                "password": "Recruiter@123456",
                "name": "Karthik Rajan",
                "company": "NeuralEdge AI Labs",
                "designation": "Head of Engineering Hiring",
                "phone": "+91 9876543212"
            }
        ]

        recruiter_objs = []
        for r_data in recruiter_users:
            u = User.query.filter_by(email=r_data["email"]).first()
            if not u:
                print(f"[*] Creating Recruiter: {r_data['email']}")
                u = User(email=r_data["email"], role="recruiter")
                u.set_password(r_data["password"])
                db.session.add(u)
                db.session.flush()

                rec = Recruiter(
                    user_id=u.user_id,
                    name=r_data["name"],
                    company=r_data["company"],
                    designation=r_data["designation"],
                    phone=r_data["phone"]
                )
                db.session.add(rec)
                db.session.flush()
                recruiter_objs.append(rec)
            else:
                print(f"[+] Recruiter already exists: {r_data['email']}")
                recruiter_objs.append(u.recruiter_profile)

        db.session.commit()

        # 3. Student Accounts
        student_users = [
            {
                "email": "arjun.sharma@example.com",
                "password": "Student@123456",
                "name": "Arjun Sharma",
                "phone": "+91 9811223344",
                "college": "National Institute of Technology",
                "degree": "B.Tech",
                "department": "Computer Science & Engineering",
                "graduation_year": 2026,
                "skills": "Python, SQL, React, Flask, REST APIs, Git, Docker",
                "cgpa": 8.92
            },
            {
                "email": "priya.patel@example.com",
                "password": "Student@123456",
                "name": "Priya Patel",
                "phone": "+91 9822334455",
                "college": "Indian Institute of Information Technology",
                "degree": "B.Tech",
                "department": "Information Technology",
                "graduation_year": 2026,
                "skills": "JavaScript, React, Node.js, HTML, CSS, Tailwind, MongoDB",
                "cgpa": 9.15
            },
            {
                "email": "rohit.verma@example.com",
                "password": "Student@123456",
                "name": "Rohit Verma",
                "phone": "+91 9833445566",
                "college": "Delhi Technological University",
                "degree": "B.Tech",
                "department": "Electronics & Communication",
                "graduation_year": 2025,
                "skills": "Python, Machine Learning, TensorFlow, Pandas, NumPy, SQL",
                "cgpa": 8.45
            }
        ]

        student_objs = []
        for s_data in student_users:
            u = User.query.filter_by(email=s_data["email"]).first()
            if not u:
                print(f"[*] Creating Student: {s_data['email']}")
                u = User(email=s_data["email"], role="student")
                u.set_password(s_data["password"])
                db.session.add(u)
                db.session.flush()

                st = Student(
                    user_id=u.user_id,
                    name=s_data["name"],
                    phone=s_data["phone"],
                    college=s_data["college"],
                    degree=s_data["degree"],
                    department=s_data["department"],
                    graduation_year=s_data["graduation_year"],
                    skills=s_data["skills"],
                    cgpa=s_data["cgpa"]
                )
                db.session.add(st)
                db.session.flush()
                student_objs.append(st)
            else:
                print(f"[+] Student already exists: {s_data['email']}")
                student_objs.append(u.student_profile)

        db.session.commit()

        # 4. Placement Job Listings
        jobs_data = [
            {
                "recruiter_idx": 0,
                "company": "InnovateX Solutions",
                "job_title": "Python Developer",
                "location": "Bengaluru, Karnataka",
                "experience": "0-2 Years",
                "skills": "Python, SQL, Flask, REST APIs",
                "description": "Join our core backend engineering team building scalable microservices and high-performance placement analytics. You will work closely with database architects and frontend teams."
            },
            {
                "recruiter_idx": 0,
                "company": "InnovateX Solutions",
                "job_title": "Frontend Developer",
                "location": "Hyderabad, Telangana",
                "experience": "0-1 Year (Freshers Welcome)",
                "skills": "React, JavaScript, HTML, CSS, TypeScript",
                "description": "Create responsive, accessible, and delightful web user interfaces for our enterprise dashboard suite. Strong foundation in modern JavaScript and React component lifecycle required."
            },
            {
                "recruiter_idx": 0,
                "company": "InnovateX Solutions",
                "job_title": "Full Stack Engineer",
                "location": "Pune, Maharashtra",
                "experience": "1-3 Years",
                "skills": "Python, React, SQL, Docker, AWS",
                "description": "Lead end-to-end feature delivery across frontend interfaces and backend microservices. Optimize SQL queries and manage cloud deployment pipelines."
            },
            {
                "recruiter_idx": 1,
                "company": "CloudSphere Inc",
                "job_title": "Cloud DevOps Engineer",
                "location": "Mumbai, Maharashtra",
                "experience": "0-2 Years",
                "skills": "Docker, Kubernetes, Linux, AWS, CI/CD",
                "description": "Maintain highly available Kubernetes clusters, automate deployment pipelines with GitHub Actions, and implement telemetry and infrastructure-as-code."
            },
            {
                "recruiter_idx": 1,
                "company": "CloudSphere Inc",
                "job_title": "Backend API Engineer (Java/Spring)",
                "location": "Chennai, Tamil Nadu",
                "experience": "0-2 Years",
                "skills": "Java, Spring Boot, MySQL, REST APIs, Microservices",
                "description": "Architect high-throughput transactional banking APIs with Spring Boot and MySQL. Focus on concurrency, caching, and database performance tuning."
            },
            {
                "recruiter_idx": 1,
                "company": "CloudSphere Inc",
                "job_title": "QA Automation Engineer",
                "location": "Noida, Uttar Pradesh",
                "experience": "0-1 Year",
                "skills": "Python, Selenium, Pytest, REST APIs, Git",
                "description": "Develop and maintain automated integration and regression test suites. Integrate test automation into continuous delivery pipelines."
            },
            {
                "recruiter_idx": 2,
                "company": "NeuralEdge AI Labs",
                "job_title": "Machine Learning Engineer",
                "location": "Bengaluru, Karnataka",
                "experience": "0-2 Years",
                "skills": "Python, Machine Learning, TensorFlow, PyTorch, SQL, Pandas",
                "description": "Train and evaluate deep learning and generative models. Deploy inference endpoints with low latency onto cloud GPU instances."
            },
            {
                "recruiter_idx": 2,
                "company": "NeuralEdge AI Labs",
                "job_title": "Data Analyst / BI Specialist",
                "location": "Gurugram, Haryana",
                "experience": "0-1 Year",
                "skills": "SQL, Python, Tableau, PowerBI, Excel, Statistics",
                "description": "Analyze candidate placement patterns, build executive dashboards, and derive predictive insights on student hiring trends."
            },
            {
                "recruiter_idx": 2,
                "company": "NeuralEdge AI Labs",
                "job_title": "Data Engineer",
                "location": "Remote, India",
                "experience": "1-3 Years",
                "skills": "Python, SQL, Apache Spark, Kafka, Airflow, Snowflake",
                "description": "Build high-throughput ETL data pipelines ingesting millions of hiring metrics daily into cloud analytical warehouses."
            }
        ]

        job_objs = []
        for j_data in jobs_data:
            existing_job = Job.query.filter_by(job_title=j_data["job_title"], company=j_data["company"]).first()
            if not existing_job:
                rec_idx = j_data["recruiter_idx"]
                rec_id = recruiter_objs[rec_idx].recruiter_id if rec_idx < len(recruiter_objs) else recruiter_objs[0].recruiter_id
                print(f"[*] Posting Job: {j_data['job_title']} at {j_data['company']}")
                j = Job(
                    recruiter_id=rec_id,
                    company=j_data["company"],
                    job_title=j_data["job_title"],
                    location=j_data["location"],
                    experience=j_data["experience"],
                    skills=j_data["skills"],
                    description=j_data["description"]
                )
                db.session.add(j)
                db.session.flush()
                job_objs.append(j)
            else:
                print(f"[+] Job already exists: {j_data['job_title']}")
                job_objs.append(existing_job)

        db.session.commit()

        # 5. Sample Initial Applications
        sample_applications = [
            {"student_idx": 0, "job_idx": 0, "status": "Under Review"}, # Arjun -> Python Dev
            {"student_idx": 0, "job_idx": 2, "status": "Shortlisted"},   # Arjun -> Full Stack
            {"student_idx": 1, "job_idx": 1, "status": "Interview"},     # Priya -> Frontend Dev
            {"student_idx": 2, "job_idx": 6, "status": "Selected"},      # Rohit -> ML Engineer
        ]

        for app_data in sample_applications:
            s_idx = app_data["student_idx"]
            j_idx = app_data["job_idx"]
            if s_idx < len(student_objs) and j_idx < len(job_objs):
                s_id = student_objs[s_idx].student_id
                j_id = job_objs[j_idx].job_id
                existing_app = Application.query.filter_by(student_id=s_id, job_id=j_id).first()
                if not existing_app:
                    print(f"[*] Applying Student #{s_id} -> Job #{j_id} [{app_data['status']}]")
                    new_app = Application(
                        student_id=s_id,
                        job_id=j_id,
                        status=app_data["status"]
                    )
                    db.session.add(new_app)

        db.session.commit()
        print("\n=========================================================")
        print("[SUCCESS] SmartHire Database Initialized & Seeded Successfully!")
        print("=========================================================\n")

if __name__ == "__main__":
    seed_database()
