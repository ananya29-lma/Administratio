/* Sample data for the Student Administration UI. All values are fictional. */
export type Row = Record<string, any>;

let seed = 42;
const rnd = () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};
const pick = <T,>(a: T[]): T => a[Math.floor(rnd() * a.length)];
const int = (min: number, max: number) => Math.floor(rnd() * (max - min + 1)) + min;
const pad = (n: number, l = 4) => String(n).padStart(l, "0");
export const TODAY = "2026-10-16";
const addDays = (iso: string, d: number) => {
  const t = new Date(iso + "T00:00:00Z");
  t.setUTCDate(t.getUTCDate() + d);
  return t.toISOString().slice(0, 10);
};
export { addDays };

const courseFeeTemplates = [
  { duration: "12 Months", registration: 1000, admission: 2500, tuition: 32000, exam: 2000, other: 1500, installments: true },
  { duration: "6 Months", registration: 1000, admission: 3000, tuition: 42000, exam: 2500, other: 1500, installments: true },
  { duration: "4 Months", registration: 1000, admission: 2000, tuition: 28000, exam: 2000, other: 1000, installments: true },
  { duration: "3 Months", registration: 500, admission: 1000, tuition: 9500, exam: 1000, other: 500, installments: false },
  { duration: "6 Months", registration: 1000, admission: 2500, tuition: 26000, exam: 1500, other: 2000, installments: true },
  { duration: "3 Months", registration: 500, admission: 500, tuition: 7000, exam: 500, other: 500, installments: false },
];

const courseCategorySeeds = [
  {
    category: "AI COURSE",
    codePrefix: "AI",
    names: [
      "Master's in Gen AI & Agentic AI",
      "Master's in AI Big Data & Advance MLOps",
      "Advanced Data Science",
      "Certificate in Big Data",
      "Expertise in Cyber Security",
      "Certificate in Data Security",
      "Advanced Product Management",
    ],
  },
  {
    category: "MULTIMEDIA",
    codePrefix: "MM",
    names: [
      "AI Integrated Graphic Design",
      "AI Integrated Video Editing & VFX",
      "Animation & VFX",
      "Film Production",
      "Performance Marketing & Social Media Marketing",
      "Certificate in Digital Marketing",
      "Diploma in 3D Animation & Visual Effects",
      "Auto Desk, Maya",
      "After Effect",
      "Adobe Premier",
      "Adobe Photoshop",
      "Adobe Illustrator",
      "Corel Draw",
    ],
  },
  {
    category: "MANAGEMENT",
    codePrefix: "MG",
    names: [
      "Business & Entrepreneurship",
      "Sales & Business Development",
      "Marketing & Growth",
      "Finance & Accounting",
      "People & Operations",
      "Product Management",
    ],
  },
  {
    category: "UG & PG",
    codePrefix: "UG",
    names: ["BCA", "BBA", "BCom", "BA", "MBA", "MCA", "MCom", "MA"],
  },
  {
    category: "OFFICE AUTOMATION & PROGRAMMING DEPARTMENT",
    codePrefix: "OP",
    names: [
      "Advance Diploma in Computer Application",
      "Python",
      "C & C++",
      "C++",
      "Advanced Excel",
      "MS Excel",
      "Zoho Books",
      "Power BI",
      "Tableau",
    ],
  },
  {
    category: "ACCOUNTING DEPARTMENT",
    codePrefix: "AC",
    names: ["AI in Accounting", "Manual + SAP", "Manual + Tally", "SAP FICO", "Tally"],
  },
];

export const COURSE_CATEGORIES = courseCategorySeeds.map(({ category, codePrefix, names }) => ({
  category,
  codePrefix,
  names,
}));

const courseEntries = COURSE_CATEGORIES.flatMap(({ category, codePrefix, names }) =>
  names.map((name, index) => ({ code: `${codePrefix}-${pad(index + 1, 2)}`, name })),
);

export const COURSES: Row[] = courseEntries.map((course, index) => {
  const fees = courseFeeTemplates[index % courseFeeTemplates.length];
  return { ...course, ...fees, total: fees.registration + fees.admission + fees.tuition + fees.exam + fees.other };
});

export const COURSE_OPTION_GROUPS = COURSE_CATEGORIES.map(({ category, names }) => ({
  label: category,
  options: names,
}));

export const courseFee = (name: string) => COURSES.find((c) => c.name === name)?.total ?? 0;

const instructors = ["Ramesh Kumar", "Priya Natarajan", "Arun Prakash", "Lakshmi Iyer", "Vikram Sethi", "Divya Menon"];
const rooms = ["Lab A", "Lab B", "Lab C", "Room 101", "Room 102", "Design Studio"];

export const INITIAL_BATCHES: Row[] = [
  { courseIndex: 0, type: "Morning", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], start: "09:00", end: "11:00" },
  { courseIndex: 1, type: "Evening", days: ["Mon", "Wed", "Fri"], start: "17:00", end: "19:00" },
  { courseIndex: 2, type: "Morning", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], start: "10:00", end: "13:00" },
  { courseIndex: 3, type: "Weekend", days: ["Sat", "Sun"], start: "09:00", end: "14:00" },
  { courseIndex: 4, type: "Afternoon", days: ["Tue", "Thu", "Sat"], start: "14:00", end: "16:30" },
  { courseIndex: 5, type: "Morning", days: ["Mon", "Wed", "Fri"], start: "08:00", end: "09:30" },
  { courseIndex: 6, type: "Afternoon", days: ["Mon", "Tue", "Thu"], start: "13:30", end: "16:00" },
  { courseIndex: 7, type: "Evening", days: ["Tue", "Thu"], start: "18:00", end: "19:30" },
].map(({ courseIndex, type, days, start, end }, i) => ({
  id: `B-${COURSES[courseIndex].code}-${type === "Morning" ? "M" : type === "Evening" ? "E" : type === "Weekend" ? "W" : "A"}1`,
  name: `${COURSES[courseIndex].name} · ${type}`,
  course: COURSES[courseIndex].name,
  startDate: addDays("2026-01-05", i * 31),
  endDate: addDays("2026-01-05", i * 31 + 180),
  days, startTime: start, endTime: end, instructor: instructors[i % 6], room: rooms[i % 6], capacity: pick([25, 30, 35]),
  status: i === 0 ? "Completed" : i === 7 ? "Upcoming" : "Active",
}));

const first = ["Aarav", "Diya", "Karthik", "Meera", "Rohan", "Sneha", "Arjun", "Ananya", "Vishal", "Kavya", "Rahul", "Pooja", "Siddharth", "Nisha", "Harish", "Ishita", "Manoj", "Divya", "Naveen", "Shruti", "Gokul", "Priyanka", "Ajay", "Swathi"];
const last = ["Sharma", "Reddy", "Iyer", "Nair", "Patel", "Krishnan", "Gupta", "Menon", "Rao", "Pillai", "Verma", "Subramanian"];
const quals = ["10th Standard", "12th Standard", "B.Com", "B.Sc Computer Science", "BCA", "B.A English", "Diploma (EEE)", "MBA"];
const sources = ["Walk-in", "Website", "Social Media", "Friend Referral", "Newspaper Ad", "Alumni"];
const portraitHair = ["#3f2a1d", "#1f2937", "#6b3f26", "#4b3024", "#263238", "#51351d"];

function sampleStudentPortrait(index: number) {
  const background = `hsl(${(index * 47) % 360} 70% 92%)`;
  const shirt = `hsl(${(index * 67 + 205) % 360} 65% 45%)`;
  const hair = portraitHair[index % portraitHair.length];
  const hairStyle = index % 3;
  const hairShape = hairStyle === 0
    ? `<path d="M43 53c-2-24 11-39 33-39 24 0 39 15 37 41l-8 12H52z" fill="${hair}"/>`
    : hairStyle === 1
      ? `<path d="M43 54c-1-26 13-40 34-40 19 0 34 12 36 34l-14-9-9-13c-9 9-23 14-47 15z" fill="${hair}"/>`
      : `<path d="M42 57c0-28 13-43 35-43 21 0 36 15 36 42l-8 11H51z" fill="${hair}"/><path d="M48 31c8 6 18 8 31 5" fill="none" stroke="${hair}" stroke-width="8" stroke-linecap="round"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><rect width="160" height="160" rx="18" fill="${background}"/><path d="M20 160c5-32 25-48 60-48s55 16 60 48" fill="${shirt}"/><path d="M61 103h38v20H61z" fill="#a96f4f"/><ellipse cx="80" cy="68" rx="34" ry="40" fill="#c98f6b"/>${hairShape}<path d="M63 69h4m26 0h4" stroke="#3b2b26" stroke-width="4" stroke-linecap="round"/><path d="M72 87c5 4 11 4 16 0" fill="none" stroke="#7b3f35" stroke-width="3" stroke-linecap="round"/><path d="M48 61c-7-4-10 0-8 8 2 6 5 9 10 8m60-16c7-4 10 0 8 8-2 6-5 9-10 8" fill="#c98f6b"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export const INITIAL_STUDENTS: Row[] = Array.from({ length: 52 }, (_, i) => {
  const name = `${first[i % first.length]} ${pick(last)}`;
  const batch = pick(INITIAL_BATCHES);
  const regDate = `2026-${pad(int(1, 10), 2)}-${pad(int(1, 28), 2)}`;
  return {
    regNo: `APP-2026-${pad(1001 + i)}`, name, photoUrl: sampleStudentPortrait(i), dob: `${int(1996, 2008)}-${pad(int(1, 12), 2)}-${pad(int(1, 28), 2)}`,
    gender: pick(["Male", "Female"]), mobile: `9${int(100000000, 999999999)}`, email: `${name.split(" ")[0].toLowerCase()}${i}@mail.com`,
    address: `${int(1, 200)}, ${pick(["Anna Nagar", "T. Nagar", "Velachery", "Adyar", "Tambaram"])}, Chennai`,
    guardian: `${pick(["Suresh", "Mahesh", "Lakshmi", "Ravi", "Geetha"])} ${name.split(" ")[1]}`, guardianMobile: `9${int(100000000, 999999999)}`,
    qualification: pick(quals), prevInstitution: pick(["Govt. Hr. Sec. School", "St. Joseph's College", "DAV School", "Loyola College", "SRM University"]),
    course: batch.course, batch: batch.name, regDate, source: pick(sources), remarks: "",
    feePlanPreferred: COURSES.find((course) => course.name === batch.course)?.installments && i % 2 === 0 ? "Installment" : "Full Payment",
  };
}).sort((a, b) => b.regDate.localeCompare(a.regDate));

const admStatuses = ["Enrolled", "Enrolled", "Enrolled", "Approved", "Under Review", "Submitted", "Draft", "Rejected"];
export const INITIAL_ADMISSIONS: Row[] = INITIAL_STUDENTS.slice(0, 46).map((s, i) => {
  const fee = courseFee(s.course);
  const discount = pick([0, 0, 1000, 2000, 5000]);
  const paid = Math.min(fee - discount, pick([0, 5000, 10000, 15000, fee - discount]));
  return {
    appNo: `APP-2026-${pad(501 + i)}`, regNo: s.regNo, name: s.name, mobile: s.mobile, course: s.course, batch: s.batch,
    appDate: addDays(s.regDate, int(1, 6)), admissionDate: addDays(s.regDate, int(5, 12)), startDate: addDays(s.regDate, int(14, 25)),
    type: pick(["Regular", "Regular", "Scholarship", "Corporate"]), duration: COURSES.find((c) => c.name === s.course)?.duration,
    fee, discount, paid, status: admStatuses[i % admStatuses.length], remarks: "",
    docs: { photo: true, id: true, marksheet: rnd() > 0.2, transfer: rnd() > 0.5 },
  };
});
export const feeStatus = (a: Row) => {
  const bal = a.fee - a.discount - a.paid;
  if (bal <= 0) return "Paid";
  if (a.paid === 0) return "Unpaid";
  return a.dueDate && a.dueDate < TODAY ? "Overdue" : "Partially Paid";
};
INITIAL_ADMISSIONS.forEach((a, i) => (a.dueDate = addDays(TODAY, i % 4 === 0 ? -int(3, 20) : int(3, 40))));

export const INITIAL_PAYMENTS: Row[] = INITIAL_ADMISSIONS.filter((a) => a.paid > 0).map((a, i) => ({
  receiptNo: `RCP-${pad(7001 + i)}`, appNo: a.appNo, name: a.name, regNo: a.regNo, date: a.admissionDate, amount: a.paid,
  method: pick(["Cash", "UPI", "Card", "Bank Transfer"]), reference: `TXN${int(100000, 999999)}`, component: "Tuition Fee", installment: 1, remarks: "",
}));

const enrolled = () => pick(INITIAL_STUDENTS.slice(0, 40));
const reasons = ["Family function", "Medical – fever", "Out-of-town travel", "University exam", "Personal work", "Sibling's wedding"];
export const INITIAL_LEAVES: Row[] = Array.from({ length: 18 }, (_, i) => {
  const s = enrolled();
  const start = addDays(TODAY, int(-30, 10));
  const days = int(1, 5);
  return { id: `LR-${pad(301 + i)}`, name: s.name, regNo: s.regNo, course: s.course, batch: s.batch, start, end: addDays(start, days - 1), days,
    reason: pick(reasons), category: pick(["Medical", "Personal", "Academic", "Family"]), submitted: addDays(start, -int(1, 4)),
    status: i < 6 ? "Pending" : pick(["Approved", "Approved", "Rejected"]), remarks: "" };
});

export const INITIAL_LATE: Row[] = Array.from({ length: 10 }, (_, i) => {
  const s = enrolled();
  const b = INITIAL_BATCHES.find((x) => x.name === s.batch)!;
  return { id: `LPR-${pad(101 + i)}`, name: s.name, regNo: s.regNo, course: s.course, batch: s.batch, date: addDays(TODAY, -i),
    timing: `${b.startTime} – ${b.endTime}`, arrival: b.startTime.replace(/:00$/, ":30"), reason: pick(["Bus delay", "Heavy traffic", "Medical appointment", "Rain"]),
    grantedBy: pick(["Admin Office", "Batch Coordinator"]), remarks: "Allowed", issueTime: b.startTime.replace(/:00$/, ":35") };
});

export const INITIAL_OUTGOING: Row[] = Array.from({ length: 10 }, (_, i) => {
  const s = enrolled();
  return { id: `OGS-${pad(201 + i)}`, name: s.name, regNo: s.regNo, course: s.course, batch: s.batch, date: addDays(TODAY, -i),
    outTime: pick(["11:15", "12:00", "15:30"]), returnTime: pick(["12:30", "13:30", "16:30"]), reason: pick(["Bank work", "Doctor visit", "Collect documents", "Parent pickup"]),
    guardianApproval: pick(["Yes", "Not Required"]), grantedBy: "Admin Office", actualReturn: i < 3 ? "" : "13:20", status: i < 3 ? "Out" : "Returned" };
});

export const INITIAL_ABSENCES: Row[] = Array.from({ length: 9 }, (_, i) => {
  const s = INITIAL_STUDENTS[i * 4 + 2];
  const days = int(7, 21);
  const status = ["Contact Required", "Monitoring", "Follow-up Scheduled", "Contact Required", "Returned", "Resolved", "Monitoring", "Follow-up Scheduled", "Contact Required"][i];
  return { id: `ABS-${pad(41 + i)}`, name: s.name, regNo: s.regNo, course: s.course, batch: s.batch, guardianMobile: s.guardianMobile,
    lastAttendance: addDays(TODAY, -days), days, lastFollowUp: addDays(TODAY, -int(1, 5)), nextFollowUp: addDays(TODAY, int(-1, 4)),
    status, studentStatus: status === "Returned" || status === "Resolved" ? "Attending" : "Absent", flaggedOn: addDays(TODAY, -int(0, 6)),
    returnDate: status === "Returned" || status === "Resolved" ? addDays(TODAY, -1) : "",
    history: [{ date: addDays(TODAY, -days + 7), note: "Flagged automatically after 7 consecutive absent days (sample rule)." },
      { date: addDays(TODAY, -int(1, 5)), note: "Called guardian. " + pick(["No response.", "Student unwell, expected back next week.", "Will visit office."]) }] };
});

const staff = ["Priyanka (AI)", "Anvitha (Multimedia)", "Harshika (Accounts)", "Pooja (Management)"];
export const STAFF = staff;

const currentWeekDate = (dayOffset: number) => {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7) + dayOffset);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1, 2)}-${pad(date.getDate(), 2)}`;
};
const todayWeekOffset = (new Date().getDay() + 6) % 7;
export const INITIAL_SCHEDULED_CLASSES: Row[] = [];

export const INITIAL_TASKS: Row[] = [
  { id: "TSK-0005", title: "Prepare today's class materials", assignee: STAFF[2], date: currentWeekDate(todayWeekOffset), startTime: "09:00", endTime: "11:00", deadline: currentWeekDate(todayWeekOffset), description: "Prepare the learning materials for today's scheduled classes.", priority: "High", status: "Pending", workflowStatus: "Assigned" },
  { id: "TSK-0006", title: "Review today's student work", assignee: STAFF[3], date: currentWeekDate(todayWeekOffset), startTime: "11:00", endTime: "13:00", deadline: currentWeekDate(todayWeekOffset), description: "Review student work and prepare feedback.", priority: "Medium", status: "In Progress", workflowStatus: "Assigned" },
  { id: "TSK-0001", title: "Prepare weekly lesson plan", assignee: STAFF[0], date: currentWeekDate(0), startTime: "09:00", endTime: "10:00", deadline: currentWeekDate(2), description: "Prepare and share the lesson plan for this week's classes.", priority: "High", status: "Pending", workflowStatus: "Assigned" },
  { id: "TSK-0002", title: "Review student assignments", assignee: STAFF[1], date: currentWeekDate(1), startTime: "11:00", endTime: "12:00", deadline: currentWeekDate(3), description: "Review submitted assignments and record feedback.", priority: "Medium", status: "In Progress", workflowStatus: "Assigned" },
  { id: "TSK-0003", title: "Update course materials", assignee: STAFF[2], date: currentWeekDate(2), startTime: "14:00", endTime: "15:00", deadline: currentWeekDate(4), description: "Update the course materials for the next class.", priority: "Low", status: "Completed", workflowStatus: "Assigned" },
  { id: "TSK-0004", title: "Coordinate practical session", assignee: STAFF[3], date: currentWeekDate(4), startTime: "16:00", endTime: "17:00", deadline: currentWeekDate(5), description: "Confirm the resources needed for the practical session.", priority: "Medium", status: "Pending", workflowStatus: "Assigned" },
];

export const CERT_TYPES = ["Course Completion Certificate", "Bonafide Certificate", "Study Certificate", "Character Certificate", "Transfer Certificate", "Course Participation Certificate", "Fee Payment Certificate", "Other"];
export const CERT_STATUSES = ["Submitted", "Under Verification", "Awaiting Documents", "Awaiting Fee Clearance", "Approved", "Ready for Collection", "Issued", "Rejected", "Pending"];
export const INITIAL_CERTS: Row[] = Array.from({ length: 14 }, (_, i) => {
  const a = INITIAL_ADMISSIONS[i * 2];
  return { id: `CRT-${pad(601 + i)}`, date: addDays(TODAY, -int(1, 30)), name: a.name, regNo: a.regNo, appNo: a.appNo, course: a.course, batch: a.batch,
    type: CERT_TYPES[i % 7], purpose: pick(["Higher studies", "Job application", "Bank loan", "Passport", "Personal record"]), admissionDate: a.admissionDate,
    completion: pick(["Completed", "In Progress"]), feeStatus: feeStatus(a) === "Paid" ? "Cleared" : "Pending", mobile: a.mobile, delivery: pick(["Collect in person", "Courier", "Email (scanned)"]),
    verification: pick(["Verified", "Pending"]), staff: pick(staff), expected: addDays(TODAY, int(-2, 10)), status: CERT_STATUSES[i % 8], remarks: "" };
});

export const INITIAL_AGREEMENTS: Row[] = INITIAL_ADMISSIONS.slice(0, 8).map((a, i) => ({
  id: `AGR-${pad(401 + i)}`, name: a.name, regNo: a.regNo, course: a.course, batch: a.batch, date: a.admissionDate,
  studentSign: i < 6 ? a.name : "", guardianSign: i < 5 ? "Guardian" : "", verifiedBy: i < 4 ? STAFF[2] : "",
  accepted: i < 6, status: i < 4 ? "Completed" : i < 6 ? "Accepted" : "Pending",
}));

export const INITIAL_SLIPS: Row[] = INITIAL_ADMISSIONS.filter((a) => a.status === "Enrolled").slice(0, 10).map((a, i) => {
  const b = INITIAL_BATCHES.find((x) => x.name === a.batch)!;
  return { id: `CSS-${pad(801 + i)}`, name: a.name, regNo: a.regNo, appNo: a.appNo, course: a.course, duration: a.duration, startDate: a.startDate,
    batch: a.batch, timing: `${b.startTime} – ${b.endTime}`, room: b.room, instructor: b.instructor, feeStatus: feeStatus(a), issued: addDays(a.startDate, -2),
    instructions: "Report 15 minutes before batch time. Carry ID card and this slip on day one." };
});

export const INITIAL_COURSE_COMPLETIONS: Row[] = INITIAL_ADMISSIONS
  .filter((admission) => admission.status === "Enrolled")
  .slice(0, 8)
  .map((admission, i) => ({
    id: `CPS-${pad(1 + i)}`,
    name: admission.name,
    regNo: admission.regNo,
    appNo: admission.appNo,
    course: admission.course,
    completionDate: addDays(TODAY, -i - 1),
    signedBy: STAFF[i % STAFF.length],
    remarks: ["Successfully completed all course requirements.", "Coursework and final assessment completed."][i % 2],
  }));

const sampleSlipAdmissions = INITIAL_ADMISSIONS.filter((admission) => admission.status === "Enrolled").slice(0, 6);
const sampleSlipTracks = ["MWF", "TTS", "MTWTFS"];

export const INITIAL_COURSE_CHANGES: Row[] = sampleSlipAdmissions.map((admission, i) => {
  const courseIndex = COURSES.findIndex((course) => course.name === admission.course);
  return {
    id: `CCS-${pad(401 + i)}`,
    name: admission.name,
    regNo: admission.regNo,
    currentCourse: admission.course,
    newCourse: COURSES[(courseIndex + 1) % COURSES.length].name,
    date: addDays(TODAY, -i - 1),
    reason: ["Schedule preference", "Career goal change", "Requested course transfer"][i % 3],
    signedBy: STAFF[i % STAFF.length],
  };
});

export const INITIAL_COURSE_RESTARTS: Row[] = sampleSlipAdmissions.map((admission, i) => {
  const batch = INITIAL_BATCHES.find((item) => item.name === admission.batch);
  return {
    id: `CRS-${pad(501 + i)}`,
    name: admission.name,
    regNo: admission.regNo,
    course: admission.course,
    timing: batch ? `${batch.startTime} – ${batch.endTime}` : "09:00 – 11:00",
    track: sampleSlipTracks[i % sampleSlipTracks.length],
    restartDate: addDays(TODAY, -i - 2),
    reason: ["Returning after medical leave", "Resuming after personal leave", "Restarting after schedule break"][i % 3],
    signedBy: STAFF[(i + 1) % STAFF.length],
  };
});

export const INITIAL_TRACK_CHANGES: Row[] = sampleSlipAdmissions.map((admission, i) => ({
  id: `TCS-${pad(601 + i)}`,
  name: admission.name,
  regNo: admission.regNo,
  course: admission.course,
  currentTrack: sampleSlipTracks[i % sampleSlipTracks.length],
  newTrack: sampleSlipTracks[(i + 1) % sampleSlipTracks.length],
  date: addDays(TODAY, -i - 3),
  reason: ["Work schedule change", "Requested batch transfer", "Travel schedule adjustment"][i % 3],
  signedBy: STAFF[(i + 2) % STAFF.length],
}));

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
