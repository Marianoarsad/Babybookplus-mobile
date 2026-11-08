import RecordIcon, { HospitalStayIcon, VaccineIcon } from "./RecordIcon";
import React, { useId, useMemo, useState } from "react";
import { Animated, Image, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { MIN_TOUCH, space, type } from "../../theme";
import AnimatedReveal from "./AnimatedReveal";
import Gradient from "./Gradient";
import useSoftPress from "./useSoftPress";

const WARNING = require("../../assets/attention/warning.png");

function Surface({ colors, radius, highlight }) {
    return <Gradient pointerEvents="none" accessible={false} colors={colors}
        style={[StyleSheet.absoluteFill, { borderRadius: radius, boxShadow: `inset 1px 2px 3px ${highlight}` }]} />;
}

function Control({ kind = "row", radius = 22, style, children, ...props }) {
    const { colors } = useTheme();
    const p = colors.attentionSurface;
    const { respond, transform } = useSoftPress();
    const [pressed, setPressed] = useState(false), [focused, setFocused] = useState(false);
    const focus = event => setFocused(Platform.OS === "web" && Boolean(event.currentTarget?.matches?.(":focus-visible")));
    const press = down => { setPressed(down); respond(down); };
    return <Pressable {...props} onPressIn={() => press(true)} onPressOut={() => press(false)} onFocus={focus} onKeyDown={focus}
        onBlur={() => { setFocused(false); press(false); }}
        style={[{ minHeight: MIN_TOUCH, borderRadius: radius }, style, !kind && pressed && { opacity: 0.72 },
            Platform.OS === "web" && { outlineStyle: focused ? "solid" : "none", outlineWidth: 2, outlineOffset: 3, outlineColor: p.focus }]}>
        {kind ? <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius,
            backgroundColor: p[kind][0], transform, boxShadow: pressed ? p.pressedShadow : kind === "control" ? p.controlShadow : p.rowShadow }]}>
            <Surface colors={p[kind]} radius={radius} highlight={p.highlight} />
        </Animated.View> : null}
        {children}
    </Pressable>;
}

function FoldSymbol({ collapsed }) {
    const { colors } = useTheme();
    return <Ionicons name={collapsed ? "chevron-down" : "chevron-up"} size={22} color={colors.attentionSurface.chevron}
        pointerEvents="none" accessible={false} style={{ position: "relative", zIndex: 1 }} />;
}

export default function NeedsAttentionCard({ items, collapsed, onToggle, onOpenItem, onSeeAll }) {
    const { colors } = useTheme();
    const p = colors.attentionSurface;
    const styles = useMemo(() => makeStyles(colors), [colors]);
    const { fontScale } = useWindowDimensions();
    const [headerWidth, setHeaderWidth] = useState(0);
    const stacked = headerWidth > 0 && headerWidth - 100 < 112 * fontScale;
    const panelId = "attention-content-" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
    if (!items.length) return null;
    const heading = <View style={[styles.heading, stacked && styles.headingStacked]} testID="attention-heading">
        <Text style={styles.title}>Needs Attention</Text>
        <View style={styles.count} accessibilityLabel={`${items.length} items need attention`}>
            <Surface colors={p.count} radius={999} highlight={p.highlight} />
            <Text testID="attention-count" style={styles.countText}>{items.length}</Text>
        </View>
    </View>;
    return <View testID="needs-attention-card" style={styles.panel}>
        <View pointerEvents="none" accessible={false} style={styles.background} testID="attention-background">
            <Surface colors={p.panel} radius={28} highlight={p.highlight} />
            <Gradient colors={p.topTint} locations={[0, 0.45, 1]} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
                style={styles.topTint} testID="attention-top-tint" />
        </View>
        <View style={styles.header} testID="attention-header">
            <View style={[styles.headerRow, stacked && styles.headerStacked]} onLayout={e => setHeaderWidth(Math.round(e.nativeEvent.layout.width))}>
                <View style={styles.warning} pointerEvents="none" accessible={false}>
                    <Image source={WARNING} resizeMode="contain" accessible={false} style={{ width: 32, height: 32 }} />
                </View>
                {!stacked ? heading : null}
                <Control kind="control" radius={22} style={styles.toggle} onPress={onToggle} testID="attention-toggle"
                    accessibilityRole="button" accessibilityLabel={collapsed ? "Expand Needs attention" : "Minimize Needs attention"}
                    accessibilityState={{ expanded: !collapsed }} aria-expanded={!collapsed} aria-controls={panelId}>
                    <FoldSymbol collapsed={collapsed} />
                </Control>
            </View>
            {stacked ? heading : null}
        </View>
        <AnimatedReveal expanded={!collapsed} duration={260} contentStyle={styles.content}>
            <View nativeID={panelId} aria-hidden={collapsed} testID="attention-records">
                <View style={styles.rows}>
                    {items.slice(0, 3).map(item => <Control key={item.key} style={styles.row} disabled={collapsed} testID={`attention-item-${item.key}`}
                        onPress={() => onOpenItem(item)} accessibilityRole="button"
                        accessibilityLabel={`${item.title}. ${item.sub}.${item.dateText ? ` ${item.dateText}.` : ""}`}>
                        {item.recordType === "hospitalization" ? <HospitalStayIcon size={44} /> : item.tab === "immunizations" ? <VaccineIcon size={44} /> : item.tab === "illnesses" ? <RecordIcon category="condition" size={44} /> : <View style={[styles.otherIcon, { backgroundColor: item.tint.bg }]}>
                            <Ionicons name={item.icon} size={22} color={item.tint.on} />
                        </View>}
                        <View style={styles.recordBody}>
                            <Text style={styles.recordTitle}>{item.title}</Text>
                            <Text style={[styles.recordSub, { color: item.tab === "immunizations" ? p.overdue : item.tone }]}>{item.sub}</Text>
                            {item.dateText ? <Text style={[styles.recordSub, { color: item.tone, marginTop: 3 }]}>{item.dateText}</Text> : null}
                        </View>
                        <View style={styles.chevron} pointerEvents="none" accessible={false}>
                            <Surface colors={p.navigation} radius={18} highlight={p.highlight} />
                            <Ionicons name="chevron-forward" size={22} color={p.chevron} />
                        </View>
                    </Control>)}
                </View>
                {items.length > 3 ? <Control kind={null} radius={12} style={styles.footer} disabled={collapsed} onPress={onSeeAll}
                    testID="attention-see-all" accessibilityRole="button" accessibilityLabel={`See all ${items.length} items needing attention`}>
                    <Text style={styles.footerText}>See all {items.length}</Text>
                    <Ionicons name="chevron-forward" size={22} color={p.overdue} />
                </Control> : null}
            </View>
        </AnimatedReveal>
    </View>;
}

const makeStyles = colors => {
    const p = colors.attentionSurface;
    return StyleSheet.create({
        panel: { padding: 12, borderRadius: 28, backgroundColor: p.panel[0], boxShadow: p.panelShadow, overflow: "visible", marginBottom: space.lg },
        background: { ...StyleSheet.absoluteFill, borderRadius: 28, overflow: "hidden" },
        topTint: { position: "absolute", top: 0, left: 0, right: 0, height: 88 },
        header: { padding: 10, gap: 8 },
        headerRow: { flexDirection: "row", alignItems: "center", gap: 8 }, headerStacked: { justifyContent: "space-between" },
        warning: { width: 40, height: 40, alignItems: "center", justifyContent: "center", flexShrink: 0 },
        heading: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 6 },
        headingStacked: { flex: 0, alignSelf: "stretch", flexWrap: "wrap" },
        title: { ...type.bodyStrong, fontSize: 17, lineHeight: 23, color: p.title, flexShrink: 1 },
        count: { minWidth: 28, minHeight: 28, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, alignItems: "center", justifyContent: "center", boxShadow: p.countShadow },
        countText: { ...type.bodyStrong, color: p.onCount, fontVariant: ["tabular-nums"] },
        toggle: { width: 44, height: 44, alignItems: "center", justifyContent: "center", flexShrink: 0 },
        content: { paddingHorizontal: 4, paddingTop: 14, paddingBottom: 2 }, rows: { gap: 12 },
        row: { flexDirection: "row", alignItems: "center", padding: 12, gap: 12, minHeight: 72 },
        otherIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", flexShrink: 0 },
        recordBody: { flex: 1, minWidth: 0 }, recordTitle: { ...type.bodyStrong, color: p.text }, recordSub: { ...type.caption, marginTop: 2 },
        chevron: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: p.navigationShadow },
        footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 2, paddingTop: 8,
            minHeight: 48, marginTop: 14, borderTopWidth: 1, borderTopColor: p.divider }, footerText: { ...type.bodyStrong, color: p.overdue },
    });
};
