import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Award, Download, Printer, Users, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, NativeSelect, PageHeader, Panel, StatCard, StatusBadge } from "@/components/app/kit";
import { useStore } from "@/lib/store";
import { COURSE_OPTION_GROUPS, COURSES, MONTHS, TODAY, type Row } from "@/lib/mock";
import { exportCSV, fmtDate, fmtINR } from "@/lib/format";
import { batchCategory, feeTotals, inDateRange } from "@/lib/administration";
import { CHART_COLORS, axis, tooltipStyle } from "@/lib/chart";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/reports")({
  head: pageHead("Reports & Analytics", "Analyze admissions, fee collections, leave requests and certificates by date and course."),
  component: Page,
});

function Page() {
  const { data } = useStore();
  const [from, setFrom] = useState(`${TODAY.slice(0, 4)}-01-01`);
  const [to, setTo] = useState(`${TODAY.slice(0, 4)}-12-31`);
  const [course, setCourse] = useState("");
  const [tab, setTab] = useState("admissions");
  const invalidRange = !!from && !!to && from > to;
  const matchesCourse = (r: Row) => !course || r.course === course;
  const admissions = data.admissions.filter((r) => matchesCourse(r) && inDateRange(r.admissionDate, from, to));
  const payments = data.payments.filter((r) => (!course || data.admissions.find((a) => a.appNo === r.appNo)?.course === course) && inDateRange(r.date, from, to));
  const leaves = data.leaves.filter((r) => matchesCourse(r) && inDateRange(r.submitted, from, to));
  const certs = data.certs.filter((r) => matchesCourse(r) && inDateRange(r.date, from, to));
  const totals = feeTotals(admissions);
  const monthly = MONTHS.map((month, i) => {
    const key = `${TODAY.slice(0, 4)}-${String(i + 1).padStart(2, "0")}`;
    return { month, admissions: admissions.filter((a) => a.admissionDate?.startsWith(key)).length };
  });
  const byCourse = COURSES.map((c) => ({ name: c.code, value: admissions.filter((a) => a.course === c.name).length })).filter((r) => r.value > 0);
  const rows = tab === "admissions"
    ? admissions.map((row) => ({ ...row, batch: batchCategory(row.batch, data.batches) }))
    : tab === "leave" ? leaves : certs;
  return (
    <div className="space-y-6">
      <PageHeader title="Reports & Analytics" actions={<><Button variant="outline" disabled={invalidRange || !rows.length} onClick={() => exportCSV(`${tab}-report.csv`, rows)}><Download className="mr-1.5 h-4 w-4" />Export CSV</Button><Button variant="outline" disabled={invalidRange} onClick={() => window.print()}><Printer className="mr-1.5 h-4 w-4" />Print Report</Button></>} />
      <div className="flex flex-wrap items-end gap-4 no-print"><div className="space-y-1.5"><Label htmlFor="report-from">From Date</Label><Input id="report-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div><div className="space-y-1.5"><Label htmlFor="report-to">To Date</Label><Input id="report-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div><div className="min-w-0 space-y-1.5"><Label htmlFor="report-course">Course</Label><NativeSelect id="report-course" value={course} onChange={setCourse} optionGroups={COURSE_OPTION_GROUPS} placeholder="All Courses" className="w-full sm:max-w-80" /></div></div>
      {invalidRange ? <p role="alert" className="text-sm text-destructive">To date cannot be before from date.</p> : <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4"><StatCard label="Admissions" value={admissions.length} icon={Users} /><StatCard label="Period Collections" value={fmtINR(payments.reduce((s, p) => s + p.amount, 0))} icon={Wallet} tone="success" /><StatCard label="Admission Balances" value={fmtINR(totals.outstanding)} icon={Wallet} tone="warning" /><StatCard label="Certificate Applications" value={certs.length} icon={Award} /></div>
      <div className="grid gap-4 xl:grid-cols-2"><Panel title="Monthly Admissions"><div className="h-64"><ResponsiveContainer><BarChart data={monthly}><CartesianGrid strokeDasharray="4 4" stroke="var(--border)" /><XAxis dataKey="month" tick={axis} axisLine={false} tickLine={false} /><YAxis tick={axis} axisLine={false} tickLine={false} allowDecimals={false} /><Tooltip {...tooltipStyle} /><Bar dataKey="admissions" name="Admissions" fill="var(--chart-1)" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></Panel><Panel title="Course-wise Admissions"><div className="h-64">{byCourse.length ? <ResponsiveContainer><PieChart><Pie data={byCourse} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={1} stroke="var(--card)" strokeWidth={3}>{byCourse.map((r, i) => <Cell key={r.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}</Pie><Tooltip {...tooltipStyle} /><Legend /></PieChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No admissions in this period</div>}</div></Panel></div>
      <Tabs value={tab} onValueChange={setTab}><TabsList className="flex h-auto w-fit flex-wrap"><TabsTrigger value="admissions">Admissions</TabsTrigger><TabsTrigger value="leave">Leave</TabsTrigger><TabsTrigger value="certificates">Certificates</TabsTrigger></TabsList></Tabs>
      <DataTable key={tab} rows={rows} searchKeys={["name", "regNo", "appNo", "id"]} columns={tab === "leave" ? [
        { key: "id", label: "Request No" }, { key: "name", label: "Student" }, { key: "course", label: "Course" }, { key: "start", label: "From", render: (r) => fmtDate(r.start) }, { key: "end", label: "To", render: (r) => fmtDate(r.end) }, { key: "days", label: "Days" }, { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ] : tab === "certificates" ? [
        { key: "id", label: "Application No" }, { key: "name", label: "Student" }, { key: "type", label: "Certificate Type" }, { key: "date", label: "Date", render: (r) => fmtDate(r.date) }, { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ] : [
        { key: "appNo", label: "Application No" }, { key: "name", label: "Student" }, { key: "regNo", label: "Reg. No" }, { key: "course", label: "Course" }, { key: "batch", label: "Batch" }, { key: "admissionDate", label: "Admission Date", render: (r) => fmtDate(r.admissionDate) },
      ]} />
      </>}
    </div>
  );
}
