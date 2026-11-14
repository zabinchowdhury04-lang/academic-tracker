import type { ReactNode } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import type { Priority, Status } from "../types";

const statusStyle: Record<Status, string> = {
  Pending: "bg-amber-100 text-amber-800",
  Submitted: "bg-blue-100 text-blue-800",
  Late: "bg-red-100 text-red-800",
  Graded: "bg-emerald-100 text-emerald-800",
};

const priorityStyle: Record<Priority, string> = {
  Low: "bg-slate-100 text-slate-700",
  Medium: "bg-orange-100 text-orange-800",
  High: "bg-rose-100 text-rose-800",
};

export const StatusBadge = ({ status }: { status: Status }) => (
  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyle[status]}`}>{status}</span>
);

export const PriorityBadge = ({ priority }: { priority: Priority }) => (
  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${priorityStyle[priority]}`}>{priority}</span>
);

export const ErrorBanner = ({ message }: { message: string | null }) =>
  message ? (
    <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  ) : null;

export const Spinner = () => (
  <div className="flex items-center gap-2 py-6 text-slate-500">
    <Loader2 className="h-4 w-4 animate-spin" /> Loading...
  </div>
);

export const PageTitle = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <div className="mb-5">
    <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
    {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
  </div>
);

export const Card = ({ children }: { children: ReactNode }) => (
  <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">{children}</div>
);

export const fmtDate = (d: string | null) => (d ? d.slice(0, 10) : "-");
export const fmtDateTime = (d: string | null) => (d ? d.replace("T", " ").slice(0, 16) : "-");

export const daysText = (days: number) =>
  days < 0 ? `${Math.abs(days)} day(s) overdue` : days === 0 ? "Due today" : `${days} day(s) left`;
