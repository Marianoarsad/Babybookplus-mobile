import { shiftMonthClamped, todayLocal, toLocalISO } from "./dates";

export const MILK_TYPES = ["Breastmilk", "Formula", "Mixed"];

export function milkDay(value) {
    const iso = String(value || "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || toLocalISO(new Date(`${iso}T00:00:00`)) !== iso) return null;
    const [y, m, d] = iso.split("-").map(Number);
    return { iso, ordinal: Date.UTC(y, m - 1, d) / 86400000 };
}

export function milkTypeWindow(range, feeds, today = todayLocal()) {
    const now = milkDay(today);
    let from = today;
    if (range === "all") {
        const starts = feeds.map(f => milkDay(f.date)?.iso).filter(date => date && date <= today);
        from = starts.sort()[0] || today;
    } else if (range === "3m") from = shiftMonthClamped(today, -3);
    else {
        const date = new Date(`${today}T00:00:00`);
        date.setDate(date.getDate() - (range === "30" ? 29 : 6));
        from = toLocalISO(date);
    }
    return { from, to: today, first: milkDay(from)?.ordinal, last: now?.ordinal };
}
