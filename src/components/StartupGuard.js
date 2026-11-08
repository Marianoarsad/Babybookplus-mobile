import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { useTheme } from "../context/ThemeContext";

export default function StartupGuard({ children, onRetry, hideSplash, retrying = false }) {
    const { colors } = useTheme();
    const stages = useRef({ initialization: false });
    const [ready, setReady] = useState(false);
    const [failed, setFailed] = useState(false);
    const report = useCallback(next => {
        stages.current = next;
        setReady(Object.values(next).every(Boolean));
        if (typeof __DEV__ !== "undefined" && __DEV__) console.log("Startup stages:", next);
    }, []);
    useEffect(() => {
        if (ready) return undefined;
        const timer = setTimeout(() => {
            if (typeof __DEV__ !== "undefined" && __DEV__) console.log("Startup stalled:", stages.current);
            setFailed(true);
        }, 20000);
        return () => clearTimeout(timer);
    }, [ready]);
    if (!failed) return <View style={{ flex: 1 }}>
        {children(report)}
        {retrying && !ready ? <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background,
            justifyContent: "center", alignItems: "center", gap: 16 }]}>
            <ActivityIndicator color={colors.accentStrong} size="large" />
            <Text style={{ color: colors.text }}>Starting BabyBook+…</Text>
        </View> : null}
    </View>;
    return <View onLayout={() => Promise.resolve(hideSplash()).catch(() => {})}
        style={{ flex: 1, justifyContent: "center", padding: 32, gap: 18, backgroundColor: colors.background }}>
        <Text accessibilityRole="header" style={{ fontSize: 22, fontWeight: "700", color: colors.text }}>Couldn't finish starting BabyBook+</Text>
        <Text style={{ fontSize: 16, lineHeight: 24, color: colors.textSecondary }}>Check your connection and try again. Your saved information has not been deleted.</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Retry startup" onPress={onRetry}
            style={{ minHeight: 48, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: colors.accentStrong }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: colors.onAccent }}>Retry</Text>
        </Pressable>
    </View>;
}
