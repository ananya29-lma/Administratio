import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FormDialog, type Field } from "@/components/app/kit";
import { subjectSessionCount } from "@/lib/administration";

describe("FormDialog Enter navigation", () => {
  it("can hide Cancel without changing the default dialog actions", () => {
    const props = {
      open: true,
      onOpenChange: () => {},
      title: "Test Form",
      fields: [] as Field[],
      initial: {},
      onSubmit: () => {},
    };
    const { rerender } = render(<FormDialog {...props} hideCancel />);

    expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();

    rerender(<FormDialog {...props} />);
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("moves through Add Class fields and controls without submitting early", async () => {
    const submit = vi.fn();
    const fields: Field[] = [
      {
        name: "subject",
        label: "Subject",
        type: "select",
        options: ["Python"],
        modalPicker: true,
        placeholder: "Select a subject",
        showOptionValue: false,
      },
      { name: "sessions", label: "Total Sessions", type: "number" },
    ];
    render(
      <FormDialog
        open
        onOpenChange={() => {}}
        title="Add Class"
        fields={fields}
        initial={{ subject: "", sessions: 4 }}
        onSubmit={submit}
        enterMovesNext
        submitLabel="Add Class"
      >
        {() => (
          <>
            <button type="button" data-enter-navigation>
              Schedule
            </button>
            <button type="button" data-enter-navigation>
              Add Task
            </button>
          </>
        )}
      </FormDialog>,
    );

    const subject = screen.getByLabelText("Subject");
    const sessions = screen.getByLabelText("Total Sessions");
    const custom = screen.getByRole("button", { name: "Schedule" });

    subject.focus();
    fireEvent.keyDown(subject, { key: "Enter" });
    fireEvent.click(subject);
    const subjectOption = await screen.findByRole("button", { name: "Python" });
    fireEvent.keyDown(subjectOption, { key: "Enter" });
    fireEvent.click(subjectOption);
    await waitFor(() => expect(document.activeElement).toBe(sessions), { timeout: 1000 });
    fireEvent.keyDown(sessions, { key: "Enter" });
    expect(document.activeElement).toBe(custom);
    expect(submit).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Add Class" }));
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it("updates Total Sessions for every mapped subject and submits the selected count", () => {
    const subjects = [
      ["AI Foundation / Orientation", 15],
      ["Advanced Python & Database Foundation", 40],
      ["ML, Data Science & Data Visualization", 55],
      ["Big Data & Cloud Data Engineering", 40],
      ["Big Data Analytics - Tableau & Power BI", 25],
      ["Advanced MLOps", 30],
      ["Advanced Deep Learning & Computer Vision", 40],
      ["NLP & AI Bots", 40],
      ["Introduction to Generative AI & Agentic AI", 15],
      ["AI Research", 15],
    ] as const;
    const submit = vi.fn();
    const fields: Field[] = [
      {
        name: "course",
        label: "Subject",
        type: "select",
        options: subjects.map(([subject]) => subject),
        required: true,
        onChange: (subject) => ({ totalSessions: subjectSessionCount(subject) ?? "" }),
      },
      { name: "totalSessions", label: "Total Sessions", type: "number", required: true },
    ];

    render(
      <FormDialog
        open
        onOpenChange={() => {}}
        title="Add Class"
        fields={fields}
        initial={{ totalSessions: 1 }}
        onSubmit={submit}
        submitLabel="Add Class"
      />,
    );
    const subjectSelect = screen.getByLabelText(/Subject/);
    const totalSessions = screen.getByLabelText(/Total Sessions/) as HTMLInputElement;

    for (const [subject, sessions] of subjects) {
      fireEvent.change(subjectSelect, { target: { value: subject } });
      expect(totalSessions.value).toBe(String(sessions));
    }

    fireEvent.click(screen.getByRole("button", { name: "Add Class" }));
    expect(submit).toHaveBeenCalledWith(
      expect.objectContaining({ course: "AI Research", totalSessions: 15 }),
    );
  });
});
