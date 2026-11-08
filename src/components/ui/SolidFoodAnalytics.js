import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { type } from "../../theme";
import { FOOD_CATEGORIES, foodCategoryLabel } from "../../utils/solidFoods";
import { DashboardSurface as Surface, DashboardListTransition as Transition } from "./ConsultationsAppointmentsCard";
import FoodCategoryIcon from "./FoodCategoryIcon";
import FeedingStackedPlot from "./FeedingStackedPlot";

export default function SolidFoodAnalytics({ chart, width, plotWidth, onPlotWidth, unavailable = false, onInspect, readOnly = false }) {
    const { colors } = useTheme(), p = { ...colors.appointmentDashboard, ...colors.milkTypeDashboard, ...colors.solidFoodDashboard };
    const s = useMemo(() => makeStyles(p), [p]), { fontScale } = useWindowDimensions();
    const metricWidth = Math.max(0, width - 64) * 0.48;
    const horizontalMetrics = metricWidth >= 136 * fontScale;
    const metricIconSize = horizontalMetrics && metricWidth < 156 * fontScale ? 44 : 56;
    const wideHeader = plotWidth >= 720 * fontScale, legendColumns = plotWidth >= 290 * fontScale ? 3 : 2;
    const rangeKey = `${chart.window.from}:${chart.window.to}`;
    const legend = <View testID="solid-legend" style={[s.legend, wideHeader && s.wideLegend]}>{FOOD_CATEGORIES.map(c => <View key={c} style={[s.legendEntry, { width: legendColumns === 3 ? "32%" : "49%" }]}><View style={s.dot}><Surface colors={colors.solidFoodCategories[c].segment} highlight={p.highlight} radius={6} /></View><Text style={s.caption}>{foodCategoryLabel(c)}</Text></View>)}</View>;
    return (
        <View testID="solid-analysis" style={s.analysis}>
            <Surface colors={p.row} highlight={p.highlight} radius={24} />
            <Transition filter={rangeKey}><View onLayout={e => onPlotWidth(e.nativeEvent.layout.width)}>
                <View style={[s.chartHeader, wideHeader && s.wideChartHeader]}><View style={s.body}>
                    <Text style={s.sectionTitle}>{chart.title}</Text>
                    <Text style={s.caption}>{chart.subtitle}</Text></View>{legend}</View>
                <Pressable accessibilityRole="button" accessibilityLabel="View solid food chart data" onPress={() => onInspect(null)}>
                    <FeedingStackedPlot key={rangeKey} chart={chart} width={plotWidth} categories={FOOD_CATEGORIES} materials={colors.solidFoodCategories} p={p} prefix="solid" maxBarWidth={64} plotHeight={160} unit="Entries" unavailable={unavailable} onInspect={onInspect} />
                </Pressable>
                {unavailable || !chart.total ? <Text testID="solid-chart-empty" style={s.caption}>{unavailable ? readOnly ? "Solid food records are unavailable in this shared snapshot." : "Solid food records are unavailable until they load." : "No recorded solid food entries in this period."}</Text> : null}
            </View></Transition>
            <View testID="solid-category-metrics" style={s.metrics}>{FOOD_CATEGORIES.map(category => <View key={category} accessible
                accessibilityLabel={`${foodCategoryLabel(category)}, ${unavailable ? "count unavailable" : `${chart.totals[category]} entries, ${chart.total ? chart.displayPercentages[category] : 0}% of entries`}`}
                style={[s.metric, horizontalMetrics && s.horizontalMetric]}>
                <Surface colors={p.row} highlight={p.highlight} radius={20} /><FoodCategoryIcon category={category} size={metricIconSize} />
                <View style={[s.metricBody, horizontalMetrics && s.horizontalMetricBody]}><Text style={s.value}>{unavailable ? "\u2014" : chart.totals[category].toLocaleString()}</Text><Text style={[s.metricLabel, horizontalMetrics && s.leftText]}>{foodCategoryLabel(category)}</Text><Text style={[s.metricNote, horizontalMetrics && s.leftText]}>{unavailable ? "Unavailable" : `${chart.total ? chart.displayPercentages[category] : 0}% of entries`}</Text></View>
            </View>)}</View>
        </View>
    );
}

const makeStyles = p => StyleSheet.create({
    body: { flex: 1, minWidth: 0, gap: 3 },
    caption: { ...type.caption, fontSize: 12, lineHeight: 18, color: p.secondary, flexShrink: 1 }, sectionTitle: { ...type.bodyStrong, fontSize: 17, lineHeight: 24, color: p.text },
    analysis: { borderRadius: 24, padding: 16, gap: 20, backgroundColor: p.row[0], boxShadow: p.chartShadow, overflow: "visible" }, chartHeader: { gap: 16, marginBottom: 12 }, wideChartHeader: { flexDirection: "row", gap: 24 },
    legend: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 10 }, wideLegend: { width: 300, flexShrink: 0 }, legendEntry: { flexDirection: "row", alignItems: "center", gap: 5 }, dot: { width: 12, height: 12, borderRadius: 6 },
    metrics: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 12 }, metric: { width: "48%", minWidth: 0, padding: 8, gap: 8, borderRadius: 20, alignItems: "center", minHeight: 112, backgroundColor: p.row[0], boxShadow: p.rowShadow }, horizontalMetric: { flexDirection: "row" }, horizontalMetricBody: { flex: 1, alignItems: "flex-start" }, metricBody: { minWidth: 0, maxWidth: "100%", gap: 3, alignItems: "center" }, leftText: { textAlign: "left" },
    value: { ...type.title, fontSize: 24, lineHeight: 30, color: p.text, maxWidth: "100%" }, metricLabel: { ...type.caption, fontSize: 13, lineHeight: 19, textAlign: "center", fontWeight: "600", color: p.text, maxWidth: "100%" }, metricNote: { ...type.caption, fontSize: 11, lineHeight: 17, color: p.secondary, textAlign: "center", maxWidth: "100%" },
});
