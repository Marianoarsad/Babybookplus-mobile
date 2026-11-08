import SheetGrabber from "./SheetGrabber";
import Button from "./Button";
import RecordIcon from "./RecordIcon";
import Gradient from "./Gradient";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    Animated,
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    useWindowDimensions,
} from "react-native";
import Modal from "./AppModal";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { expandedSheetHeight, recordSheetHeight } from "../../utils/responsive";
import { space, type } from "../../theme";
import { useTheme } from "../../context/ThemeContext";
import { storage } from "../../utils/storageAdapter";
import useBottomSheetMotion from "./useBottomSheetMotion";

// The "+" button's sheet. Lifted out of App.js, which was already very large
// and does not need this component's own storage-backed state.
//
// Two things shape the layout. First, a parent's use of these actions is
// wildly uneven — milk many times a day, a hospital stay perhaps once — but
// the old sheet was nine identical rows in one scrolling list, with the last
// entries below a fold the parent had to discover. Second, the app already
// owns a colour per record type (theme.js's rec* tokens, used on every list
// row elsewhere), and the sheet was rendering all nine icons in one flat
// primary.
//
// `tab` values are deep-link keys read by the destination screen. Health.js
// and Growth.js both follow the same rule: a plain tab name only switches
// tabs, an alias switches AND opens a form. Every entry here is an alias,
// because every entry here is meant to open something.
const ACTIONS = {
    milk: { label: "Milk", category: "milk", view: "nutrition", tab: "milk" },
    food: { label: "Food", category: "food", view: "nutrition", tab: "solid" },
    growth: { label: "Growth", category: "growth", view: "growth", tab: "metrics" },
    vaccine: { label: "Vaccine", category: "vaccine", view: "health", tab: "vaccine" },
    checkup: { label: "Checkup", category: "checkup", view: "health", tab: "checkup" },
    medication: { label: "Medication", category: "medication", view: "health", tab: "medication" },
    illness: { label: "Condition", category: "condition", view: "health", tab: "illness" },
    hospitalization: { label: "Hospital stay", category: "hospitalStay", view: "health", tab: "hospitalization" },
    // One entry, because it opens one form that saves either kind.
    memory: { label: "Photo or milestone", category: "milestone", view: "growth", tab: "memory" },
};

// Fixed groups, in a fixed order. This list must never reorder itself — the
// shortcut row above it is what adapts. If both moved, the muscle memory the
// shortcut exists to build would be destroyed every time the counts shifted.
const GROUPS = [
    { title: "Everyday", keys: ["milk", "food", "growth"] },
    { title: "Health", keys: ["vaccine", "checkup", "medication", "illness", "hospitalization"] },
    { title: "Keepsake", keys: ["memory"] },
];

// Order used to seed the shortcut row before this parent has tapped anything,
// and to break ties afterwards so it never shuffles arbitrarily.
const DEFAULT_ORDER = ["milk", "food", "growth", "vaccine", "checkup", "medication", "illness", "hospitalization", "memory"];
const USAGE_KEY = "bb_action_usage";
const SHORTCUTS = 3;

export default function ActionSheet({ visible, onClose, onSelect }) {
    const { colors } = useTheme();
    const { height: windowHeight, fontScale } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const [availableHeight, setAvailableHeight] = useState(windowHeight);
    const sheetHeight = recordSheetHeight(Math.min(windowHeight, availableHeight), fontScale, insets.top, insets.bottom);
    const expandedHeight = expandedSheetHeight(Math.min(windowHeight, availableHeight), sheetHeight, insets.top);
    const motion = useBottomSheetMotion({ visible, collapsedHeight: sheetHeight, expandedHeight, onClose });
    const dismiss = motion.dismiss;
    const styles = useMemo(() => makeStyles(colors), [colors]);
    const [usage, setUsage] = useState({});

    useEffect(() => {
        storage
            .getItem(USAGE_KEY)
            .then((raw) => {
                if (!raw) return;
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === "object") setUsage(parsed);
            })
            // A corrupt or absent counter must never stop the sheet opening —
            // it just falls back to the default order.
            .catch(() => {});
    }, []);

    const topKeys = useMemo(() => {
        return [...DEFAULT_ORDER]
            .sort((a, b) => {
                const diff = (usage[b] || 0) - (usage[a] || 0);
                return diff !== 0 ? diff : DEFAULT_ORDER.indexOf(a) - DEFAULT_ORDER.indexOf(b);
            })
            .slice(0, SHORTCUTS);
    }, [usage]);

    const choose = useCallback(
        (key) => {
            dismiss(() => {
                const next = { ...usage, [key]: (usage[key] || 0) + 1 };
                setUsage(next);
                storage.setItem(USAGE_KEY, JSON.stringify(next)).catch(() => {});
                const a = ACTIONS[key];
                onSelect(a.view, a.tab);
            });
        },
        [usage, onSelect, dismiss],
    );

    return (
        <Modal visible={motion.presented} transparent animationType="none" onShow={motion.startOpening} onRequestClose={() => motion.dismiss()}>
            <View onLayout={e => setAvailableHeight(e.nativeEvent.layout.height)} style={[styles.root, { paddingTop: Math.max(insets.top, space.md) }]}>
                <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.text + "66", opacity: motion.shade }]} />
                <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    activeOpacity={1}
                    onPress={() => motion.dismiss()}
                    accessibilityRole="button"
                    accessibilityLabel="Close"
                />
                <Animated.View style={[styles.card, { height: motion.height, paddingBottom: Math.max(space.xl, insets.bottom) }]}
                    accessibilityViewIsModal onAccessibilityEscape={() => motion.dismiss()}>
                    <Gradient pointerEvents="none" colors={colors.recordSheet.panel} style={StyleSheet.absoluteFill} />
                    <View>
                        <SheetGrabber motion={motion} />
                        <Text style={styles.title} accessibilityRole="header">
                            Add a record
                        </Text>
                    </View>

                    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                        <Text style={styles.groupTitle} accessibilityRole="header">
                            Most used
                        </Text>
                        <View style={styles.shortcutRow}>
                            {topKeys.map((key) => {
                                const a = ACTIONS[key];
                                return (
                                    <TouchableOpacity
                                        key={key}
                                        style={styles.shortcut}
                                        onPress={() => choose(key)}
                                        accessibilityRole="button"
                                        accessibilityLabel={`Add ${a.label}`}
                                    >
                                        <Gradient pointerEvents="none" colors={colors.recordSheet.row} style={[StyleSheet.absoluteFill, styles.shortcutSurface]} />
                                        <RecordIcon category={a.category} size={44} />
                                        <Text style={styles.shortcutText} numberOfLines={fontScale > 1.3 ? undefined : 2}>
                                            {a.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {GROUPS.map((g) => (
                            <View key={g.title}>
                                <Text style={styles.groupTitle} accessibilityRole="header">
                                    {g.title}
                                </Text>
                                {g.keys.map((key) => {
                                    const a = ACTIONS[key];
                                    return (
                                        <TouchableOpacity
                                            key={key}
                                            style={styles.item}
                                            onPress={() => choose(key)}
                                            accessibilityRole="button"
                                            accessibilityLabel={`Add ${a.label}`}
                                        >
                                            <Gradient pointerEvents="none" colors={colors.recordSheet.row} style={[StyleSheet.absoluteFill, styles.itemSurface]} />
                                            <RecordIcon category={a.category} size={36} />
                                            <Text style={styles.itemText}>{a.label}</Text>
                                            <Ionicons
                                                name="chevron-forward"
                                                size={16}
                                                color={colors.recordSheet.secondary}
                                            />
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        ))}
                    </ScrollView>

                    <Button title="Cancel" style={{ marginTop: space.md }} variant="settingsSecondary" onPress={() => motion.dismiss()} />
                </Animated.View>
            </View>
        </Modal>
    );
}

const makeStyles = (colors) =>
    StyleSheet.create({
        root: { flex: 1, justifyContent: "flex-end" },
        card: {
            width: "100%",
            maxHeight: "100%",
            flexShrink: 1,
            minHeight: 0,
            backgroundColor: colors.recordSheet.panel[0],
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            borderCurve: "continuous",
            overflow: "hidden",
            paddingHorizontal: space.lg,
            paddingTop: space.sm,
            paddingBottom: space.xl,
            boxShadow: colors.recordSheet.shadow,
        },
        title: { ...type.heading, fontSize: type.heading.fontSize * 1.3, lineHeight: type.heading.lineHeight * 1.3,
            color: colors.recordSheet.text, textAlign: "center", marginBottom: space.sm },
        scroll: { flex: 1, minHeight: 0, marginHorizontal: -8 },
        scrollContent: { paddingHorizontal: 8, paddingBottom: 12 },
        groupTitle: {
            ...type.subheading,
            color: colors.recordSheet.secondary,
            marginTop: space.md,
            marginBottom: space.sm,
        },

        // Shortcut row — three equal, larger targets.
        shortcutRow: { flexDirection: "row", gap: space.sm },
        shortcut: {
            flex: 1,
            minWidth: 0,
            alignItems: "center",
            gap: space.xs,
            paddingVertical: space.md,
            borderRadius: 20,
            borderCurve: "continuous",
            backgroundColor: colors.recordSheet.row[0],
            borderWidth: 1,
            borderColor: colors.recordSheet.edge,
            boxShadow: colors.recordSheet.shadow,
            paddingHorizontal: 4,
        },
        shortcutSurface: { borderRadius: 20 },
        itemSurface: { borderRadius: 18 },
        shortcutText: { ...type.label, color: colors.recordSheet.text, textAlign: "center", minHeight: 30 },

        item: {
            flexDirection: "row",
            alignItems: "center",
            gap: space.md,
            minHeight: 52,
            paddingHorizontal: space.md,
            paddingVertical: space.sm,
            borderRadius: 18,
            borderCurve: "continuous",
            backgroundColor: colors.recordSheet.row[0],
            borderWidth: 1,
            borderColor: colors.recordSheet.edge,
            boxShadow: colors.recordSheet.shadow,
            marginBottom: space.sm,
        },
        itemText: { ...type.bodyStrong, color: colors.recordSheet.text, flex: 1 },

    });
