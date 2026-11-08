import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import Gradient from "./Gradient";

// Shadows remain outside the clipped paint layer; children keep their own hit targets.
export default function NeumorphicCard({ children, ref, style, padding, radius, elevation = "soft", material, pressed = false, inset = false, ...props }) {
    const { colors } = useTheme();
    const p = { ...colors.detailSurface, ...material };
    const r = radius ?? p.radius;
    const android = Platform.OS === "android", version = Number(Platform.Version);
    const fallback = android && version < (inset ? 29 : 28);
    return <View {...props} ref={ref} style={[{
        borderRadius: r, borderCurve: "continuous", backgroundColor: p.surface[0], padding: padding ?? p.padding,
        boxShadow: fallback || elevation === "none" ? undefined : inset ? p.insetShadow : pressed ? p.pressedShadow : p.shadow,
        ...(fallback && !inset && elevation !== "none" ? { elevation: pressed ? 1 : 3, shadowColor: p.shadowColor } : {}),
    }, style]}>
        <Gradient pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants"
            colors={inset ? [...p.surface].reverse() : p.surface} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: r, overflow: "hidden" }]} />
        <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants"
            style={[StyleSheet.absoluteFill, { borderRadius: r, borderTopWidth: 1, borderLeftWidth: 1, borderColor: p.highlight }]} />
        {children}
    </View>;
}
