import React, { useId } from "react";
import { View } from "react-native";
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import { useTheme } from "../../context/ThemeContext";

export default function VaccineIcon({ size = 40, showBackground = true }) {
    const { colors } = useTheme(), p = colors.recordCategory.vaccine;
    const id = "vaccine-" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
    return <View pointerEvents="none" accessible={false} style={{ width: size, height: size, flexShrink: 0, borderRadius: size / 2, boxShadow: showBackground ? p.shadow : undefined }}>
        <Svg accessible={false} width={size} height={size} viewBox="0 0 100 100">
            <Defs>
                <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">{p.body.map((color, i) => <Stop key={i} offset={i / 2} stopColor={color} />)}</LinearGradient>
                <LinearGradient id={id + "-glass"} x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor={p.reflection} /><Stop offset="0.45" stopColor={p.highlight} /><Stop offset="1" stopColor={p.primary} /></LinearGradient>
                <LinearGradient id={id + "-bg"} x1="0" y1="0" x2="1" y2="1">{p.surface.map((color, i) => <Stop key={i} offset={i} stopColor={color} />)}</LinearGradient>
            </Defs>
            {showBackground ? <Circle cx="50" cy="50" r="49" fill={`url(#${id}-bg)`} /> : null}
            <G transform="rotate(42 50 50)">
                <Path d="M50 77v18" stroke={p.shade} strokeWidth="3" strokeLinecap="round" />
                <Rect x="43" y="69" width="14" height="14" rx="4" fill={`url(#${id})`} />
                <Rect x="47" y="10" width="7" height="21" rx="2" fill={`url(#${id})`} />
                <Rect x="37" y="8" width="27" height="7" rx="3.5" fill={`url(#${id})`} />
                <Rect x="39" y="30" width="23" height="43" rx="6" fill={`url(#${id}-glass)`} />
                <Rect x="33" y="26" width="35" height="8" rx="4" fill={`url(#${id})`} />
                <Path d="M43 39v23M40 29h17" fill="none" stroke={p.reflection} strokeWidth="2.5" opacity="0.85" strokeLinecap="round" />
                {[42, 51, 60].map(y => <Path key={y} d={`M51 ${y}h6`} stroke={p.shade} strokeWidth="2.5" strokeLinecap="round" />)}
                <Ellipse cx="50" cy="11" rx="9" ry="1.2" fill={p.reflection} opacity="0.6" />
            </G>
        </Svg>
    </View>;
}
