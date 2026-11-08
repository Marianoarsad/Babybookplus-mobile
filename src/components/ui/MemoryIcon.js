import React, { memo, useId } from "react";
import { View } from "react-native";
import Svg, { Circle, ClipPath, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import { useTheme } from "../../context/ThemeContext";

export default memo(function MemoryIcon({ size = 40, showBackground = true }) {
    const { colors } = useTheme(), p = colors.recordCategory.memory, a = colors.keepsakeArtwork;
    const id = "memory-" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
    const gradient = (name, stops) => <LinearGradient id={id + name} x1="0" y1="0" x2="0.8" y2="1">
        {stops.map((color, i) => <Stop key={i} offset={i / (stops.length - 1)} stopColor={color} />)}
    </LinearGradient>;
    const fill = name => `url(#${id + name})`;
    return <View accessible={false} pointerEvents="none" style={{ width: size, height: size, borderRadius: size / 2, flexShrink: 0, boxShadow: showBackground ? p.shadow : undefined }}>
        <Svg accessible={false} aria-hidden width={size} height={size} viewBox="0 0 100 100" style={{ position: "relative" }}>
            <Defs>{gradient("ivory", a.ivory)}{gradient("pink", a.pink)}{gradient("sky", a.sky)}{gradient("sun", a.sun)}{gradient("bg", p.surface)}
                <ClipPath id={id + "photo"}><Rect x="33" y="24" width="52" height="48" rx="6" /></ClipPath>
            </Defs>
            {showBackground ? <Circle cx="50" cy="50" r="49" fill={fill("bg")} /> : null}
            <Ellipse cx="53" cy="87" rx="32" ry="5" fill={a.shadow} />
            <G transform="rotate(-12 45 57)">
                <Rect x="14" y="29" width="63" height="57" rx="10" fill={a.shadow} />
                <Rect x="12" y="26" width="63" height="57" rx="10" fill={fill("ivory")} stroke={a.ivoryEdge} strokeWidth="0.8" />
                <Rect x="17" y="31" width="53" height="42" rx="6" fill={fill("pink")} />
                <Path d="M18 67l15-17q3-3 6 0l12 13 8-9 10 18H18Z" fill={a.sky[0]} opacity="0.8" />
                <Path d="M15 63V38q0-9 8-9h38" fill="none" stroke={a.reflection} strokeWidth="1.5" opacity="0.9" strokeLinecap="round" />
            </G>
            <G transform="rotate(9 59 51)">
                <Rect x="29" y="21" width="63" height="64" rx="11" fill={a.shadow} />
                <Rect x="27" y="18" width="63" height="64" rx="10" fill={fill("ivory")} stroke={a.ivoryEdge} strokeWidth="0.9" />
                <G clipPath={`url(#${id}photo)`}>
                    <Rect x="33" y="24" width="52" height="48" fill={fill("sky")} />
                    <Circle cx="72.5" cy="38" r="7.5" fill={a.blue[2]} opacity="0.18" />
                    <Circle cx="72" cy="36" r="7.2" fill={fill("sun")} stroke={a.sun[2]} strokeWidth="0.7" />
                    <Path d="M67 36q0-5 5-5" fill="none" stroke={a.reflection} strokeWidth="1.4" strokeLinecap="round" opacity="0.95" />
                    <Path d="M51 72l17-22q3-4 6 0l18 22Z" fill={fill("pink")} stroke={a.pink[2]} strokeWidth="0.7" strokeLinejoin="round" />
                    <Path d="M27 72l21-27q3-4 7 0l23 27Z" fill={fill("pink")} stroke={a.pink[2]} strokeWidth="0.9" strokeLinejoin="round" />
                    <Path d="m35 65 15-18q2-2 4 0M69 52q2-2 4 0" fill="none" stroke={a.reflection} strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
                </G>
                <Rect x="33" y="24" width="52" height="48" rx="6" fill="none" stroke={a.blue[2]} strokeWidth="0.7" opacity="0.4" />
                <Path d="M30 60V30q0-9 9-9h39M34 77h47" fill="none" stroke={a.reflection} strokeWidth="1.7" opacity="0.9" strokeLinecap="round" />
            </G>
        </Svg>
    </View>;
});
