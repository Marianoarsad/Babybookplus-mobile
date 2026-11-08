import React, { useId, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { useTheme } from "../../context/ThemeContext";
import { type } from "../../theme";
import { numericDate } from "../../utils/dates";
import { DashboardSurface as Surface } from "./ConsultationsAppointmentsCard";

function ReactionWarning({ severity, size = 40 }) {
    const { colors } = useTheme(), p = colors.clinicalSummary;
    const tone = p[severity] || p.unknown;
    const id = "clinical-warning-" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
    return <View accessible={false} style={{ width: size, height: size, flexShrink: 0, borderRadius: size / 2 }}>
        <Surface colors={tone.surface} highlight={p.highlight} radius={size / 2} />
        <Svg aria-hidden pointerEvents="none" width={size} height={size} viewBox="0 0 40 40" style={{ position: "relative" }}>
            <Defs><LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">{tone.art.map((c, i) => <Stop key={i} offset={i / 2} stopColor={c} />)}</LinearGradient></Defs>
            <Path d="M17 8q3-5 6 0l12 21q3 5-3 5H8q-6 0-3-5Z" fill={`url(#${id})`} />
            <Path d="M20 14v9m0 5v1" stroke={p.reflection} strokeWidth="3" strokeLinecap="round" />
            <Path d="m9 26 9-16" stroke={p.reflection} strokeWidth="1.5" strokeLinecap="round" opacity="0.65" />
        </Svg>
    </View>;
}

export function ClinicalAlertRow({ title, subtitle, tone = "unknown", badge, ...props }) {
    const { colors } = useTheme(), p = colors.clinicalSummary;
    const styles = useMemo(() => makeStyles(p), [p]);
    const material = p[tone] || p.unknown;
    const Container = props.onPress ? Pressable : View;
    return <Container {...props} style={styles.row}>
        <Surface colors={material.surface} highlight={p.highlight} radius={20} />
        <ReactionWarning severity={tone} />
        <View style={styles.details}><Text style={styles.label}>{title}</Text>{subtitle ? <Text style={styles.date}>{subtitle}</Text> : null}</View>
        {badge ? <View style={[styles.badge, { backgroundColor: material.badge }]}><Text style={[styles.badgeText, { color: material.ink }]}>{badge}</Text></View> : null}
    </Container>;
}

export default function RecordedFoodReactionItem({ entry, onOpen }) {
    const food = entry.foodIntroduced || "Food not recorded";
    const date = numericDate(entry.date) || "Date not recorded";
    const severity = entry.reactionSeverity === "severe" ? "Severe" : entry.reactionSeverity === "mild" ? "Mild" : "Severity not recorded";
    return <ClinicalAlertRow title={food} subtitle={date} tone={entry.reactionSeverity} badge={severity}
        testID={`clinical-reaction-${entry.reactionSeverity || "unknown"}`}
        {...(onOpen ? { onPress: () => onOpen(entry), accessibilityRole: "button",
            accessibilityLabel: `${food}, ${date}, ${severity}`, accessibilityHint: "View recorded food reaction details" } : {})} />;
}

const makeStyles = p => StyleSheet.create({
    row: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", borderRadius: 20, padding: 12, gap: 10, minHeight: 76, boxShadow: p.itemShadow },
    details: { flex: 1, minWidth: 80, gap: 3 },
    label: { ...type.bodyStrong, fontSize: 15, lineHeight: 22, color: p.text },
    date: { ...type.body, fontSize: 13, lineHeight: 20, color: p.secondary },
    badge: { borderRadius: 999, paddingVertical: 5, paddingHorizontal: 10, alignSelf: "center", maxWidth: "100%", boxShadow: p.badgeShadow },
    badgeText: { ...type.caption, fontSize: 13, lineHeight: 18 },
});
