import { milkDay } from "./milkTypeHistory";
import { todayLocal, ageLabel } from "./dates";
import { ageInDays } from "./whoGrowth";

export function viewerGrowthData(rows, capturedAt, dob) {
    const number = value => value == null || value === "" || !Number.isFinite(Number(value)) ? null : Number(value);
    const birth = milkDay(dob)?.iso;
    const measurements = (Array.isArray(rows) ? rows : []).filter(row => row && typeof row === "object").map((row, index) => {
        const date = milkDay(row.date_recorded)?.iso || null;
        return { id: row.id, snapshotKey: index, date, day: birth && date ? ageInDays(birth, date) : null,
            weight: number(row.weight), height: number(row.height), head_circumference: number(row.head_circumference),
            measured_at: row.measured_at || null };
    }).sort((a, b) => (b.date || "").localeCompare(a.date || "") || Number(b.id || 0) - Number(a.id || 0) || b.snapshotKey - a.snapshotKey);
    const capturedDay = typeof capturedAt === "string" && Number.isFinite(Date.parse(capturedAt)) ? milkDay(capturedAt)?.iso : undefined;
    const today = todayLocal();
    const referenceDate = capturedDay || measurements.find(entry => entry.date && entry.date <= today)?.date || today;
    const dated = measurements.filter(entry => entry.date && entry.date <= referenceDate);
    return { measurements, capturedDay, referenceDate, unavailable: !Array.isArray(rows),
        dateOfBirth: birth && birth <= referenceDate ? birth : undefined,
        rows: dated.map(entry => ({ id: entry.id, date_recorded: entry.date, height: entry.height,
            weight: entry.weight, head_circumference: entry.head_circumference, measured_at: entry.measured_at })) };
}

export function viewerGrowthDetail(entry) {
    return { title: "Growth Measurement Details", categoryLabel: "Shared growth measurement", date: entry.date,
        showTime: false, showReminder: false, showNotes: false,
        details: [
            { label: "Age", value: entry.day != null && entry.day >= 0 ? ageLabel(entry.day) : "Age unavailable" },
            ...[["Weight", "weight", "kg"], ["Height", "height", "cm"], ["Head Circumference", "head_circumference", "cm"]]
                .map(([label, field, unit]) => ({ label, value: entry[field] == null ? "Not recorded" : `${entry[field]} ${unit}` })),
            { label: "Measured at", value: ({ home: "At home", health_center: "Health center", clinic: "Clinic", hospital: "Hospital" })[entry.measured_at] || "Not recorded" },
        ] };
}
