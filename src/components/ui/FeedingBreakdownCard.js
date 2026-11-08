import React, { useId, useMemo, useState } from "react";
import { Animated, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { MIN_TOUCH, type } from "../../theme";
import { shortDate, shortTime } from "../../utils/dates";
import { recordedFeedingTime } from "../../utils/feedingStats";
import { SectionContainerCard } from "../common/Cards";
import AnimatedReveal from "./AnimatedReveal";
import Gradient from "./Gradient";
import { MilkIcon, SolidFoodIcon } from "./RecordIcon";
import { MetricArtwork } from "./FeedingTodayCard";
import NutritionMixChart, { NutritionMixLegend } from "./NutritionMixChart";
import { SkeletonBlock } from "./Skeleton";
import EntriesButton from "./EntriesButton";
import useSoftPress from "./useSoftPress";

function Surface({ colors, radius = 22, highlight }) {
    return <Gradient pointerEvents="none" accessible={false} colors={colors}
        style={[StyleSheet.absoluteFill, { borderRadius: radius, boxShadow: "inset 1px 2px 3px " + highlight }]} />;
}

function Control({ ref: controlRef, surface = "control", radius = 24, style, children, ...props }) {
    const { colors } = useTheme(), p = colors.feedingBreakdown;
    const { respond, transform } = useSoftPress();
    const [pressed, setPressed] = useState(false), [focused, setFocused] = useState(false);
    const focus = e => setFocused(Platform.OS === "web" && Boolean(e.currentTarget?.matches?.(":focus-visible")));
    const press = down => { setPressed(down); respond(down); };
    return <Pressable {...props} ref={controlRef} onPressIn={() => press(true)} onPressOut={() => press(false)}
        onFocus={focus} onKeyDown={focus} onBlur={() => { setFocused(false); press(false); }}
        style={[{ minHeight: MIN_TOUCH, borderRadius: radius }, style, Platform.OS === "web" && { outlineStyle: focused ? "solid" : "none", outlineWidth: 2, outlineOffset: 3, outlineColor: p.azure }]}>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, transform,
            backgroundColor: p[surface][0], boxShadow: pressed ? p.pressedShadow : p.itemShadow }]}>
            <Surface colors={p[surface]} radius={radius} highlight={p.highlight} />
        </Animated.View>
        {children}
    </Pressable>;
}

export function FeedingSummaryMetrics({ summary }) {
    const { colors } = useTheme(), p = colors.feedingBreakdown;
    const styles = useMemo(() => makeStyles(p), [p]);
    const { fontScale } = useWindowDimensions();
    const [width, setWidth] = useState(0);
    const columns = width > 0 && (width - 10) / 2 < 104 * fontScale ? 1 : 2;
    const inline = width > 0 && (width - 10 * (columns - 1)) / columns >= 140 * fontScale;
    const volume = summary.loggedMilkVolumeMl;
    const tiles = [
        { key: "milk", label: "Milk feeds", value: String(summary.milkEntries) },
        { key: "solid", label: "Solid meals", value: String(summary.solidFoodEntries) },
        { key: "volume", label: "Logged milk volume", value: volume == null ? "Not logged" : volume < 0.1 ? "<0.1 mL" : `${Number(volume.toFixed(1))} mL` },
        { key: "time", label: "Last feed", value: shortTime(summary.lastFeedingTime) || "Not logged" },
    ];
    const groups = [];
    for (let i = 0; i < tiles.length; i += columns) groups.push(tiles.slice(i, i + columns));
    return <View testID="feeding-summary-metrics" style={styles.metrics} onLayout={e => setWidth(e.nativeEvent.layout.width)}>
        {groups.map((group, index) => <View key={index} style={styles.metricRow}>
            {group.map(tile => <View key={tile.key} testID={`feeding-summary-${tile.key}`} accessible
                accessibilityLabel={`${tile.label}, ${tile.value}`} style={[styles.tile, inline && styles.tileInline]}>
                <Surface colors={p.metric} highlight={p.highlight} />
                {tile.key === "milk" ? <MilkIcon size={40} /> : tile.key === "solid" ? <SolidFoodIcon size={40} /> :
                    <View style={styles.metricIcon}>
                        <Surface colors={p.center} radius={20} highlight={p.highlight} />
                        <MetricArtwork kind={tile.key === "time" ? "clock" : "volume"} size={40} />
                    </View>}
                <View style={[styles.metricBody, inline && { flex: 1 }]}><Text style={[styles.metricLabel, inline && styles.alignLeft]}>{tile.label}</Text>
                    <Text style={[styles.value, (tile.value === "Not logged" || tile.value.length > 6) && styles.missingValue, inline && styles.alignLeft]}>{tile.value}</Text></View>
            </View>)}
        </View>)}
    </View>;
}

export default function FeedingBreakdownCard({ date, summary, entriesVisible, onToggleEntries, onOpenEntry, entryTitle, loading, loadFailed, onRetry }) {
    const { colors } = useTheme(), p = colors.feedingBreakdown;
    const styles = useMemo(() => makeStyles(p), [p]);
    const panelId = "feeding-entries-" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
    const unavailable = summary.totalEntries === 0 && (loading || loadFailed);
    return <SectionContainerCard title="Feeding Breakdown" subtitle={shortDate(date)} style={styles.panel}
        titleStyle={styles.title} subtitleStyle={styles.date} headerStyle={styles.header}
        background={<Surface colors={p.panel} radius={28} highlight={p.highlight} />}>
        {unavailable ? <View testID="feeding-breakdown-unavailable" style={styles.unavailable}>
            {loading ? <><SkeletonBlock height={220} radius={110} /><SkeletonBlock height={116} radius={22} /></> : <>
                <Text style={styles.help}>Feeding records could not be loaded.</Text>
                <Control onPress={onRetry} style={styles.retry} accessibilityRole="button" accessibilityLabel="Retry feeding records"><Text style={styles.toggleText}>Retry</Text></Control>
            </>}
        </View> : <>
            <NutritionMixChart summary={summary} />
            <NutritionMixLegend summary={summary} />
            {summary.distribution.excludedMilkEntries > 0 ? <Text testID="feeding-distribution-note" style={styles.distributionNote}>Chart excludes {summary.distribution.excludedMilkEntries} milk {summary.distribution.excludedMilkEntries === 1 ? "entry" : "entries"} without a recorded milk type.</Text> : null}
            <FeedingSummaryMetrics summary={summary} />
            <EntriesButton style={styles.toggle} onPress={onToggleEntries} testID="feeding-entries-toggle"
                label={entriesVisible ? "Hide entries" : "Show entries"} expanded={entriesVisible} aria-controls={panelId} />
            <AnimatedReveal expanded={entriesVisible} duration={260} contentStyle={styles.history}>
                <View nativeID={panelId} aria-hidden={!entriesVisible} testID="feeding-breakdown-history" style={styles.historyRows}>
                    {summary.entries.length === 0 ? <Text style={styles.empty}>No feeding entries logged today.</Text> : null}
                    {summary.entries.map(entry => {
                        const time = shortTime(recordedFeedingTime(entry.time));
                        return <Control key={entry.id} surface="row" radius={22} style={styles.entry}
                        disabled={!entriesVisible} onPress={() => onOpenEntry(entry)} accessibilityRole="button"
                        accessibilityLabel={`View ${entryTitle(entry)}. ${shortDate(entry.date)}${time ? `, ${time}` : ""}`}>
                        {entry.entryType === "solid" ? <SolidFoodIcon size={40} /> : <MilkIcon size={40} />}
                        <View style={styles.entryBody}>
                            <Text style={styles.entryTitle}>{entryTitle(entry)}</Text>
                            <Text style={styles.entryDate}>{shortDate(entry.date)}{time ? ` · ${time}` : ""}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={p.azure} accessible={false} />
                    </Control>;
                    })}
                </View>
            </AnimatedReveal>
        </>}
    </SectionContainerCard>;
}

const makeStyles = p => StyleSheet.create({
    panel: { padding: 16, borderRadius: 28, borderWidth: 0, backgroundColor: p.panel[0], boxShadow: p.panelShadow, overflow: "visible" },
    header: { marginBottom: 8 }, title: { ...type.heading, fontSize: 20, lineHeight: 26, color: p.text }, date: { ...type.caption, color: p.secondary, marginTop: 4 },
    metrics: { gap: 10, overflow: "visible" }, metricRow: { flexDirection: "row", gap: 10, alignItems: "stretch" },
    tile: { flex: 1, minWidth: 0, minHeight: 112, padding: 10, gap: 8, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: p.metric[0], boxShadow: p.itemShadow },
    tileInline: { flexDirection: "row", justifyContent: "flex-start", minHeight: 100 }, metricBody: { minWidth: 0, alignSelf: "stretch", justifyContent: "center" }, alignLeft: { textAlign: "left" },
    metricIcon: { width: 40, height: 40, borderRadius: 20, flexShrink: 0, alignItems: "center", justifyContent: "center", boxShadow: p.itemShadow },
    value: { ...type.heading, fontSize: 22, lineHeight: 28, textAlign: "center", color: p.text }, missingValue: { fontSize: 16, lineHeight: 24 },
    metricLabel: { ...type.caption, lineHeight: 17, color: p.secondary, textAlign: "center" },
    toggle: { marginTop: 18 }, toggleText: { ...type.label, color: p.azure },
    history: { paddingTop: 16, paddingHorizontal: 2, paddingBottom: 10 }, historyRows: { gap: 10 },
    entry: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, minHeight: 64 }, entryBody: { flex: 1, minWidth: 0 },
    entryTitle: { ...type.bodyStrong, fontSize: 15, lineHeight: 21, color: p.text }, entryDate: { ...type.caption, fontSize: 12, color: p.secondary, marginTop: 3 },
    empty: { ...type.caption, color: p.secondary, marginTop: 18, textAlign: "center" }, distributionNote: { ...type.caption, color: p.secondary, marginBottom: 14 }, help: { ...type.caption, color: p.secondary, lineHeight: 20 },
    unavailable: { gap: 16, paddingVertical: 16 }, retry: { alignItems: "center", justifyContent: "center" },
});
