export type Priority = "Low" | "Medium" | "High";
export type Status = "Pending" | "Submitted" | "Late" | "Graded";

export interface Student {
  student_id: number;
  full_name: string;
  email: string;
  department: string;
  semester: number;
}

export interface Course {
  course_id: number;
  course_code: string;
  course_title: string;
  credits: number;
  instructor_name: string;
}

export interface TaskType {
  type_id: number;
  type_name: string;
}

export interface StudentTask {
  task_id: number;
  course_code: string;
  course_title: string;
  type_name: string;
  title: string;
  description: string | null;
  assigned_date: string;
  due_date: string;
  max_marks: number;
  priority: Priority;
  status: Status;
  submission_time: string | null;
  marks_obtained: number | null;
  remarks: string | null;
  days_left: number;
}

export interface PendingTask {
  task_id: number;
  course_code: string;
  course_title: string;
  type_name: string;
  title: string;
  due_date: string;
  max_marks: number;
  priority: Priority;
  status: Status;
  days_left: number;
}

export interface DeadlineRow {
  student_id: number;
  student_name: string;
  task_id: number;
  course_code: string;
  title: string;
  type_name: string;
  due_date: string;
  max_marks: number;
  priority: Priority;
  days_left?: number;
  days_overdue?: number;
}

export interface TaskSummary {
  task_id: number;
  course_code: string;
  type_name: string;
  title: string;
  due_date: string;
  max_marks: number;
  priority: Priority;
}

export interface SubmissionRow {
  submission_id: number;
  task_id: number;
  student_id: number;
  student_name: string;
  status: Status;
  submission_time: string | null;
  marks_obtained: number | null;
  remarks: string | null;
  max_marks: number;
}

export interface LeaderboardRow {
  student_id: number;
  full_name: string;
  avg_percentage: number;
  completed_tasks: number;
  late_submissions: number;
}
