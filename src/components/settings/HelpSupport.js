import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, Linking, TouchableOpacity, Animated, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SettingsCard } from "./SettingsControls";
import ProfileSettingsIcon from "./ProfileSettingsIcon";
import AnimatedReveal from "../ui/AnimatedReveal";
import useReducedMotion from "../ui/useReducedMotion";
import { useTheme } from "../../context/ThemeContext";
import { useScreenPadBottom, useScreenPadTop } from "../../utils/responsive";
import { useScroll } from "../../context/ScrollContext";
import { space, type, MIN_TOUCH } from "../../theme";

const FAQS = [
    {
        q: "How do I share my child's records with a doctor?",
        a: "Go to the header QR icon on Dashboard, generate a consultation code, and have the healthcare professional scan it. Access is temporary and view-only.",
        icon: "qr",
    },
    {
        q: "Can I use BabyBook+ without an internet connection?",
        a: "You need a connection to sync records with your account, but the app is lightweight and works well on mobile data.",
        icon: "cloud",
    },
    {
        q: "Is my child's data private?",
        a: "Yes. Sensitive fields are encrypted, and access is controlled entirely by you as the parent/guardian. See Privacy Settings for more.",
        icon: "privacy",
    },
    {
        q: "How do I change my baby's profile info?",
        a: "Open Profile → Edit Profile for your own account, or use the pencil icon on the Dashboard baby card to edit your child's profile.",
        icon: "person",
    },
];

export default function HelpSupport() {
    const { colors } = useTheme();
    const styles = useMemo(() => makeStyles(colors), [colors]);
    const padBottom = useScreenPadBottom();
    const padTop = useScreenPadTop();

    const { scrollProps } = useScroll();
    const [openIdx, setOpenIdx] = useState(null);

    return (
        <Animated.ScrollView
            style={styles.container}
            contentContainerStyle={[styles.content, { paddingTop: padTop, paddingBottom: padBottom }]}
            keyboardShouldPersistTaps="handled"
            {...scrollProps}
        >
            <SettingsCard title="Frequently Asked Questions">
                {FAQS.map((item, idx) => <FaqRow key={item.q} item={item} open={openIdx === idx}
                    onPress={() => setOpenIdx(openIdx === idx ? null : idx)} styles={styles} />)}
            </SettingsCard>

            <SettingsCard title="Contact Support" subtitle="We usually respond within 1-2 business days">
                <TouchableOpacity
                    style={styles.contactRow}
                    onPress={() => Linking.openURL("mailto:support@babybookplus.app")}
                    accessibilityRole="button"
                    accessibilityLabel="Email support@babybookplus.app"
                >
                    <ProfileSettingsIcon kind="mail" size={36} />
                    <Text style={styles.contactText}>support@babybookplus.app</Text>
                </TouchableOpacity>
            </SettingsCard>
        </Animated.ScrollView>
    );
}

function FaqRow({ item, open, onPress, styles }) {
    const { colors } = useTheme();
    const reduced = useReducedMotion();
    const turn = useRef(new Animated.Value(open ? 1 : 0)).current;
    useEffect(() => {
        if (reduced !== false) { turn.setValue(open ? 1 : 0); return; }
        const animation = Animated.timing(turn, { toValue: open ? 1 : 0, duration: 220, useNativeDriver: true });
        animation.start();
        return () => animation.stop();
    }, [open, reduced, turn]);
    return <View style={styles.faqItem}>
        <TouchableOpacity style={styles.faqHeader} onPress={onPress} accessibilityRole="button"
            accessibilityLabel={item.q} accessibilityState={{ expanded: open }}
            {...(Platform.OS === "web" ? { "aria-expanded": open } : {})}>
            <ProfileSettingsIcon kind={item.icon} size={36} />
            <Text style={styles.faqQ}>{item.q}</Text>
            <Animated.View accessible={false} style={{ transform: [{ rotate: turn.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] }) }] }}>
                <Ionicons name="chevron-down" size={18} color={colors.profileSettings.accent} />
            </Animated.View>
        </TouchableOpacity>
        <AnimatedReveal expanded={open}><Text style={styles.faqA}>{item.a}</Text></AnimatedReveal>
    </View>;
}

const makeStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: "transparent" },
    content: { padding: space.lg },
    faqItem: { paddingBottom: 10, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.profileSettings.divider },
    faqHeader: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: MIN_TOUCH, paddingVertical: 6 },
    faqQ: { ...type.bodyStrong, color: colors.profileSettings.text, flex: 1, minWidth: 0 },
    faqA: { ...type.body, color: colors.profileSettings.muted, padding: 12, marginTop: 8,
        backgroundColor: colors.profileSettings.inset, borderRadius: 16 },
    contactRow: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 52, padding: 10,
        backgroundColor: colors.profileSettings.control[1], borderRadius: 20, boxShadow: colors.profileSettings.iconShadow },
    contactText: { ...type.label, color: colors.profileSettings.accent, flexShrink: 1 },
});
