import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SettingsCard } from "./SettingsControls";
import Button from "../ui/Button";
import InfoCallout from "../ui/InfoCallout";
import Gradient from "../ui/Gradient";
import { DeleteConfirmation } from "../ui/RecordFormSheet";
import { measureConfirmationAnchor } from "../../utils/confirmationPosition.cjs";
import { api } from "../../utils/api";
import { useToast } from "../ui/Toast";
import { useTheme } from "../../context/ThemeContext";
import { useScreenPadBottom, useScreenPadTop } from "../../utils/responsive";
import { useScroll } from "../../context/ScrollContext";
import { SkeletonBlock } from "../ui/Skeleton";
import { space, radius, type, MIN_TOUCH } from "../../theme";

// Consent status/retention + the existing withdraw-and-delete flow, surfaced
// as its own destination instead of only appearing in the annual reminder.
export default function PrivacySettings({ onAccountDeleted }) {
    const { colors } = useTheme();
    const styles = useMemo(() => makeStyles(colors), [colors]);
    const padBottom = useScreenPadBottom();
    const padTop = useScreenPadTop();

    const { scrollProps } = useScroll();
    const toast = useToast();

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleteAnchor, setDeleteAnchor] = useState(null);
    const deleteButton = useRef(null);
    const [renewing, setRenewing] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const load = async () => {
        try {
            const { user } = await api.me();
            setUser(user);
        } catch (e) {
            console.log("privacy load:", e.message);
        }
    };

    useEffect(() => {
        (async () => {
            setLoading(true);
            await load();
            setLoading(false);
        })();
    }, []);

    const handleRenew = async () => {
        setRenewing(true);
        try {
            await api.renewConsent();
            toast.success("Data retention renewed for another year.");
            await load();
        } catch (e) {
            toast.error(e.message || "Could not renew consent");
        } finally {
            setRenewing(false);
        }
    };

    const handleDelete = async () => {
        if (deleting) return;
        setDeleting(true);
        try {
            await api.deleteAccount();
            onAccountDeleted && onAccountDeleted();
        } catch (e) {
            toast.error(e.message || "Could not delete account");
        } finally {
            setDeleting(false);
        }
    };

    const retentionDate = user?.retentionUntil
        ? new Date(user.retentionUntil).toLocaleDateString()
        : "—";
    const consentDate = user?.consentDate ? new Date(user.consentDate).toLocaleDateString() : "—";

    // Consent-status banner — the one thing worth knowing at a glance before
    // reading the detail rows below. Only two states are backed by real data
    // (consentReviewDue is a plain yes/no from the API), so the banner uses
    // the "overdue" ramp when review is due and "completed" otherwise rather
    // than inventing a third "upcoming" bucket we have no date to drive.
    const reviewDue = !!user?.consentReviewDue;
    const bannerColor = reviewDue ? colors.overdue : colors.completed;
    const bannerBg = reviewDue ? colors.overdueBg : colors.completedBg;

    return (
        <Animated.ScrollView
            style={styles.container}
            contentContainerStyle={[styles.content, { paddingTop: padTop, paddingBottom: padBottom }]}
            keyboardShouldPersistTaps="handled"
            {...scrollProps}
        >
            {loading ? (
                <SkeletonBlock width="100%" height={52} radius={radius.lg} style={{ marginBottom: space.lg }} />
            ) : (
                <View style={[styles.consentBanner, { backgroundColor: bannerBg, boxShadow: colors.profileSettings.iconShadow }]}>
                    <Gradient colors={[bannerBg, bannerColor]} style={{ width: 36, height: 36, borderRadius: 18,
                        alignItems: "center", justifyContent: "center", boxShadow: colors.profileSettings.iconShadow }}>
                        <Ionicons name={reviewDue ? "alert" : "checkmark"} size={24} color={colors.onPrimary} />
                    </Gradient>
                    <Text style={[styles.consentBannerText, { color: bannerColor }]}>
                        {reviewDue
                            ? "Annual consent review is due — renew below to keep your data active."
                            : "Your consent is up to date."}
                    </Text>
                </View>
            )}

            <SettingsCard
                title="Data Privacy Act of 2012 (RA 10173)"
                subtitle="Your consent and data-retention status"
            >
                {loading ? (
                    [0, 1, 2].map((i) => (
                        <View key={i} style={styles.row}>
                            <SkeletonBlock width="44%" height={12} radius={6} />
                            <SkeletonBlock width="28%" height={12} radius={6} />
                        </View>
                    ))
                ) : (
                    <>
                        <View style={styles.row}>
                            <Text style={styles.rowLabel}>Consent accepted on</Text>
                            <Text style={styles.rowValue}>{consentDate}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.rowLabel}>Data retained until</Text>
                            <Text style={styles.rowValue}>{retentionDate}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.rowLabel}>Annual review due</Text>
                            <Text style={styles.rowValue}>{user?.consentReviewDue ? "Yes — review now" : "Not yet"}</Text>
                        </View>
                    </>
                )}
                <Button title="Renew data retention for another year" variant="settings" onPress={handleRenew}
                    loading={renewing} disabled={loading} style={{ marginTop: 16 }} />
            </SettingsCard>

            <InfoCallout title="QR Consultation Access Log" style={{ marginBottom: 20 }}
                message="When a healthcare professional resolves a consultation code, we record their name, the exact time, their network (IP) address, and a summary of their device. This is shown in your Share Records access log and helps you notice a code being viewed from somewhere unexpected." />

            <SettingsCard title="Withdraw Consent" subtitle="Permanently delete your account and all child records">
                <View ref={deleteButton} collapsable={false}>
                    <Button title="Withdraw & delete my data" variant="danger" onPress={event => {
                        measureConfirmationAnchor(deleteButton, event, setDeleteAnchor);
                        setConfirmDelete(true);
                    }} />
                </View>
                <DeleteConfirmation visible={confirmDelete} anchor={deleteAnchor} busy={deleting}
                    title="Withdraw Consent?"
                    message="This permanently deletes your account and all of your child's records. This cannot be undone."
                    deleteLabel="Permanently delete everything" cancelLabel="Cancel"
                    onCancel={() => { if (!deleting) setConfirmDelete(false); }} onConfirm={handleDelete} />
            </SettingsCard>
        </Animated.ScrollView>
    );
}

const makeStyles = (colors) =>
    StyleSheet.create({
        // transparent, not colors.background: App.js paints the page gradient.

        container: { flex: 1, backgroundColor: "transparent" },
        // Padding on the content so the bottom clearance scrolls with it.
        content: { padding: space.lg },
        consentBanner: {
            flexDirection: "row",
            alignItems: "center",
            gap: space.sm,
            borderRadius: radius.lg,
            borderCurve: "continuous",
            padding: space.md,
            marginBottom: space.lg,
        },
        consentBannerText: { ...type.bodyStrong, flex: 1 },
        // Neither child was flexed, so a long value ran past the card edge.
        row: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: space.md,
            minHeight: MIN_TOUCH,
            paddingVertical: 10,
            borderBottomWidth: 1,
            borderBottomColor: colors.profileSettings.divider,
        },
        rowLabel: { ...type.label, color: colors.profileSettings.muted, flex: 1, minWidth: 0 },
        rowValue: { ...type.label, color: colors.profileSettings.text, flexShrink: 1, textAlign: "right" },
    });
