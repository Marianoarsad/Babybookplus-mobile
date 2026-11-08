import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { MIN_TOUCH, type } from "../../theme";
import { durationText, shortTime } from "../../utils/dates";
import { SectionContainerCard } from "../common/Cards";
import Gradient from "./Gradient";
import { MilkIcon, SolidFoodIcon } from "./RecordIcon";

export function recentFeedingAmount(entry) {
    if (entry.entryType === "solid") return "";
    if (entry.feedMethod === "breast") return Number.isFinite(Number(entry.durationMinutes)) && Number(entry.durationMinutes) > 0
        ? durationText(entry.durationMinutes) : "";
    const quantity = Number(entry.quantity);
    const breastmilk = Number(entry.breastmilkQuantity);
    const unit = entry.unit || "mL";
    const hasQuantity = entry.quantity != null && Number.isFinite(quantity) && quantity > 0;
    const hasBreastmilk = entry.breastmilkQuantity != null && Number.isFinite(breastmilk) && breastmilk > 0;
    if (entry.milkType === "Mixed" && hasQuantity && hasBreastmilk) return `${quantity} + ${breastmilk} ${unit}`;
    if (hasQuantity) return `${quantity} ${unit}`;
    return hasBreastmilk ? `${breastmilk} ${unit}` : "";
}

export default function TodaysFeedingOverviewCard({ summary, onViewAll, onOpenEntry }) {
    const { colors } = useTheme();
    const styles = useMemo(() => makeStyles(colors), [colors]);
    const { fontScale } = useWindowDimensions();
    const [width, setWidth] = useState(0);
    const horizontal = width >= 300 * fontScale;
    const recent = summary.entries.slice(0, 3);
    return <SectionContainerCard title="Today’s Feeding" icon={<MilkIcon size={40} />}
        style={styles.panel} titleStyle={styles.title} headerStyle={styles.header}
        background={<Gradient pointerEvents="none" colors={colors.feedingToday.panel}
            style={[StyleSheet.absoluteFill, { borderRadius: 26 }]} />}
        action={<Pressable onPress={onViewAll} accessibilityRole="button" accessibilityLabel="View all nutrition records"
            style={styles.viewAll}>
            <Gradient pointerEvents="none" colors={colors.feedingToday.time} style={[StyleSheet.absoluteFill, styles.pillBackground]} />
            <Text style={styles.viewAllText}>View All</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.feedingToday.accent} />
        </Pressable>}>
        <View testID="today-feeding-overview-body" onLayout={event => setWidth(event.nativeEvent.layout.width)}
            style={[styles.body, !horizontal && styles.bodyStacked]}>
            <View accessible accessibilityLabel={`${summary.totalEntries} ${summary.totalEntries === 1 ? "feed" : "feeds"} logged today`}
                style={[styles.feedCount, horizontal && styles.feedCountSpacing]}>
                <Text style={styles.count}>{summary.totalEntries}</Text>
                <Text style={styles.countLabel}>{summary.totalEntries === 1 ? "feed" : "feeds"}</Text>
            </View>
            <View style={styles.records}>
                {recent.length ? recent.map(entry => {
                    const amount = recentFeedingAmount(entry);
                    const kind = entry.entryType === "solid" ? "Solid food" : entry.milkType === "Breastmilk" ? "Breast milk" : entry.milkType || "Milk";
                    const time = shortTime(entry.time) || "Time not recorded";
                    return <Pressable key={entry.id} testID="today-feeding-overview-entry" onPress={() => onOpenEntry(entry.id)}
                        accessibilityRole="button" accessibilityLabel={`${time}, ${kind}${amount ? `, ${amount}` : ""}. View feeding record`}
                        style={styles.record}>
                        <Gradient pointerEvents="none" colors={colors.recordItem.surface} style={[StyleSheet.absoluteFill, styles.recordBackground]} />
                        {entry.entryType === "solid" ? <SolidFoodIcon size={30} /> : <MilkIcon size={30} />}
                        <View style={styles.recordText}>
                            <Text style={styles.time}>{time}</Text>
                            <Text style={styles.kind} numberOfLines={1}>{kind}</Text>
                        </View>
                        {amount ? <Text style={styles.amount}>{amount}</Text> : null}
                        <Ionicons name="chevron-forward" size={15} color={colors.feedingToday.secondary} />
                    </Pressable>;
                }) : <Text style={styles.empty}>No feedings recorded today.</Text>}
            </View>
        </View>
    </SectionContainerCard>;
}

const makeStyles = colors => {
    const p = colors.feedingToday;
    return StyleSheet.create({
        panel: { padding: 16, borderRadius: 26, backgroundColor: p.panel[0], boxShadow: p.panelShadow, overflow: "visible" },
        header: { marginBottom: 12 },
        title: { ...type.title, color: p.text, fontSize: 18 },
        viewAll: { minHeight: MIN_TOUCH, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5,
            paddingHorizontal: 13, borderRadius: 22, backgroundColor: p.time[0], boxShadow: p.tileShadow, overflow: "visible" },
        pillBackground: { borderRadius: 22 }, viewAllText: { ...type.bodyStrong, color: p.accent },
        body: { flexDirection: "row", alignItems: "center", gap: 10 },
        bodyStacked: { flexDirection: "column", alignItems: "stretch" },
        feedCount: { width: 92, minHeight: 60, alignItems: "center", justifyContent: "center", flexShrink: 0, alignSelf: "center" },
        feedCountSpacing: { marginRight: 14 },
        count: { ...type.title, color: p.text, fontSize: 25, lineHeight: 30 },
        countLabel: { ...type.caption, color: p.secondary },
        records: { flex: 1, minWidth: 0, gap: 8, alignSelf: "stretch", justifyContent: "center" },
        record: { minHeight: 50, flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 9,
            paddingVertical: 6, borderRadius: 18, backgroundColor: colors.recordItem.surface[0], boxShadow: p.tileShadow },
        recordBackground: { borderRadius: 18 },
        recordText: { flex: 1, minWidth: 0 },
        time: { ...type.bodyStrong, color: p.text },
        kind: { ...type.caption, color: p.secondary },
        amount: { ...type.bodyStrong, color: p.text, textAlign: "right", maxWidth: 82, flexShrink: 1 },
        empty: { ...type.body, color: p.secondary, textAlign: "center", paddingVertical: 12 },
    });
};
