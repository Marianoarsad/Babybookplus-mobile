import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform } from "react-native";
import { SettingsCard, selectionStyle } from "./SettingsControls";
import { useLanguage } from "../../context/LanguageContext";
import { useTheme } from "../../context/ThemeContext";
import { useScreenPadBottom, useScreenPadTop } from "../../utils/responsive";
import { useScroll } from "../../context/ScrollContext";
import { space, radius, type } from "../../theme";

const LANGUAGES = [
    { key: "en", label: "English", identifier: "EN" },
    { key: "fil", label: "Filipino", identifier: "FIL" },
    { key: "tag", label: "Taglish", identifier: "TL" },
];

export default function LanguagePreferences() {
    const { language, setLanguage, t } = useLanguage();
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
            <SettingsCard title={t("settingsLanguageLabel")} subtitle={t("settingsLanguageHelp")}>
                <View style={styles.langGrid}>
                    {LANGUAGES.map((l) => {
                        const on = language === l.key;
                        return (
                            <TouchableOpacity
                                key={l.key}
                                style={[styles.langCard, selectionStyle(colors, on)]}
                                onPress={() => setLanguage(l.key)}
                                accessibilityRole="radio"
                                accessibilityLabel={l.label}
                                accessibilityState={{ selected: on, checked: on }}
                                {...(Platform.OS === "web" ? { "aria-checked": on } : {})}
                            >
                                <Text style={styles.langIdentifier}>{l.identifier}</Text>
                                <Text accessible={false} style={styles.langCheck}>{on ? "●" : "○"}</Text>
                                <Text style={[styles.langLabel, on && styles.langLabelActive]}>{l.label}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
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
        langGrid: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
        langCard: {
            flexBasis: "28%",
            minWidth: 70,
            flexGrow: 1,
            paddingVertical: space.lg,
            borderRadius: radius.lg,
            borderCurve: "continuous",
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            alignItems: "center",
        },
        langIdentifier: { ...type.heading, color: colors.profileSettings.text, marginBottom: 4 },
        langCheck: { color: colors.profileSettings.accent, fontSize: 18, marginBottom: 4 },
        langLabel: { ...type.caption, color: colors.profileSettings.muted, textAlign: "center" },
        langLabelActive: { color: colors.profileSettings.accent, fontWeight: "600" },
    });
