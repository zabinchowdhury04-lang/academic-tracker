import type {
  Course, DeadlineRow, LeaderboardRow, PendingTask, Student, StudentTask,
  SubmissionRow, TaskSummary, TaskType,
} from "./types";
import type { TaskForm } from "./schemas";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(body?.detail ?? `Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

const post = <T>(path: string, body: unknown) =>
  request<T>(path, { method: "POST", body: JSON.stringify(body) });

export const api = {
  students: () => request<Student[]>("/students"),
  courses: () => request<Course[]>("/courses"),
  taskTypes: () => request<TaskType[]>("/task-types"),
  studentTasks: (id: number) => request<StudentTask[]>(`/students/${id}/tasks`),
  pending: (id: number) => request<PendingTask[]>(`/students/${id}/pending`),
  upcoming: (id: number) => request<DeadlineRow[]>(`/students/${id}/upcoming`),
  overdue: (id: number) => request<DeadlineRow[]>(`/students/${id}/overdue`),
  tasks: () => request<TaskSummary[]>("/tasks"),
  taskSubmissions: (taskId: number) => request<SubmissionRow[]>(`/tasks/${taskId}/submissions`),
  leaderboard: () => request<LeaderboardRow[]>("/leaderboard"),
  createTask: (data: TaskForm) => post<{ task_id: number }>("/tasks", data),
  submitTask: (task_id: number, student_id: number) =>
    post<{ status: string }>("/submissions/submit", { task_id, student_id }),
  gradeTask: (task_id: number, student_id: number, marks_obtained: number, remarks: string) =>
    post<{ status: string }>("/submissions/grade", { task_id, student_id, marks_obtained, remarks }),
};
