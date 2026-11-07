import {
  BookOpen,
  Brain,
  Briefcase,
  CalendarDays,
  Calculator,
  CheckCircle2,
  Film,
} from "lucide-react";
import { fmtDate } from "@/lib/format";

export type AIPredictionCardProps = {
  department: string;
  currentModule: string;
  completedSessions: number;
  totalSessions: number;
  nextModule: string;
  nextStartDate: string;
  suggestedDays: string;
  suggestedTime: string;
  batchPattern: string;
  status: string;
};

const statusStyle: Record<string, string> = {
  "On Track": "border-[#A7E8D0] bg-[#E8F8F2] text-[#164E63]",
  "Almost Complete": "border-amber-200 bg-amber-100 text-amber-800",
  Delayed: "border-red-200 bg-red-100 text-red-800",
};
const departmentIcons = {
  AI: Brain,
  Multimedia: Film,
  Accounts: Calculator,
  Management: Briefcase,
};

function dateLabel(date: string) {
  return fmtDate(date);
}

export function AIPredictionCard({
  department,
  currentModule,
  completedSessions,
  totalSessions,
  nextModule,
  nextStartDate,
  suggestedDays,
  suggestedTime,
  batchPattern,
  status,
}: AIPredictionCardProps) {
  const percent =
    totalSessions > 0 ? Math.min(100, Math.round((completedSessions / totalSessions) * 100)) : 0;
  const time = suggestedTime
    .split(" – ")
    .map((value) => {
      const [hour, minute] = value.split(":").map(Number);
      return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`;
    })
    .join(" – ");
  const DepartmentIcon = departmentIcons[department as keyof typeof departmentIcons] ?? Brain;

  return (
    <section
      aria-label={`${department} AI prediction`}
      className={`es-ai-card es-ai-department-card es-ai-department-${department.toLowerCase()}`}
    >
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E8F8F2] text-[#164E63] sm:h-11 sm:w-11">
            <DepartmentIcon className="h-6 w-6" strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-bold leading-5">{department}</h2>
            <p className="mt-0.5 max-w-[340px] text-xs leading-4 text-[#64748B]">
              Based on current schedule, module progress and faculty availability.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">
          <span
            className={`inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 text-xs font-bold ${statusStyle[status] ?? statusStyle["On Track"]}`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.75} />
            {status}
          </span>
        </div>
      </header>

      <div className="mt-3 grid grid-cols-1 gap-3 min-[768px]:grid-cols-[1.4fr_0.9fr_1.15fr] min-[768px]:gap-x-2 min-[1280px]:mt-3 min-[1280px]:grid-cols-[1.55fr_0.9fr_1.15fr]">
        <div className="min-w-0">
          <p className="text-xs text-[#64748B]">Current Module</p>
          <p className="truncate text-sm font-semibold leading-5">{currentModule}</p>
          <div className="mt-1 flex items-center gap-2">
            <div className="h-2 min-w-10 flex-1 overflow-hidden rounded-full bg-white/15">
              <div
                className="es-ai-accent-progress h-full rounded-full"
                style={{ width: `${percent}%` }}
              />
            </div>
            <span className="es-ai-accent-text whitespace-nowrap text-[11px] font-semibold">
              {percent}% completed
            </span>
          </div>
          <p className="mt-0.5 text-[11px] leading-3 text-[#64748B]">
            ({completedSessions} of {totalSessions} sessions)
          </p>
        </div>

        <div className="min-w-0">
          <p className="text-xs text-[#64748B]">Next Module</p>
          <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold leading-5">
            <BookOpen className="es-ai-accent-icon h-4 w-4 shrink-0" strokeWidth={1.75} />
            {nextModule}
          </p>
          <p className="mt-0.5 text-[11px] leading-3 text-[#64748B]">
            Start from {dateLabel(nextStartDate)}
          </p>
        </div>

        <div className="min-w-0">
          <p className="text-xs text-[#64748B]">Suggested Next Batch Schedule</p>
          <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold leading-5">
            <CalendarDays className="es-ai-accent-icon h-4 w-4 shrink-0" strokeWidth={1.75} />
            {suggestedDays}
          </p>
          <p className="mt-0.5 text-[11px] leading-3 text-[#64748B]">
            ({time}) · For Batch: {batchPattern}
          </p>
        </div>
      </div>
    </section>
  );
}
