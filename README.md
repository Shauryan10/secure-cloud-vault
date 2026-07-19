# 🔐 Secure Cloud Vault

A secure cloud-based file storage system built with **FastAPI**, **MySQL**, **AWS S3**, and **JWT Authentication**. The application allows authenticated users to upload, manage, and download encrypted assets securely from cloud storage.

---

# Features

- User Registration
- JWT Authentication
- Secure Login
- Upload Files to AWS S3
- Download Files
- Delete Files
- Asset Ownership Verification
- SHA-256 File Integrity Hashing
- File Size Validation (10 MB Limit)
- MySQL Database
- Dockerized Backend
- React Frontend
- REST API with Swagger Documentation

---

# Tech Stack

## Backend

- FastAPI
- SQLAlchemy
- PyMySQL
- JWT Authentication
- Passlib (bcrypt)
- Boto3
- Python 3.11

## Frontend

- React (Vite)
- Axios
- React Router

## Database

- MySQL 8.4

## Cloud

- AWS S3

## Containerization

- Docker
- Docker Compose

---

# Project Structure

```
secure-cloud-vault/

│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── security/
│   │   ├── database.py
│   │   └── main.py
│   │
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── pages/
│   │   └── App.jsx
│   │
│   ├── package.json
│   └── vite.config.js
│
└── docker-compose.yml
```

---

# Installation

## Clone Repository

```bash
git clone https://github.com/yourusername/secure-cloud-vault.git

cd secure-cloud-vault
```

---

# Backend Setup

Create a virtual environment.

```bash
python -m venv venv
```

Activate it.

### Windows

```bash
venv\Scripts\activate
```

### macOS/Linux

```bash
source venv/bin/activate
```

Install dependencies.

```bash
pip install -r requirements.txt
```

---

# Environment Variables

Create a `.env` file inside the backend directory.

```env
DB_HOST=localhost
DB_PORT=3307
DB_USER=root
DB_PASSWORD=root123
DB_NAME=secure_cloud_vault

SECRET_KEY=your_secret_key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

AWS_ACCESS_KEY_ID=YOUR_ACCESS_KEY
AWS_SECRET_ACCESS_KEY=YOUR_SECRET_KEY
AWS_REGION=ap-south-1
S3_BUCKET_NAME=your_bucket_name
```

---

# Run MySQL

```bash
docker compose up mysql -d
```

---

# Run Backend

```bash
uvicorn app.main:app --reload
```

Swagger

```
http://localhost:8000/docs
```

---

# Frontend

Move into frontend directory.

```bash
cd frontend
```

Install packages.

```bash
npm install
```

Run development server.

```bash
npm run dev
```

Frontend

```
http://localhost:5173
```

---

# Running with Docker

Build and start everything.

```bash
docker compose up --build
```

Stop containers.

```bash
docker compose down
```

---

# API Endpoints

## Authentication

| Method | Endpoint |
|----------|----------------|
| POST | /auth/register |
| POST | /auth/login |
| GET | /auth/me |

---

## Assets

| Method | Endpoint |
|----------|------------------------|
| GET | /assets |
| POST | /assets/upload |
| GET | /assets/{id}/download |
| DELETE | /assets/{id} |

---

# Security Features

- JWT Authentication
- Password Hashing using bcrypt
- SHA-256 Hash Generation
- User Authorization
- Ownership Verification
- File Size Restriction
- Secure AWS S3 Storage
- Environment Variable Configuration

---

# AWS S3 Workflow

```
User
   │
   ▼
Frontend (React)
   │
   ▼
FastAPI Backend
   │
   ├── Validate User
   ├── Generate SHA-256 Hash
   ├── Upload File
   ▼
AWS S3
   │
   ▼
Store Metadata in MySQL
```

---

# Future Improvements

- File Encryption before Upload
- AWS KMS Integration
- MFA Authentication
- File Sharing
- Audit Logs
- Versioning
- Virus Scanning
- Role-Based Access Control (RBAC)

---



---

# Author

**Shauryan Shindhu**

B.Tech CSE (IoT & Cybersecurity with Blockchain)

Interested in:

- Cloud Computing
- DevOps
- DevSecOps
- AWS
- Cybersecurity
- Backend Development

---

# License

This project is related to my industry internship at PBEL IBM(virtual) 