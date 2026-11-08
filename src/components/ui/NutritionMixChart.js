import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Stop } from "react-native-svg";
import { useTheme } from "../../context/ThemeContext";
import { motion, type } from "../../theme";
import { feedingPercentage } from "../../utils/feedingStats";
import Gradient from "./Gradient";
import useReducedMotion from "./useReducedMotion";

const CENTER = 120, RADIUS = 70, STROKE = 42, CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const CATEGORIES = [
    { key: "breastmilk", label: "Milk", tone: "ringMilk" },
    { key: "formula", label: "Formula", tone: "ringFormula" },
    { key: "mixed", label: "Mixed", tone: "ringMixed" },
    { key: "solid", label: "Solid Food", tone: "ringSolid" },
];
const percentage = (distribution, key) => distribution.total ? distribution.counts[key] / distribution.total * 100 : 0;

export default function NutritionMixChart({ summary }) {
    const { colors } = useTheme(), p = colors.feedingBreakdown;
    const styles = useMemo(() => makeStyles(p), [p]);
    const id = "feeding-" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
    const [width, setWidth] = useState(0);
    const size = Math.min(252, width), centerSize = size * 98 / 192;
    const reduced = useReducedMotion();
    const distribution = summary.distribution;
    const fractions = CATEGORIES.map(item => percentage(distribution, item.key) / 100);
    const [drawn, setDrawn] = useState(fractions);
    const current = useRef(drawn), progress = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        progress.stopAnimation();
        const target = fractions, from = current.current;
        if (reduced !== false) { current.current = target; setDrawn(target); return; }
        if (from.every((value, i) => value === target[i])) return;
        progress.setValue(0);
        const listener = progress.addListener(({ value }) => {
            current.current = from.map((start, i) => start + (target[i] - start) * value);
            setDrawn(current.current);
        });
        const animation = Animated.timing(progress, { toValue: 1, duration: 320, easing: Easing.bezier(...motion.standard.bezier), useNativeDriver: false });
        animation.start();
        return () => { animation.stop(); progress.removeListener(listener); };
    }, [fractions[0], fractions[1], fractions[2], fractions[3], reduced, progress]);
    let start = 0;
    const segments = CATEGORIES.map((item, index) => ({ ...item, fraction: drawn[index], colors: p[item.tone] })).reverse()
        .map(item => { const segment = { ...item, start }; start += item.fraction; return segment; })
        .filter(segment => segment.fraction > 0);
    const accessibleSummary = `${summary.totalEntries} feeds today. ${CATEGORIES.map(item =>
        `${item.label === "Milk" ? "Milk (breastmilk only)" : item.label}: ${distribution.counts[item.key]}, ${feedingPercentage(percentage(distribution, item.key))}`).join(". ")}.
        Percentages count eligible feeding events, not nutritional intake.${distribution.excludedMilkEntries ? ` Excludes ${distribution.excludedMilkEntries} milk ${distribution.excludedMilkEntries === 1 ? "entry" : "entries"} without a recorded milk type.` : ""}`;
    return <View testID="feeding-donut" style={styles.chart} onLayout={e => setWidth(e.nativeEvent.layout.width)}
        accessible accessibilityRole="image" accessibilityLabel={accessibleSummary}>
        <View style={{ width: size, height: size }}>
            <Svg pointerEvents="none" accessible={false} width={size} height={size} viewBox="24 24 192 192">
                <Defs>
                    {segments.map(segment => <LinearGradient key={segment.key} id={`${id}-${segment.key}`} x1="100%" y1="0%" x2="0%" y2="100%">
                        {segment.colors.map((color, i) => <Stop key={i} offset={i / 2} stopColor={color} />)}
                    </LinearGradient>)}
                    <LinearGradient id={`${id}-gloss`} x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0" stopColor={p.reflection} stopOpacity="0.85" />
                        <Stop offset="0.45" stopColor={p.reflection} stopOpacity="0.12" />
                        <Stop offset="1" stopColor={p.clearReflection} />
                    </LinearGradient>
                    <RadialGradient id={`${id}-center`} cx="25%" cy="15%" r="85%">
                        {p.center.map((color, i) => <Stop key={i} offset={i / 2} stopColor={color} />)}
                    </RadialGradient>
                </Defs>
                <Circle cx={CENTER} cy={CENTER + 3} r={RADIUS} fill="none" stroke={p.ringShade} strokeOpacity="0.18" strokeWidth={STROKE + 4} />
                <Circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none" stroke={p.track} strokeWidth={STROKE} />
                {segments.map(segment => <Circle key={segment.key} testID={`feeding-arc-${segment.key}`} cx={CENTER} cy={CENTER} r={RADIUS}
                    fill="none" stroke={`url(#${id}-${segment.key})`} strokeWidth={STROKE}
                    strokeDasharray={`${segment.fraction * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
                    strokeDashoffset={-segment.start * CIRCUMFERENCE} transform={`rotate(-90 ${CENTER} ${CENTER})`} />)}
                <Circle cx={CENTER} cy={CENTER} r={89} fill="none" stroke={`url(#${id}-gloss)`} strokeWidth={3} />
                <Circle cx={CENTER} cy={CENTER} r={84} fill="none" stroke={`url(#${id}-gloss)`} strokeWidth={7} strokeOpacity="0.3" />
                <Circle cx={CENTER} cy={CENTER} r={49} fill={`url(#${id}-center)`} stroke={p.reflection} strokeOpacity="0.8" strokeWidth={2} />
            </Svg>
            <View pointerEvents="none" accessible={false} style={[StyleSheet.absoluteFill, styles.center]}>
                <Text testID="feeding-donut-total" style={[styles.centerValue, { maxWidth: centerSize * 0.9 }]}>{summary.totalEntries}</Text>
                <Text style={styles.centerText}>Feeds</Text>
            </View>
        </View>
    </View>;
}

export function NutritionMixLegend({ summary }) {
    const { colors } = useTheme(), p = colors.feedingBreakdown;
    const { fontScale } = useWindowDimensions();
    const [width, setWidth] = useState(0);
    const styles = useMemo(() => makeStyles(p), [p]);
    const columns = width >= 600 * fontScale ? 4 : width > 0 && width < 240 * fontScale ? 1 : 2;
    const groups = [];
    for (let i = 0; i < CATEGORIES.length; i += columns) groups.push(CATEGORIES.slice(i, i + columns));
    return <View testID="feeding-legends" onLayout={e => setWidth(e.nativeEvent.layout.width)} style={styles.legends}>
        {groups.map((group, index) => <View key={index} style={styles.legendRow}>
            {group.map(item => <View key={item.key} testID={`feeding-legend-${item.key}`} accessible
                accessibilityLabel={`${item.label === "Milk" ? "Milk (breastmilk only)" : item.label}, ${feedingPercentage(percentage(summary.distribution, item.key))}`} style={styles.legend}>
                <Gradient colors={p.row} style={[StyleSheet.absoluteFill, { borderRadius: 24, boxShadow: "inset 0 2px 2px " + p.highlight }]} />
                <Gradient colors={p[item.tone]} style={styles.dot} />
                <Text style={styles.legendLabel}>{item.label}</Text>
                <Text style={styles.legendValue}>{feedingPercentage(percentage(summary.distribution, item.key))}</Text>
            </View>)}
        </View>)}
    </View>;
}
const makeStyles = p => StyleSheet.create({
    chart: { width: "100%", alignItems: "center", marginTop: 4, marginBottom: 10 },
    center: { alignItems: "center", justifyContent: "center" }, centerValue: { ...type.heading, fontSize: 36, lineHeight: 43, textAlign: "center", color: p.text }, centerText: { ...type.body, fontSize: 16, lineHeight: 22, textAlign: "center", color: p.secondary },
    legends: { gap: 8, marginBottom: 16, overflow: "visible" }, legendRow: { flexDirection: "row", gap: 8, alignItems: "stretch" },
    legend: { flex: 1, minWidth: 0, minHeight: 44, flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 24, boxShadow: p.itemShadow },
    dot: { width: 12, height: 12, borderRadius: 6, flexShrink: 0 }, legendLabel: { ...type.caption, fontSize: 12, color: p.text, flex: 1, minWidth: 0 }, legendValue: { ...type.label, fontSize: 12, color: p.secondary, textAlign: "right", flexShrink: 0 },
});
