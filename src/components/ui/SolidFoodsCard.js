import { SunkenInputSurface } from "./Field";
import NeumorphicCard from './NeumorphicCard';
import React, { useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { type } from "../../theme";
import { shortDate, shortTime } from "../../utils/dates";
import { ageInDays } from "../../utils/whoGrowth";
import { solidFoodStats } from "../../utils/feedingStats";
import { FOOD_CATEGORIES, buildSolidFoodChart, foodCategoryLabel, foodReactionLabel, searchSolidFoods, solidFoodCategory, sortSolidFoods } from "../../utils/solidFoods";
import { DashboardSurface as Surface, DashboardControl as Control } from "./ConsultationsAppointmentsCard";
import { SolidFoodIcon } from "./RecordIcon";
import SolidFoodAnalytics from "./SolidFoodAnalytics";
import RecordedFoodReactionItem from "./RecordedFoodReactionItem";
import PlanDetail from "./PlanDetail";
import AnimatedReveal from "./AnimatedReveal";
import EntriesButton from "./EntriesButton";
import NutritionDateFilter, { nutritionDateView } from "./NutritionDateFilter";

export function SolidFoodRow({ entry, reaction = false, onOpen }) {
    const { colors } = useTheme(), p = useMemo(() => ({ ...colors.appointmentDashboard, ...colors.milkTypeDashboard, ...colors.solidFoodDashboard }), [colors]);
    const s = useMemo(() => makeStyles(p), [p]);
    const severe = entry.reactionSeverity === "severe", mild = entry.reactionSeverity === "mild";
    const ink = severe ? colors.danger : mild ? colors.warning : p.secondary;
    if (reaction) return <RecordedFoodReactionItem entry={entry} onOpen={onOpen} />;
    return <Control material={{ surface: p.row }} radius={22}
        style={s.record} onPress={() => onOpen(entry)} accessibilityRole="button"
        accessibilityLabel={`View ${entry.foodIntroduced || "Solid food"}, ${foodCategoryLabel(entry.foodCategory)}, ${shortDate(entry.date) || "Date not recorded"}`}>
        <SolidFoodIcon size={44} />
        <View style={s.body}><Text style={s.recordTitle}>{entry.foodIntroduced || "Solid food"}</Text>
            <Text style={s.caption}>{foodCategoryLabel(entry.foodCategory)}</Text>
            {entry.reactionSeverity === "mild" || entry.reactionSeverity === "severe" || !entry.reactionSeverity && entry.reaction ? <Text style={[s.caption, { color: ink }]}>{foodReactionLabel(entry)}{entry.reactionSeverity ? " reaction recorded" : ""}</Text> : null}
            <View style={s.date}><Ionicons accessible={false} name="calendar-outline" size={15} color={p.secondary} /><Text style={s.caption}>{shortDate(entry.date) || "Date not recorded"}</Text></View>
        </View><View accessible={false} pointerEvents="none" style={s.chevron}><Surface colors={p.control} highlight={p.highlight} radius={20} /><Ionicons name="chevron-forward" size={22} color={p.azure} /></View>
    </Control>;
}

export default function SolidFoodsCard({ entries, dob, today, unavailable = false, failed = false, onRetry, onOpenEntry }) {
    const { colors } = useTheme(), p = useMemo(() => ({ ...colors.appointmentDashboard, ...colors.milkTypeDashboard, ...colors.solidFoodDashboard }), [colors]);
    const s = useMemo(() => makeStyles(p), [p]);
    const [width, setWidth] = useState(0), [plotWidth, setPlotWidth] = useState(0), [appliedRange, setAppliedRange] = useState(null);
    const [query, setQuery] = useState(""), [mode, setMode] = useState(null), [visible, setVisible] = useState(10), [selection, setSelection] = useState(null);
    const solids = useMemo(() => sortSolidFoods(entries.filter(e => e.entryType === "solid")), [entries]);
    const stats = useMemo(() => solidFoodStats(solids, today.slice(0, 7)), [solids, today]);
    const minimumDate = dob && String(dob).slice(0, 10) <= today ? String(dob).slice(0, 10) : null;
    const dateView = useMemo(() => nutritionDateView(appliedRange, minimumDate, today), [appliedRange, minimumDate, today]);
    const availableDates = useMemo(() => [...new Set(solids.map(entry => entry.date).filter(Boolean))].sort(), [solids]);
    const chart = useMemo(() => buildSolidFoodChart(solids, dateView.dateRange, today), [solids, dateView, today]);
    const matching = useMemo(() => searchSolidFoods(solids, query), [solids, query]);
    const selected = selection && chart.points.find(point => point.from === selection.from);
    const chartEntries = selected ? selected.entries.filter(e => !selection.category || solidFoodCategory(e) === selection.category) : [];
    const open = entry => { setMode(null); onOpenEntry(entry); };
    const inspect = (point, category = null) => { setSelection(point ? { from: point.from, category } : null); setVisible(10); setMode("chart"); };
    const show = value => { setVisible(10); setMode(value); };
    const days = stats.first && dob ? ageInDays(dob, stats.first.date) : null;
    const months = days != null && Number.isFinite(days) && days >= 0 ? Math.round(days / 30.4375) : null;
    const milestone = unavailable ? "Solid food records have not loaded." : stats.first ? `${stats.first.foodIntroduced} · ${shortDate(stats.first.date) || "Date not recorded"}${months == null ? "" : ` · ${months} month${months === 1 ? "" : "s"} old`}` : "No solid foods recorded.";
    const overviewValue = value => unavailable ? "Unavailable" : String(value);
    const help = "Counts saved Solid Food feeding entries, not servings or unique foods. Each entry counts once. Mixed dishes use the single category recorded by the parent. Other includes entries without a recorded category; food names are never classified automatically. Percentages are shares of entries in the chart range, rounded by largest remainder to total 100%. Very small shares can round to 0%. Search covers the complete food history independently of chart dates. Recorded reactions are not confirmed allergies.";
    const plan = { title: mode === "history" ? "Solid Food History" : mode === "reactions" ? "Food Reaction History"
        : selected ? `${selection.category ? foodCategoryLabel(selection.category) : "Food entries"} · ${shortDate(selected.from)}` : "Solid Food Chart Data",
        categoryLabel: "Solid foods", showDate: false, showTime: false, showReminder: false, showNotes: mode === "chart" && !selected,
        notes: help, details: mode === "history" ? [
            { label: "Different foods", value: overviewValue(stats.distinct) }, { label: "New this month", value: overviewValue(stats.newThisMonth) },
            { label: "With a reaction", value: overviewValue(stats.reactions.length) }, { label: "First solid food", value: milestone },
        ] : mode === "reactions" ? [{ label: "Recorded reactions", value: overviewValue(stats.reactions.length) }, { label: "Information", value: "Recorded food reactions are not confirmed allergies." }]
            : selected ? [{ label: "Dates", value: `${shortDate(selected.from)} – ${shortDate(selected.to)}` },
                ...FOOD_CATEGORIES.map(c => ({ label: foodCategoryLabel(c), value: `${selected.values[c]} entries` })), { label: "Total", value: `${selected.total} entries` }]
                : [{ label: "Range", value: `${shortDate(chart.window.from)} – ${shortDate(chart.window.to)}` }, { label: "Total", value: unavailable ? "Unavailable" : `${chart.total} entries` }] };
    const more = (total, noun = mode === "reactions" ? "reactions" : "food records") => total > visible ? <EntriesButton
        onPress={() => setVisible(count => count + 10)} accessibilityLabel={`Show more ${noun}, ${total - visible} remaining`}
        label={`Show more (${total - visible} remaining)`} /> : null;
    const search = <View style={[s.search, { boxShadow: "none", backgroundColor: "transparent", position: "relative" }]}><SunkenInputSurface /><Ionicons name="search-outline" size={20} color={p.secondary} />
        <TextInput testID="solid-food-search" value={query} onChangeText={value => { setQuery(value); setVisible(10); }} placeholder="Search food, date, or reaction..."
            placeholderTextColor={p.secondary} style={s.input} accessibilityLabel="Search all solid food history" />
        {query ? <Control material={{ surface: p.control }} radius={22} style={s.smallControl} onPress={() => { setQuery(""); setVisible(10); }} accessibilityRole="button" accessibilityLabel="Clear food search"><Ionicons name="close" size={19} color={p.azure} /></Control> : null}</View>;
    const heading = (title, subtitle, target) => <View style={s.sectionHeader}><View style={s.body}><Text accessibilityRole="header" style={s.sectionTitle}>{title}</Text><Text style={s.caption}>{subtitle}</Text></View>
        <Control material={{ surface: p.control }} radius={22} appearance="text" style={s.viewAll} onPress={() => show(target)} accessibilityRole="button" accessibilityLabel={`View all ${target === "reactions" ? "food reactions" : "solid food records"}`}><Text style={s.link}>View All</Text><Ionicons name="chevron-forward" size={17} color={p.azure} /></Control></View>;
    const empty = message => <Text testID="solid-food-empty" style={s.caption}>{unavailable ? "Solid food records are unavailable until they load." : message}</Text>;
    const rows = (data, count, reaction = false) => <AnimatedReveal duration={240} contentStyle={s.list}>
        {data.slice(0, count).map(entry => <SolidFoodRow key={entry.id} entry={entry} reaction={reaction} onOpen={open} />)}
    </AnimatedReveal>;
    return <View testID="solid-food-card" style={s.panel} onLayout={e => setWidth(e.nativeEvent.layout.width)}>
        <Surface colors={p.panel} highlight={p.highlight} radius={28} />
        <View style={s.header}><SolidFoodIcon size={52} showBackground={false} /><View style={s.body}><Text accessibilityRole="header" style={s.title}>Solid Foods</Text><Text style={s.subtitle}>Foods the child has tried.</Text></View>
            <NutritionDateFilter context="solid" value={dateView} onChange={setAppliedRange} minimumDate={minimumDate} availableDates={availableDates} />
        </View>
        {failed ? <View style={s.notice}><Text style={s.caption}>{unavailable ? "Solid food records could not be loaded." : "Records could not be refreshed. Showing the last loaded entries."}</Text><Control material={{ surface: p.control }} style={s.more} onPress={onRetry} accessibilityRole="button" accessibilityLabel="Retry loading solid foods"><Text style={s.link}>Retry</Text></Control></View> : null}
        <SolidFoodAnalytics chart={chart} width={width} plotWidth={plotWidth} onPlotWidth={setPlotWidth}
            unavailable={unavailable} onInspect={inspect} />
        <View testID="solid-reactions" style={s.reactions}><Surface colors={p.row} highlight={p.highlight} radius={24} />
            {heading("Recent Food Reactions", "Latest recorded reactions to foods.", "reactions")}
            {stats.reactions.length ? rows(stats.reactions, 2, true) : empty("No food reactions recorded.")}
        </View>
        {heading("Recent Records", "Your latest solid food entries.", "history")}
        {solids.length ? rows(solids, 3) : empty("No solid foods recorded yet.")}
        <PlanDetail visible={Boolean(mode)} plan={mode ? plan : null} onClose={() => setMode(null)}>
            <NeumorphicCard style={s.modalContent}>
                {mode === "history" ? <>{search}{matching.length ? rows(matching, visible) : empty(query ? "No food records match your search." : "No solid foods recorded yet.")}{more(matching.length)}</>
                    : mode === "reactions" ? <>{stats.reactions.length ? rows(stats.reactions, visible, true) : empty("No food reactions recorded.")}{more(stats.reactions.length)}</>
                        : mode === "chart" && !unavailable ? selected ? <>
                            <Control material={{ surface: p.control }} style={s.more} onPress={() => inspect(null)} accessibilityRole="button" accessibilityLabel="View all solid food chart data"><Text style={s.link}>All chart data</Text></Control>
                            {chartEntries.slice(0, visible).map(entry => <Control key={entry.id} material={{ surface: p.row }} style={s.more} onPress={() => open(entry)} accessibilityRole="button" accessibilityLabel={`View food entry ${entry.foodIntroduced}, ${shortDate(entry.date)}`}><Text style={s.link}>{entry.foodIntroduced || "Solid food"} · {shortDate(entry.date)} {shortTime(entry.time)}</Text></Control>)}{more(chartEntries.length)}
                        </> : <>{chart.points.slice(0, visible).map(point => <Control key={point.from} material={{ surface: p.row }} style={s.more} onPress={() => inspect(point)} accessibilityRole="button" accessibilityLabel={`${shortDate(point.from)} to ${shortDate(point.to)}, ${point.total} entries. ${FOOD_CATEGORIES.map(c => `${foodCategoryLabel(c)} ${point.values[c]}`).join(", ")}`}><Text style={s.link}>{shortDate(point.from)}{point.to !== point.from ? ` – ${shortDate(point.to)}` : ""} · {point.total} entries</Text></Control>)}{more(chart.points.length, "chart dates")}</> : null}
            </NeumorphicCard>
        </PlanDetail>
    </View>;
}

const makeStyles = p => StyleSheet.create({
    panel: { padding: 16, gap: 18, borderRadius: 28, backgroundColor: p.panel[0], boxShadow: p.panelShadow, marginBottom: 24, overflow: "visible" },
    header: { flexDirection: "row", alignItems: "center", gap: 12 }, body: { flex: 1, minWidth: 0, gap: 3 }, title: { ...type.heading, fontSize: 20, lineHeight: 26, color: p.text },
    subtitle: { ...type.caption, fontSize: 13, lineHeight: 19, color: p.secondary },
    caption: { ...type.caption, fontSize: 12, lineHeight: 18, color: p.secondary, flexShrink: 1 }, sectionTitle: { ...type.bodyStrong, fontSize: 17, lineHeight: 24, color: p.text },
    reactions: { borderRadius: 24, padding: 14, gap: 14, boxShadow: p.chartShadow, backgroundColor: p.row[0], overflow: "visible" }, sectionHeader: { flexDirection: "row", gap: 8, alignItems: "center" }, viewAll: { flexDirection: "row", gap: 2, alignItems: "center", paddingHorizontal: 8, flexShrink: 0 },
    list: { padding: 6, gap: 12 }, record: { minHeight: 100, padding: 12, flexDirection: "row", gap: 10, alignItems: "center" }, recordTitle: { ...type.bodyStrong, fontSize: 15, lineHeight: 22, color: p.text }, date: { flexDirection: "row", gap: 5, alignItems: "flex-start" },
    chevron: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", boxShadow: p.iconShadow, flexShrink: 0 },
    search: { minHeight: 48, borderRadius: 999, paddingLeft: 14, paddingRight: 4, gap: 8, flexDirection: "row", alignItems: "center", boxShadow: p.rowShadow }, input: { position: "relative", minHeight: 48, flex: 1, minWidth: 0, color: p.text, fontSize: 13, ...(Platform.OS === "web" ? { outlineColor: p.azure, outlineOffset: 2 } : {}) }, smallControl: { width: 44, alignItems: "center", justifyContent: "center" },
    link: { ...type.caption, fontSize: 13, lineHeight: 19, color: p.azure }, notice: { gap: 8 }, modalContent: { gap: 12, padding: 12 },
});
