import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { SettingsCard } from "./SettingsControls";
import { api } from "../../utils/api";
import { useToast } from "../ui/Toast";
import { useTheme } from "../../context/ThemeContext";
import { useScreenPadBottom, useScreenPadTop } from "../../utils/responsive";
import { useScroll } from "../../context/ScrollContext";
import { space, radius, type } from "../../theme";
import KeyboardAvoider from "../ui/KeyboardAvoider";
import Field from "../ui/Field";
import Button from "../ui/Button";
import ProfileSettingsIcon from "./ProfileSettingsIcon";

// Cosmetic-only heuristic (length + character variety) driving the 4-segment
// meter below. Not a security gate — the actual submit validation is
// untouched (still just "at least 8 characters").
function passwordStrength(pw) {
    if (!pw) return 0;
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[0-9]/.test(pw) && /[a-zA-Z]/.test(pw)) score++;
    if (/[^a-zA-Z0-9]/.test(pw)) score++;
    return Math.max(pw.length > 0 ? 1 : 0, Math.min(score, 4));
}

export default function ChangePassword() {
    const { colors } = useTheme();
    const styles = useMemo(() => makeStyles(colors), [colors]);
    const padBottom = useScreenPadBottom();
    const padTop = useScreenPadTop();

    const { scrollProps } = useScroll();
    const toast = useToast();

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [saving, setSaving] = useState(false);

    const strength = passwordStrength(newPassword);
    // Index by strength (1-4) — the whole meter turns one ramp color, it
    // doesn't rainbow segment-by-segment.
    const STRENGTH_COLOR = { 1: colors.danger, 2: colors.warning, 3: colors.info, 4: colors.success };
    const strengthColor = STRENGTH_COLOR[strength];
    const STRENGTH_LABEL = { 0: "", 1: "Weak", 2: "Fair", 3: "Good", 4: "Strong" };

    const handleSubmit = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            toast.error("Please fill in all fields.");
            return;
        }
        if (newPassword.length < 8) {
            toast.error("New password must be at least 8 characters.");
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.error("New password and confirmation don't match.");
            return;
        }
        setSaving(true);
        try {
            await api.changePassword({ currentPassword, newPassword });
            toast.success("Password updated successfully.");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (e) {
            toast.error(e.message || "Could not change password");
        } finally {
            setSaving(false);
        }
    };

    return (
        <KeyboardAvoider>
        <Animated.ScrollView
            style={styles.container}
            contentContainerStyle={[styles.content, { paddingTop: padTop, paddingBottom: padBottom }]}
            keyboardShouldPersistTaps="handled"
            {...scrollProps}
        >
            <SettingsCard icon={<ProfileSettingsIcon kind="lock" size={40} />} title="Change Password" subtitle="Use your current password to set a new one">
                <Field appearance="settings" borderRadius={radius.pill}
                        label="Current Password"
                        secureTextEntry
                        value={currentPassword}
                        onChangeText={setCurrentPassword}
                    />
                <View style={styles.formGroup}>
                    <Field appearance="settings" borderRadius={radius.pill} label="New Password" secureTextEntry value={newPassword} onChangeText={setNewPassword} />
                    {newPassword ? (
                        <View style={styles.meterRow}>
                            <View style={styles.meterBars}>
                                {[0, 1, 2, 3].map((i) => (
                                    <View
                                        key={i}
                                        style={[
                                            styles.meterBar,
                                            i < strength && { backgroundColor: strengthColor },
                                        ]}
                                    />
                                ))}
                            </View>
                            <Text style={[styles.meterLabel, { color: strengthColor }]}>
                                {STRENGTH_LABEL[strength]}
                            </Text>
                        </View>
                    ) : null}
                </View>
                <Field appearance="settings" borderRadius={radius.pill}
                        label="Confirm New Password"
                        secureTextEntry
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                    />
                <Button title="Update Password" variant="settings" onPress={handleSubmit} loading={saving} />
            </SettingsCard>
        </Animated.ScrollView>
        </KeyboardAvoider>
    );
}

const makeStyles = (colors) =>
    StyleSheet.create({
        // transparent, not colors.background: App.js paints the page gradient.

        container: { flex: 1, backgroundColor: "transparent" },
        // Padding on the content so the bottom clearance scrolls with it.
        content: { padding: space.lg },
        formGroup: { marginBottom: space.md },
        meterRow: { flexDirection: "row", alignItems: "center", marginTop: space.sm },
        meterBars: { flexDirection: "row", gap: 4, flex: 1 },
        meterBar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.hairline },
        meterLabel: { ...type.caption, marginLeft: space.sm },
    });
