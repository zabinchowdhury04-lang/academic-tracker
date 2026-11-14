import { z } from "zod";

const requiredId = (msg: string) =>
  z.number({ invalid_type_error: msg, required_error: msg }).int().positive(msg);

// Instructor "Create Task" form
export const taskSchema = z
  .object({
    course_id: requiredId("Select a course"),
    type_id: requiredId("Select a task type"),
    title: z
      .string()
      .trim()
      .min(3, "Title must be at least 3 characters")
      .max(150, "Title is too long (max 150 characters)"),
    description: z.string().max(1000, "Description is too long (max 1000 characters)"),
    assigned_date: z.string().min(1, "Assigned date is required"),
    due_date: z.string().min(1, "Due date is required"),
    max_marks: z
      .number({ invalid_type_error: "Enter maximum marks", required_error: "Enter maximum marks" })
      .int("Marks must be a whole number")
      .min(1, "Maximum marks must be at least 1")
      .max(1000, "Maximum marks cannot exceed 1000"),
    priority: z.enum(["Low", "Medium", "High"]),
  })
  .refine((d) => d.due_date >= d.assigned_date, {
    message: "Due date cannot be earlier than the assigned date",
    path: ["due_date"],
  });

export type TaskForm = z.infer<typeof taskSchema>;

// Grading form - the maximum depends on the task, so it is built per task
export const makeGradeSchema = (maxMarks: number) =>
  z.object({
    marks_obtained: z
      .number({ invalid_type_error: "Enter marks", required_error: "Enter marks" })
      .min(0, "Marks cannot be negative")
      .max(maxMarks, `Marks cannot exceed ${maxMarks}`),
    remarks: z.string().max(255, "Remarks too long (max 255 characters)"),
  });

export type GradeForm = z.infer<ReturnType<typeof makeGradeSchema>>;
