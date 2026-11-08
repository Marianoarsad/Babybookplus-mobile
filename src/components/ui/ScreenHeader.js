import React, { useRef, useState } from "react";
import { Animated, Platform, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../context/ThemeContext";
import { MIN_TOUCH, space, type } from "../../theme";

// Secondary pages share this chrome; only the five main tabs own global navigation.
export default function ScreenHeader({ title, onBack, actions, disabled = false,
    inset = true, floating = false, scrollY, onLayout }) {
    const { colors } = useTheme(), insets = useSafeAreaInsets();
    return <View onLayout={onLayout} style={{ paddingTop: inset ? insets.top : 0,
        paddingLeft: inset ? insets.left : 0, paddingRight: inset ? insets.right : 0,
        ...(floating ? { position: "absolute", top: 0, left: 0, right: 0, zIndex: 10 } : {}) }}>
        {floating && scrollY ? <Animated.View pointerEvents="none" style={{ position: "absolute", inset: 0,
            backgroundColor: colors.surface, opacity: scrollY.interpolate({ inputRange: [0, 60], outputRange: [0, 1], extrapolate: "clamp" }) }} /> : null}
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: space.lg, paddingVertical: space.md, gap: space.sm }}>
            <TouchableOpacity onPress={onBack} disabled={disabled} accessibilityRole="button" accessibilityLabel="Back"
                accessibilityState={{ disabled }} style={{ minWidth: MIN_TOUCH, minHeight: MIN_TOUCH, flexDirection: "row", gap: 4,
                    alignItems: "center", justifyContent: "center", opacity: disabled ? 0.5 : 1 }}>
                <Ionicons name="arrow-back" size={22} color={colors.text} />
            </TouchableOpacity>
            <Text accessibilityRole="header" numberOfLines={2} style={{ ...type.heading, fontSize: 21, lineHeight: 27,
                color: colors.text, flex: 1, minWidth: 0 }}>{title}</Text>
            <View style={{ flexDirection: "row", gap: space.xs, flexShrink: 0 }}>{actions}</View>
        </View>
    </View>;
}

// Each overlay owns its scroll state; it must never drive the underlying page.
export function useDetailHeader() {
    const insets = useSafeAreaInsets();
    const [height, setHeight] = useState(insets.top + 76);
    const scrollY = useRef(new Animated.Value(0)).current;
    return { headerProps: { floating: true, scrollY, onLayout: e => setHeight(e.nativeEvent.layout.height) },
        scrollProps: { onScroll: Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: Platform.OS !== "web" }), scrollEventThrottle: 16 },
        contentStyle: { paddingTop: height + space.md } };
}
