import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { type } from "../../theme";
import { shortDate, numericDate, todayLocal } from "../../utils/dates";
import { MILK_TYPES } from "../../utils/milkTypeHistory";
import { buildMilkFeedingChart } from "../../utils/milkFeedingChart";
import { feedingPercentage } from "../../utils/feedingStats";
import { DashboardSurface as Surface, DashboardListTransition as ListTransition } from "./ConsultationsAppointmentsCard";
import { MilkIcon } from "./RecordIcon";
import MilkFeedingStackedChart, { MilkAnalyticIcon } from "./MilkFeedingStackedChart";
import NutritionDateFilter, { nutritionDateView } from "./NutritionDateFilter";

export default function MilkTypeAnalytics({ feeds, referenceDate = todayLocal(), minimumDate, unavailable = false, stale = false,
    onOpenEntry, readOnly = false, notice, children }) {
    const { colors } = useTheme(), p = useMemo(() => ({ ...colors.appointmentDashboard, ...colors.milkTypeDashboard }), [colors]);
    const styles = useMemo(() => makeStyles(p), [p]);
    const { fontScale } = useWindowDimensions();
    const [width, setWidth] = useState(0), [appliedRange, setAppliedRange] = useState(null);
    const dateView = useMemo(() => nutritionDateView(appliedRange, minimumDate, referenceDate), [appliedRange, minimumDate, referenceDate]);
    const availableDates = useMemo(() => feeds.map(feed => feed.date).filter(Boolean), [feeds]);
    const chart = useMemo(() => buildMilkFeedingChart(feeds, dateView.dateRange, referenceDate), [feeds, dateView, referenceDate]);
    const window = chart.window, rangeKey = `${window.from}:${window.to}`;
    const stackedMetrics = width > 0 && width < 260 * fontScale;
    return <View testID="milk-type-card" style={styles.panel} onLayout={e => setWidth(e.nativeEvent.layout.width)}>
        <Surface colors={p.panel} highlight={p.highlight} radius={28} />
        <View style={styles.header}><MilkIcon size={52} /><View style={styles.body}><Text style={styles.title}>Milk Type</Text>
            <Text style={styles.subtitle}>What the baby has been drinking.</Text></View>
            <NutritionDateFilter context="milk" value={dateView} onChange={setAppliedRange} minimumDate={minimumDate} availableDates={availableDates} referenceDate={referenceDate} />
        </View>
        {notice}
        <Text style={styles.caption}>{shortDate(window.from)} – {shortDate(window.to)}</Text>
        <View testID="milk-analysis" style={styles.chart}><Surface colors={p.row} highlight={p.highlight} radius={24} />
            <ListTransition filter={rangeKey}><MilkFeedingStackedChart key={rangeKey} chart={chart} unavailable={unavailable} stale={stale} onOpenEntry={onOpenEntry} readOnly={readOnly} /></ListTransition>
            <View testID="milk-metrics" style={[styles.metrics, stackedMetrics && styles.stacked]}>{MILK_TYPES.map(t => <View key={t} accessible
                accessibilityLabel={`${t}, ${unavailable ? "feeding count and recorded dates unavailable" : `${chart.totals[t]} recorded feedings${chart.total ? `, ${feedingPercentage(chart.percentages[t])} of categorized feeds` : ""}, ${chart.recordedDays[t].days} days recorded, first ${numericDate(chart.recordedDays[t].first) || "not recorded"}, last ${numericDate(chart.recordedDays[t].last) || "not recorded"}`}`}
                style={[styles.metric, stackedMetrics && styles.compactMetric]}>
                <Surface colors={p.row} highlight={p.highlight} radius={18} /><MilkAnalyticIcon kind={t} size={48} />
                <View style={styles.metricBody}><Text style={styles.value}>{unavailable ? "\u2014" : chart.totals[t].toLocaleString()}</Text>
                    <Text style={styles.metricLabel}>{t}</Text>
                    <Text style={styles.metricNote}>{unavailable ? "Unavailable" : chart.total ? `${feedingPercentage(chart.percentages[t])} of feeds` : readOnly ? "0% of feeds" : "Feedings"}</Text>
                    <Text style={styles.metricNote}>Days recorded: {unavailable ? "\u2014" : chart.recordedDays[t].days}</Text>
                    <Text style={styles.metricNote}>First: {unavailable ? "Unavailable" : numericDate(chart.recordedDays[t].first) || "Not recorded"}</Text>
                    <Text style={styles.metricNote}>Last: {unavailable ? "Unavailable" : numericDate(chart.recordedDays[t].last) || "Not recorded"}</Text>
                </View></View>)}</View>
        </View>
        <Text style={styles.caption}>Days recorded counts dates with saved feeding entries in this range, not a continuous feeding period.</Text>
        {readOnly ? <Text style={styles.caption}>Counts recorded feeding entries, not milk volume. Missing logs do not establish that no feeding occurred.</Text> : null}
        {readOnly && chart.excluded > 0 ? <Text style={styles.caption}>{`${chart.excluded} uncategorized milk ${chart.excluded === 1 ? "entry is" : "entries are"} excluded from the chart and percentages.`}</Text> : null}
        {children}
    </View>;
}

const makeStyles = p => StyleSheet.create({
    panel: { padding: 16, borderRadius: 28, backgroundColor: p.panel[0], boxShadow: p.panelShadow, marginBottom: 24, gap: 18, overflow: "visible" },
    header: { flexDirection: "row", alignItems: "center", gap: 12 }, title: { ...type.heading, fontSize: 20, lineHeight: 26, color: p.text, minWidth: 0, flexShrink: 1 },
    subtitle: { ...type.caption, fontSize: 13, lineHeight: 19, color: p.secondary },
    caption: { ...type.caption, fontSize: 12, lineHeight: 18, color: p.secondary, flexShrink: 1 },
    body: { flex: 1, minWidth: 0, gap: 3 },
    chart: { borderRadius: 24, padding: 12, gap: 18, backgroundColor: p.row[0], boxShadow: p.chartShadow, overflow: "visible" },
    metrics: { flexDirection: "row", gap: 8 }, stacked: { flexDirection: "column" }, metric: { flex: 1, minWidth: 0, paddingHorizontal: 6, paddingVertical: 12, gap: 8, borderRadius: 18, alignItems: "center", backgroundColor: p.row[0], boxShadow: p.rowShadow },
    compactMetric: { flexDirection: "row", flex: 0, justifyContent: "center", gap: 16 },
    metricBody: { minWidth: 0, gap: 3, alignItems: "center" },
    value: { ...type.heading, fontSize: 22, lineHeight: 28, color: p.text }, metricLabel: { ...type.caption, fontSize: 12, lineHeight: 18, textAlign: "center", fontWeight: "600", color: p.azure, flexShrink: 1 }, metricNote: { ...type.caption, fontSize: 11, lineHeight: 17, textAlign: "center", color: p.secondary, flexShrink: 1 },
});
