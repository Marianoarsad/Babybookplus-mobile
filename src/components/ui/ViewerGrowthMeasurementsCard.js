import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { space, type } from "../../theme";
import { shortDate } from "../../utils/dates";
import { GROWTH_METRIC_KEYS } from "../../utils/growthMetricFilter.cjs";
import { viewerGrowthData } from "../../utils/viewerGrowth";
import GrowthMeasurementsCard from "./GrowthMeasurementsCard";
import { nutritionDateView } from "./NutritionDateFilter";

export default function ViewerGrowthMeasurementsCard({ growth, capturedAt, dob }) {
    const { colors } = useTheme();
    const styles = useMemo(() => makeStyles(colors), [colors]);
    const data = useMemo(() => viewerGrowthData(growth?.measurements, capturedAt, dob), [growth, capturedAt, dob]);
    const [applied, setApplied] = useState(null), [metricKeys, setMetricKeys] = useState(() => [...GROWTH_METRIC_KEYS]);
    const dateView = useMemo(() => nutritionDateView(applied, data.dateOfBirth, data.referenceDate), [applied, data]);
    return <View testID="viewer-growth-measurements">
        <GrowthMeasurementsCard rows={data.rows} dateOfBirth={data.dateOfBirth} dateView={dateView}
            metricKeys={metricKeys} onMetricKeysChange={setMetricKeys} onDateViewChange={setApplied}
            referenceDate={data.referenceDate} unavailable={data.unavailable} style={styles.panel}
            notice={<Text style={styles.notice}>{data.capturedDay ? `Shared snapshot as of ${shortDate(data.capturedDay)}.`
                : "Snapshot capture date unavailable; the initial range uses the latest dated shared measurement, when available."} Only shared records are shown.</Text>}>
            <View testID="viewer-growth-birth" style={styles.section}>
                <Text accessibilityRole="header" style={styles.heading}>At Birth</Text>
                {!growth ? <Text style={styles.body}>Birth measurements are unavailable in this snapshot.</Text> : [["Height", "birthLength", "cm"], ["Weight", "birthWeight", "kg"], ["Head Circumference", "birthHeadCircumference", "cm"]].map(([label, field, unit]) =>
                    <View key={field} style={styles.birthRow}><Text style={styles.body}>{label}</Text>
                        <Text style={styles.body}>{growth?.[field] != null ? `${growth[field]} ${unit}` : "Not recorded"}</Text></View>)}
            </View>
        </GrowthMeasurementsCard>
    </View>;
}

const makeStyles = colors => StyleSheet.create({
    panel: { marginBottom: space.xl },
    notice: { ...type.caption, color: colors.textSecondary, marginBottom: space.md, lineHeight: 20 },
    section: { marginTop: space.lg, marginBottom: space.lg, gap: space.sm },
    heading: { ...type.bodyStrong, color: colors.growthHistory.title, flexShrink: 1 },
    body: { ...type.body, color: colors.text, flexShrink: 1 },
    birthRow: { flexDirection: "row", justifyContent: "space-between", flexWrap: "wrap", gap: space.sm },
});
