import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Image, Platform, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ScrollContext from "../../context/ScrollContext";
import { useTheme } from "../../context/ThemeContext";
import { useLanguage } from "../../context/LanguageContext";
import { MIN_TOUCH, type } from "../../theme";
import { dateEndpointBounds, numericDateRange, shortDate, todayLocal, toLocalISO } from "../../utils/dates";
import { commitFilterDate, dateFilterDraft, dateFilterError, nutritionPreset } from "../../utils/dateFilter";
import AnchoredMenu from "./AnchoredMenu";
import AnimatedReveal from "./AnimatedReveal";
import { DashboardControl } from "./ConsultationsAppointmentsCard";
import { DateWheelPicker } from "./DateField";

const PRESETS = ["week", "month", "year"];
const PRESET_LABELS = { week: "growthWeekShort", month: "growthMonthShort", year: "growthYearShort" };
const CALENDAR = require("../../assets/navbar/calendar-blue.png");

export function nutritionDateView(saved, minimumDate, referenceDate = todayLocal()) {
    const today = String(referenceDate).slice(0, 10);
    const year = Number(today.slice(0, 4));
    if (saved?.dateRange?.from && saved?.dateRange?.to) {
        return {
            dateRange: saved.dateRange,
            preset: ["week", "month", "year"].includes(saved.preset) ? saved.preset : null,
            yearRange: saved.yearRange || { from: year, to: year },
        };
    }
    const start = new Date(`${today}T00:00:00`);
    start.setDate(start.getDate() - 29);
    const rollingFrom = toLocalISO(start);
    const from = minimumDate && minimumDate > rollingFrom && minimumDate <= today
        ? minimumDate
        : rollingFrom;
    return {
        dateRange: { from, to: today },
        preset: null,
        yearRange: { from: year, to: year },
    };
}

export default function NutritionDateFilter({ value, onChange, minimumDate, availableDates = [], context = "nutrition", referenceDate }) {
    const { colors } = useTheme(), p = colors.appointmentDashboard;
    const { t } = useLanguage();
    const scope = ["solid", "milk", "growth"].includes(context) ? context : "nutrition";
    const copyKey = { solid: "SolidFood", milk: "Milk", growth: "Growth", nutrition: "Nutrition" }[scope];
    const testPrefix = `${scope}-date`;
    const { width, height, fontScale } = useWindowDimensions();
    const scale = Math.min(1.5, Math.max(1, width / 400));
    const styles = useMemo(() => makeStyles(p, scale, width, fontScale), [p, scale, width, fontScale]);
    const { scrollY, headerHeight, tabBarHeight } = useContext(ScrollContext);
    const trigger = useRef(null);
    const [open, setOpen] = useState(false), [anchor, setAnchor] = useState(null);
    const [draft, setDraft] = useState(() => dateFilterDraft(value));
    const [customOpen, setCustomOpen] = useState(false), [picker, setPicker] = useState(null);
    const today = referenceDate || todayLocal();
    const minDate = minimumDate && minimumDate <= today ? minimumDate : null;
    const earliest = minDate?.slice(0, 4) || availableDates.slice().sort()[0]?.slice(0, 4) || today.slice(0, 4);
    const years = Array.from({ length: Math.max(1, Number(today.slice(0, 4)) - Number(earliest) + 1) }, (_, i) => Number(earliest) + i);
    const range = numericDateRange(value.dateRange.from, value.dateRange.to);
    const error = dateFilterError(draft, minDate, today, years);
    const bounds = dateEndpointBounds(draft.dateRange, picker, minDate, today);
    const updateAnchor = useCallback(() => trigger.current?.measureInWindow((x, y, measuredWidth, measuredHeight) => {
        if (y + measuredHeight < headerHeight || y >= height - tabBarHeight) { setOpen(false); return; }
        setAnchor(previous => previous?.x === x && previous?.y === y && previous?.width === measuredWidth && previous?.height === measuredHeight
            ? previous : { x, y, width: measuredWidth, height: measuredHeight });
    }), [headerHeight, height, tabBarHeight]);

    useEffect(() => {
        if (!open) return;
        updateAnchor();
        const listener = scrollY.addListener(updateAnchor);
        const observer = Platform.OS === "web" && globalThis.ResizeObserver ? new globalThis.ResizeObserver(updateAnchor) : null;
        let node = trigger.current;
        while (observer && node?.nodeType === 1) { observer.observe(node); node = node.parentElement; }
        return () => { scrollY.removeListener(listener); observer?.disconnect(); };
    }, [open, width, height, fontScale, headerHeight, tabBarHeight, scrollY, updateAnchor]);

    const close = () => { if (picker) setPicker(null); else setOpen(false); };
    const openPopover = () => trigger.current?.measureInWindow((x, y, measuredWidth, measuredHeight) => {
        setAnchor({ x, y, width: measuredWidth, height: measuredHeight });
        setDraft(dateFilterDraft(value)); setCustomOpen(false); setPicker(null); setOpen(true);
    });
    const apply = next => {
        onChange({ dateRange: { ...next.dateRange }, preset: next.preset, yearRange: { ...next.yearRange } });
        setOpen(false);
    };
    const choosePreset = key => {
        const next = nutritionPreset(key, { ...draft, preset: null }, { today, minimumDate: minDate, availableDates, years });
        if (!dateFilterError(next, minDate, today, years)) apply(next);
    };
    const field = endpoint => <View key={endpoint} style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>{t(endpoint === "from" ? "growthStartingDate" : "growthEndingDate")}</Text>
        <DashboardControl testID={`${testPrefix}-${endpoint}`} material={p.all} radius={16} style={styles.dateField}
            onPress={() => setPicker(endpoint)} accessibilityRole="button"
            {...(Platform.OS === "web" ? { tabIndex: customOpen ? 0 : -1 } : {})}
            accessibilityLabel={`${t(endpoint === "from" ? "growthStartingDate" : "growthEndingDate")}: ${shortDate(draft.dateRange?.[endpoint])}`}>
            <Text style={styles.dateValue}>{shortDate(draft.dateRange?.[endpoint])}</Text>
            <Ionicons name="calendar-outline" size={Math.round(17 * scale)} color={p.azure} />
        </DashboardControl>
    </View>;

    return <>
        <View ref={trigger} onLayout={open ? updateAnchor : undefined} collapsable={false}>
            <DashboardControl testID={`${testPrefix}-trigger`} material={p.all} radius={MIN_TOUCH / 2} style={styles.trigger}
                onPress={openPopover} accessibilityRole="button" accessibilityState={{ expanded: open }}
                accessibilityLabel={`Filter ${scope === "solid" ? "solid food" : scope} dates, ${range}`}>
                <Image source={CALENDAR} style={styles.calendar} resizeMode="contain" accessible={false} />
            </DashboardControl>
        </View>
        <AnchoredMenu visible={open} anchor={anchor} onClose={close} appearance="neumorphic"
            maxWidth={Math.min(540, Math.max(340, width * 0.84))}
            bottomClearance={tabBarHeight} dimBackdrop={false} viewport={{ width, height }}>
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <Ionicons name="stats-chart" size={Math.round(25 * scale)} color={p.azure} accessible={false} />
                    <Text accessibilityRole="header" style={styles.title}>{t(`dateFilter${copyKey}Title`)}</Text>
                    <DashboardControl material={p.all} radius={MIN_TOUCH * scale / 2}
                        faceSize={Math.round(36 * scale)} style={styles.close} onPress={close}
                        accessibilityRole="button" accessibilityLabel="Close date filter">
                        <Ionicons name="close" size={Math.round(21 * scale)} color={p.azure} />
                    </DashboardControl>
                </View>
                <Text style={styles.subtitle}>{t(`dateFilter${copyKey}Help`)}</Text>
            </View>
            <Text style={styles.sectionTitle}>{t("growthQuickActions")}</Text>
            <View style={styles.presets}>
                {PRESETS.map(key => <DashboardControl key={key} testID={`${testPrefix}-preset-${key}`}
                    material={{ surface: p.all.surface, active: p.dateFilterActive }} radius={20}
                    active={draft.preset === key} style={styles.preset} onPress={() => choosePreset(key)}
                    accessibilityRole="button" accessibilityState={{ selected: draft.preset === key }}
                    accessibilityLabel={t(PRESET_LABELS[key])}>
                    <Ionicons name="calendar-outline" size={Math.round(15 * scale)}
                        color={draft.preset === key ? p.dateFilterActiveText : p.azure} accessible={false} />
                    <Text style={[styles.presetText, draft.preset === key && { color: p.dateFilterActiveText }]}>{t(PRESET_LABELS[key])}</Text>
                </DashboardControl>)}
            </View>
            <View style={styles.divider}><View style={styles.line} /><Text style={styles.or}>OR</Text><View style={styles.line} /></View>
            <DashboardControl testID={`${testPrefix}-custom-toggle`} material={p.all} radius={16} style={styles.customToggle}
                onPress={() => setCustomOpen(current => !current)} accessibilityRole="button"
                accessibilityState={{ expanded: customOpen }}>
                <View style={styles.customCopy}>
                    <Text style={styles.sectionTitle}>{t("dateFilterCustomRange")}</Text>
                    <Text style={styles.subtitle}>{t("dateFilterNutritionCustomHelp")}</Text>
                </View>
                <Ionicons name={customOpen ? "chevron-up" : "chevron-down"} size={Math.round(19 * scale)} color={p.azure} />
            </DashboardControl>
            <View aria-hidden={!customOpen} accessibilityElementsHidden={!customOpen}
                importantForAccessibility={customOpen ? "auto" : "no-hide-descendants"}>
            <AnimatedReveal expanded={customOpen} contentStyle={styles.customBody}>
                <View style={styles.fields}>{["from", "to"].map(field)}</View>
                {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
                <View style={styles.footer}>
                    <DashboardControl material={p.all} radius={20} style={styles.footerButton} onPress={() => setOpen(false)}
                        accessibilityRole="button" accessibilityLabel={t("cancel")}
                        {...(Platform.OS === "web" ? { tabIndex: customOpen ? 0 : -1 } : {})}>
                        <Text style={styles.actionText}>{t("cancel")}</Text>
                    </DashboardControl>
                    <DashboardControl testID={`${testPrefix}-apply`} material={{ surface: p.dateFilterActive }} radius={20}
                        style={[styles.footerButton, !!error && styles.disabled]} disabled={!!error}
                        onPress={() => { if (!error) apply(draft); }} accessibilityRole="button"
                        {...(Platform.OS === "web" ? { tabIndex: customOpen ? 0 : -1 } : {})}
                        accessibilityState={{ disabled: !!error }} accessibilityLabel={t("dateFilterApply")}>
                        <Text style={[styles.actionText, { color: p.dateFilterActiveText }]}>{t("dateFilterApply")}</Text>
                    </DashboardControl>
                </View>
            </AnimatedReveal>
            </View>
        </AnchoredMenu>
        {/* Mount after the filter portal so the date wheel stays above it on web. */}
        {open && picker ? <DateWheelPicker visible value={draft.dateRange?.[picker] || today}
            minimumDate={bounds.min || undefined} maximumDate={bounds.max || undefined} availableDates={availableDates}
            accessibilityLabel={t(picker === "to" ? "growthEndingDate" : "growthStartingDate")}
            onChange={selected => setDraft(current => commitFilterDate(current, picker, selected))}
            onClose={() => setPicker(null)} /> : null}
    </>;
}

const makeStyles = (p, scale, width, fontScale) => {
    const s = value => Math.round(value * scale);
    const stackedFields = width < 340 || (width < 390 && fontScale > 1.25);
    return StyleSheet.create({
    trigger: { width: MIN_TOUCH, height: MIN_TOUCH, alignItems: "center", justifyContent: "center" },
    calendar: { width: 27, height: 27 },
    header: { gap: s(2) },
    headerTop: { flexDirection: "row", alignItems: "center", gap: s(8) },
    title: { ...type.bodyStrong, color: p.text, fontSize: s(15), lineHeight: s(20), flex: 1, minWidth: 0 },
    subtitle: { ...type.caption, color: p.secondary, fontSize: s(11), lineHeight: s(16) },
    close: { width: s(MIN_TOUCH), height: s(MIN_TOUCH), alignItems: "center", justifyContent: "center", flexShrink: 0 },
    sectionTitle: { ...type.label, color: p.text, fontSize: s(13), lineHeight: s(18) },
    presets: { flexDirection: "row", gap: s(7) },
    preset: { flex: 1, minWidth: 0, height: s(44), flexDirection: "row", gap: s(4), alignItems: "center", justifyContent: "center", paddingHorizontal: s(4) },
    presetText: { ...type.label, fontSize: s(12), lineHeight: s(17), color: p.azure, textAlign: "center", flexShrink: 1 },
    divider: { flexDirection: "row", alignItems: "center", gap: s(10) },
    line: { height: StyleSheet.hairlineWidth, backgroundColor: p.divider, flex: 1 },
    or: { ...type.caption, color: p.secondary, fontSize: s(10), lineHeight: s(13) },
    customToggle: { flexDirection: "row", alignItems: "center", gap: s(8), paddingHorizontal: s(8), paddingVertical: s(4) },
    customCopy: { flex: 1, minWidth: 0, gap: s(2) },
    customBody: { gap: s(9), paddingTop: s(9) },
    fields: { flexDirection: stackedFields ? "column" : "row", gap: s(8) },
    fieldGroup: { flex: stackedFields ? undefined : 1, minWidth: 0, gap: s(5) },
    fieldLabel: { ...type.caption, color: p.secondary, fontSize: s(11), lineHeight: s(15) },
    dateField: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: s(4), paddingHorizontal: s(10), height: s(44) },
    dateValue: { ...type.caption, fontSize: s(11), lineHeight: s(16), color: p.text, flexShrink: 1 },
    error: { ...type.caption, color: p.overdue.ink },
    footer: { flexDirection: "row", justifyContent: "flex-end", gap: s(8) },
    footerButton: { minWidth: s(78), height: s(44), alignItems: "center", justifyContent: "center", paddingHorizontal: s(12) },
    actionText: { textAlign: "center", ...type.label, fontSize: s(12), color: p.azure },
    disabled: { opacity: 0.5 },
});
};
