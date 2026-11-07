import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Users, UserCheck, CalendarPlus, Hourglass, CalendarCheck, Wallet, Award } from "lucide-react";
import { PageHeader, Panel, StatCard, StatusBadge } from "@/components/app/kit";
import { useStore } from "@/lib/store";
import { MONTHS, TODAY, feeStatus } from "@/lib/mock";
import { fmtDate, fmtINR } from "@/lib/format";
import { pageHead } from "@/lib/seo";
import { CHART_COLORS, axis, tooltipStyle } from "@/lib/chart";

export const Route = createFileRoute("/")({
  head: pageHead("Dashboard", "Overview of registrations, admissions, leave, fees and certificates."),
  component: Dashboard,
});

function Dashboard() {
  const { data } = useStore();
  const range = "This year";
  const month = TODAY.slice(0, 7);
  const enrolled = data.admissions.filter((a) => a.status === "Enrolled");

  const monthly = useMemo(() => {
    let cum = 0;
    return MONTHS.map((m, i) => {
      const key = `2026-${String(i + 1).padStart(2, "0")}`;
      const admissions = data.admissions.filter((a) => a.admissionDate?.startsWith(key)).length;
      cum += admissions;
      return { month: m, admissions, registrations: data.students.filter((s) => s.regDate.startsWith(key)).length, cumulative: cum };
    });
  }, [data]);
  const shown = range === "Last 6 months" ? monthly.slice(4, 10) : range === "This quarter" ? monthly.slice(9, 12) : monthly;

  const byCourse = Object.entries(data.admissions.reduce<Record<string, number>>((acc, a) => ((acc[a.course.split(" ").slice(0, 2).join(" ")] = (acc[a.course.split(" ").slice(0, 2).join(" ")] || 0) + 1), acc), {})).map(([name, value]) => ({ name, value }));
  const byBatch = data.batches.map((b) => ({ name: b.name.replace(" Morning", " AM").replace(" Evening", " PM"), students: data.admissions.filter((a) => a.batch === b.name).length }));
  const pending = data.admissions.reduce((s, a) => s + (a.fee - a.discount - a.paid), 0);

  const pendingLeaves = data.leaves.filter((l) => l.status === "Pending");
  const pendingCerts = data.certs.filter((c) => !["Issued", "Rejected"].includes(c.status));

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard"
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total Application" value={data.students.length} icon={Users} />
        <StatCard label="Admissions This Month" value={data.admissions.filter((a) => a.admissionDate?.startsWith(month)).length} icon={CalendarPlus} tone="success" />
        <StatCard label="Active Students" value={enrolled.length} icon={UserCheck} tone="success" />
        <StatCard label="Pending Admission Applications" value={data.admissions.filter((a) => ["Submitted", "Under Review"].includes(a.status)).length} icon={Hourglass} tone="warning" />
        <StatCard label="Pending Leave Requests" value={pendingLeaves.length} icon={CalendarCheck} tone="warning" />
        <StatCard label="Pending Fee Payments" value={data.admissions.filter((a) => feeStatus(a) !== "Paid").length} icon={Wallet} hint={fmtINR(pending) + " outstanding"} tone="danger" />
        <StatCard label="Pending Certificates" value={pendingCerts.length} icon={Award} tone="warning" />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title="Month-wise Admission Counts (2026)" className="xl:col-span-2">
          <div className="h-64">
            <ResponsiveContainer><BarChart data={shown}><CartesianGrid strokeDasharray="4 4" stroke="var(--border)" /><XAxis dataKey="month" tick={axis} axisLine={false} tickLine={false} /><YAxis tick={axis} axisLine={false} tickLine={false} allowDecimals={false} /><Tooltip {...tooltipStyle} cursor={{ fill: "var(--muted)" }} /><Bar dataKey="admissions" name="Admissions" fill="var(--chart-1)" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Course-wise Distribution">
          <div className="h-64">
            <ResponsiveContainer><PieChart><Pie data={byCourse} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={1} stroke="var(--card)" strokeWidth={3}>{byCourse.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % 6]} />)}</Pie><Tooltip {...tooltipStyle} /><Legend wrapperStyle={{ fontSize: 11 }} /></PieChart></ResponsiveContainer>
          </div>
        </Panel>
        <div className="grid gap-4 xl:col-span-3 xl:grid-cols-2">
          <Panel title="Admission Trend (cumulative)">
            <div className="h-56">
              <ResponsiveContainer><LineChart data={shown}><CartesianGrid strokeDasharray="4 4" stroke="var(--border)" /><XAxis dataKey="month" tick={axis} axisLine={false} tickLine={false} /><YAxis tick={axis} axisLine={false} tickLine={false} /><Tooltip {...tooltipStyle} /><Line dataKey="cumulative" name="Total admissions" stroke="var(--chart-2)" strokeWidth={2.5} dot={{ r: 3.5, strokeWidth: 2, fill: "var(--card)" }} /><Line dataKey="registrations" name="Application" stroke="var(--chart-4)" strokeWidth={2.5} dot={{ r: 3.5, strokeWidth: 2, fill: "var(--card)" }} /></LineChart></ResponsiveContainer>
            </div>
          </Panel>
          <Panel title="Batch-wise Student Count">
            <div className="h-56">
              <ResponsiveContainer><BarChart data={byBatch} layout="vertical" margin={{ left: 20 }}><XAxis type="number" tick={axis} axisLine={false} tickLine={false} /><YAxis type="category" dataKey="name" tick={axis} width={110} axisLine={false} tickLine={false} /><Tooltip {...tooltipStyle} cursor={{ fill: "var(--muted)" }} /><Bar dataKey="students" fill="var(--chart-2)" radius={[0, 6, 6, 0]} /></BarChart></ResponsiveContainer>
            </div>
          </Panel>
        </div>
      </div>

    </div>
  );
}
