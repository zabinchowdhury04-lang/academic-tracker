import { useState } from "react";
import { Send } from "lucide-react";
import { api } from "../api";
import { useSession } from "../session";
import { useFetch } from "../useFetch";
import {
  Card, ErrorBanner, PageTitle, PriorityBadge, Spinner, StatusBadge, daysText, fmtDate,
} from "../components/ui";

export default function Dashboard() {
  const { studentId } = useSession();
  const { data, error, loading, reload } = useFetch(
    studentId ? () => api.studentTasks(studentId) : null,
    [studentId],
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function submit(taskId: number) {
    if (!studentId) return;
    setBusyId(taskId);
    setActionError(null);
    try {
      await api.submitTask(taskId, studentId);
      reload();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <PageTitle title="Student Task Dashboard" subtitle="All tasks of your enrolled courses, sorted by due date" />
      <ErrorBanner message={error ?? actionError} />
      {loading && !data ? <Spinner /> : (
        <Card>
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase text-slate-600">
              <tr>
                {["Course", "Task", "Type", "Due date", "Max marks", "Priority", "Status", "Marks", ""].map((h) => (
                  <th key={h} className="px-3 py-2.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data?.map((t) => (
                <tr key={t.task_id} className="border-t border-slate-100">
                  <td className="px-3 py-2.5 font-medium">{t.course_code}</td>
                  <td className="px-3 py-2.5">
                    {t.title}
                    {t.remarks && <div className="text-xs text-slate-500">Remark: {t.remarks}</div>}
                  </td>
                  <td className="px-3 py-2.5">{t.type_name}</td>
                  <td className="px-3 py-2.5">
                    {fmtDate(t.due_date)}
                    {t.status === "Pending" && <div className="text-xs text-slate-500">{daysText(t.days_left)}</div>}
                  </td>
                  <td className="px-3 py-2.5">{t.max_marks}</td>
                  <td className="px-3 py-2.5"><PriorityBadge priority={t.priority} /></td>
                  <td className="px-3 py-2.5"><StatusBadge status={t.status} /></td>
                  <td className="px-3 py-2.5">{t.marks_obtained ?? "-"}</td>
                  <td className="px-3 py-2.5">
                    {t.status === "Pending" && (
                      <button
                        onClick={() => submit(t.task_id)}
                        disabled={busyId === t.task_id}
                        className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                      >
                        <Send className="h-3.5 w-3.5" /> Submit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {data?.length === 0 && (
                <tr><td colSpan={9} className="px-3 py-6 text-center text-slate-500">No tasks found.</td></tr>
              )}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
