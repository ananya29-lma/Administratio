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

function formValue(value: unknown): string {
  return value === undefined || value === null || value === "" ? "Not provided" : String(value);
}

function formCheck(value: unknown): string {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return formValue(value);
}

function ageFromDob(value: unknown): string {
  if (typeof value !== "string" || !value) return "Not provided";
  const dob = new Date(`${value}T00:00:00`);
  if (Number.isNaN(dob.getTime())) return "Not provided";
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  if (
    today.getMonth() < dob.getMonth() ||
    (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate())
  ) {
    age -= 1;
  }
  return age >= 0 ? String(age) : "Not provided";
}

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
                  <h3 className="text-sm font-semibold">Personal Details</h3>
                  <KV
                    items={[
                      ["Application Date", fmtDate(p.appDate ?? p.regDate)],
                      ["Application Number", p.regNo],
                      ["Date of Birth", fmtDate(p.dob)],
                      ["Age", ageFromDob(p.dob)],
                      ["Student Full Name", formValue(p.name)],
                      ["Gender", p.gender],
                      ["Mobile Number", formValue(p.mobile)],
                      ["Email Address", formValue(p.email)],
                      ["Permanent Address", formValue(p.address)],
                    ]}
                  />
                </section>
                <section className="space-y-3 border-t pt-4">
                  <h3 className="text-sm font-semibold">Guardian Details</h3>
                  <KV
                    items={[
                      ["Guardian Name", formValue(p.guardian)],
                      ["Relationship to Student", formValue(p.guardianRelationship)],
                      ["Guardian Mobile Number", formValue(p.guardianMobile)],
                    ]}
                  />
                </section>
                <section className="space-y-3 border-t pt-4">
                  <h3 className="text-sm font-semibold">
                    Educational Qualification / Work Experience
                  </h3>
                  <KV
                    items={[
                      ["Qualification / Role", formValue(p.qualification)],
                      ["Institute / Company", formValue(p.prevInstitution)],
                      ["Year of Passing", formValue(p.qualificationYear)],
                      ["Percentage / Grade", formValue(p.gradePercent)],
                    ]}
                  />
                </section>
                <section className="space-y-3 border-t pt-4">
                  <h3 className="text-sm font-semibold">Lead Source &amp; Reference</h3>
                  <KV
                    items={[
                      ["Lead Source", formValue(p.source)],
                      [
                        "Reference / More Details",
                        formValue(
                          p.sourceDetails ??
                            p.referenceDetails ??
                            p.reference ??
                            p.otherSourceDetails,
                        ),
                      ],
                    ]}
                  />
                </section>
                <section className="space-y-3 border-t pt-4">
                  <h3 className="text-sm font-semibold">Course Preference</h3>
                  <KV
                    items={[
                      ["Course Applied For", formValue(courseCategoryName(p.course))],
                      ["Fee Plan Preferred", formValue(p.feePlanPreferred)],
                      [
                        "Instalments",
                        formCheck(
                          p.instalments ??
                            p.installments ??
                            (p.feePlanPreferred === "Installment"
                              ? true
                              : p.feePlanPreferred === "Full Payment"
                                ? false
                                : undefined),
                        ),
                      ],
                      ["Preferred Number of Instalments", formValue(p.preferredInstallments)],
                    ]}
                  />
                </section>
                <section className="space-y-3 border-t pt-4">
                  <h3 className="text-sm font-semibold">Documents Enclosed</h3>
                  <KV
                    items={[
                      ["ID Proof", formCheck(p.idEnclosed ?? p.docs?.id)],
                      ["Address Proof", formCheck(p.addressProofEnclosed ?? p.docs?.address)],
                      ["Latest Marksheet", formCheck(p.qualificationEnclosed ?? p.docs?.marksheet)],
                      ["Passport-size Photographs", formCheck(p.photoEnclosed ?? p.docs?.photo)],
                      ["Transfer Certificate", formCheck(p.transferEnclosed ?? p.docs?.transfer)],
                    ]}
                  />
                </section>
                <section className="space-y-3 border-t pt-4">
                  <h3 className="text-sm font-semibold">Declaration</h3>
                  <p className="text-sm text-muted-foreground">
                    I declare that the information given in this form is true and correct. I agree
                    to follow the rules and regulations of Skill AI and understand that admission is
                    subject to written approval.
                  </p>
                  <KV
                    items={[
                      ["Declaration Accepted", formCheck(p.declarationAccepted)],
                      ["Declaration Date", fmtDate(p.declarationDate)],
                    ]}
                  />
                </section>
                <section className="space-y-3 border-t pt-4">
                  <h3 className="text-sm font-semibold">Office Use Only</h3>
                  <p className="text-xs text-muted-foreground">
                    Administrator and Accountant must independently verify their responsibilities
                    before admission is fully verified.
                  </p>
                  <KV
                    items={[
                      ["Administrator Verification", formCheck(p.administratorVerified)],
                      ["Administrator Name", formValue(p.administratorName)],
                      ["Administrator Verification Date", fmtDate(p.administratorDate)],
                      ["Accountant Verification", formCheck(p.accountantVerified)],
                      ["Accountant Name", formValue(p.accountantName)],
                      ["Accountant Verification Date", fmtDate(p.accountantDate)],
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
