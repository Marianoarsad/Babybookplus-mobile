import React, { useMemo } from "react";
import { View, Text, StyleSheet, Animated, Image } from "react-native";
import { SettingsCard } from "./SettingsControls";
import { useTheme } from "../../context/ThemeContext";
import { useScreenPadBottom, useScreenPadTop } from "../../utils/responsive";
import { useScroll } from "../../context/ScrollContext";
import { space, radius, type } from "../../theme";

import appConfig from "../../app.json";
const APP_VERSION = appConfig.expo.version;

export default function AboutApp() {
    const { colors } = useTheme();
    const styles = useMemo(() => makeStyles(colors), [colors]);
    const padBottom = useScreenPadBottom();
    const padTop = useScreenPadTop();

    const { scrollProps } = useScroll();

    return (
        <Animated.ScrollView
            style={styles.container}
            contentContainerStyle={[styles.content, { paddingTop: padTop, paddingBottom: padBottom }]}
            keyboardShouldPersistTaps="handled"
            {...scrollProps}
        >
            {/* Version-plate hero — anchors the app identity + clinical
                credibility claim before the reference sections below. */}
            <View style={styles.brandBox}>
                <Image
                    source={require("../../assets/splash-icon.png")}
                    style={styles.brandLogo}
                    resizeMode="contain"
                    accessible
                    accessibilityRole="image"
                    accessibilityLabel="BabyBook+"
                />
                <Text style={styles.brandVersion}>Version {APP_VERSION}</Text>
                <View style={styles.epiBadge}>
                    <Text style={styles.epiBadgeText}>DOH-aligned EPI schedule</Text>
                </View>
            </View>

            <SettingsCard title="About This App">
                <Text style={styles.paragraph}>
                    BabyBook+ is a parent-controlled app for recording a child's health and
                    development from birth through age six, built for families in the
                    Philippines. It helps you track vaccinations, growth, milestones, and
                    nutrition, and lets you securely share records with a healthcare
                    professional through a temporary QR consultation code.
                </Text>
            </SettingsCard>

            <SettingsCard title="Compliance">
                <Text style={styles.paragraph}>
                    Data handling follows the Philippine Data Privacy Act of 2012 (RA 10173).
                    See Privacy Settings for your consent status and data-retention details.
                </Text>
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
        brandBox: { alignItems: "center", padding: 20, marginBottom: 20, borderRadius: 24, backgroundColor: colors.profileSettings.panel[1], boxShadow: colors.profileSettings.panelShadow },
        brandLogo: { width: 100, height: 100, marginBottom: space.xs },
        brandVersion: { ...type.caption, color: colors.profileSettings.muted, marginTop: 4 },
        epiBadge: {
            backgroundColor: colors.utilityRecordTints.recVaccine.bg,
            borderRadius: radius.pill,
            borderCurve: "continuous",
            paddingVertical: 6,
            paddingHorizontal: space.md,
            marginTop: space.md,
        },
        epiBadgeText: { ...type.label, color: colors.utilityRecordTints.recVaccine.on },
        paragraph: { ...type.body, color: colors.profileSettings.muted },
    });
