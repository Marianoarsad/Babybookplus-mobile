import { nutritionToApp } from "./adapters";
import { milkDay } from "./milkTypeHistory";
import { todayLocal } from "./dates";
import { byMoment, foodKey, solidFoodStats } from "./feedingStats";
import { sortSolidFoods } from "./solidFoods";

export function viewerSolidData(rows, capturedAt, dob) {
    const solids = sortSolidFoods((Array.isArray(rows) ? rows : []).filter(row => row && typeof row === "object")
        .map((row, index) => ({ ...nutritionToApp(row), id: `snapshot-solid-${index}` }))
        .filter(entry => entry.entryType === "solid"));
    const capturedDay = typeof capturedAt === "string" && Number.isFinite(Date.parse(capturedAt)) ? milkDay(capturedAt)?.iso : undefined;
    const today = todayLocal();
    const referenceDate = capturedDay || solids.map(entry => milkDay(entry.date)?.iso).filter(date => date && date <= today).sort().at(-1) || today;
    const dated = solids.filter(entry => milkDay(entry.date) && entry.date <= referenceDate);
    const birth = milkDay(dob)?.iso;
    return { solids, dated, capturedDay, referenceDate, unavailable: !Array.isArray(rows),
        minimumDate: birth && birth <= referenceDate ? birth : undefined,
        first: dated.filter(entry => foodKey(entry.foodIntroduced)).at(-1) || null,
        reactions: solidFoodStats(solids).reactions.sort((a, b) =>
            Number(b.reactionSeverity === "severe") - Number(a.reactionSeverity === "severe") || byMoment(b, a)) };
}

export function viewerSolidOverview(data, chart) {
    const entries = chart.points.flatMap(point => point.entries);
    const firstDates = new Map();
    for (const entry of data.dated) {
        const key = foodKey(entry.foodIntroduced);
        if (key && (!firstDates.has(key) || entry.date < firstDates.get(key))) firstDates.set(key, entry.date);
    }
    return { distinct: solidFoodStats(entries).distinct,
        introduced: [...firstDates.values()].filter(date => date >= chart.window.from && date <= chart.window.to).length,
        reactions: solidFoodStats(entries).reactions.length };
}
