import React, { useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { useLanguage } from "../../context/LanguageContext";
import { radius, space, type, MIN_TOUCH } from "../../theme";
import { todayLocal } from "../../utils/dates";
import { wholeNumberLabel } from "../../utils/whoGrowth";
import { toggleGrowthMetric } from "../../utils/growthMetricFilter.cjs";
import { SectionContainerCard } from "../common/Cards";
import { LatestMeasurementsSummary, growthMeasurements } from "../common/RecordSummaries";
import PercentileChart from "../PercentileChart";
import { GrowthBackground, GrowthControl, GrowthMetricIcon } from "./GrowthVisuals";
import { MedicineSurface } from "./MedicineVisuals";
import { SkeletonBlock } from "./Skeleton";
import NutritionDateFilter from "./NutritionDateFilter";
import GlassChartFilterPopover from "./GlassChartFilterPopover";

const METRIC_TABS = [
    { key: "weight", labelKey: "growthWeight", field: "weight", unit: "kg" },
    { key: "height", labelKey: "growthHeight", field: "height", unit: "cm" },
    { key: "head", labelKey: "growthHeadCirc", filterLabelKey: "growthHeadFilter", field: "head_circumference", unit: "cm" },
];

export default function GrowthMeasurementsCard({ rows, dateOfBirth, dateView, metricKeys, onDateViewChange,
    onMetricKeysChange, referenceDate = todayLocal(), loading = false, unavailable = false, blurTarget, notice, children, style }) {
    const { colors } = useTheme(), { t } = useLanguage();
    const styles = useMemo(() => makeStyles(colors), [colors]);
    const { dateRange, preset: appliedDatePreset, yearRange } = dateView;
    const [metricMenuOpen, setMetricMenuOpen] = useState(false), [metricMenuAnchor, setMetricMenuAnchor] = useState(null);
    const metricTriggerRef = useRef(null);
    const visibleMetrics = useMemo(
        () => METRIC_TABS.filter((metric) => metricKeys.includes(metric.key)),
        [metricKeys],
    );

    const measurements = useMemo(() => growthMeasurements(rows, dateOfBirth), [rows, dateOfBirth]);

    // A shared date must describe one visit, so this strip is the newest log as
    // a snapshot rather than a mix of values taken on different dates.
    const latestMeasurement = measurements[0] || null;
    const availableMeasurementDates = useMemo(
        () => [...new Set(measurements
            .filter((measurement) => METRIC_TABS.some((metric) => Number(measurement[metric.field]) > 0))
            .map((measurement) => measurement.date))].sort(),
        [measurements],
    );
    const filteredGrowthRows = useMemo(
        () => rows.filter((r) => {
            const date = r.date_recorded ? String(r.date_recorded).slice(0, 10) : "";
            return date >= dateRange.from && date <= dateRange.to;
        }),
        [rows, dateRange],
    );
    const sharedChartWindow = useMemo(() => {
        const dates = filteredGrowthRows
            .filter((row) => visibleMetrics.some((metric) => Number(row[metric.field]) > 0))
            .map((row) => String(row.date_recorded).slice(0, 10))
            .sort();
        return dates.length ? { from: dates[0], to: dates[dates.length - 1] } : null;
    }, [filteredGrowthRows, visibleMetrics]);
    // The API returns growth rows by date DESC, id DESC, so the first valid
    // value is also the last plotted value for that metric in this filter.
    const latestChartValues = useMemo(
        () => Object.fromEntries(METRIC_TABS.map((metric) => {
            const row = filteredGrowthRows.find(
                (item) => item[metric.field] != null && item[metric.field] !== "",
            );
            const value = row ? Number(row[metric.field]) : null;
            return [
                metric.key,
                Number.isFinite(value) ? `${wholeNumberLabel(value)} ${metric.unit}` : null,
            ];
        })),
        [filteredGrowthRows],
    );
    const chartDateWindow = dateRange;
    const datePickerMin = dateOfBirth && String(dateOfBirth).slice(0, 10) <= referenceDate
        ? String(dateOfBirth).slice(0, 10) : null;

    const openMetricMenu = () => {
        metricTriggerRef.current?.measureInWindow((x, y, width, height) => {
            setMetricMenuAnchor({ x, y, width, height });
            setMetricMenuOpen(true);
        });
    };

    return <>
        <SectionContainerCard
            style={[styles.trackingPanel, style]}
            background={<MedicineSurface />}
            title={t("growthMetricsTitle")}
            subtitle={t("growthMetricsSub")}
            minimumTitleWidth={112}
            action={<View style={styles.chartControls}>
                <NutritionDateFilter context="growth"
                    value={dateView}
                    referenceDate={referenceDate} minimumDate={datePickerMin} availableDates={availableMeasurementDates}
                    onChange={onDateViewChange} />
                <GrowthControl
                    ref={metricTriggerRef}
                    circular
                    onPress={openMetricMenu}
                    style={styles.metricFilterButton}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: metricMenuOpen }}
                    accessibilityLabel={t("growthChartFilterButton").replace(
                        "{count}",
                        metricKeys.length,
                    )}
                >
                    <MaterialCommunityIcons name="tune" size={26} color={colors.growthSurface.series} />
                </GrowthControl>
            </View>}
        >
            {notice}
            {loading ? (
                <>
                    <SkeletonBlock width="100%" height={96} radius={radius.md} style={{ marginBottom: 16 }} />
                    <SkeletonBlock width="100%" height={200} radius={radius.lg} />
                </>
            ) : unavailable ? <Text style={styles.chartHelp}>Growth measurements are unavailable in this shared snapshot.</Text> : (
                <>
            <LatestMeasurementsSummary measurement={latestMeasurement} appearance="neumorphic" />

            <Text style={styles.chartHelp}>{t("growthAllChartHelp")}</Text>

            {dateOfBirth ? <View testID="growth-measurement-charts" style={styles.allCharts}>
                {visibleMetrics.map((metric) => (
                    <View key={metric.key} style={[styles.allChart, { boxShadow: colors.growthSurface.metric[metric.key].shadow }]}>
                        <GrowthBackground metric={metric.key} radius={24} />
                        <View style={styles.allChartTitleRow}>
                            <GrowthMetricIcon metric={metric.key} size={36} />
                            <Text style={styles.allChartTitle}>{t(metric.labelKey)}</Text>
                            {latestChartValues[metric.key] ? (
                                <Text selectable style={[styles.allChartLatest, { color: colors.growthSurface.metric[metric.key].accent }]}>
                                    {latestChartValues[metric.key]}
                                </Text>
                            ) : null}
                        </View>
                        <PercentileChart
                            animateLine
                            indicator={metric.key}
                            dateOfBirth={dateOfBirth}
                            rows={filteredGrowthRows}
                            compact
                            name={t(metric.labelKey)}
                            showReference={false}
                            seriesTheme={colors.growthSurface.metric[metric.key]}
                            gridColor={colors.growthSurface.grid}
                            areaFill
                            dateWindow={chartDateWindow}
                            datePreset={appliedDatePreset}
                            yearRange={appliedDatePreset === "year" ? yearRange : null}
                            axisWindow={sharedChartWindow}
                            pointAlignedShortRange
                            emptyMessage={appliedDatePreset === "year"
                                ? t("growthNoMeasurementsYears").replace("{from}", yearRange.from).replace("{to}", yearRange.to)
                                : t("growthNoMeasurementsRange")}
                        />
                    </View>
                ))}
            </View> : <Text style={styles.chartHelp}>The growth charts need a birth date, which was not shared.</Text>}

                </>
            )}
            {children}
        </SectionContainerCard>
        <GlassChartFilterPopover
            visible={metricMenuOpen}
            anchor={metricMenuAnchor}
            onClose={() => setMetricMenuOpen(false)}
            blurTarget={blurTarget}
            title={t("growthChartFilterTitle")}
            closeLabel={t("growthCloseChartFilter")}
            options={METRIC_TABS.map(metric => ({
                key: metric.key,
                label: t(metric.filterLabelKey || metric.labelKey),
                icon: <GrowthMetricIcon metric={metric.key} size={40} circular />,
            }))}
            selectedKeys={metricKeys}
            onToggle={key => onMetricKeysChange(toggleGrowthMetric(metricKeys, key))}
            testIDPrefix="growth-chart-toggle"
        />

    </>;
}

const makeStyles = colors => StyleSheet.create({
    trackingPanel: {
        borderRadius: 28,
        borderWidth: 0,
        backgroundColor: colors.medicineSurface.section[0],
        boxShadow: colors.medicineSurface.shadow,
    },
    chartControls: {
        flexDirection: "row",
        alignItems: "center",
        gap: space.sm,
    },
    metricFilterButton: {
        width: MIN_TOUCH,
        height: MIN_TOUCH,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: radius.pill,
        flexShrink: 0,
    },
    chartHelp: { ...type.body, color: colors.textSecondary, marginBottom: space.md },
    allCharts: { gap: space.md },
    allChart: { padding: space.sm, borderRadius: 24 },
    allChartTitleRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: space.xs,
        paddingBottom: space.xs,
    },
    allChartTitle: { ...type.bodyStrong, color: colors.text, flex: 1, minWidth: 0 },
    allChartLatest: {
        ...type.heading,
        marginLeft: "auto",
        flexShrink: 0,
        fontVariant: ["tabular-nums"],
    },
});
