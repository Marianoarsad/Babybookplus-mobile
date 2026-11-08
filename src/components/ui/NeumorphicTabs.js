import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, Platform, Pressable, StyleSheet, View } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { MIN_TOUCH, type } from "../../theme";
import Gradient from "./Gradient";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

const PROTRUSION = 4;

function Tab({ tab, active, reduceMotion, colors, styles, onChange, onKeyDown, tabRef, selectionRole }) {
    const progress = useRef(new Animated.Value(active ? 1 : 0)).current;
    const [focusVisible, setFocusVisible] = useState(false);
    const updateFocus = Platform.OS === "web"
        ? event => setFocusVisible(Boolean(event.currentTarget?.matches?.(":focus-visible")))
        : undefined;
    useEffect(() => {
        progress.stopAnimation();
        if (reduceMotion) {
            progress.setValue(active ? 1 : 0);
            return;
        }
        const animation = Animated.timing(progress, {
            toValue: active ? 1 : 0, duration: 200, easing: Easing.out(Easing.quad),
            useNativeDriver: Platform.OS !== "web", isInteraction: false,
        });
        animation.start();
        return () => animation.stop();
    }, [active, reduceMotion, progress]);
    useEffect(() => () => progress.stopAnimation(), [progress]);
    return <Pressable ref={tabRef} onPress={() => onChange(tab.key)}
        accessibilityRole={selectionRole} accessibilityLabel={tab.label}
        accessibilityState={{ selected: active, ...(selectionRole === "radio" ? { checked: active } : {}) }}
        {...(selectionRole === "radio" ? { "aria-checked": active } : { "aria-selected": active })}
        onFocus={updateFocus} onBlur={() => setFocusVisible(false)}
        onKeyDown={Platform.OS === "web" ? event => { updateFocus(event); onKeyDown(event); } : undefined}
        onPressIn={event => {
            if (event.nativeEvent?.type === "keydown") updateFocus?.(event);
            else setFocusVisible(false);
        }}
        style={[styles.tab, Platform.OS === "web" && styles.webTab, focusVisible && styles.focused]}>
        <Animated.Text style={[styles.label, {
            color: progress.interpolate({ inputRange: [0, 1], outputRange: [colors.inactiveLabel, colors.activeLabel] }),
        }]}>{tab.label}</Animated.Text>
    </Pressable>;
}

export default function NeumorphicTabs({ tabs, value, onChange, style, selectionRole = "tab" }) {
    const { colors } = useTheme();
    const material = colors.healthTabs;
    const fallback = Platform.OS === "android" && Number(Platform.Version) < 29;
    const insetId = "tabs-inset-" + useId().replace(/:/g, "");
    const styles = useMemo(() => makeStyles(material), [material]);
    const [reduceMotion, setReduceMotion] = useState(true);
    const [layout, setLayout] = useState({ width: 0, height: 0 });
    const indicatorX = useRef(new Animated.Value(0)).current;
    const previousPlacement = useRef(null);
    const tabRefs = useRef({});
    const index = tabs.findIndex(tab => tab.key === value);
    const itemWidth = Math.max(0, layout.width / Math.max(1, tabs.length));
    const visible = index >= 0 && itemWidth > 0 && layout.height > 0;
    const destination = Math.max(0, index) * itemWidth;
    useLayoutEffect(() => {
        const previous = previousPlacement.current;
        previousPlacement.current = { width: layout.width, height: layout.height, count: tabs.length, index };
        const resized = !previous || previous.width !== layout.width || previous.height !== layout.height || previous.count !== tabs.length;
        if (!visible || resized || previous.index < 0 || reduceMotion) {
            indicatorX.stopAnimation();
            indicatorX.setValue(destination);
            return;
        }
        if (previous.index === index) return;
        const animation = Animated.spring(indicatorX, {
            toValue: destination, stiffness: 450, damping: 38, mass: 1,
            overshootClamping: true, restDisplacementThreshold: 0.5, restSpeedThreshold: 5,
            useNativeDriver: Platform.OS !== "web", isInteraction: false,
        });
        animation.start();
        return () => animation.stop();
    }, [destination, index, visible, layout.width, layout.height, tabs.length, reduceMotion, indicatorX]);
    useEffect(() => {
        let mounted = true, changed = false;
        const media = Platform.OS === "web" && globalThis.matchMedia?.("(prefers-reduced-motion: reduce)");
        const update = value => { changed = true; if (mounted) setReduceMotion(value); };
        if (media) setReduceMotion(media.matches);
        else AccessibilityInfo.isReduceMotionEnabled().then(value => {
            if (mounted && !changed) setReduceMotion(value);
        }).catch(() => {});
        const listener = event => update(event.matches);
        if (media?.addEventListener) media.addEventListener("change", listener);
        else media?.addListener?.(listener);
        const subscription = media ? null : AccessibilityInfo.addEventListener("reduceMotionChanged", update);
        return () => {
            mounted = false;
            if (media?.removeEventListener) media.removeEventListener("change", listener);
            else media?.removeListener?.(listener);
            subscription?.remove();
            indicatorX.stopAnimation();
        };
    }, [indicatorX]);
    const navigateByKey = (event, position) => {
        const key = event.nativeEvent?.key || event.key;
        const next = key === "ArrowRight" ? (position + 1) % tabs.length
            : key === "ArrowLeft" ? (position - 1 + tabs.length) % tabs.length
            : key === "Home" ? 0 : key === "End" ? tabs.length - 1 : null;
        if (next == null) return;
        event.preventDefault();
        onChange(tabs[next].key);
        tabRefs.current[tabs[next].key]?.focus?.();
    };
    return <View testID="neumorphic-tabs" style={[styles.container, style]}>
        <Gradient testID="neumorphic-tab-track" pointerEvents="none" accessible={false} colors={material.gradient}
            style={[styles.background, !fallback && { boxShadow: material.shadow }]} />
        {fallback ? <Svg testID="neumorphic-tab-inset-fallback" accessible={false} aria-hidden pointerEvents="none"
            width="100%" height="100%" style={styles.background}>
            <Defs><LinearGradient id={insetId} x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={material.innerShade} /><Stop offset="0.18" stopColor={material.surface} />
                <Stop offset="0.82" stopColor={material.surface} /><Stop offset="1" stopColor={material.innerLight} />
            </LinearGradient></Defs>
            <Rect width="100%" height="100%" rx="999" fill={`url(#${insetId})`} />
        </Svg> : null}
        <View accessibilityRole={selectionRole === "radio" ? "radiogroup" : "tablist"} style={styles.row} onLayout={({ nativeEvent: { layout: next } }) => {
            setLayout(previous => previous.width === next.width && previous.height === next.height
                ? previous : { width: next.width, height: next.height });
        }}>
            <Animated.View testID="neumorphic-tab-indicator" pointerEvents="none" accessible={false}
                accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
                style={[styles.indicator, { width: itemWidth, height: Math.max(0, layout.height + PROTRUSION * 2),
                    opacity: visible ? 1 : 0, transform: [{ translateX: indicatorX }] }]}>
                <Gradient colors={material.selectedGradient} style={styles.background} />
                <Gradient colors={material.reflection} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.highlight} />
            </Animated.View>
            {tabs.map((tab, position) => <Tab key={tab.key} tab={tab} active={index === position}
                selectionRole={selectionRole} reduceMotion={reduceMotion} colors={material} styles={styles} onChange={onChange}
                tabRef={node => { tabRefs.current[tab.key] = node; }}
                onKeyDown={event => navigateByKey(event, position)} />)}
        </View>
    </View>;
}

const makeStyles = colors => StyleSheet.create({
    container: { borderRadius: 999, borderCurve: "continuous", overflow: "visible" },
    background: { ...StyleSheet.absoluteFill, borderRadius: 999, overflow: "hidden" },
    highlight: { position: "absolute", top: 1, left: 16, right: 16, height: 8, borderRadius: 999 },
    row: { flexDirection: "row", alignItems: "stretch", overflow: "visible" },
    // Move the old inset into the touch rows, preserving the track's 52dp minimum and text growth.
    tab: { flex: 1, minWidth: 0, minHeight: MIN_TOUCH + 8, paddingVertical: 14, paddingHorizontal: 0, zIndex: 1,
        alignItems: "center", justifyContent: "center", borderRadius: 999 },
    webTab: { outlineStyle: "none" },
    focused: { outlineStyle: "solid", outlineWidth: 2, outlineOffset: -3, outlineColor: colors.activeLabel },
    label: { ...type.caption, textAlign: "center", alignSelf: "stretch" },
    indicator: { position: "absolute", top: -PROTRUSION, left: 0, borderRadius: 999,
        borderCurve: "continuous", boxShadow: colors.selectedShadow },
});
