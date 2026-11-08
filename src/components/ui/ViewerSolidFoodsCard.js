import NeumorphicCard from './NeumorphicCard';
import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { space, type } from "../../theme";
import { shortDate, shortTime } from "../../utils/dates";
import { ageInDays } from "../../utils/whoGrowth";
import { FOOD_CATEGORIES, buildSolidFoodChart, foodCategoryLabel, solidFoodCategory } from "../../utils/solidFoods";
import { viewerSolidData, viewerSolidOverview } from "../../utils/viewerSolidFoods";
import { DashboardSurface as Surface, DashboardControl as Control } from "./ConsultationsAppointmentsCard";
import { SolidFoodIcon } from "./RecordIcon";
import { SolidFoodRow } from "./SolidFoodsCard";
import SolidFoodAnalytics from "./SolidFoodAnalytics";
import RecordedFoodReactionItem from "./RecordedFoodReactionItem";
import NutritionDateFilter, { nutritionDateView } from "./NutritionDateFilter";
import EntriesButton from "./EntriesButton";
import PlanDetail from "./PlanDetail";

export function viewerSolidDetail(entry) {
    if (!entry) return null;
    return { title: entry.foodIntroduced || "Solid food", categoryLabel: "Shared solid food entry", date: entry.date,
        showTime: false, showReminder: false, showNotes: true, notes: entry.notes,
        details: [
            { label: "Food", value: entry.foodIntroduced || "Not recorded" },
            { label: "Food category", value: foodCategoryLabel(entry.foodCategory) },
            { label: "Recorded time", value: shortTime(entry.time) || "Not recorded" },
            { label: "Recorded severity", value: entry.reactionSeverity ? entry.reactionSeverity.charAt(0).toUpperCase() + entry.reactionSeverity.slice(1) : "Not recorded" },
            { label: "Recorded reaction", value: entry.reaction || "Not recorded" },
        ] };
}

const CHART_HELP = "Counts recorded entries, not portions, nutrients or dietary balance. Mixed dishes keep the single category recorded by the parent. Other includes entries without a recorded category; food names are never classified automatically. Percentages describe entries in the selected range. Missing logs do not establish that no feeding occurred.";

export default function ViewerSolidFoodsCard({ rows, capturedAt, dob }) {
    const { colors } = useTheme(), p = { ...colors.appointmentDashboard, ...colors.milkTypeDashboard, ...colors.solidFoodDashboard };
    const s = useMemo(() => makeStyles(p), [p]), { fontScale } = useWindowDimensions();
    const data = useMemo(() => viewerSolidData(rows, capturedAt, dob), [rows, capturedAt, dob]);
    const [width, setWidth] = useState(0), [plotWidth, setPlotWidth] = useState(0), [appliedRange, setAppliedRange] = useState(null);
    const [inspection, setInspection] = useState(null), [dialogVisible, setDialogVisible] = useState(10);
    const dateView = useMemo(() => nutritionDateView(appliedRange, data.minimumDate, data.referenceDate), [appliedRange, data.minimumDate, data.referenceDate]);
    const chart = useMemo(() => buildSolidFoodChart(data.solids, dateView.dateRange, data.referenceDate), [data.solids, dateView, data.referenceDate]);
    const overview = useMemo(() => viewerSolidOverview(data, chart), [data, chart]);
    const availableDates = useMemo(() => [...new Set(data.dated.map(entry => entry.date))], [data.dated]);
    const show = next => { setDialogVisible(10); setInspection(next); };
    const open = entry => show({ kind: "entry", entry });
    const inspect = (point, category = null) => show({ kind: "chart", from: point?.from, category });
    const point = inspection?.kind === "chart" && chart.points.find(point => point.from === inspection.from);
    const pointEntries = point ? point.entries.filter(entry => !inspection.category || solidFoodCategory(entry) === inspection.category) : [];
    const dialogRows = inspection?.kind === "reactions" ? data.reactions : pointEntries;
    const plan = inspection?.kind === "entry" ? viewerSolidDetail(inspection.entry) : inspection ? {
        title: inspection.kind === "reactions" ? "All Shared Food Reactions" : point ? `${inspection.category ? foodCategoryLabel(inspection.category) : "Food entries"} · ${shortDate(point.from)}` : "Shared Solid Food Chart Data",
        categoryLabel: "Shared solid foods", showDate: false, showTime: false, showReminder: false, showNotes: true,
        notes: inspection.kind === "reactions" ? "Recorded food reactions are not confirmed allergies. This list includes the full shared history, independently of the chart dates." : CHART_HELP,
        details: inspection.kind === "reactions" ? [{ label: "Recorded reactions", value: String(data.reactions.length) }]
            : [{ label: "Range", value: `${shortDate(point?.from || chart.window.from)} – ${shortDate(point?.to || chart.window.to)}` },
                { label: "Total", value: data.unavailable ? "Unavailable" : `${point ? point.total : chart.total} entries` },
                ...(point ? FOOD_CATEGORIES.map(category => ({ label: foodCategoryLabel(category), value: `${point.values[category]} entries` })) : [])],
    } : null;
    const days = data.first && data.minimumDate ? ageInDays(data.minimumDate, data.first.date) : null;
    const months = Number.isFinite(days) && days >= 0 ? Math.round(days / 30.4375) : null;
    const more = (count, shown, action, label) => count > shown ? <EntriesButton
        onPress={action} accessibilityLabel={label} label={`Show more (${count - shown} remaining)`} /> : null;
    return <View testID="viewer-solid-foods" style={s.panel} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
        <Surface colors={p.panel} highlight={p.highlight} radius={28} />
        <View style={s.header}><SolidFoodIcon size={52} showBackground={false} /><View style={s.body}>
            <Text accessibilityRole="header" style={s.title}>Solid Foods</Text><Text style={s.caption}>Foods the child has tried.</Text>
        </View><NutritionDateFilter context="solid" value={dateView} referenceDate={data.referenceDate} minimumDate={data.minimumDate}
            availableDates={availableDates} onChange={setAppliedRange} /></View>
        <Text style={s.caption}>{data.capturedDay ? `Shared snapshot as of ${shortDate(data.capturedDay)}.` : "Capture date unavailable; the initial range uses the latest dated shared food entry, when available."} Only shared records are shown.</Text>
        <Text style={s.caption}>{shortDate(chart.window.from)} – {shortDate(chart.window.to)}</Text>
        <View testID="viewer-solid-overview" style={s.overview}>{[["Different foods", overview.distinct], ["New in range", overview.introduced], ["Reaction entries", overview.reactions]].map(([label, count]) =>
            <View key={label} accessible accessibilityLabel={`${label}, ${data.unavailable ? "unavailable" : count}, selected range`}
                style={[s.tile, { minWidth: 72 * fontScale }]}><Surface colors={p.row} highlight={p.highlight} radius={18} />
                <Text style={s.value}>{data.unavailable ? "—" : count}</Text><Text style={s.tileLabel}>{label}</Text></View>)}</View>
        <Text style={s.caption}>Overview counts use the selected range. New means a first dated appearance in this shared history.</Text>
        <View style={s.section}><Text style={s.sectionTitle}>First dated food record in this share</Text>
            <Text style={s.caption}>{data.unavailable ? "Food history is unavailable in this snapshot." : data.first
                ? `${data.first.foodIntroduced} · ${shortDate(data.first.date)}${months == null ? "" : ` · ${months} month${months === 1 ? "" : "s"} old`}`
                : "No dated solid food records in this shared history."}</Text>
            <Text style={s.caption}>This does not establish the baby's actual first introduction.</Text>
        </View>
        <View testID="viewer-solid-reactions" style={s.section}><Text style={s.sectionTitle}>Recorded food reactions</Text>
            <Text style={s.caption}>Across the full shared history, with severe records first.</Text>
            {data.unavailable ? <Text style={s.caption}>Food reactions are unavailable in this snapshot.</Text> : data.reactions.length ? <>
                {data.reactions.slice(0, 2).map(entry => <RecordedFoodReactionItem key={entry.id} entry={entry} onOpen={open} />)}
                <Control material={{ surface: p.control }} radius={999} style={s.control} onPress={() => show({ kind: "reactions" })}
                    accessibilityRole="button" accessibilityLabel="View all shared food reactions"><Text style={s.link}>View all reactions ({data.reactions.length})</Text></Control>
            </> : <Text style={s.caption}>No recorded food reactions in this shared snapshot.</Text>}
            <Text style={s.caption}>Recorded reactions are not confirmed allergies.</Text>
        </View>
        <SolidFoodAnalytics chart={chart} width={width} plotWidth={plotWidth} onPlotWidth={setPlotWidth} unavailable={data.unavailable} onInspect={inspect} readOnly />
        <Text style={s.caption}>Counts recorded entries, not portions or nutrients. Other includes uncategorized records. Missing logs do not establish that no feeding occurred.</Text>
        <PlanDetail visible={Boolean(inspection)} plan={plan} onClose={() => setInspection(null)} heroContent={inspection?.kind === "entry" ? <SolidFoodIcon size={56} /> : undefined}>
            {inspection && inspection.kind !== "entry" && !data.unavailable ? <NeumorphicCard style={s.history}>
                {inspection.kind === "chart" && !point ? <>{chart.points.slice(0, dialogVisible).map(point => <Control key={point.from} material={{ surface: p.control }} style={s.control}
                    onPress={() => inspect(point)} accessibilityRole="button" accessibilityLabel={`View food entries for ${point.from}`}><Text style={s.link}>{shortDate(point.from)} · {point.total} entries</Text></Control>)}
                    {more(chart.points.length, dialogVisible, () => setDialogVisible(count => count + 10), "Show more shared chart dates")}</>
                    : <>{point ? <Control material={{ surface: p.control }} style={s.control} onPress={() => inspect(null)} accessibilityRole="button" accessibilityLabel="View all shared chart dates"><Text style={s.link}>All chart data</Text></Control> : null}
                        {dialogRows.slice(0, dialogVisible).map(entry => inspection.kind === "reactions"
                            ? <RecordedFoodReactionItem key={entry.id} entry={entry} onOpen={open} />
                            : <SolidFoodRow key={entry.id} entry={entry} onOpen={open} />)}
                        {!dialogRows.length ? <Text style={s.caption}>No recorded entries in this selection.</Text> : null}
                        {more(dialogRows.length, dialogVisible, () => setDialogVisible(count => count + 10), "Show more shared inspection records")}</>}
            </NeumorphicCard> : null}
        </PlanDetail>
    </View>;
}

const makeStyles = p => StyleSheet.create({
    panel: { padding: 16, gap: 18, borderRadius: 28, backgroundColor: p.panel[0], boxShadow: p.panelShadow, marginBottom: space.xl, overflow: "visible" },
    header: { flexDirection: "row", alignItems: "center", gap: 12 }, body: { flex: 1, minWidth: 0, gap: 3 },
    title: { ...type.heading, fontSize: 20, lineHeight: 26, color: p.text }, caption: { ...type.caption, fontSize: 12, lineHeight: 19, color: p.secondary, flexShrink: 1 },
    overview: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, tile: { flex: 1, padding: 10, gap: 6, alignItems: "center", borderRadius: 18, boxShadow: p.rowShadow },
    value: { ...type.title, fontSize: 23, lineHeight: 29, color: p.text }, tileLabel: { ...type.caption, fontSize: 12, lineHeight: 18, textAlign: "center", color: p.text },
    section: { gap: 12 }, sectionTitle: { ...type.bodyStrong, fontSize: 16, lineHeight: 23, color: p.text },
    control: { minHeight: 48, padding: 12, gap: 8, flexDirection: "row", alignItems: "center", justifyContent: "center" }, link: { ...type.label, color: p.azure, flexShrink: 1, textAlign: "center" },
    history: { padding: 4, gap: 14 },
});
