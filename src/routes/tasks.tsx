import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { CalendarDays, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Clock, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ConfirmDialog, DataTable, FormDialog, KV, PageHeader, Panel, StatCard, StatusBadge, type Field } from "@/components/app/kit";
import { taskTimeError } from "@/lib/administration";
import { useCollection } from "@/lib/store";
import { STAFF, type Row } from "@/lib/mock";
import { fmtDate } from "@/lib/format";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/tasks")({
  head: pageHead("Task Assigning", "Assign and track faculty tasks on a weekly calendar."),
  component: TaskAssigning,
});

const STATUSES = ["Pending", "In Progress", "Completed"];
const PRIORITIES = ["Low", "Medium", "High"];
const HOURS = Array.from({ length: 10 }, (_, index) => index + 9);
const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function isoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function localDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

function mondayOf(date: Date) {
  const monday = new Date(date);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return monday;
}

function shiftDate(iso: string, days: number) {
  const date = localDate(iso);
  date.setDate(date.getDate() + days);
  return isoDate(date);
}

function hourLabel(hour: number) {
  const suffix = hour < 12 ? "AM" : "PM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:00 ${suffix}`;
}

function TaskAssigning() {
  const tasks = useCollection("tasks", "id");
  const [form, setForm] = useState<Row | null>(null);
  const [selectedTask, setSelectedTask] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => isoDate(new Date()));
  const [weekStart, setWeekStart] = useState(() => mondayOf(localDate(selectedDate)));
  const [selectedFaculty, setSelectedFaculty] = useState(STAFF[0]);

  const weekDates = WEEKDAYS.map((day, index) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + index);
    return { day, date: isoDate(date) };
  });

  const fields: Field[] = [
    { name: "title", label: "Task Title", required: true, full: true },
    {
      name: "assignee",
      label: "Assign to Faculty",
      type: "select",
      options: STAFF,
      required: true,
    },
    { name: "endTime", label: "End Time", type: "time", required: true, validate: (endTime, values) => taskTimeError(values.startTime, String(endTime ?? "")) },
    { name: "deadline", label: "Deadline", type: "date", required: true },
    { name: "description", label: "Task Description", type: "textarea", full: true },
    { name: "priority", label: "Priority", type: "select", options: PRIORITIES, required: true },
    { name: "status", label: "Status", type: "select", options: STATUSES, required: true },
  ];

  const openTaskForm = (date: string, startTime = "09:00", task?: Row) => {
    const startHour = Number(startTime.slice(0, 2));
    const endTime = `${String(Math.min(startHour + 1, 23)).padStart(2, "0")}:00`;
    setForm(task
      ? { ...task }
      : {
          id: tasks.nextId("TSK"),
          date,
          startTime,
          endTime,
          deadline: date,
          priority: "Medium",
          status: "Pending",
          workflowStatus: "Draft",
        });
  };

  const saveTask = (value: Row, workflowStatus: "Draft" | "Assigned") => {
    const record = { ...value, workflowStatus };
    const exists = tasks.rows.some((task) => task.id === value.id);
    if (exists) {
      tasks.update(value.id, record);
      toast.success(workflowStatus === "Assigned" ? "Task assigned" : "Draft saved");
    } else {
      tasks.add(record);
      toast.success(workflowStatus === "Assigned" ? "Task assigned" : "Draft saved");
    }
    setForm(null);
  };

  const assignedTasks = tasks.rows.filter((task) => task.workflowStatus !== "Draft");
  const drafts = tasks.rows.filter((task) => task.workflowStatus === "Draft");
  const pending = assignedTasks.filter((task) => task.status === "Pending").length;
  const inProgress = assignedTasks.filter((task) => task.status === "In Progress").length;
  const completed = assignedTasks.filter((task) => task.status === "Completed").length;

  const priorityStyle: Record<string, string> = {
    High: "border-red-300 bg-red-50 text-red-950 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100",
    Medium: "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100",
    Low: "border-blue-300 bg-blue-50 text-blue-950 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100",
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Task Assigning"
        description="Schedule and assign tasks to faculty."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Assigned Tasks" value={assignedTasks.length} icon={CalendarDays} />
        <StatCard label="Pending" value={pending} icon={Clock} tone="warning" />
        <StatCard label="In Progress" value={inProgress} icon={Pencil} />
        <StatCard label="Completed" value={completed} icon={CheckCircle2} tone="success" />
      </div>

      <Panel title="Faculty Task Calendar">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="icon" aria-label="Previous week" onClick={() => {
              setWeekStart((current) => { const next = new Date(current); next.setDate(next.getDate() - 7); return next; });
              setSelectedDate((current) => shiftDate(current, -7));
            }}><ChevronLeft className="h-4 w-4" /></Button>
            <Button type="button" variant="outline" size="icon" aria-label="Next week" onClick={() => {
              setWeekStart((current) => { const next = new Date(current); next.setDate(next.getDate() + 7); return next; });
              setSelectedDate((current) => shiftDate(current, 7));
            }}><ChevronRight className="h-4 w-4" /></Button>
            <p className="min-w-44 text-sm font-semibold">{fmtDate(weekDates[0].date)} – {fmtDate(weekDates[weekDates.length - 1].date)}</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            Faculty
            <Popover>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" aria-label={`Select faculty calendar, currently ${selectedFaculty}`} className="h-9 gap-2 font-normal text-foreground">
                  {selectedFaculty}
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64 p-1">
                <div role="listbox" aria-label="Faculty members">
                  {STAFF.map((faculty) => (
                    <button
                      key={faculty}
                      type="button"
                      role="option"
                      aria-selected={selectedFaculty === faculty}
                      onClick={() => setSelectedFaculty(faculty)}
                      className="flex w-full items-center justify-between rounded-sm px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                    >
                      {faculty}
                      {selectedFaculty === faculty && <Check className="h-4 w-4" />}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="overflow-x-auto rounded-md border bg-white text-slate-900 dark:bg-card dark:text-foreground">
          <div className="min-w-[980px]">
            <div className="grid grid-cols-[82px_repeat(6,minmax(125px,1fr))]">
              <div className="border-b border-r p-2" />
              {weekDates.map(({ day, date }) => (
                <button key={date} type="button" onClick={() => setSelectedDate(date)} className={`border-b border-r p-2 text-center last:border-r-0 hover:bg-slate-50 dark:hover:bg-muted ${date === selectedDate ? "bg-primary/5" : ""}`}>
                  <span className="block text-xs font-medium text-muted-foreground">{day.slice(0, 3)}</span>
                  <span className="mt-1 block text-sm font-semibold">{localDate(date).getDate()}</span>
                </button>
              ))}
              {HOURS.map((hour) => {
                const startTime = `${String(hour).padStart(2, "0")}:00`;
                return (
                  <div key={hour} className="contents">
                    <div className="min-h-20 border-b border-r px-2 pt-2 text-right text-[11px] text-muted-foreground">{hourLabel(hour)}</div>
                    {weekDates.map(({ date }) => {
                      const endTime = `${String(hour + 1).padStart(2, "0")}:00`;
                      const slotTasks = assignedTasks.filter((task) =>
                        task.assignee === selectedFaculty
                        && task.date === date
                        && String(task.startTime ?? "").slice(0, 2) === String(hour).padStart(2, "0"),
                      );
                      return (
                        <div key={`${date}-${hour}`} className={`group relative min-h-20 border-b border-r p-1 last:border-r-0 ${date === selectedDate ? "bg-primary/[0.025]" : ""}`}>
                          {slotTasks.length > 0 ? (
                            <div className="space-y-1">
                              {slotTasks.map((task) => (
                                <button key={task.id} type="button" onClick={() => setSelectedTask(task)} className={`w-full rounded-md border p-2 text-left text-xs shadow-sm transition hover:shadow ${priorityStyle[task.priority] ?? priorityStyle.Medium}`}>
                                  <span className="block truncate font-semibold">{task.title}</span>
                                  <span className="mt-0.5 block truncate">{task.assignee}</span>
                                  <span className="mt-1 block truncate text-[10px]">Due: {fmtDate(task.deadline)}</span>
                                  <span className="mt-1 flex flex-wrap items-center justify-between gap-1">
                                    <span className="font-mono text-[10px]">{task.startTime}–{task.endTime}</span>
                                    <TaskStatusBadge status={task.status} />
                                  </span>
                                </button>
                              ))}
                            </div>
                          ) : null}
                          {!slotTasks.length && (
                              <button type="button" aria-label={`Assign task ${date} ${startTime}`} onClick={() => openTaskForm(date, startTime)} className="absolute inset-0 flex h-full min-h-[76px] w-full items-center justify-center rounded-sm text-slate-300 opacity-0 transition hover:bg-slate-50 hover:text-primary focus-visible:bg-slate-50 focus-visible:opacity-100 group-hover:opacity-100 dark:hover:bg-muted">
                                <Plus className="h-4 w-4" />
                              </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
          {PRIORITIES.map((priority) => <span key={priority} className="flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-sm border ${priorityStyle[priority]}`} />{priority} priority</span>)}
          <span>Task status is shown inside each calendar block.</span>
        </div>
      </Panel>

      {drafts.length > 0 && (
        <Panel title={`Draft Tasks (${drafts.length})`}>
          <DataTable
            rows={drafts}
            searchKeys={["title", "assignee", "description"]}
            columns={[
              { key: "title", label: "Task Title", render: (task) => <span className="font-medium">{task.title || "Untitled draft"}</span> },
              { key: "assignee", label: "Faculty" },
              { key: "date", label: "Date", render: (task) => fmtDate(task.date) },
              { key: "actions", label: "Actions", sortable: false, render: (task) => <Button variant="outline" size="sm" onClick={() => openTaskForm(task.date || selectedDate, task.startTime || "09:00", task)}><Pencil className="mr-1.5 h-3.5 w-3.5" />Edit / Assign</Button> },
            ]}
          />
        </Panel>
      )}

      <FormDialog
        open={!!form}
        onOpenChange={(open) => !open && setForm(null)}
        title={form && tasks.rows.some((task) => task.id === form.id) ? (form.workflowStatus === "Draft" ? "Edit Draft Task" : "Edit Task") : "Assign Task"}
        description="Set the faculty assignment, assigned date, deadline, priority and status."
        fields={fields}
        initial={form ?? {}}
        onSubmit={(value) => saveTask(value, "Assigned")}
        submitLabel={form && tasks.rows.some((task) => task.id === form.id) ? "Update Task" : "Assign Task"}
        wide
        enterMovesNext
      />

      <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader><DialogTitle>{selectedTask?.title}</DialogTitle></DialogHeader>
          {selectedTask && <>
            <KV items={[
              ["Faculty", selectedTask.assignee],
              ["Date", fmtDate(selectedTask.date)],
              ["Time", `${selectedTask.startTime} – ${selectedTask.endTime}`],
              ["Deadline", fmtDate(selectedTask.deadline)],
              ["Priority", <StatusBadge key="priority" status={selectedTask.priority} />],
              ["Status", <TaskStatusBadge key="status" status={selectedTask.status} />],
              ["Description", selectedTask.description || "—"],
            ]} />
            <div className="flex flex-wrap justify-end gap-2 border-t pt-3">
              <Button variant="destructive" onClick={() => { setDeleting(selectedTask); setSelectedTask(null); }}><Trash2 className="mr-1.5 h-4 w-4" />Delete Task</Button>
              <Button onClick={() => { openTaskForm(selectedTask.date, selectedTask.startTime, selectedTask); setSelectedTask(null); }}><Pencil className="mr-1.5 h-4 w-4" />Edit / Update Status</Button>
            </div>
          </>}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        destructive
        title="Delete task?"
        description={`Delete "${deleting?.title}" from the task calendar?`}
        confirmLabel="Delete Task"
        onConfirm={() => {
          if (!deleting) return;
          tasks.remove(deleting.id);
          toast.success("Task deleted");
          setDeleting(null);
        }}
      />
    </div>
  );
}

function TaskStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Pending: "border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200",
    "In Progress": "border-blue-300 bg-blue-100 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200",
    Completed: "border-emerald-300 bg-emerald-100 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  };
  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${styles[status] ?? "border-border bg-muted text-muted-foreground"}`}>{status}</span>;
}
