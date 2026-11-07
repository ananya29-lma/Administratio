import { useStore } from "./store";
import type { Row } from "./mock";

/** Student picker helpers: options show "Name (admission number)" and resolve to the student + admission. */
export function useStudentPicker(onlyAdmitted = false) {
  const { data } = useStore();
  const list = onlyAdmitted ? data.admissions : data.students;
  const options = list.map((s) => `${s.name} (${s.regNo})`);
  const resolve = (label: string): Row => {
    const reg = label?.match(/\(([^)]+)\)$/)?.[1];
    const s = data.students.find((x) => x.regNo === reg) ?? {};
    const a = data.admissions.find((x) => x.regNo === reg) ?? {};
    return { ...s, ...a, name: s.name ?? a.name, regNo: reg, appNo: a.appNo };
  };
  return { options, resolve };
}
