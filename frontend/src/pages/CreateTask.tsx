import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2 } from "lucide-react";
import { api } from "../api";
import { taskSchema, type TaskForm } from "../schemas";
import { useFetch } from "../useFetch";
import { ErrorBanner, PageTitle } from "../components/ui";

const today = () => new Date().toISOString().slice(0, 10);
const input = "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";
const Err = ({ msg }: { msg?: string }) => (msg ? <p className="mt-1 text-xs text-red-600">{msg}</p> : null);

export default function CreateTask() {
  const courses = useFetch(() => api.courses(), []);
  const types = useFetch(() => api.taskTypes(), []);
  const [serverError, setServerError] = useState<string | null>(null);
  const [created, setCreated] = useState<number | null>(null);

  const {
    register, handleSubmit, reset, formState: { errors, isSubmitting },
  } = useForm<TaskForm>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      course_id: NaN, type_id: NaN, title: "", description: "",
      assigned_date: today(), due_date: "", max_marks: NaN, priority: "Medium",
    },
  });

  async function onSubmit(values: TaskForm) {
    setServerError(null);
    setCreated(null);
    try {
      const res = await api.createTask(values); // calls sp_create_task
      setCreated(res.task_id);
      reset();
    } catch (e) {
      setServerError((e as Error).message); // error raised by SIGNAL in MySQL
    }
  }

  return (
    <>
      <PageTitle title="Create Task" subtitle="Instructor form - calls the stored procedure sp_create_task" />
      <ErrorBanner message={serverError ?? courses.error ?? types.error} />
      {created && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4" /> Task #{created} created. Pending submissions were added for enrolled students.
        </div>
      )}
      <form onSubmit={handleSubmit(onSubmit)} noValidate
        className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2">
        <label className="text-sm font-medium">Course
          <select className={input} {...register("course_id", { valueAsNumber: true })}>
            <option value="">Select course</option>
            {courses.data?.map((c) => <option key={c.course_id} value={c.course_id}>{c.course_code} - {c.course_title}</option>)}
          </select>
          <Err msg={errors.course_id?.message} />
        </label>
        <label className="text-sm font-medium">Task type
          <select className={input} {...register("type_id", { valueAsNumber: true })}>
            <option value="">Select type</option>
            {types.data?.map((t) => <option key={t.type_id} value={t.type_id}>{t.type_name}</option>)}
          </select>
          <Err msg={errors.type_id?.message} />
        </label>
        <label className="text-sm font-medium md:col-span-2">Title
          <input className={input} {...register("title")} />
          <Err msg={errors.title?.message} />
        </label>
        <label className="text-sm font-medium md:col-span-2">Description
          <textarea rows={3} className={input} {...register("description")} />
          <Err msg={errors.description?.message} />
        </label>
        <label className="text-sm font-medium">Assigned date
          <input type="date" className={input} {...register("assigned_date")} />
          <Err msg={errors.assigned_date?.message} />
        </label>
        <label className="text-sm font-medium">Due date
          <input type="date" className={input} {...register("due_date")} />
          <Err msg={errors.due_date?.message} />
        </label>
        <label className="text-sm font-medium">Maximum marks
          <input type="number" className={input} {...register("max_marks", { valueAsNumber: true })} />
          <Err msg={errors.max_marks?.message} />
        </label>
        <label className="text-sm font-medium">Priority
          <select className={input} {...register("priority")}>
            <option>Low</option><option>Medium</option><option>High</option>
          </select>
          <Err msg={errors.priority?.message} />
        </label>
        <div className="md:col-span-2">
          <button type="submit" disabled={isSubmitting}
            className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
            {isSubmitting ? "Creating..." : "Create task"}
          </button>
        </div>
      </form>
    </>
  );
}
