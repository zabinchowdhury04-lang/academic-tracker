# Academic Tasks, Assignments & Deadline Tracker

A full-stack academic tracker for students and instructors: create tasks, submit work,
grade submissions, track deadlines and follow a points-based leaderboard.

**Stack:** MySQL (XAMPP) + Python FastAPI + React 19 / TypeScript / Vite / Tailwind CSS 4

---

## Features

- Dashboard with per-student pending, upcoming and overdue tasks
- Create and browse assignments/deadlines per course
- Submission and grading workflows
- Leaderboard based on awarded points
- SQL layer built on stored procedures (`sp_*`) and views (`v_*`)

## Project structure

```
backend/    FastAPI app (main.py) + Python dependencies
database/   academic_tracker.sql - schema, seed data, procedures, views
frontend/   React 19 + TypeScript + Vite + Tailwind single-page app
```

## Prerequisites

- [XAMPP](https://www.apachefriends.org/) with Apache + MySQL running
- Python 3.10+
- Node.js 18+

## Setup

### 1. Database

1. Start **XAMPP** → start **Apache** and **MySQL**.
2. Open phpMyAdmin → **Import** → choose `database/academic_tracker.sql` → **Go**.

### 2. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

API docs: http://127.0.0.1:8000/docs

#### Configuration

DB settings are read from environment variables with XAMPP-friendly defaults:

| Variable      | Default            |
| ------------- | ------------------ |
| `DB_HOST`     | `localhost`        |
| `DB_PORT`     | `3306`             |
| `DB_USER`     | `root`             |
| `DB_PASSWORD` | *(empty)*          |
| `DB_NAME`     | `academic_tracker` |

Optionally copy `backend/.env.example` to `backend/.env` and edit it — the app loads
`backend/.env` automatically when it exists.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. Requests to `/api/*` are proxied to the backend on port 8000.

Build for production with `npm run build`.

## API overview

| Method | Endpoint                              | Description                |
| ------ | ------------------------------------- | -------------------------- |
| GET    | `/api/students`                       | List students              |
| GET    | `/api/instructors`                    | List instructors           |
| GET    | `/api/courses`                        | List courses               |
| GET    | `/api/task-types`                     | List task types            |
| GET    | `/api/students/{id}/tasks`            | All tasks for a student    |
| GET    | `/api/students/{id}/pending`          | Pending tasks              |
| GET    | `/api/students/{id}/upcoming`         | Upcoming tasks             |
| GET    | `/api/students/{id}/overdue`          | Overdue tasks              |
| GET    | `/api/tasks`                          | All tasks                  |
| POST   | `/api/tasks`                          | Create a task              |
| GET    | `/api/tasks/{id}/submissions`         | Submissions for a task     |
| POST   | `/api/submissions/submit`             | Submit work                |
| POST   | `/api/submissions/grade`              | Grade a submission         |
| GET    | `/api/leaderboard`                    | Points leaderboard         |

## License

Licensed under the [GNU General Public License v3.0](LICENSE).
