import React, { useEffect, useId, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, Keyboard, Platform, StyleSheet, View, findNodeHandle } from "react-native";
import Svg, { Circle, Defs, FeGaussianBlur, Filter } from "react-native-svg";
import { databaseLoaderColors } from "../../theme";
import { useLanguage } from "../../context/LanguageContext";
import { getApiActivitySnapshot } from "../../utils/api";

const SPINNER_SIZE = 112;
const STROKE_WIDTH = 7.8 * 1.15;
const DRAW_SIZE = SPINNER_SIZE * 104 / 96;
const DRAW_PADDING = SPINNER_SIZE * 4 / 96;

function arcArtwork(r, palette, angle, id, name) {
    const arc = { cx: 48, cy: 48, r, fill: "none", strokeLinecap: "round",
        strokeDasharray: `${r * Math.PI * 1.5} ${r * Math.PI * 0.5}`,
        // Static material pose; the existing animated wrappers still own all motion.
        strokeDashoffset: -r * Math.PI * angle / 180 };
    return <Svg width={DRAW_SIZE} height={DRAW_SIZE} viewBox="-4 -4 104 104" accessible={false}
        style={{ position: "absolute", left: -DRAW_PADDING, top: -DRAW_PADDING }}>
        <Defs>
            <Filter id={`${id}-shadow`} x="-4" y="-4" width="104" height="104" filterUnits="userSpaceOnUse">
                <FeGaussianBlur stdDeviation="0.8" />
            </Filter>
        </Defs>
        <Circle {...arc} stroke={palette.shadow} strokeWidth={STROKE_WIDTH} opacity={0.16}
            transform="translate(0.5 0.7)" filter={`url(#${id}-shadow)`} />
        <Circle {...arc} testID={`database-loader-${name}-arc`} stroke={palette.primary} strokeWidth={STROKE_WIDTH} />
        <Circle {...arc} stroke={databaseLoaderColors.reflection} strokeWidth={0.9} opacity={0.18}
            transform="translate(-1.8 -1.8)" />
    </Svg>;
}

export default function DatabaseLoadingOverlay({ previousFocus }) {
    const { t } = useLanguage();
    const label = t("databaseLoading");
    const id = "database-loader-" + useId().replace(/:/g, "");
    const ref = useRef(null);
    const outerRotation = useRef(new Animated.Value(0)).current;
    const innerRotation = useRef(new Animated.Value(0)).current;
    const [reduceMotion, setReduceMotion] = useState(true);
    useEffect(() => {
        let active = true;
        AccessibilityInfo.isReduceMotionEnabled().then((value) => active && setReduceMotion(value)).catch(() => {});
        const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
        return () => { active = false; subscription.remove(); };
    }, []);
    useEffect(() => {
        outerRotation.setValue(0);
        innerRotation.setValue(0);
        if (reduceMotion) return undefined;
        const loops = [[outerRotation, 1200], [innerRotation, 1000]].map(([value, duration]) => Animated.loop(
            Animated.timing(value, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: Platform.OS !== "web", isInteraction: false }),
        ));
        loops.forEach((loop) => loop.start());
        return () => loops.forEach((loop) => loop.stop());
    }, [reduceMotion, outerRotation, innerRotation]);
    useEffect(() => {
        Keyboard.dismiss();
        const previous = Platform.OS === "web" && typeof document !== "undefined" ? previousFocus?.current || document.activeElement : null;
        const frame = requestAnimationFrame(() => {
            if (Platform.OS === "web") ref.current?.focus?.();
            else {
                const handle = findNodeHandle(ref.current);
                if (handle != null) AccessibilityInfo.setAccessibilityFocus(handle);
            }
            AccessibilityInfo.announceForAccessibility?.(label);
        });
        return () => {
            cancelAnimationFrame(frame);
            if (previous) requestAnimationFrame(() => {
                if (!getApiActivitySnapshot() && previous.isConnected) previous.focus?.();
            });
        };
    }, [label, previousFocus]);
    return <View ref={ref} accessible focusable accessibilityRole="progressbar" accessibilityLabel={label}
        accessibilityState={{ busy: true }} accessibilityViewIsModal onAccessibilityEscape={() => {}}
        onStartShouldSetResponder={() => true} onMoveShouldSetResponder={() => true}
        {...(Platform.OS === "web" ? {
            onWheel: (event) => { event.preventDefault(); event.stopPropagation(); },
            onKeyDown: (event) => { if (!event.ctrlKey && !event.metaKey) { event.preventDefault(); event.stopPropagation(); } },
        } : {})}
        style={[StyleSheet.absoluteFill, { zIndex: 10000, backgroundColor: databaseLoaderColors.backdrop, alignItems: "center", justifyContent: "center" },
            Platform.OS === "web" && { touchAction: "none" }]}>
        <View pointerEvents="none" accessible={false} style={{ width: SPINNER_SIZE, height: SPINNER_SIZE }}>
            {[[43, databaseLoaderColors.blue, outerRotation, "360deg", 135, "outer"],
                [28, databaseLoaderColors.pink, innerRotation, "-360deg", -45, "inner"]].map(([r, palette, rotation, end, angle, name]) =>
                <Animated.View key={r} testID={`database-loader-${name}-motion`} style={[StyleSheet.absoluteFill, { transform: [{ rotate: rotation.interpolate({ inputRange: [0, 1], outputRange: ["0deg", end] }) }] }]}>
                    {arcArtwork(r, palette, angle, `${id}-${name}`, name)}
                </Animated.View>)}
        </View>
    </View>;
}
