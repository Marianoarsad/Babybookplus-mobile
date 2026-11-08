import React, { memo, useId } from "react";
import { View } from "react-native";
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import { useTheme } from "../../context/ThemeContext";

export default memo(function MedicalHistoryIcon({ size = 40, showBackground = true }) {
    const { colors } = useTheme(), p = colors.recordCategory.milk, a = colors.keepsakeArtwork;
    const id = "medical-history-" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
    const gradient = (name, stops) => <LinearGradient id={id + name} x1="0" y1="0" x2="0.8" y2="1">
        {stops.map((color, i) => <Stop key={i} offset={i / (stops.length - 1)} stopColor={color} />)}
    </LinearGradient>;
    const fill = name => `url(#${id + name})`;
    const clip = "M39 20h3a9 9 0 0 1 18 0h3q6 0 6 6v5q0 6-6 6H37q-6 0-6-6v-5q0-6 8-6Z";
    const cross = "M47 44h6q2 0 2 2v5h5q2 0 2 2v6q0 2-2 2h-5v5q0 2-2 2h-6q-2 0-2-2v-5h-5q-2 0-2-2v-6q0-2 2-2h5v-5q0-2 2-2Z";
    return <View pointerEvents="none" accessible={false} style={{ width: size, height: size, flexShrink: 0, borderRadius: size / 2, boxShadow: showBackground ? p.shadow : undefined }}>
        <Svg accessible={false} aria-hidden width={size} height={size} viewBox="0 0 100 100" style={{ position: "relative" }}>
            <Defs>{gradient("blue", a.blue)}{gradient("azure", a.azure)}
                {gradient("paper", [a.reflection, a.reflection, a.blue[0]])}{gradient("bg", p.surface)}</Defs>
            {showBackground ? <>
                <Circle cx="50" cy="50" r="49" fill={fill("bg")} />
                <Path d="M8 45A43 43 0 0 1 47 7" fill="none" stroke={a.reflection} strokeWidth="1.4" opacity="0.8" strokeLinecap="round" />
            </> : null}
            <Ellipse cx="52" cy="91" rx="29" ry="4" fill={a.shadow} opacity="0.6" />
            <Rect x="21" y="26" width="60" height="65" rx="13" fill={a.shadow} />
            <Rect x="20" y="23" width="60" height="66" rx="13" fill={fill("azure")} stroke={a.blue[1]} strokeWidth="0.8" />
            <Path d="M23 71V38q0-12 12-12h28" fill="none" stroke={a.reflection} strokeWidth="1.7" opacity="0.8" strokeLinecap="round" />
            <Path d="M24 78q0 8 10 8h32q11 0 11-11V40" fill="none" stroke={a.blue[0]} strokeWidth="1.1" opacity="0.7" />
            <Rect x="27" y="30" width="48" height="56" rx="9" fill={a.azure[2]} opacity="0.3" />
            <Rect x="26" y="29" width="48" height="56" rx="9" fill={fill("paper")} />
            <Path d="M29 41v-2q0-7 7-7h27" fill="none" stroke={a.reflection} strokeWidth="1.2" opacity="0.9" strokeLinecap="round" />
            <Path d={clip} fill={a.shadow} transform="translate(0.5 2)" />
            <Path d={clip} fill={fill("azure")} stroke={a.blue[1]} strokeWidth="0.7" />
            <Path d="M34 29v-2q0-4 5-4h5q1-10 9-10" fill="none" stroke={a.reflection} strokeWidth="1.6" strokeLinecap="round" opacity="0.85" />
            <Circle cx="51" cy="21" r="4.5" fill={a.azure[2]} opacity="0.35" transform="translate(0.5 1)" />
            <Circle cx="51" cy="21" r="4.5" fill={fill("paper")} />
            <Path d={cross} fill={a.shadow} transform="translate(1 2)" />
            <Path d={cross} fill={fill("azure")} />
            <Path d="M47 49v-2q0-1 2-1h3M40 57v-2q0-2 3-2h3" fill="none" stroke={a.reflection} strokeWidth="1.2" strokeLinecap="round" opacity="0.85" />
            {[32, 26, 19].map((width, i) => <React.Fragment key={width}>
                <Rect x="33" y={71 + i * 5} width={width} height="3" rx="1.5" fill={a.blue[2]} opacity="0.4" />
                <Path d={`M34 ${71.6 + i * 5}h${width - 2}`} stroke={a.blue[0]} strokeWidth="0.6" strokeLinecap="round" />
            </React.Fragment>)}
        </Svg>
    </View>;
});
