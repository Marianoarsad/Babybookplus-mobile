import { useGlassTarget } from "../../context/GlassTargetContext";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Modal from "./AppModal";
import { Ionicons } from "@expo/vector-icons";
import { MIN_TOUCH, radius, shadow, space, type } from "../../theme";
import { useTheme } from "../../context/ThemeContext";
import { useRecordForm } from "./RecordFormSheet";
import { FieldShell } from "./Field";
import { shortDate, todayLocal } from "../../utils/dates";
import {
    availablePickerDates,
    closestAvailableDate,
    durationParts,
    durationValue,
    pickerDateParts,
    pickerDateValue,
    pickerYears,
    timeParts,
    timeValue,
} from "../../utils/pickers";
import numericInput from "../../utils/numericInput.cjs";
import Gradient from "./Gradient";
import GlassLighting from "./GlassLighting";
import useReducedMotion from "./useReducedMotion";

const {
    measurementFractions,
    measurementParts,
    measurementValue,
    measurementWholeValues,
} = numericInput;

const MONTHS = Array.from({ length: 12 }, (_, month) =>
    new Date(2026, month, 1).toLocaleDateString(undefined, { month: "long" }),
);
const pad = (value) => String(value).padStart(2, "0");

function clampDate(value, minimumDate, maximumDate) {
    const fallback = value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : todayLocal();
    if (minimumDate && fallback < minimumDate) return minimumDate;
    if (maximumDate && fallback > maximumDate) return maximumDate;
    return fallback;
}

function wheelGeometry(scale = 1, compact = false) {
    const row = Math.max(compact ? 44 : 64, Math.ceil((compact ? 30 : 44) * scale + 8));
    const viewport = Math.max(192, row * 3), frame = Math.max(240, viewport);
    return { row, viewport, frame, padding: (viewport - row) / 2, top: (frame - row) / 2 };
}
function WheelColumn({ values, value, onChange, format = String, label, styles, compact = false, weight = 1, active, disabled = false, reducedMotion = false }) {
    const index = Math.max(0, values.indexOf(value));
    const [columnWidth, setColumnWidth] = useState(0);
    const dateFontSize = compact && columnWidth > 0
        ? Math.min(24, (columnWidth - 8) / (Math.max(1, ...values.map(item => format(item).length)) * 0.6)) : 24;
    const { fontScale = 1 } = useWindowDimensions();
    const geometry = wheelGeometry(fontScale, compact);
    const itemHeight = geometry.row;
    const scrollRef = useRef(null);
    const draggingRef = useRef(false);
    const positionedRef = useRef(false);
    const programmaticRef = useRef(false);
    const programmaticTargetRef = useRef(index * itemHeight);
    const programmaticTimer = useRef(null);
    const offsetRef = useRef(index * itemHeight);
    const settleTimer = useRef(null);
    const clearSettle = () => {
        if (settleTimer.current) clearTimeout(settleTimer.current);
        settleTimer.current = null;
    };
    const selectAtOffset = (offset = offsetRef.current) => {
        if (disabled) return;
        const nextIndex = Math.max(0, Math.min(values.length - 1, Math.round(offset / itemHeight)));
        if (values[nextIndex] !== value) onChange(values[nextIndex]);
    };
    const scheduleSelection = () => {
        clearSettle();
        settleTimer.current = setTimeout(selectAtOffset, 100);
    };
    const clearProgrammatic = () => {
        if (programmaticTimer.current) clearTimeout(programmaticTimer.current);
        programmaticTimer.current = null;
        programmaticRef.current = false;
    };
    const scheduleProgrammaticEnd = (delay = 120) => {
        if (programmaticTimer.current) clearTimeout(programmaticTimer.current);
        programmaticTimer.current = setTimeout(() => {
            programmaticTimer.current = null;
            programmaticRef.current = false;
            offsetRef.current = programmaticTargetRef.current;
        }, delay);
    };
    const scrollToValue = () => {
        if (!active) {
            positionedRef.current = false;
            clearProgrammatic();
            return;
        }
        const target = index * itemHeight;
        const animated = !reducedMotion && positionedRef.current && Math.abs(offsetRef.current - target) > 1;
        if (animated) {
            clearSettle();
            programmaticRef.current = true;
            programmaticTargetRef.current = target;
            scrollRef.current?.scrollTo({ x: 0, y: target, animated: true });
            scheduleProgrammaticEnd(400);
        } else if (!positionedRef.current || reducedMotion) {
            clearProgrammatic();
            offsetRef.current = target;
            scrollRef.current?.scrollTo({ x: 0, y: target, animated: false });
        }
        positionedRef.current = true;
    };
    const positionOnLayout = () => {
        if (!active) return;
        const target = index * itemHeight;
        clearProgrammatic();
        offsetRef.current = target;
        positionedRef.current = true;
        scrollRef.current?.scrollTo({ x: 0, y: target, animated: false });
    };
    useEffect(scrollToValue, [active, index, itemHeight, reducedMotion]);
    useEffect(() => () => {
        clearSettle();
        clearProgrammatic();
    }, []);
    return (
        <View style={[styles.wheelColumn, compact && styles.dateWheelColumn, { flex: weight, height: geometry.viewport }]} accessibilityLabel={label}
            onLayout={compact ? event => setColumnWidth(event.nativeEvent.layout.width) : undefined}>
            <ScrollView
                ref={scrollRef}
                style={[styles.wheelScroll, compact && styles.dateWheelScroll, { height: geometry.viewport, flexGrow: 0, flexShrink: 0 }]}
                contentContainerStyle={[styles.wheelContent, compact && styles.dateWheelContent, { paddingVertical: geometry.padding }]}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
                scrollEnabled={!disabled}
                snapToInterval={itemHeight}
                decelerationRate="normal"
                onLayout={positionOnLayout}
                scrollEventThrottle={16}
                onScroll={({ nativeEvent }) => {
                    offsetRef.current = nativeEvent.contentOffset.y;
                    if (programmaticRef.current) {
                        scheduleProgrammaticEnd();
                        return;
                    }
                    if (!draggingRef.current) scheduleSelection();
                }}
                onScrollBeginDrag={() => {
                    clearProgrammatic();
                    draggingRef.current = true;
                    clearSettle();
                }}
                onScrollEndDrag={({ nativeEvent }) => {
                    draggingRef.current = false;
                    offsetRef.current = nativeEvent.contentOffset.y;
                    scheduleSelection();
                }}
                onMomentumScrollBegin={clearSettle}
                onMomentumScrollEnd={({ nativeEvent }) => {
                    clearSettle();
                    clearProgrammatic();
                    offsetRef.current = nativeEvent.contentOffset.y;
                    selectAtOffset();
                }}
            >
                {values.map((item, itemIndex) => (
                    <TouchableOpacity
                        disabled={disabled}
                        key={item == null ? `empty-${itemIndex}` : item}
                        style={[
                            styles.wheelItem,
                            compact && styles.dateWheelItem, { height: itemHeight },
                        ]}
                        onPress={() => item !== value && onChange(item)}
                        accessibilityRole="button"
                        accessibilityLabel={`${label} ${format(item)}`}
                        accessibilityState={{ selected: item === value, disabled }}
                        aria-pressed={compact ? item === value : undefined}
                    >
                        <Text numberOfLines={compact ? 1 : undefined} adjustsFontSizeToFit={compact} style={[
                            styles.wheelText,
                            compact && styles.dateWheelText,
                            compact && item === value && styles.dateWheelTextSelected,
                            item !== value && styles.wheelTextMuted,
                            compact && item !== value && styles.dateWheelTextMuted,
                            compact && { fontSize: dateFontSize },
                            compact && { opacity: item === value ? 1 : Math.abs(itemIndex - index) === 1 ? 0.76 : 0.44 },
                        ]}>{format(item)}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
}

function TextButton({ label, onPress, styles }) {
    return <TouchableOpacity style={styles.textButton} onPress={onPress} accessibilityRole="button"><Text style={styles.textButtonLabel}>{label}</Text></TouchableOpacity>;
}

function PrimaryButton({ label, onPress, styles, disabled = false, material }) {
    return <TouchableOpacity style={[styles.primaryButton, disabled && styles.primaryButtonDisabled]} disabled={disabled} onPress={onPress} accessibilityRole="button" accessibilityState={{ disabled }}>
        {material ? <View pointerEvents="none" accessible={false} style={[StyleSheet.absoluteFill, { borderRadius: radius.pill, overflow: "hidden" }]}>
            <Gradient colors={material.active} style={StyleSheet.absoluteFill} />
            <GlassLighting material={material} radius={999} />
        </View> : null}
        <Text style={styles.primaryButtonLabel}>{label}</Text></TouchableOpacity>;
}

function WheelPickerModal({ visible, onClose, blurTarget, accessibilityLabel, children }) {
    const { colors, scheme } = useTheme();
    const material = useMemo(() => ({ ...colors.dateWheelGlass, ...colors.overlayGlass }), [colors]);
    const { fontScale = 1 } = useWindowDimensions();
    const styles = useMemo(() => dateWheelStyles(colors, fontScale), [colors, fontScale]);
    const inheritedTarget = useGlassTarget();
    blurTarget = blurTarget ?? inheritedTarget;
    const { height } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const reducedMotion = useReducedMotion(visible);
    const [reduceTransparency, setReduceTransparency] = useState(false);
    useEffect(() => {
        if (!visible) return;
        const media = Platform.OS === "web" && globalThis.matchMedia?.("(prefers-reduced-transparency: reduce)");
        if (media) {
            const update = event => setReduceTransparency(event.matches);
            setReduceTransparency(media.matches); media.addEventListener?.("change", update);
            return () => media.removeEventListener?.("change", update);
        }
        if (Platform.OS !== "ios") return;
        let active = true;
        AccessibilityInfo.isReduceTransparencyEnabled?.().then(value => active && setReduceTransparency(value)).catch(() => {});
        const listener = AccessibilityInfo.addEventListener?.("reduceTransparencyChanged", setReduceTransparency);
        return () => { active = false; listener?.remove(); };
    }, [visible]);
    const supportsBlur = !reduceTransparency && (Platform.OS === "web"
        ? Boolean(globalThis.CSS?.supports?.("backdrop-filter", "blur(1px)") || globalThis.CSS?.supports?.("-webkit-backdrop-filter", "blur(1px)"))
        : Platform.OS === "ios" || Platform.OS === "android" && !!blurTarget);

    return <Modal visible={visible} transparent animationType={reducedMotion === true ? "none" : "fade"} presentationStyle="overFullScreen" statusBarTranslucent onRequestClose={onClose}>
        <View testID="date-wheel-overlay" style={[styles.datePickerBackdrop, { paddingTop: insets.top + space.lg, paddingBottom: insets.bottom + space.lg }]}>
            <TouchableOpacity activeOpacity={1} style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close picker" testID="date-wheel-dismiss" />
            <View testID="glass-date-wheel" style={[styles.card, supportsBlur && Platform.OS === "web" && styles.webBlur]} accessibilityViewIsModal accessibilityLabel={accessibilityLabel}>
                <View pointerEvents="none" accessible={false} style={styles.material}>
                    {supportsBlur && Platform.OS !== "web" ? <BlurView testID="date-wheel-local-blur" blurTarget={blurTarget} blurMethod={Platform.OS === "android" ? Number(Platform.Version) < 31 ? "dimezisBlurView" : "dimezisBlurViewSdk31Plus" : undefined} intensity={material.blurIntensity} blurReductionFactor={material.blurReductionFactor}
                        tint={Platform.OS === "android" ? "default" : scheme === "dark" ? "systemUltraThinMaterialDark" : "systemUltraThinMaterialLight"} style={StyleSheet.absoluteFill} /> : null}
                    <Gradient colors={supportsBlur ? material.panel : [material.fallback, material.fallback]} style={StyleSheet.absoluteFill} />
                    <GlassLighting material={material} radius={28} panel />
                </View>
                <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled showsVerticalScrollIndicator={false} style={{ flexGrow: 0, maxHeight: Math.max(100, height - insets.top - insets.bottom - 4 * space.lg) }}>{children}</ScrollView>
            </View>
        </View>
    </Modal>;
}

export function DateWheelPicker({
    visible,
    value,
    onChange,
    onClose,
    minimumDate,
    maximumDate,
    availableDates,
    accessibilityLabel = "Choose date",
    headerAccessory,
    blurTarget,
}) {
    const { colors } = useTheme();
    const material = useMemo(() => ({ ...colors.dateWheelGlass, ...colors.overlayGlass }), [colors]);
    const { fontScale = 1 } = useWindowDimensions();
    const styles = useMemo(() => dateWheelStyles(colors, fontScale), [colors, fontScale]);
    const [draft, setDraft] = useState(() => clampDate(value, minimumDate, maximumDate));
    const reducedMotion = useReducedMotion(visible);

    const restricted = Array.isArray(availableDates);
    const allowedDates = useMemo(
        () => restricted ? availablePickerDates(availableDates, minimumDate, maximumDate) : null,
        [availableDates, maximumDate, minimumDate, restricted],
    );

    useEffect(() => {
        if (!visible) return;
        const initial = clampDate(value, minimumDate, maximumDate);
        setDraft(restricted ? closestAvailableDate(allowedDates, initial) : initial);
    }, [allowedDates, maximumDate, minimumDate, restricted, value, visible]);

    const parts = pickerDateParts(draft, todayLocal());
    const years = restricted
        ? [...new Set(allowedDates.map((date) => Number(date.slice(0, 4))))]
        : pickerYears(draft, minimumDate, maximumDate);
    const months = restricted
        ? [...new Set(allowedDates
            .filter((date) => Number(date.slice(0, 4)) === parts.year)
            .map((date) => Number(date.slice(5, 7))))]
        : MONTHS.map((_, index) => index + 1);
    const days = restricted
        ? allowedDates
            .filter((date) => Number(date.slice(0, 4)) === parts.year && Number(date.slice(5, 7)) === parts.month)
            .map((date) => Number(date.slice(8, 10)))
        : Array.from(
            { length: new Date(parts.year, parts.month, 0).getDate() },
            (_, index) => index + 1,
        );
    const choose = (part, selected) => {
        if (restricted) {
            const candidates = allowedDates.filter((date) => {
                const dateParts = pickerDateParts(date, date);
                if (part === "year") return dateParts.year === selected;
                if (part === "month") return dateParts.year === parts.year && dateParts.month === selected;
                return dateParts.year === parts.year && dateParts.month === parts.month && dateParts.day === selected;
            });
            const target = pickerDateValue({ ...parts, [part]: selected });
            setDraft(closestAvailableDate(candidates, target));
            return;
        }
        const next = pickerDateValue({ ...parts, [part]: selected }, minimumDate, maximumDate);
        setDraft(next);
    };

    return (
        <WheelPickerModal visible={visible} onClose={onClose} blurTarget={blurTarget} accessibilityLabel={accessibilityLabel}>
                    <View style={styles.heading}>
                        <Text accessibilityRole="header" style={styles.title}>{accessibilityLabel}</Text>
                        <Text style={styles.subtitle}>{shortDate(draft)}</Text>
                    </View>
                    {headerAccessory}
                    {restricted && !allowedDates.length ? (
                        <View style={styles.dateEmpty}><Text style={styles.dateEmptyText}>No recorded dates available.</Text></View>
                    ) : (
                        <View style={styles.dateWheels}>
                            <View testID="date-wheel-selection" pointerEvents="none" style={[styles.selectionBand, styles.compactSelectionBand]}>
                                <View style={styles.selectionMaterial}><Gradient colors={material.selected} style={StyleSheet.absoluteFill} />
                                    <GlassLighting material={material} radius={22} selected /></View>
                            </View>
                            {[0.7 / 3.15, 2.15 / 3.15].map(position => <View key={position} testID="date-wheel-divider" pointerEvents="none"
                                style={[styles.divider, { left: `${position * 100}%` }]} />)}
                            <WheelColumn values={days} value={parts.day} onChange={(day) => choose("day", day)} label="Day" styles={styles} compact weight={0.7} active={visible} reducedMotion={reducedMotion === true} />
                            <WheelColumn values={months} value={parts.month} onChange={(month) => choose("month", month)} format={(month) => MONTHS[month - 1]} label="Month" styles={styles} compact weight={1.45} active={visible} reducedMotion={reducedMotion === true} />
                            <WheelColumn values={years} value={parts.year} onChange={(year) => choose("year", year)} label="Year" styles={styles} compact active={visible} reducedMotion={reducedMotion === true} />
                        </View>
                    )}
                    <View style={styles.actionsEnd}>
                        <View style={styles.actionGroup}>
                            <TextButton label="Cancel" onPress={onClose} styles={styles} />
                            <PrimaryButton label="Done" disabled={restricted && !allowedDates.length} onPress={() => { onChange(draft); onClose(); }} styles={styles} material={material} />
                        </View>
                    </View>
        </WheelPickerModal>
    );
}

function formatTime(value) {
    const { period, hour, minute } = timeParts(value);
    return `${hour}:${pad(minute)} ${period}`;
}

export function DurationWheel({ value, onChange, disabled = false }) {
    const { colors } = useTheme(), p = colors.shareSurface;
    const { fontScale = 1 } = useWindowDimensions();
    const styles = useMemo(() => {
        const base = makeStyles(colors, fontScale);
        return { ...base, durationLabel: { ...base.durationLabel, color: p.secondary },
            durationColumnGroup: { ...base.durationColumnGroup, gap: 12, maxWidth: 360 },
            durationLabels: { ...base.durationLabels, maxWidth: 360, gap: 12 },
            wheelText: { ...base.wheelText, fontSize: 30, color: p.text }, wheelTextMuted: { color: p.secondary, opacity: 0.65 } };
    }, [colors, fontScale]);
    const parts = durationParts(value);
    const hours = Array.from({ length: 25 }, (_, index) => index);
    const minutes = parts.hour === 24 ? [0] : Array.from({ length: parts.hour === 0 ? 59 : 60 }, (_, index) => index + (parts.hour === 0 ? 1 : 0));
    return <View>
        <View style={styles.durationLabels}><Text style={styles.durationLabel}>Hours</Text><Text style={styles.durationLabel}>Minutes</Text></View>
        <View style={styles.durationWheels}><View style={styles.durationColumnGroup}>
            {[{ label: "Hours", values: hours, value: parts.hour, update: hour => durationValue({ hour, minute: parts.minute }) },
                { label: "Minutes", values: minutes, value: parts.minute, update: minute => durationValue({ hour: parts.hour, minute }) }].map(column =>
                <View key={column.label} style={{ flex: 1, height: wheelGeometry(fontScale).frame, justifyContent: "center" }}>
                    <View pointerEvents="none" style={[styles.selectionBand, styles.regularSelectionBand, { borderRadius: 16, backgroundColor: p.methodActive[1] }]} />
                    <View style={{ height: wheelGeometry(fontScale).viewport }}><WheelColumn values={column.values} value={column.value} format={pad} label={column.label}
                        onChange={next => { if (!disabled) onChange(column.update(next)); }} styles={styles} disabled={disabled} active /></View>
                </View>)}
        </View></View>
    </View>;
}

function PickerField({
    mode = "date",
    label,
    value,
    onChange,
    helper,
    required = false,
    minimumDate,
    maximumDate,
    placeholder,
    disabled = false,
    error,
    blurTarget,
    appearance,
}) {
    const { colors } = useTheme();
    const recordForm = useRecordForm();
    const { fontScale = 1 } = useWindowDimensions();
    const styles = useMemo(() => dateWheelStyles(colors, fontScale), [colors, fontScale]);
    const [open, setOpen] = useState(false);
    const [pendingDate, setPendingDate] = useState("");
    const [pendingTime, setPendingTime] = useState(timeParts(value));

    const openPicker = () => {
        if (disabled) return;
        if (mode === "time") setPendingTime(timeParts(value));
        else {
            const initial = clampDate(value, minimumDate, maximumDate);
            setPendingDate(initial);
        }
        setOpen(true);
    };
    const hours = Array.from({ length: 12 }, (_, index) => index + 1);
    const minutes = Array.from({ length: 60 }, (_, index) => index);

    const trigger = <TouchableOpacity onPress={openPicker} disabled={disabled} accessibilityRole="button"
            accessibilityState={{ disabled }} accessibilityLabel={`${label || (mode === "time" ? "Time" : "Date")}: ${value || "not set"}`}
            style={[styles.input, { backgroundColor: "transparent", borderRadius: radius.pill }]}>
                <Text style={[styles.inputText, !value && styles.placeholder]}>
                    {value ? (mode === "date" ? shortDate(value) : formatTime(value)) : placeholder || `Select a ${mode}`}
                </Text>
                <Ionicons name={mode === "time" ? "time-outline" : "calendar-outline"} size={18} color={colors.textMuted} />
            </TouchableOpacity>;

    return (
        <>
            {recordForm && !label ? trigger : <FieldShell appearance={appearance} borderRadius={radius.pill} label={label} required={required} focused={open} disabled={disabled}
                error={error} helper={helper}>{trigger}</FieldShell>}

            <WheelPickerModal visible={open && mode === "time"} onClose={() => setOpen(false)} blurTarget={blurTarget} accessibilityLabel={label || "Select time"}>
                        <View style={styles.heading}><Text style={styles.title}>{label || "Select time"}</Text><Text style={styles.subtitle}>{formatTime(timeValue(pendingTime))}</Text></View>
                        <View style={styles.wheels}>
                            <View pointerEvents="none" style={[styles.selectionBand, styles.regularSelectionBand]} />
                            <WheelColumn values={["AM", "PM"]} value={pendingTime.period} onChange={(period) => setPendingTime((v) => ({ ...v, period }))} label="Period" styles={styles} active={open && mode === "time"} />
                            <WheelColumn values={hours} value={pendingTime.hour} onChange={(hour) => setPendingTime((v) => ({ ...v, hour }))} format={pad} label="Hour" styles={styles} active={open && mode === "time"} />
                            <WheelColumn values={minutes} value={pendingTime.minute} onChange={(minute) => setPendingTime((v) => ({ ...v, minute }))} format={pad} label="Minute" styles={styles} active={open && mode === "time"} />
                        </View>
                        <View style={styles.actionsEnd}>
                            <View style={styles.actionGroup}><TextButton label="Cancel" onPress={() => setOpen(false)} styles={styles} /><PrimaryButton label="Done" onPress={() => { onChange(timeValue(pendingTime)); setOpen(false); }} styles={styles} /></View>
                        </View>
            </WheelPickerModal>
            <DateWheelPicker
                visible={open && mode === "date"}
                value={pendingDate}
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                blurTarget={blurTarget}
                accessibilityLabel={label || "Select date"}
                onChange={(next) => {
                    setPendingDate(next);
                    onChange(next);
                }}
                onClose={() => setOpen(false)}
            />
        </>
    );
}

export function MeasurementField({
    blurTarget,
    label,
    value,
    onChange,
    unit,
    min,
    max,
    defaultValue = min,
    helper,
    required = false,
    error = false,
    disabled = false,
    appearance,
}) {
    const { colors } = useTheme();
    const recordForm = useRecordForm();
    const { fontScale = 1 } = useWindowDimensions();
    const styles = useMemo(() => dateWheelStyles(colors, fontScale), [colors, fontScale]);
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState(() => measurementParts(value, min, max, defaultValue));

    const openPicker = () => {
        if (disabled) return;
        setDraft(measurementParts(value, min, max, defaultValue));
        setOpen(true);
    };
    const wholeValues = useMemo(() => measurementWholeValues(min, max), [min, max]);
    const fractions = useMemo(
        () => measurementFractions(draft.whole, min, max),
        [draft.whole, min, max],
    );
    useEffect(() => {
        if (!fractions.includes(draft.fraction)) {
            setDraft((current) => ({ ...current, fraction: fractions[0] || 0 }));
        }
    }, [draft.fraction, fractions]);

    const displayValue = value === "" || value == null
        ? "Select measurement"
        : `${Number(value).toFixed(1)} ${unit}`;

    const trigger = <TouchableOpacity
                onPress={openPicker}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityState={{ disabled }}
                accessibilityLabel={`${label || "Measurement"}: ${displayValue}`}
                style={[styles.input, { backgroundColor: "transparent", borderRadius: radius.pill }]}
            >
                <Text style={[styles.inputText, (value === "" || value == null) && styles.placeholder]}>{displayValue}</Text>
                <Ionicons name="chevron-expand" size={18} color={colors.textMuted} />
            </TouchableOpacity>;

    return (
        <>
            {recordForm && !label ? trigger : <FieldShell appearance={appearance} borderRadius={radius.pill} label={label} required={required} focused={open} disabled={disabled}
                error={error} helper={helper}>{trigger}</FieldShell>}

            <WheelPickerModal visible={open} onClose={() => setOpen(false)} blurTarget={blurTarget} accessibilityLabel={label || "Choose a measurement"}>
                        <View style={styles.heading}>
                            <Text style={styles.title}>{label || "Choose a measurement"}</Text>
                            <Text style={styles.subtitle}>
                                {`${measurementValue(draft, min, max)} ${unit}`}
                            </Text>
                        </View>
                        <View style={styles.measurementWheels}>
                            <View pointerEvents="none" style={[styles.selectionBand, styles.regularSelectionBand]} />
                            <View style={styles.measurementNumberGroup}>
                                <WheelColumn
                                    values={wholeValues}
                                    value={draft.whole}
                                    onChange={(whole) => setDraft((current) => ({ ...current, whole }))}
                                    format={String}
                                    label={`${label || "Measurement"} whole value`}
                                    styles={styles}
                                    active={open}
                                />
                                <Text style={styles.measurementDecimal}>.</Text>
                                <WheelColumn
                                    values={fractions}
                                    value={fractions.includes(draft.fraction) ? draft.fraction : fractions[0]}
                                    onChange={(fraction) => setDraft((current) => ({ ...current, fraction }))}
                                    label={`${label || "Measurement"} decimal`}
                                    styles={styles}
                                    active={open}
                                />
                                <Text style={styles.measurementUnit}>{unit}</Text>
                            </View>
                        </View>
                        <View style={[styles.actionsEnd, value !== "" && value != null && styles.actionsBetween]}>
                            {value !== "" && value != null ? <TextButton label="Clear" onPress={() => { onChange(""); setOpen(false); }} styles={styles} /> : null}
                            <View style={styles.actionGroup}>
                                <TextButton label="Cancel" onPress={() => setOpen(false)} styles={styles} />
                                <PrimaryButton label="Done" onPress={() => { onChange(measurementValue(draft, min, max)); setOpen(false); }} styles={styles} />
                            </View>
                        </View>
            </WheelPickerModal>
        </>
    );
}

const makeStyles = (colors, scale = 1) => StyleSheet.create({
    input: { minHeight: 50, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "transparent", paddingHorizontal: space.lg },
    inputText: { ...type.body, color: colors.text },
    placeholder: { color: colors.placeholder },
    backdrop: { flex: 1, justifyContent: "center", padding: space.lg, backgroundColor: "rgba(0,0,0,0.48)" },
    card: { width: "100%", maxWidth: 380, alignSelf: "center", padding: space.md, borderRadius: radius.xl, borderCurve: "continuous", backgroundColor: colors.surface, ...shadow.raised },
    heading: { paddingHorizontal: space.sm, paddingTop: space.sm, gap: 2 },
    title: { ...type.heading, color: colors.text },
    subtitle: { ...type.caption, color: colors.textMuted, minHeight: 18 },
    actionsEnd: { minHeight: MIN_TOUCH, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", paddingTop: space.sm },
    actionsBetween: { justifyContent: "space-between" },
    actionGroup: { flexDirection: "row", alignItems: "center", gap: space.xs },
    textButton: { minHeight: MIN_TOUCH, alignItems: "center", justifyContent: "center", paddingHorizontal: space.sm },
    textButtonLabel: { ...type.label, textAlign: "center", flexShrink: 1, ...(Platform.OS === "android" ? { includeFontPadding: false, textAlignVertical: "center" } : {}), color: colors.textSecondary },
    primaryButton: { minHeight: MIN_TOUCH, alignItems: "center", justifyContent: "center", paddingHorizontal: space.lg, borderRadius: radius.pill, backgroundColor: colors.primary },
    primaryButtonDisabled: { opacity: 0.45 },
    primaryButtonLabel: { ...type.label, textAlign: "center", flexShrink: 1, ...(Platform.OS === "android" ? { includeFontPadding: false, textAlignVertical: "center" } : {}), color: colors.onPrimary },
    wheels: { height: wheelGeometry(scale).frame, flexDirection: "row", alignItems: "center", position: "relative" },
    durationLabels: { width: "66.6667%", alignSelf: "center", flexDirection: "row", paddingTop: space.sm },
    durationLabel: { flex: 1, ...type.caption, color: colors.textMuted, textAlign: "center" },
    durationWheels: { height: wheelGeometry(scale).frame, alignItems: "center", position: "relative" },
    durationColumnGroup: { width: "66.6667%", height: "100%", flexDirection: "row", alignItems: "center" },
    measurementWheels: { height: wheelGeometry(scale).frame, justifyContent: "center", position: "relative" },
    measurementNumberGroup: { width: "66.6667%", height: "100%", flexDirection: "row", alignItems: "center", alignSelf: "center", position: "relative" },
    measurementDecimal: { ...type.heading, color: colors.text, paddingHorizontal: 2 },
    measurementUnit: { ...type.bodyStrong, color: colors.textSecondary, position: "absolute", right: -space.xl * 2, width: 40, textAlign: "left" },
    wheelColumn: { flex: 1, height: 192, alignItems: "stretch", zIndex: 1 },
    wheelScroll: { height: 192 },
    wheelContent: { paddingVertical: 64 },
    wheelItem: { height: 64, alignItems: "center", justifyContent: "center" },
    wheelText: { fontFamily: type.body.fontFamily, fontSize: 36, lineHeight: 44, includeFontPadding: false, textAlign: "center", color: colors.text, fontVariant: ["tabular-nums"] },
    wheelTextMuted: { color: colors.placeholder, opacity: 0.55 },
    datePickerBackdrop: {
        flex: 1,
        justifyContent: "center",
        padding: space.lg,
        backgroundColor: "transparent",
    },
    dateWheels: {
        height: wheelGeometry(scale, true).frame,
        flexDirection: "row",
        alignItems: "center",
        position: "relative",
    },
    dateEmpty: { height: 240, alignItems: "center", justifyContent: "center", paddingHorizontal: space.lg },
    dateEmptyText: { ...type.body, color: colors.textMuted, textAlign: "center" },
    selectionBand: {
        position: "absolute",
        left: 0,
        right: 0,
        backgroundColor: colors.surfaceAlt,
    },
    regularSelectionBand: { top: wheelGeometry(scale).top, height: wheelGeometry(scale).row },
    compactSelectionBand: { top: wheelGeometry(scale, true).top, height: wheelGeometry(scale, true).row },
    dateWheelColumn: { zIndex: 1 },
    dateWheelScroll: { height: 192 },
    dateWheelContent: { paddingVertical: 74 },
    dateWheelItem: { height: 44 },
    dateWheelText: { ...type.body, fontSize: 24, lineHeight: 30, color: colors.text, textAlign: "center" },
    dateWheelTextSelected: { ...type.bodyStrong, fontSize: 24, lineHeight: 30, color: colors.text },
});

function dateWheelStyles(colors, scale = 1) {
    const base = makeStyles(colors, scale), p = { ...colors.dateWheelGlass, ...colors.overlayGlass };
    return { ...base, ...StyleSheet.create({
        card: { ...base.card, padding: space.lg, borderRadius: 28, backgroundColor: "transparent", shadowOpacity: 0, elevation: 0, boxShadow: p.panelShadow },
        material: { ...StyleSheet.absoluteFill, borderRadius: 28, overflow: "hidden" },
        webBlur: { backdropFilter: p.webBlur, WebkitBackdropFilter: p.webBlur },
        heading: { paddingHorizontal: 6, paddingTop: 4, gap: 4 },
        title: { ...type.heading, fontSize: 20, lineHeight: 27, color: p.text },
        subtitle: { ...type.caption, fontSize: 14, lineHeight: 20, color: p.secondary, minHeight: 20 },
        dateEmptyText: { ...base.dateEmptyText, color: p.secondary },
        regularSelectionBand: { ...base.regularSelectionBand, borderRadius: 22, backgroundColor: p.selected[1] },
        compactSelectionBand: { ...base.compactSelectionBand, borderRadius: 22, backgroundColor: "transparent", boxShadow: p.controlShadow },
        selectionMaterial: { ...StyleSheet.absoluteFill, borderRadius: 22, overflow: "hidden" },
        divider: { position: "absolute", width: StyleSheet.hairlineWidth, top: 30, bottom: 30, backgroundColor: p.divider, zIndex: 2 },
        dateWheelText: { ...base.dateWheelText, color: p.text, paddingHorizontal: 4 },
        dateWheelTextSelected: { ...base.dateWheelTextSelected, color: p.text },
        dateWheelTextMuted: { color: p.unselected },
        actionsEnd: { ...base.actionsEnd, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: p.divider, paddingTop: 12 },
        actionGroup: { ...base.actionGroup, gap: 10 },
        textButtonLabel: { ...base.textButtonLabel, color: p.secondary },
        primaryButton: { ...base.primaryButton, minWidth: 80, backgroundColor: p.active[1], boxShadow: p.activeShadow },
        primaryButtonLabel: { ...base.primaryButtonLabel, ...type.bodyStrong, color: p.onActive },
    }) };
}

export function DateField(props) { return <PickerField mode="date" {...props} />; }
export function TimeField(props) { return <PickerField mode="time" {...props} />; }
export default DateField;
