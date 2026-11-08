import React, { memo, useId } from "react";
import { View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import { useTheme } from "../../context/ThemeContext";

export default memo(function GrowthIcon({ size = 40, showBackground = true, accessibilityLabel }) {
    const { colors } = useTheme(), p = colors.recordCategory.growth;
    const id = "growth-category-" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
    return <View pointerEvents="none" accessible={!!accessibilityLabel} accessibilityRole={accessibilityLabel ? "image" : undefined}
        accessibilityLabel={accessibilityLabel} style={{ width: size, height: size, flexShrink: 0, borderRadius: size / 2, boxShadow: showBackground ? p.shadow : undefined }}>
        <Svg accessible={false} width={size} height={size} viewBox="0 0 100 100">
            <Defs>
                <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">{p.body.map((color, i) => <Stop key={i} offset={i / 2} stopColor={color} />)}</LinearGradient>
                <LinearGradient id={id + "-bg"} x1="0" y1="0" x2="1" y2="1">{p.surface.map((color, i) => <Stop key={i} offset={i} stopColor={color} />)}</LinearGradient>
            </Defs>
            {showBackground ? <Circle cx="50" cy="50" r="49" fill={`url(#${id}-bg)`} /> : null}
            <Rect x="36" y="16" width="31" height="75" rx="9" fill={p.shade} opacity="0.14" />
            <Rect x="34" y="12" width="31" height="75" rx="9" fill={`url(#${id})`} />
            <Path d="M39 26V23q0-6 7-6h10M39 31v43" stroke={p.reflection} opacity="0.65" strokeWidth="2.3" strokeLinecap="round" fill="none" />
            {[27, 38, 49, 60, 71].map((y, i) => <Path key={y} d={`M${i % 2 ? 54 : 49} ${y}h8`} stroke={p.reflection} strokeWidth="3" strokeLinecap="round" opacity="0.9" />)}
            <Path d="M61 24v51q0 7-6 8" stroke={p.shade} strokeWidth="2" opacity="0.35" fill="none" strokeLinecap="round" />
        </Svg>
    </View>;
});
