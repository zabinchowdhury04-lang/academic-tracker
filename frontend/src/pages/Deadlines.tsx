import { useState } from "react";
import { api } from "../api";
import { useSession } from "../session";
import { useFetch } from "../useFetch";
import { Card, ErrorBanner, PageTitle, PriorityBadge, Spinner, daysText, fmtDate } from "../components/ui";
import type { Priority } from "../types";

type Tab = "pending" | "upcoming" | "overdue";

interface Row {
  task_id: number;
  course_code: string;
  title: string;
  type_name: string;
  due_date: string;
  max_marks: number;
  priority: Priority;
  days: number;
}

async function load(tab: Tab, id: number): Promise<Row[]> {
  if (tab === "pending") {
    const r = await api.pending(id); // stored procedure sp_pending_tasks
    return r.map((x) => ({ ...x, days: x.days_left }));
  }
  if (tab === "upcoming") {
    const r = await api.upcoming(id); // view v_upcoming_deadlines
    return r.map((x) => ({ ...x, days: x.days_left ?? 0 }));
  }
  const r = await api.overdue(id); // view v_overdue_tasks
  return r.map((x) => ({ ...x, days: -(x.days_overdue ?? 0) }));
}

const tabs: { key: Tab; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "upcoming", label: "Upcoming" },
  { key: "overdue", label: "Overdue" },
];

export default function Deadlines() {
  const { studentId } = useSession();
  const [tab, setTab] = useState<Tab>("pending");
  const { data, error, loading } = useFetch(studentId ? () => load(tab, studentId) : null, [tab, studentId]);

  return (
    <>
      <PageTitle title="Deadline Intelligence" subtitle="Pending, upcoming and overdue work with days left" />
      <div className="mb-4 flex gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium ${
              tab === t.key ? "bg-indigo-600 text-white" : "bg-white text-slate-700 border border-slate-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <ErrorBanner message={error} />
      {loading && !data ? <Spinner /> : (
        <Card>
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase text-slate-600">
              <tr>
                {["Course", "Task", "Type", "Due date", "Time", "Max marks", "Priority"].map((h) => (
                  <th key={h} className="px-3 py-2.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data?.map((r) => (
                <tr key={r.task_id} className="border-t border-slate-100">
                  <td className="px-3 py-2.5 font-medium">{r.course_code}</td>
                  <td className="px-3 py-2.5">{r.title}</td>
                  <td className="px-3 py-2.5">{r.type_name}</td>
                  <td className="px-3 py-2.5">{fmtDate(r.due_date)}</td>
                  <td className={`px-3 py-2.5 ${r.days < 0 ? "font-medium text-red-600" : ""}`}>{daysText(r.days)}</td>
                  <td className="px-3 py-2.5">{r.max_marks}</td>
                  <td className="px-3 py-2.5"><PriorityBadge priority={r.priority} /></td>
                </tr>
              ))}
              {data?.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-500">Nothing here.</td></tr>
              )}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
