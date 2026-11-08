import { feedingMixCategory } from "./feedingStats";
import { todayLocal } from "./dates";
import { MILK_TYPES } from "./milkTypeHistory";
import { buildFeedingCountChart } from "./feedingCountChart";
export { feedingCountAxis as milkFeedAxis } from "./feedingCountChart";

export function milkFeedType(feed) {
    return { breastmilk: "Breastmilk", formula: "Formula", mixed: "Mixed" }[feedingMixCategory(feed)] || null;
}
export function buildMilkFeedingChart(feeds, range = "7", today = todayLocal()) {
    const chart = buildFeedingCountChart(feeds.filter(feed => (feed.entryType || "milk") === "milk"), MILK_TYPES, milkFeedType, range, today);
    const dates = Object.fromEntries(MILK_TYPES.map(type => [type, new Set()]));
    for (const point of chart.points) for (const feed of point.entries) dates[milkFeedType(feed)].add(feed.date.slice(0, 10));
    const recordedDays = Object.fromEntries(MILK_TYPES.map(type => {
        const ordered = [...dates[type]].sort();
        return [type, { days: ordered.length, first: ordered[0] || null, last: ordered.at(-1) || null }];
    }));
    const days = chart.window.last - chart.window.first + 1;
    const label = typeof range === "object" ? chart.window.to === today && [7, 30].includes(days) ? `Last ${days} Days` : "Selected Range"
        : range === "all" ? "All Time" : range === "3m" ? "Last 3 Months" : `Last ${range === "30" ? 30 : 7} Days`;
    return { ...chart, recordedDays,
        title: `Milk Feedings (${label})`,
        subtitle: chart.granularity === "day" ? "Number of recorded feedings per day, grouped by milk type." : `${chart.granularity === "week" ? "Weekly" : "Monthly"} feeding totals, grouped by milk type.` };
}
