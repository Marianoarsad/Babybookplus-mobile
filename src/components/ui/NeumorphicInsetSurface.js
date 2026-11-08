import React, { useId } from "react";
import { Platform, StyleSheet, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { useTheme } from "../../context/ThemeContext";

export default function NeumorphicInsetSurface({ children, style, material, ...props }) {
    const { colors } = useTheme(), p = { ...colors.infoCallout, ...material };
    const id = "info-inset-" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
    const fallback = Platform.OS === "android" && Number(Platform.Version) < 29;
    return <View {...props} style={[{ backgroundColor: p.surface, borderRadius: p.radius,
        boxShadow: fallback ? undefined : p.insetShadow }, style]}>
        {fallback ? <Svg accessible={false} aria-hidden pointerEvents="none" width="100%" height="100%"
            style={[StyleSheet.absoluteFill, { borderRadius: p.radius, overflow: "hidden" }]}>
            <Defs><LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={p.innerShade} /><Stop offset="0.22" stopColor={p.surface} />
                <Stop offset="0.8" stopColor={p.surface} /><Stop offset="1" stopColor={p.innerLight} />
            </LinearGradient></Defs>
            <Rect width="100%" height="100%" rx={p.radius} fill={`url(#${id})`} />
        </Svg> : null}
        {children}
    </View>;
}
