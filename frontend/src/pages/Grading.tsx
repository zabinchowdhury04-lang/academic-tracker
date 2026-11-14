import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "../api";
import { makeGradeSchema, type GradeForm } from "../schemas";
import { useFetch } from "../useFetch";
import { Card, ErrorBanner, PageTitle, Spinner, StatusBadge, fmtDateTime } from "../components/ui";
import type { SubmissionRow } from "../types";

function GradeRow({ row, onDone }: { row: SubmissionRow; onDone: () => void }) {
  const schema = useMemo(() => makeGradeSchema(row.max_marks), [row.max_marks]);
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<GradeForm>({
    resolver: zodResolver(schema),
    defaultValues: { marks_obtained: row.marks_obtained ?? NaN, remarks: row.remarks ?? "" },
  });

  async function onSubmit(v: GradeForm) {
    setServerError(null);
    try {
      await api.gradeTask(row.task_id, row.student_id, v.marks_obtained, v.remarks); // sp_grade_task
      onDone();
    } catch (e) {
      setServerError((e as Error).message);
    }
  }

  return (
    <tr className="border-t border-slate-100 align-top">
      <td className="px-3 py-2.5 font-medium">{row.student_name}</td>
      <td className="px-3 py-2.5"><StatusBadge status={row.status} /></td>
      <td className="px-3 py-2.5">{fmtDateTime(row.submission_time)}</td>
      <td colSpan={3} className="px-3 py-2.5">
        {row.status === "Pending" ? (
          <span className="text-slate-500">Not submitted yet</span>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-wrap items-start gap-2">
            <div>
              <input type="number" step="0.5" placeholder={`/ ${row.max_marks}`}
                className="w-24 rounded-lg border border-slate-300 px-2 py-1.5"
                {...register("marks_obtained", { valueAsNumber: true })} />
              {errors.marks_obtained && <p className="mt-1 text-xs text-red-600">{errors.marks_obtained.message}</p>}
            </div>
            <div>
              <input placeholder="Remarks" className="w-56 rounded-lg border border-slate-300 px-2 py-1.5"
                {...register("remarks")} />
              {errors.remarks && <p className="mt-1 text-xs text-red-600">{errors.remarks.message}</p>}
            </div>
            <button disabled={isSubmitting}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
              {row.status === "Graded" ? "Update grade" : "Grade"}
            </button>
            {serverError && <p className="w-full text-xs text-red-600">{serverError}</p>}
          </form>
        )}
      </td>
    </tr>
  );
}

export default function Grading() {
  const tasks = useFetch(() => api.tasks(), []);
  const [taskId, setTaskId] = useState<number | null>(null);
  const subs = useFetch(taskId ? () => api.taskSubmissions(taskId) : null, [taskId]);

  return (
    <>
      <PageTitle title="Submission & Grading" subtitle="Grade submitted work with marks and remarks (sp_grade_task)" />
      <ErrorBanner message={tasks.error ?? subs.error} />
      <select
        value={taskId ?? ""}
        onChange={(e) => setTaskId(e.target.value ? Number(e.target.value) : null)}
        className="mb-4 w-full max-w-xl rounded-lg border border-slate-300 px-3 py-2 text-sm"
      >
        <option value="">Select a task</option>
        {tasks.data?.map((t) => (
          <option key={t.task_id} value={t.task_id}>
            {t.course_code} - {t.title} (max {t.max_marks})
          </option>
        ))}
      </select>
      {subs.loading && !subs.data ? <Spinner /> : taskId && (
        <Card>
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase text-slate-600">
              <tr><th className="px-3 py-2.5">Student</th><th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5">Submitted at</th><th className="px-3 py-2.5" colSpan={3}>Marks and remarks</th></tr>
            </thead>
            <tbody>
              {subs.data?.map((r) => (
                <GradeRow key={`${r.submission_id}-${r.status}-${r.marks_obtained}`} row={r} onDone={subs.reload} />
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
