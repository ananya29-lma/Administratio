import { createFileRoute } from "@tanstack/react-router";
import {
  BarChart3,
  CalendarDays,
  CalendarClock,
  Layers3,
  FileCheck2,
  UsersRound,
  CalendarCheck,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
  Pie,
  PieChart,
} from "recharts";
import { pageHead } from "@/lib/seo";
import { UrgentClassesPredictionCard } from "@/components/app/UrgentClassesPredictionCard";
import { KpiCard } from "@/components/app/kit";
import { COURSE_GROUPS, courseCategoryName } from "@/lib/mock";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: pageHead("EduSphere Dashboard", "Your education management overview."),
  component: Dashboard,
});

const studentRecordTrend = [
  { month: "Jun", records: 650 },
  { month: "Jul", records: 720 },
  { month: "Aug", records: 690 },
  { month: "Sep", records: 810 },
  { month: "Oct", records: 770 },
  { month: "Nov", records: 900 },
];

const courseDistributionColors = ["#164e63", "#2a9d8f", "#397c9b", "#ba762b", "#218a68"];
const demoMultimediaStudentCount = 18;

function Dashboard() {
  const { data } = useStore();
  const todayLabel = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
    .format(new Date())
    .toUpperCase();
  const courseDistribution = Object.entries(
    data.students.reduce<Record<string, number>>(
      (distribution, student) => {
        const course = String(student.course ?? "").trim();
        const category = course ? courseCategoryName(course) : "Other";
        distribution[category] = (distribution[category] ?? 0) + 1;
        return distribution;
      },
      Object.fromEntries(COURSE_GROUPS.map(({ label }) => [label, 0])),
    ),
  ).map(([name, value]) => ({ name, value }));
  const multimediaCategory = courseDistribution.find(({ name }) => name === "Multimedia");
  if (multimediaCategory && multimediaCategory.value === 0) {
    multimediaCategory.value = demoMultimediaStudentCount;
  }
  const courseDistributionTotal = courseDistribution.reduce(
    (total, category) => total + category.value,
    0,
  );
  const pendingLeaveRequests = data.leaves.filter((request) => request.status === "Pending");
  const approvedLeaveCount = data.leaves.filter((request) => request.status === "Approved").length;
  return (
    <div className="es-dashboard">
      <section className="es-greeting">
        <div>
          <p className="es-eyebrow">{todayLabel}</p>
          <h1>
            Good Morning, Harshika! <span aria-hidden="true">👋</span>
          </h1>
          <p className="es-greeting-subtitle">Here’s what’s happening at EduSphere today.</p>
        </div>
      </section>

      <section className="es-metrics" aria-label="Key metrics">
        <KpiCard label="Total Students" value="1,248" change="5.2%" icon={UsersRound} tone="teal" />
        <KpiCard label="Active Batches" value="892" change="3.1%" icon={Layers3} tone="green" />
        <KpiCard
          label="Upcoming Classes"
          value="24"
          change="0%"
          icon={CalendarDays}
          tone="blue"
          flat
        />
        <KpiCard
          label="Total Certificates"
          value={data.certs.length.toLocaleString()}
          icon={FileCheck2}
          tone="teal"
        />
        <KpiCard
          label="Leave Approvals"
          value={approvedLeaveCount.toLocaleString()}
          icon={CalendarCheck}
          tone="green"
        />
      </section>

      <section className="es-middle-grid" aria-label="Academic overview">
        <article className="es-card es-academic-card">
          <div className="es-card-heading">
            <div className="es-title-wrap">
              <span className="es-heading-icon es-icon-teal">
                <BarChart3 size={19} />
              </span>
              <div>
                <h2>Students Record Trend</h2>
                <p>Student records by month</p>
              </div>
            </div>
          </div>
          <div className="es-chart-legend">
            <span>
              <i className="legend-blue" />
              Student Records
            </span>
          </div>
          <div className="es-area-chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={studentRecordTrend}
                margin={{ top: 8, right: 7, left: -18, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="studentRecordFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2A9D8F" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#A7E8D0" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#E2E8F0" strokeDasharray="4 5" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#64748B", fontSize: 11 }}
                />
                <YAxis
                  domain={[0, 1000]}
                  ticks={[0, 250, 500, 750, 1000]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#64748B", fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{
                    border: "1px solid #E2E8F0",
                    borderRadius: 12,
                    boxShadow: "0 8px 24px #17203314",
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "#172033", fontWeight: 700 }}
                />
                <Area
                  type="natural"
                  dataKey="records"
                  stroke="#2A9D8F"
                  strokeWidth={2.5}
                  fill="url(#studentRecordFill)"
                  dot={{ r: 3, fill: "#fff", strokeWidth: 2, stroke: "#2A9D8F" }}
                  activeDot={{ r: 5 }}
                  isAnimationActive
                  animationDuration={1200}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        <UrgentClassesPredictionCard />
      </section>

      <section
        className="es-dashboard-insights"
        aria-label="Leave requests and course distribution"
      >
        <article className="es-card es-leave-card">
          <div className="es-card-heading">
            <div className="es-title-wrap">
              <span className="es-heading-icon es-icon-orange">
                <CalendarClock size={19} />
              </span>
              <div>
                <h2>Leave Requests</h2>
                <p>{pendingLeaveRequests.length} pending approval</p>
              </div>
            </div>
          </div>
          {pendingLeaveRequests.length ? (
            <ul className="es-leave-request-list">
              {pendingLeaveRequests.slice(0, 4).map((request) => (
                <li key={String(request.id)}>
                  <span className="es-leave-request-dot" />
                  <span className="es-leave-request-copy">
                    <strong>{String(request.name ?? "Student")}</strong>
                    <small>
                      {String(request.category ?? "Leave")} · {Number(request.days ?? 1)}{" "}
                      {Number(request.days ?? 1) === 1 ? "day" : "days"}
                    </small>
                  </span>
                  <span className="es-leave-request-status">Pending</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="es-leave-empty">No pending leave requests.</p>
          )}
        </article>
        <article className="es-card es-distribution-card">
          <div className="es-card-heading">
            <div className="es-title-wrap">
              <span className="es-heading-icon es-icon-blue">
                <Layers3 size={19} />
              </span>
              <div>
                <h2>Course-wise Distribution</h2>
                <p>Students by course category</p>
              </div>
            </div>
          </div>
          {courseDistribution.length ? (
            <>
              <div className="es-distribution-content">
                <div className="es-distribution-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={courseDistribution}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={55}
                        outerRadius={82}
                        paddingAngle={2}
                        cornerRadius={5}
                        startAngle={90}
                        endAngle={-270}
                        stroke="#fff"
                        strokeWidth={1}
                        isAnimationActive
                        animationDuration={900}
                      >
                        {courseDistribution.map((category, index) => (
                          <Cell
                            key={category.name}
                            fill={courseDistributionColors[index % courseDistributionColors.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name) => [value, name]}
                        contentStyle={{
                          border: "1px solid #E2E8F0",
                          borderRadius: 12,
                          boxShadow: "0 8px 24px #17203314",
                          fontSize: 12,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div
                    className="es-distribution-total"
                    aria-label={`${courseDistributionTotal} students`}
                  >
                    <strong>{courseDistributionTotal.toLocaleString()}</strong>
                    <span>Students</span>
                  </div>
                </div>
                <ul className="es-distribution-legend">
                  {courseDistribution.map((category, index) => {
                    const percentage = courseDistributionTotal
                      ? ((category.value / courseDistributionTotal) * 100).toFixed(1)
                      : "0.0";
                    return (
                      <li key={category.name}>
                        <i
                          style={{
                            backgroundColor:
                              courseDistributionColors[index % courseDistributionColors.length],
                          }}
                        />
                        <span>{category.name}</span>
                        <strong>{percentage}%</strong>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </>
          ) : (
            <p className="es-distribution-empty">
              Course distribution will appear when students are added.
            </p>
          )}
        </article>
      </section>
    </div>
  );
}
