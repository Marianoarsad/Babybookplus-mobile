import GlassHeaderButton from "./GlassHeaderButton";
import React, { useMemo, useRef } from "react";
import { Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import ScreenHeader, { useDetailHeader } from "./ScreenHeader";
import Modal from "./AppModal";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { MIN_TOUCH, radius, shadow, space, type } from "../../theme";
import { shortTime } from "../../utils/dates";
import Gradient from "./Gradient";
import NeumorphicCard from "./NeumorphicCard";
import { measureConfirmationAnchor } from "../../utils/confirmationPosition.cjs";

function longDate(value) {
    const date = new Date(`${String(value || "").slice(0, 10)}T00:00:00`);
    return Number.isNaN(date.getTime())
        ? "Date not recorded"
        : date.toLocaleDateString(undefined, {
              weekday: "long",
              month: "short",
              day: "numeric",
              year: "numeric",
          });
}

function DetailRow({ label, value, color, valueColor, styles }) {
    if (!value) return null;
    return (
        <NeumorphicCard style={styles.detailRow}>
            <Text style={styles.detailLabel}>{label}</Text>
            <View style={styles.detailValueRow}>
                {color ? <View style={[styles.colorDot, { backgroundColor: color }]} /> : null}
                <Text style={[styles.detailValue, valueColor && { color: valueColor }]} selectable>{value}</Text>
            </View>
        </NeumorphicCard>
    );
}

export default function PlanDetail({ visible, plan, onClose, onEdit, onDelete, onViewAttachment, deleteAccessibilityLabel, headerTitle, deleting = false, heroContent, children }) {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const header = useDetailHeader();
    const deleteButton = useRef(null);
    const styles = useMemo(() => makeStyles(colors), [colors]);
    if (!plan) return null;

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <Gradient
                colors={colors.pageGradient}
                locations={[0, 0.5, 1]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={styles.root}
            >
                <ScreenHeader {...header.headerProps} title={headerTitle || plan.categoryLabel || "Record Details"}
                    onBack={onClose} disabled={deleting} actions={onEdit ?
                        <GlassHeaderButton icon="edit" onPress={onEdit} disabled={deleting} accessibilityLabel={`Edit ${plan.title}`} /> : null} />

                <Animated.ScrollView {...header.scrollProps}
                    contentContainerStyle={[styles.content, { paddingBottom: space.xl + insets.bottom }, header.contentStyle]}
                    showsVerticalScrollIndicator={false}
                >
                    {plan.showTitle === false && plan.showDate === false && plan.showTime === false ? null : (
                        <View>
                            {plan.showTitle === false ? null : <Text style={styles.title} selectable>{plan.title || "Untitled plan"}</Text>}
                            {plan.showDate === false ? null : <Text style={styles.date} selectable>{longDate(plan.date)}</Text>}
                            {plan.showTime === false ? null : (
                                <Text style={styles.time} selectable>{plan.time ? shortTime(plan.time) : "All-day"}</Text>
                            )}
                        </View>
                    )}

                    {heroContent}

                    <View style={styles.rows}>
                        <DetailRow label="Type" value={plan.categoryLabel} color={plan.color} styles={styles} />
                        <DetailRow label="Status" value={plan.status} styles={styles} />
                        {(plan.details || []).map((detail) => (
                            <DetailRow key={`${detail.label}:${detail.value}`} {...detail} styles={styles} />
                        ))}
                        {plan.showReminder === false ? null : (
                            <DetailRow label="Alert" value={plan.reminderLabel || "None"} styles={styles} />
                        )}
                    </View>

                    {children}

                    {onViewAttachment ? (
                        <TouchableOpacity
                            onPress={onViewAttachment}
                            style={styles.attachmentButton}
                            accessibilityRole="button"
                            accessibilityLabel="View attached photo"
                        >
                            <NeumorphicCard padding={0} style={styles.attachmentSurface}>
                            <Ionicons name="image-outline" size={20} color={colors.primary} />
                            <Text style={styles.attachmentText}>View attached photo</Text>
                            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                            </NeumorphicCard>
                        </TouchableOpacity>
                    ) : null}

                    {plan.showNotes === false ? null : (
                        <NeumorphicCard style={styles.notesCard}>
                            <Text style={styles.notesLabel}>Notes</Text>
                            <Text style={plan.notes ? styles.notes : styles.notesEmpty} selectable>
                                {plan.notes || "No notes added."}
                            </Text>
                        </NeumorphicCard>
                    )}

                    {onDelete ? (
                        <TouchableOpacity
                            ref={deleteButton} onPress={event => measureConfirmationAnchor(deleteButton, event, onDelete)}
                            style={styles.deleteButton}
                            disabled={deleting}
                            accessibilityRole="button"
                            accessibilityLabel={deleteAccessibilityLabel || `Delete ${plan.title}`}
                            accessibilityState={{ disabled: deleting, busy: deleting }}
                        >
                            {(<Text style={styles.deleteText}>{plan.deleteLabel || "Delete plan"}</Text>)}
                        </TouchableOpacity>
                    ) : null}
                </Animated.ScrollView>
            </Gradient>
        </Modal>
    );
}

const makeStyles = (colors) => StyleSheet.create({
    root: { flex: 1 },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: space.lg,
        paddingBottom: space.md,
    },
    headerPill: {
        minHeight: MIN_TOUCH,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        paddingHorizontal: space.md,
        borderRadius: radius.pill,
        borderCurve: "continuous",
        backgroundColor: colors.surface,
        ...shadow.card,
    },
    headerPillText: { ...type.subheading, color: colors.text },
    content: { flexGrow: 1, padding: space.lg, paddingTop: space.lg, gap: space.lg },
    title: { ...type.title, fontSize: 30, lineHeight: 36, color: colors.text },
    date: { ...type.body, color: colors.text, marginTop: space.md },
    time: { ...type.body, color: colors.textMuted, marginTop: 2 },
    rows: { gap: space.lg },
    detailRow: { minHeight: 56, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.md },
    detailLabel: { ...type.body, color: colors.detailSurface.secondary, flexShrink: 1, maxWidth: "42%" },
    detailValueRow: { flex: 1, flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: space.sm },
    colorDot: { width: 14, height: 14, borderRadius: radius.pill },
    detailValue: { ...type.body, color: colors.detailSurface.secondary, textAlign: "right", flexShrink: 1 },
    notesCard: {},
    attachmentButton: { minHeight: 54 },
    attachmentSurface: { minHeight: 54, flexDirection: "row", alignItems: "center", gap: space.sm, paddingHorizontal: space.lg },
    attachmentText: { ...type.bodyStrong, color: colors.text, flex: 1 },
    notesLabel: { ...type.subheading, color: colors.text, marginBottom: space.sm },
    notes: { ...type.body, lineHeight: 24, color: colors.textSecondary },
    notesEmpty: { ...type.body, color: colors.textMuted, fontStyle: "italic" },
    deleteButton: {
        minHeight: 54,
        alignSelf: "center",
        alignItems: "center",
        justifyContent: "center",
        marginTop: "auto",
        paddingHorizontal: space.xl,
        borderRadius: radius.pill,
        borderCurve: "continuous",
        backgroundColor: colors.surface,
        ...shadow.card,
    },
    deleteText: { textAlign: "center", ...type.subheading, color: colors.danger },
});
