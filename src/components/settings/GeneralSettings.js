import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Animated } from "react-native";
import InfoCallout from "../ui/InfoCallout";
import { RadioRow } from "../common/Cards";
import { SettingsCard } from "./SettingsControls";
import ProfileSettingsIcon from "./ProfileSettingsIcon";
import { storage } from "../../utils/storageAdapter";
import { notificationsAvailable } from "../../utils/notifications";
import { useTheme } from "../../context/ThemeContext";
import { useScreenPadBottom, useScreenPadTop } from "../../utils/responsive";
import { useScroll } from "../../context/ScrollContext";
import { space } from "../../theme";

export const LEAD_TIME_KEY = "bb_default_reminder_lead";
export const LEAD_TIME_OPTIONS = [
    { key: "0", label: "Same day", icon: "flash-outline" },
    { key: "1", label: "1 day before", icon: "today-outline" },
    { key: "3", label: "3 days before", icon: "calendar-outline" },
    { key: "7", label: "1 week before", icon: "calendar-clear-outline" },
];

// General app-level settings (distinct from Theme/Language, which have their
// own menu destinations). Currently: default reminder lead time for
// calendar/appointment notifications.
export default function GeneralSettings() {
    const { colors } = useTheme();
    const styles = useMemo(() => makeStyles(colors), [colors]);
    const padBottom = useScreenPadBottom();
    const padTop = useScreenPadTop();

    const { scrollProps } = useScroll();
    const [leadDays, setLeadDays] = useState("1");

    useEffect(() => {
        (async () => {
            const saved = await storage.getItem(LEAD_TIME_KEY);
            if (saved) setLeadDays(saved);
        })();
    }, []);

    const choose = async (key) => {
        setLeadDays(key);
        await storage.setItem(LEAD_TIME_KEY, key);
    };

    return (
        <Animated.ScrollView
            style={styles.container}
            contentContainerStyle={[styles.content, { paddingTop: padTop, paddingBottom: padBottom }]}
            keyboardShouldPersistTaps="handled"
            {...scrollProps}
        >
            <SettingsCard
                title="Reminder Notifications"
                subtitle="Default lead time for appointment and event reminders"
            >
                {LEAD_TIME_OPTIONS.map((opt) => (
                    <RadioRow appearance="settings"
                        key={opt.key}
                        label={opt.label}
                        selected={leadDays === opt.key}
                        onPress={() => choose(opt.key)}
                        icon={<ProfileSettingsIcon kind={opt.key === "0" ? "reminders" : "calendar"} size={36} />}
                    />
                ))}
            </SettingsCard>
            {!notificationsAvailable() ? <InfoCallout title="Platform availability"
                message="Notifications aren't available on this platform, but this preference still applies where supported" /> : null}
        </Animated.ScrollView>
    );
}

const makeStyles = (colors) =>
    StyleSheet.create({
        // transparent, not colors.background: App.js paints the page gradient.

        container: { flex: 1, backgroundColor: "transparent" },
        // Padding on the content so the bottom clearance scrolls with it.
        content: { padding: space.lg },
    });
