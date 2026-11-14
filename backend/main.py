"""
Academic Tasks, Assignments & Deadline Tracker - FastAPI backend
Calls MySQL stored procedures (sp_*) and views (v_*).
Run:  uvicorn main:app --reload --port 8000
"""
import os
from datetime import date
from decimal import Decimal
from typing import Any, Literal

import mysql.connector
from dotenv import load_dotenv
from mysql.connector import pooling
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator, model_validator

load_dotenv()  # optional backend/.env; falls back to the environment / XAMPP defaults

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", "3306")),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", ""),   # XAMPP default: empty password
    "database": os.getenv("DB_NAME", "academic_tracker"),
}

pool = pooling.MySQLConnectionPool(pool_name="tracker_pool", pool_size=5, **DB_CONFIG)

app = FastAPI(title="Academic Tracker API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------- helpers
def _clean(row: dict[str, Any]) -> dict[str, Any]:
    """MySQL DECIMAL values -> float so the frontend receives numbers, not strings."""
    return {k: float(v) if isinstance(v, Decimal) else v for k, v in row.items()}


def _rows(cursor: Any, raw: list) -> list[dict[str, Any]]:
    cols = cursor.column_names
    return [_clean(r if isinstance(r, dict) else dict(zip(cols, r))) for r in raw]


def query(sql: str, params: tuple = ()) -> list[dict[str, Any]]:
    conn = pool.get_connection()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute(sql, params)
        return [_clean(r) for r in cur.fetchall()]
    except mysql.connector.Error as e:
        raise HTTPException(status_code=400, detail=e.msg)
    finally:
        cur.close()
        conn.close()


def call_proc(name: str, args: tuple = ()) -> list[dict[str, Any]]:
    """Call a stored procedure. SIGNAL errors from MySQL become HTTP 400 messages."""
    conn = pool.get_connection()
    cur = conn.cursor()
    try:
        cur.callproc(name, args)
        result: list[dict[str, Any]] = []
        for rs in cur.stored_results():
            result = _rows(rs, rs.fetchall())
        conn.commit()
        return result
    except mysql.connector.Error as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=e.msg)
    finally:
        cur.close()
        conn.close()


# ----------------------------------------------------------------- models
class TaskCreate(BaseModel):
    course_id: int = Field(gt=0)
    type_id: int = Field(gt=0)
    title: str = Field(min_length=3, max_length=150)
    description: str = Field(default="", max_length=1000)
    assigned_date: date
    due_date: date
    max_marks: int = Field(ge=1, le=1000)
    priority: Literal["Low", "Medium", "High"]

    @field_validator("title")
    @classmethod
    def title_not_blank(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 3:
            raise ValueError("Title must be at least 3 characters")
        return v

    @model_validator(mode="after")
    def dates_ok(self) -> "TaskCreate":
        if self.due_date < self.assigned_date:
            raise ValueError("Due date cannot be earlier than the assigned date")
        return self


class SubmitIn(BaseModel):
    task_id: int = Field(gt=0)
    student_id: int = Field(gt=0)


class GradeIn(BaseModel):
    task_id: int = Field(gt=0)
    student_id: int = Field(gt=0)
    marks_obtained: float = Field(ge=0)
    remarks: str = Field(default="", max_length=255)


@app.exception_handler(RequestValidationError)
async def validation_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    msgs = []
    for e in exc.errors():
        field = ".".join(str(p) for p in e["loc"][1:])
        text = str(e["msg"]).replace("Value error, ", "")
        msgs.append(f"{field}: {text}" if field else text)
    return JSONResponse(status_code=422, content={"detail": "; ".join(msgs)})


# -------------------------------------------------------------- lookups
@app.get("/api/students")
def students() -> list[dict[str, Any]]:
    return query("SELECT student_id, full_name, email, department, semester FROM student ORDER BY student_id")


@app.get("/api/instructors")
def instructors() -> list[dict[str, Any]]:
    return query("SELECT instructor_id, full_name, email, designation FROM instructor ORDER BY instructor_id")


@app.get("/api/courses")
def courses() -> list[dict[str, Any]]:
    return query(
        """SELECT c.course_id, c.course_code, c.course_title, c.credits,
                  i.full_name AS instructor_name
           FROM course c JOIN instructor i ON i.instructor_id = c.instructor_id
           ORDER BY c.course_code"""
    )


@app.get("/api/task-types")
def task_types() -> list[dict[str, Any]]:
    return query("SELECT type_id, type_name FROM task_type ORDER BY type_id")


# ------------------------------------------------------- student views
@app.get("/api/students/{student_id}/tasks")
def student_tasks(student_id: int) -> list[dict[str, Any]]:
    return call_proc("sp_student_tasks", (student_id,))


@app.get("/api/students/{student_id}/pending")
def student_pending(student_id: int) -> list[dict[str, Any]]:
    return call_proc("sp_pending_tasks", (student_id,))


@app.get("/api/students/{student_id}/upcoming")
def student_upcoming(student_id: int) -> list[dict[str, Any]]:
    return query(
        "SELECT * FROM v_upcoming_deadlines WHERE student_id = %s ORDER BY due_date", (student_id,)
    )


@app.get("/api/students/{student_id}/overdue")
def student_overdue(student_id: int) -> list[dict[str, Any]]:
    return query(
        "SELECT * FROM v_overdue_tasks WHERE student_id = %s ORDER BY due_date", (student_id,)
    )


# ---------------------------------------------------------- instructor
@app.get("/api/tasks")
def all_tasks() -> list[dict[str, Any]]:
    return query(
        """SELECT t.task_id, c.course_code, tt.type_name, t.title, t.due_date, t.max_marks, t.priority
           FROM task t
           JOIN course c ON c.course_id = t.course_id
           JOIN task_type tt ON tt.type_id = t.type_id
           ORDER BY t.due_date DESC"""
    )


@app.post("/api/tasks", status_code=201)
def create_task(body: TaskCreate) -> dict[str, Any]:
    rows = call_proc(
        "sp_create_task",
        (
            body.course_id, body.type_id, body.title, body.description,
            body.assigned_date, body.due_date, body.max_marks, body.priority,
        ),
    )
    return rows[0] if rows else {}


@app.get("/api/tasks/{task_id}/submissions")
def task_submissions(task_id: int) -> list[dict[str, Any]]:
    return query(
        """SELECT s.submission_id, s.task_id, s.student_id, st.full_name AS student_name,
                  s.status, s.submission_time, s.marks_obtained, s.remarks, t.max_marks
           FROM submission s
           JOIN student st ON st.student_id = s.student_id
           JOIN task t ON t.task_id = s.task_id
           WHERE s.task_id = %s
           ORDER BY st.full_name""",
        (task_id,),
    )


# ------------------------------------------------ submit / grade / board
@app.post("/api/submissions/submit")
def submit(body: SubmitIn) -> dict[str, Any]:
    rows = call_proc("sp_submit_task", (body.task_id, body.student_id))
    return rows[0] if rows else {}


@app.post("/api/submissions/grade")
def grade(body: GradeIn) -> dict[str, Any]:
    rows = call_proc(
        "sp_grade_task", (body.task_id, body.student_id, body.marks_obtained, body.remarks)
    )
    return rows[0] if rows else {}


@app.get("/api/leaderboard")
def leaderboard() -> list[dict[str, Any]]:
    return query("SELECT * FROM v_leaderboard")
