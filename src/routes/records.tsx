import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DataTable, KV, PageHeader, StatusBadge } from "@/components/app/kit";
import { useStore } from "@/lib/store";
import { courseCategoryName, feeStatus, type Row } from "@/lib/mock";
import { batchCategory } from "@/lib/administration";
import { fmtDate, fmtINR } from "@/lib/format";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/records")({
  head: pageHead(
    "Student Admission Records",
    "Central admission register with student profiles, fees and history.",
  ),
  component: Records,
});

function Records() {
  const { data, saveCommittedStudentRecord } = useStore();
  const [profile, setProfile] = useState<Row | null>(null);

  const rows = useMemo(
    () =>
      data.admissions.map((a) => ({
        ...a,
        batch: batchCategory(a.batch, data.batches),
      })),
    [data.admissions, data.batches],
  );

  const p = profile
    ? { ...(data.students.find((s) => s.regNo === profile.regNo) ?? {}), ...profile }
    : null;
  const payable = p ? Number(p.fee ?? 0) - Number(p.discount ?? 0) : 0;
  const initials =
    p?.name
      ?.split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part: string) => part[0])
      .join("")
      .toUpperCase() || "?";
  const commitToStudentRecord = () => {
    if (!p?.regNo || !data.students.some((student) => student.regNo === p.regNo)) {
      toast.error("Could not find this student in Student Records");
      return;
    }
    try {
      const student = data.students.find((item) => item.regNo === p.regNo);
      const photoUrl = [
        p.photoUrl,
        p.photo,
        p.avatarUrl,
        p.avatar,
        student?.photoUrl,
        student?.photo,
        student?.avatarUrl,
        student?.avatar,
      ].find((value) => typeof value === "string" && value.trim());
      saveCommittedStudentRecord({
        ...student,
        ...p,
        studentId: p.studentId ?? student?.studentId ?? p.regNo,
        applicationNumber: p.regNo,
        admissionNumber: p.admissionNo,
        photoUrl,
        balance: payable - Number(p.paid ?? 0),
        feeStatus: feeStatus(p),
        committedAt: new Date().toISOString(),
      });
      toast.success(`${p.name}'s details were saved to Student Records`);
    } catch (error) {
      console.error("Failed to save student admission record", error);
      toast.error(
        error instanceof Error
          ? `Could not save student record: ${error.message}`
          : "Could not save student record. Please try again.",
      );
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Admission Records"
        description="Central register of every admitted student."
      />
      <DataTable
        rows={rows}
        searchKeys={["admissionNo", "appNo", "regNo", "name", "mobile"]}
        onRowDoubleClick={setProfile}
        columns={[
          {
            key: "admissionNo",
            label: "Admission No",
            render: (r) => (
              <span className="font-mono text-xs">{r.admissionNo ?? "Not assigned"}</span>
            ),
          },
          {
            key: "regNo",
            label: "Application No",
            render: (r) => <span className="font-mono text-xs">{r.regNo}</span>,
          },
          {
            key: "name",
            label: "Student",
            render: (r) => <span className="font-medium">{r.name}</span>,
          },
          {
            key: "mobile",
            label: "Contact Number",
            render: (r) => <span className="font-mono text-xs">{r.mobile}</span>,
          },
          { key: "course", label: "Course", render: (r) => courseCategoryName(r.course) },
          { key: "admissionDate", label: "Admitted", render: (r) => fmtDate(r.admissionDate) },
        ]}
      />

      <Dialog open={!!p} onOpenChange={(o) => !o && setProfile(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          {p && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20 rounded-lg">
                    <AvatarFallback className="rounded-lg text-xl font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <DialogTitle>{p.name}</DialogTitle>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                      {p.regNo || "Registration number unavailable"}
                    </p>
                  </div>
                </div>
              </DialogHeader>
              <div className="mt-4 space-y-6">
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold">Student Details</h3>
                  <KV
                    items={[
                      ["Full Name", p.name],
                      ["Application Number", p.regNo],
                      ["Date of Birth", fmtDate(p.dob)],
                      ["Gender", p.gender],
                      ["Contact Number", p.mobile],
                      ["Address", p.address],
                      ["Guardian", p.guardian],
                      ["Guardian Contact", p.guardianMobile],
                      ["Qualification", p.qualification],
                      ["Course", courseCategoryName(p.course)],
                    ]}
                  />
                </section>
                <section className="space-y-3 border-t pt-4">
                  <h3 className="text-sm font-semibold">Payment History</h3>
                  <KV
                    items={[
                      ["Total Fees", fmtINR(p.fee)],
                      ["Total Paid", fmtINR(p.paid)],
                      ["Outstanding Balance", fmtINR(payable - Number(p.paid ?? 0))],
                      ["Next Due Date", fmtDate(p.dueDate)],
                      [
                        "Fee Status",
                        <StatusBadge key="profile-fee-status" status={feeStatus(p)} />,
                      ],
                    ]}
                  />
                </section>
              </div>
              <div className="flex justify-end gap-2 border-t pt-4">
                <Button onClick={commitToStudentRecord}>Generate Admission</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
