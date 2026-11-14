import { NavLink, Navigate, Route, Routes } from "react-router";
import { ClipboardList, Clock, GraduationCap, Trophy, PlusCircle, CheckSquare } from "lucide-react";
import { useSession } from "./session";
import Dashboard from "./pages/Dashboard";
import Deadlines from "./pages/Deadlines";
import CreateTask from "./pages/CreateTask";
import Grading from "./pages/Grading";
import Leaderboard from "./pages/Leaderboard";

const link = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
    isActive ? "bg-indigo-600 text-white" : "text-slate-700 hover:bg-slate-100"
  }`;

export default function App() {
  const { role, setRole, students, studentId, setStudentId } = useSession();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <div className="flex items-center gap-2 text-indigo-700">
            <GraduationCap className="h-6 w-6" />
            <span className="font-bold">Academic Tracker</span>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2 text-sm">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "student" | "instructor")}
              className="rounded-lg border border-slate-300 px-2 py-1.5"
            >
              <option value="student">Student</option>
              <option value="instructor">Instructor</option>
            </select>
            {role === "student" && (
              <select
                value={studentId ?? ""}
                onChange={(e) => setStudentId(Number(e.target.value))}
                className="rounded-lg border border-slate-300 px-2 py-1.5"
              >
                {students.map((s) => (
                  <option key={s.student_id} value={s.student_id}>{s.full_name}</option>
                ))}
              </select>
            )}
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl flex-wrap gap-1 px-4 pb-3">
          {role === "student" ? (
            <>
              <NavLink to="/" end className={link}><ClipboardList className="h-4 w-4" />Dashboard</NavLink>
              <NavLink to="/deadlines" className={link}><Clock className="h-4 w-4" />Deadlines</NavLink>
            </>
          ) : (
            <>
              <NavLink to="/create" className={link}><PlusCircle className="h-4 w-4" />Create Task</NavLink>
              <NavLink to="/grading" className={link}><CheckSquare className="h-4 w-4" />Grading</NavLink>
            </>
          )}
          <NavLink to="/leaderboard" className={link}><Trophy className="h-4 w-4" />Leaderboard</NavLink>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Routes>
          <Route path="/" element={role === "student" ? <Dashboard /> : <Navigate to="/create" replace />} />
          <Route path="/deadlines" element={<Deadlines />} />
          <Route path="/create" element={<CreateTask />} />
          <Route path="/grading" element={<Grading />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
