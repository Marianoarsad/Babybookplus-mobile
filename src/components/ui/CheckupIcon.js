import React, { memo, useId } from "react";
import { View } from "react-native";
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import { useTheme } from "../../context/ThemeContext";

export default memo(function CheckupIcon({ size = 40, showBackground = true }) {
    const { colors } = useTheme(), p = colors.recordCategory.checkup, a = colors.keepsakeArtwork;
    const id = "checkup-" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
    const gradient = (name, stops) => <LinearGradient id={id + name} x1="0" y1="0" x2="0.8" y2="1">
        {stops.map((color, i) => <Stop key={i} offset={i / (stops.length - 1)} stopColor={color} />)}
    </LinearGradient>;
    const fill = name => `url(#${id + name})`;
    return <View pointerEvents="none" accessible={false} style={{ width: size, height: size, flexShrink: 0, borderRadius: size / 2, boxShadow: showBackground ? p.shadow : undefined }}>
        <Svg accessible={false} aria-hidden width={size} height={size} viewBox="0 0 100 100" style={{ position: "relative" }}>
            <Defs>{gradient("ivory", a.ivory)}{gradient("blue", a.blue)}{gradient("azure", a.azure)}{gradient("bg", p.surface)}</Defs>
            {showBackground ? <Circle cx="50" cy="50" r="49" fill={fill("bg")} /> : null}
            <Ellipse cx="52" cy="87" rx="32" ry="5" fill={a.shadow} />
            <Rect x="19" y="28" width="62" height="58" rx="12" fill={a.shadow} />
            <Rect x="17" y="24" width="62" height="59" rx="12" fill={fill("ivory")} stroke={a.ivoryEdge} strokeWidth="0.8" />
            <Rect x="20" y="27" width="56" height="53" rx="10" fill="none" stroke={a.reflection} strokeWidth="1.4" opacity="0.9" />
            <Rect x="18" y="25" width="61" height="21" rx="10" fill={a.blue[2]} opacity="0.35" />
            <Rect x="17" y="23" width="62" height="21" rx="10" fill={fill("blue")} stroke={a.blue[2]} strokeWidth="0.8" />
            <Path d="M21 35v-2q0-6 8-6h39" fill="none" stroke={a.reflection} strokeWidth="1.8" opacity="0.9" strokeLinecap="round" />
            {[32, 61].map(x => <React.Fragment key={x}>
                <Rect x={x + 1} y="14" width="9" height="23" rx="4.5" fill={a.blue[2]} opacity="0.3" />
                <Rect x={x} y="12" width="9" height="23" rx="4.5" fill={fill("blue")} stroke={a.blue[2]} strokeWidth="0.6" />
                <Path d={`M${x + 2} 29V19q0-4 3-4`} fill="none" stroke={a.reflection} strokeWidth="1.5" opacity="0.85" strokeLinecap="round" />
            </React.Fragment>)}
            {[28, 43, 58].flatMap(x => [50, 64].map(y => <React.Fragment key={`${x}-${y}`}>
                <Rect x={x + 0.5} y={y + 1} width="9" height="9" rx="2.2" fill={a.blue[2]} opacity="0.2" />
                <Rect x={x} y={y} width="9" height="9" rx="2" fill={fill("blue")} />
                <Path d={`M${x + 1.2} ${y + 6}v-3q0-1.5 2-1.5h3`} fill="none" stroke={a.reflection} strokeWidth="0.8" opacity="0.85" />
            </React.Fragment>))}
            <Circle cx="76" cy="76" r="21" fill={a.shadow} />
            <Circle cx="75" cy="73" r="20.5" fill={fill("ivory")} stroke={a.ivoryEdge} strokeWidth="0.8" />
            <Circle cx="75" cy="73" r="18.5" fill="none" stroke={a.reflection} strokeWidth="1.1" opacity="0.85" />
            <Path d="M72 61h6v9h9v6h-9v9h-6v-9h-9v-6h9Z" fill={a.blue[2]} opacity="0.22" transform="translate(0.5 1.5)" strokeLinejoin="round" strokeWidth="2" stroke={a.blue[2]} />
            <Path d="M72 61h6v9h9v6h-9v9h-6v-9h-9v-6h9Z" fill={fill("azure")} stroke={a.azure[2]} strokeWidth="0.7" strokeLinejoin="round" />
            <Path d="M73.2 68v-5h3M65 72h7M79 72h5" fill="none" stroke={a.reflection} strokeWidth="1.1" strokeLinecap="round" opacity="0.85" />
        </Svg>
    </View>;
});
