import { createFileRoute } from "@tanstack/react-router";
import { useState, type KeyboardEvent } from "react";
import { toast } from "sonner";
import { Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { FieldGrid, PageHeader, Panel, validateFields, type Field } from "@/components/app/kit";
import { useStore, type Settings } from "@/lib/store";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/settings")({
  head: pageHead(
    "Settings",
    "Manage curriculum, holidays, number prefixes and notification preferences.",
  ),
  component: Page,
});

function Page() {
  const { settings, setSettings } = useStore();
  const [draft, setDraft] = useState<Settings>(() => structuredClone(settings));
  const [tab, setTab] = useState("prefixes");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [curriculumError, setCurriculumError] = useState("");
  const [holidayDraft, setHolidayDraft] = useState("");
  const prefixFields: Field[] = Object.keys(draft.prefixes)
    .filter(
      (name) => !["application", "agreement", "receipt", "late", "outgoing", "slip"].includes(name),
    )
    .map((name) => ({
      name,
      label: `${name.charAt(0).toUpperCase()}${name.slice(1)} Prefix`,
      required: true,
      validate: (v) =>
        /^[A-Za-z0-9-]+$/.test(String(v)) ? undefined : "Use only letters, numbers and hyphens",
    }));
  const moveToNextSettingsField = (event: KeyboardEvent<HTMLDivElement>) => {
    const target = event.target;
    if (
      event.key !== "Enter" ||
      !(target instanceof HTMLElement) ||
      !target.matches("input, select, textarea, [role='switch']")
    )
      return;
    event.preventDefault();
    const controls = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        "input:not([type='hidden']):not(:disabled), select:not(:disabled), textarea:not(:disabled), [role='switch']:not([aria-disabled='true'])",
      ),
    );
    controls[controls.indexOf(target) + 1]?.focus();
  };
  const save = () => {
    const e = validateFields(prefixFields, draft.prefixes);
    setErrors(e);
    const subjects = draft.subjectCurriculum;
    const invalidCurriculum =
      subjects.some(
        (subject) =>
          !subject.name.trim() ||
          !Number.isInteger(subject.sessions) ||
          subject.sessions < 1 ||
          !subject.typical.trim(),
      ) ||
      new Set(subjects.map((subject) => subject.name.trim().toLocaleLowerCase())).size !==
        subjects.length;
    setCurriculumError(
      invalidCurriculum
        ? "Enter unique subject names, positive whole session counts, and a typical duration."
        : "",
    );
    if (Object.keys(e).length) {
      toast.error("Check the highlighted settings");
      return;
    }
    if (invalidCurriculum) {
      setTab("curriculum");
      toast.error("Check the curriculum settings");
      return;
    }
    setSettings(draft);
    toast.success("Settings saved");
  };
  const reset = () => {
    setDraft(structuredClone(settings));
    setErrors({});
  };
  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        actions={
          <>
            <Button variant="outline" onClick={reset}>
              <RotateCcw className="mr-1.5 h-4 w-4" />
              Discard Changes
            </Button>
            <Button onClick={save}>
              <Save className="mr-1.5 h-4 w-4" />
              Save Settings
            </Button>
          </>
        }
      />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex h-auto w-fit flex-wrap">
          <TabsTrigger value="prefixes">Number Prefixes</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="curriculum">Curriculum &amp; Holidays</TabsTrigger>
        </TabsList>
      </Tabs>
      <div onKeyDown={moveToNextSettingsField}>
        {tab === "prefixes" && (
          <Panel title="Document Number Prefixes">
            <FieldGrid
              fields={prefixFields}
              values={draft.prefixes}
              errors={errors}
              setValues={(v) => setDraft((d) => ({ ...d, prefixes: v as Record<string, string> }))}
              cols={3}
            />
          </Panel>
        )}
        {tab === "notifications" && (
          <Panel title="Notification Preferences">
            <div className="divide-y">
              {Object.entries({
                leave: "Leave Approvals",
                certificates: "Certificate Applications",
                dailySummary: "Daily Summary",
              }).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between gap-4 py-4">
                  <Label htmlFor={`notify-${key}`}>{label}</Label>
                  <Switch
                    id={`notify-${key}`}
                    checked={!!draft.notify[key]}
                    onCheckedChange={(checked) =>
                      setDraft((d) => ({ ...d, notify: { ...d.notify, [key]: checked } }))
                    }
                  />
                </div>
              ))}
            </div>
          </Panel>
        )}
        {tab === "curriculum" && (
          <div className="space-y-4">
            <Panel title="Subject Curriculum">
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Manage the subject names, default total sessions, and typical duration shown in
                  Add Class.
                </p>
                <div className="space-y-2">
                  {draft.subjectCurriculum.map((subject, index) => (
                    <div
                      key={`${index}-${subject.name}`}
                      className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[minmax(0,1fr)_120px_minmax(140px,0.7fr)_auto]"
                    >
                      <Input
                        aria-label={`Subject ${index + 1} name`}
                        value={subject.name}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            subjectCurriculum: current.subjectCurriculum.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, name: event.target.value } : item,
                            ),
                          }))
                        }
                      />
                      <Input
                        aria-label={`Subject ${index + 1} total sessions`}
                        type="number"
                        min={1}
                        step={1}
                        value={subject.sessions}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            subjectCurriculum: current.subjectCurriculum.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, sessions: Number(event.target.value) }
                                : item,
                            ),
                          }))
                        }
                      />
                      <Input
                        aria-label={`Subject ${index + 1} typical duration`}
                        value={subject.typical}
                        placeholder="Typical duration"
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            subjectCurriculum: current.subjectCurriculum.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, typical: event.target.value } : item,
                            ),
                          }))
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove ${subject.name || `subject ${index + 1}`}`}
                        onClick={() =>
                          setDraft((current) => ({
                            ...current,
                            subjectCurriculum: current.subjectCurriculum.filter(
                              (_, itemIndex) => itemIndex !== index,
                            ),
                          }))
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      subjectCurriculum: [
                        ...current.subjectCurriculum,
                        { name: "", sessions: 1, typical: "" },
                      ],
                    }))
                  }
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add Subject
                </Button>
                {curriculumError && <p className="text-xs text-destructive">{curriculumError}</p>}
              </div>
            </Panel>
            <Panel title="Institutional Holidays">
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Selected class days that fall on these dates are skipped and moved to the next
                  available class day.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Input
                    type="date"
                    aria-label="Holiday date"
                    value={holidayDraft}
                    onChange={(event) => setHolidayDraft(event.target.value)}
                    className="max-w-56"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!holidayDraft || draft.holidays.includes(holidayDraft)}
                    onClick={() => {
                      setDraft((current) => ({
                        ...current,
                        holidays: [...current.holidays, holidayDraft].sort(),
                      }));
                      setHolidayDraft("");
                    }}
                  >
                    <Plus className="mr-1.5 h-4 w-4" />
                    Add Holiday
                  </Button>
                </div>
                {draft.holidays.length > 0 ? (
                  <ul className="divide-y rounded-lg border">
                    {draft.holidays.map((date) => (
                      <li
                        key={date}
                        className="flex items-center justify-between px-3 py-2 text-sm"
                      >
                        {date}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Remove holiday ${date}`}
                          onClick={() =>
                            setDraft((current) => ({
                              ...current,
                              holidays: current.holidays.filter((item) => item !== date),
                            }))
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No holidays configured.</p>
                )}
              </div>
            </Panel>
          </div>
        )}
      </div>
    </div>
  );
}
