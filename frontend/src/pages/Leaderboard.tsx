import { Trophy } from "lucide-react";
import { api } from "../api";
import { useFetch } from "../useFetch";
import { Card, ErrorBanner, PageTitle, Spinner } from "../components/ui";

export default function Leaderboard() {
  const { data, error, loading } = useFetch(() => api.leaderboard(), []);

  return (
    <>
      <PageTitle title="Performance Leaderboard" subtitle="Ranked by average percentage, completed tasks and late submissions (v_leaderboard)" />
      <ErrorBanner message={error} />
      {loading && !data ? <Spinner /> : (
        <Card>
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase text-slate-600">
              <tr>
                {["Rank", "Student", "Average %", "Completed tasks", "Late submissions"].map((h) => (
                  <th key={h} className="px-3 py-2.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data?.map((r, i) => (
                <tr key={r.student_id} className="border-t border-slate-100">
                  <td className="px-3 py-2.5 font-bold">
                    {i === 0 ? <Trophy className="h-4 w-4 text-amber-500" /> : i + 1}
                  </td>
                  <td className="px-3 py-2.5 font-medium">{r.full_name}</td>
                  <td className="px-3 py-2.5">{r.avg_percentage.toFixed(2)}%</td>
                  <td className="px-3 py-2.5">{r.completed_tasks}</td>
                  <td className="px-3 py-2.5">{r.late_submissions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
