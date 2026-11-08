import NeumorphicCard from './NeumorphicCard';
import React, { useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { type } from "../../theme";
import { shortDate, shortTime } from "../../utils/dates";
import { MILK_TYPES } from "../../utils/milkTypeHistory";
import { milkFeedType } from "../../utils/milkFeedingChart";
import { DashboardSurface as Surface, DashboardControl as Control } from "./ConsultationsAppointmentsCard";
import PlanDetail from "./PlanDetail";
import EntriesButton from "./EntriesButton";
import FeedingStackedPlot from "./FeedingStackedPlot";

export { roundedStackedBar as roundedMilkBar } from "./FeedingStackedPlot";

// Analytical illustrations only; the shared MilkIcon remains the record identity.
const METRIC_ARTWORK = {
    Breastmilk: require("../../assets/nutrition/milk-breastmilk.png"),
    Formula: require("../../assets/nutrition/milk-formula.png"),
    Mixed: require("../../assets/nutrition/milk-mixed.png"),
};
export function MilkAnalyticIcon({ kind, size = 44 }) {
    const { colors } = useTheme(), material = colors.milkType[kind];
    return <View accessible={false} pointerEvents="none" style={{ width: size, height: size, flexShrink: 0, borderRadius: size / 2, boxShadow: material.shadow, alignItems: "center", justifyContent: "center" }}>
        <Surface colors={material.surface} highlight={colors.appointmentDashboard.highlight} radius={size / 2} />
        <Image source={METRIC_ARTWORK[kind]} resizeMode="contain" accessible={false} style={{ position: "absolute", width: size * 1.2, height: size * 1.2 }} />
    </View>;
}

export default function MilkFeedingStackedChart({ chart, unavailable = false, stale = false, onOpenEntry, readOnly = false }) {
    const { colors } = useTheme(), p = { ...colors.appointmentDashboard, ...colors.milkTypeDashboard };
    const { fontScale } = useWindowDimensions();
    const [width, setWidth] = useState(0), [dataOpen, setDataOpen] = useState(false), [selection, setSelection] = useState(null), [visible, setVisible] = useState(10);
    const styles = useMemo(() => makeStyles(p), [p]);
    const selected = selection && chart.points.find(point => point.from === selection.from);
    const entries = selected ? selected.entries.filter(feed => !selection.type || milkFeedType(feed) === selection.type) : [];
    const inspect = (point, category = null) => { setSelection(point ? { from: point.from, type: category } : null); setVisible(10); setDataOpen(true); };
    const help = `Counts recorded feeding events, not milk volume or feeding minutes. Mixed entries count once. Percentages are shares of categorized feeds.${chart.excluded ? ` ${chart.excluded} uncategorized milk ${chart.excluded === 1 ? "entry is" : "entries are"} excluded.` : ""} Saved milk-type periods do not create feeding events.${readOnly ? " Only records included in this shared snapshot are shown. Missing logs do not establish that no feeding occurred." : " Search covers all milk-type history independently of the chart dates. The global + menu adds a history period; feeding events are logged through the existing Milk form."}`;
    const plan = { title: selected ? `${selection.type || "Milk feedings"} · ${shortDate(selected.from)}` : "Milk Feeding Data", categoryLabel: "Feeding history", date: selected?.from || chart.window.from,
        showTime: false, showReminder: false, showNotes: !selected, notes: help,
        details: selected ? [{ label: "Dates", value: `${shortDate(selected.from)} – ${shortDate(selected.to)}` },
            ...MILK_TYPES.map(t => ({ label: t, value: `${selected.values[t]} feeds` })), { label: "Total", value: `${selected.total} feeds` }]
            : [{ label: "Range", value: `${shortDate(chart.window.from)} – ${shortDate(chart.window.to)}` }, { label: "Total", value: unavailable ? "Unavailable" : `${chart.total} categorized feeds` }] };
    const legend = <View style={styles.legend}>{MILK_TYPES.map(t => <View key={t} style={styles.legendEntry}>
        <View style={styles.dot}><Surface colors={colors.milkType[t].segment} highlight={p.highlight} radius={6} /></View><Text style={styles.caption}>{t}</Text></View>)}</View>;
    return <View testID="milk-stacked-chart" onLayout={e => setWidth(e.nativeEvent.layout.width)} style={styles.chart}>
        <View style={[styles.heading, width >= 560 * fontScale && styles.wideHeading]}><View style={styles.body}>
            <Text style={styles.title}>{chart.title}</Text>
            <Text style={styles.caption}>{chart.subtitle}</Text>
        </View>{width >= 560 * fontScale ? legend : null}</View>
        {width < 560 * fontScale ? legend : null}
        <Pressable accessibilityRole="button" accessibilityLabel="View milk feeding chart data" onPress={() => inspect(null)}>
            <FeedingStackedPlot chart={chart} width={width} categories={MILK_TYPES} materials={colors.milkType} p={p}
                prefix="milk" unit="Feeds" unavailable={unavailable} onInspect={inspect} virtualize plotHeight={160} />
        </Pressable>
        {unavailable || !chart.total ? <Text testID="milk-chart-empty" style={styles.caption}>{unavailable ? readOnly ? "Feeding records are unavailable in this shared snapshot." : "Feeding records are unavailable until they load." : "No recorded milk feedings in this period."}</Text> : null}
        {stale && !unavailable ? <Text style={styles.caption}>Feeding records could not be refreshed. Showing the last loaded entries.</Text> : null}
        <PlanDetail visible={dataOpen} plan={plan} onClose={() => setDataOpen(false)}>
            {selected ? <NeumorphicCard style={styles.list}>
                <Control material={{ surface: p.control }} style={styles.entry} onPress={() => inspect(null)} accessibilityRole="button" accessibilityLabel="View all chart data"><Text style={styles.link}>All chart data</Text></Control>
                {entries.slice(0, visible).map(feed => <Control key={feed.id} material={{ surface: p.row }} style={styles.entry} onPress={() => { setDataOpen(false); onOpenEntry(feed); }}
                    accessibilityRole="button" accessibilityLabel={`View ${milkFeedType(feed)} feeding, ${shortDate(feed.date)} ${shortTime(feed.time)}`}>
                    <Text style={styles.link}>{milkFeedType(feed)} · {shortDate(feed.date)} {shortTime(feed.time)}</Text></Control>)}
                {entries.length > visible ? <EntriesButton onPress={() => setVisible(count => count + 10)} accessibilityLabel="Show more chart feeding entries" label={`Show more (${entries.length - visible} remaining)`} /> : null}
            </NeumorphicCard> : unavailable ? null : <NeumorphicCard style={styles.list}>{chart.points.slice(0, visible).map(point => <Control key={point.from} material={{ surface: p.row }} style={styles.entry} onPress={() => inspect(point)}
                accessibilityRole="button" accessibilityLabel={`${shortDate(point.from)} to ${shortDate(point.to)}, ${point.total} feeds. ${MILK_TYPES.map(t => `${t} ${point.values[t]}`).join(", ")}`}>
                <Text style={styles.link}>{shortDate(point.from)}{point.to !== point.from ? ` – ${shortDate(point.to)}` : ""} · {point.total} feeds</Text></Control>)}
                {chart.points.length > visible ? <EntriesButton onPress={() => setVisible(count => count + 10)} accessibilityLabel="Show more chart dates" label={`Show more (${chart.points.length - visible} remaining)`} /> : null}
            </NeumorphicCard>}
        </PlanDetail>
    </View>;
}

const makeStyles = p => StyleSheet.create({
    chart: { gap: 14 }, heading: { gap: 10 }, wideHeading: { flexDirection: "row", gap: 20 }, body: { flex: 1, minWidth: 0 },
    title: { ...type.bodyStrong, fontSize: 16, lineHeight: 23, color: p.text },
    caption: { ...type.caption, fontSize: 12, lineHeight: 18, color: p.secondary },
    legend: { flexDirection: "row", flexWrap: "wrap", gap: 12 }, legendEntry: { flexDirection: "row", alignItems: "center", gap: 5 }, dot: { width: 12, height: 12, borderRadius: 6 },
    list: { gap: 12, padding: 12 },
    entry: { minHeight: 48, padding: 12, justifyContent: "center" }, link: { ...type.caption, color: p.azure, lineHeight: 20 },
});
