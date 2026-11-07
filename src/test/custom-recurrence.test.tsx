import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CustomRecurrenceDialog } from "@/components/app/CustomRecurrenceDialog";

describe("Automatic class schedule dialog", () => {
  it("calculates the end after the required sessions from individually selected weekdays", () => {
    const onDone = vi.fn();
    render(
      <CustomRecurrenceDialog
        open
        startDate="2026-10-28"
        totalSessions={3}
        onDone={onDone}
        onCancel={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Wednesday" }));
    fireEvent.click(screen.getByRole("button", { name: "Tuesday" }));
    fireEvent.click(screen.getByRole("button", { name: "Thursday" }));
    expect(
      screen.getByText(/3 sessions · Tue, Thu · 2 weeks · ends Thu, Nov 5, 2026/i),
    ).toBeInTheDocument();
    expect(screen.queryByText("Mon–Fri")).not.toBeInTheDocument();
    expect(screen.queryByText("Mon/Wed/Fri")).not.toBeInTheDocument();
    expect(screen.queryByText("Tue/Thu")).not.toBeInTheDocument();
    expect(screen.queryByText("On date")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Schedule end date" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(onDone).toHaveBeenCalledWith(
      expect.objectContaining({
        daysOfWeek: [2, 4],
        startDate: "2026-10-29",
        endMode: "afterSessions",
        selectedEndDate: "2026-11-05",
        sessions: ["2026-10-29", "2026-11-03", "2026-11-05"],
      }),
    );
  });

  it("requires at least one selected weekday and a positive session count", () => {
    const { getByRole } = render(
      <CustomRecurrenceDialog
        open
        startDate="2026-10-28"
        totalSessions={0}
        onDone={vi.fn()}
        onCancel={() => {}}
      />,
    );
    expect(getByRole("dialog")).toHaveClass("overflow-y-auto", "overscroll-contain");
    expect(getByRole("dialog")).toHaveClass("max-h-[90vh]");
    fireEvent.click(screen.getByRole("button", { name: "Wednesday" }));
    const alerts = screen.getAllByRole("alert");
    expect(alerts[0]).toHaveTextContent("Choose at least one day");
    expect(alerts[1]).toHaveTextContent("positive whole number");
    expect(screen.getByRole("button", { name: "Done" })).toBeDisabled();
  });
});
