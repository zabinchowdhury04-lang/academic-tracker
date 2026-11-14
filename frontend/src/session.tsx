import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "./api";
import type { Student } from "./types";

export type Role = "student" | "instructor";

interface Session {
  role: Role;
  setRole: (r: Role) => void;
  students: Student[];
  studentId: number | null;
  setStudentId: (id: number) => void;
}

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>("student");
  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState<number | null>(null);

  useEffect(() => {
    api.students().then((list) => {
      setStudents(list);
      setStudentId((cur) => cur ?? list[0]?.student_id ?? null);
    }).catch(() => setStudents([]));
  }, []);

  return (
    <SessionContext.Provider value={{ role, setRole, students, studentId, setStudentId }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): Session {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}
