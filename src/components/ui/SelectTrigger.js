import React, { forwardRef, useContext, useEffect, useRef, useState } from "react";
import { Keyboard, Platform, Text, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import ScrollContext from "../../context/ScrollContext";
import { MIN_TOUCH, motion, space, type } from "../../theme";
import Gradient from "./Gradient";
import GlassLighting from "./GlassLighting";
import useReducedMotion from "./useReducedMotion";

// Shared face for both the in-layout control and its connected menu header.
export default forwardRef(function SelectTrigger({ label, value, placeholder, expanded = false,
    visible = false, covered: externallyCovered = false, onAnchorChange, onPress, error, required, helper, leading, style, containerStyle, ...props }, forwardedRef) {
    const local = useRef(null), target = forwardedRef || local;
    const { colors } = useTheme(), glass = colors.growthDropdownGlass;
    const { width, height, fontScale } = useWindowDimensions();
    const scroll = useContext(ScrollContext);
    const reduced = useReducedMotion();
    const [covered, setCovered] = useState(visible);
    useEffect(() => {
        if (visible) { setCovered(true); return; }
        const timer = setTimeout(() => setCovered(false), reduced ? 0 : motion.standard.duration);
        return () => clearTimeout(timer);
    }, [visible, reduced]);
    useEffect(() => {
        if (!visible || !onAnchorChange) return;
        const measure = () => target.current?.measureInWindow((x, y, width, height) => {
            if ([x, y, width, height].every(Number.isFinite) && width > 0 && height > 0)
                onAnchorChange(previous => previous?.x === x && previous?.y === y && previous?.width === width && previous?.height === height
                    ? previous : { x, y, width, height });
        });
        measure();
        const listener = scroll?.scrollY?.addListener(measure);
        const keyboard = Keyboard.addListener("keyboardDidHide", measure);
        const observer = Platform.OS === "web" && globalThis.ResizeObserver ? new globalThis.ResizeObserver(measure) : null;
        let node = target.current;
        while (observer && node?.nodeType === 1) { observer.observe(node); node = node.parentElement; }
        return () => { if (listener != null) scroll.scrollY.removeListener(listener); keyboard.remove(); observer?.disconnect(); };
    }, [visible, onAnchorChange, target, scroll, width, height, fontScale]);
    const previouslyCovered = useRef(false);
    useEffect(() => {
        const nowCovered = covered || externallyCovered;
        if (!nowCovered && previouslyCovered.current && Platform.OS === "web") target.current?.focus?.();
        previouslyCovered.current = nowCovered;
    }, [covered, externallyCovered, target]);
    const hidden = covered || externallyCovered;
    return <View style={[expanded ? { flex: 1 } : { marginBottom: label ? space.md : 0 }, containerStyle]}>
        {label ? <Text style={{ ...type.caption, color: error ? colors.danger : colors.textMuted, fontWeight: "600", marginLeft: 4, marginBottom: 6 }}>
            {label}{required ? " *" : ""}</Text> : null}
        <TouchableOpacity {...props} ref={target} onPress={event => { Keyboard.dismiss(); onPress?.(event); }}
            accessibilityRole="button" accessibilityLabel={props.accessibilityLabel || `${label || "Choose"}: ${value || placeholder || ""}`}
            accessibilityState={{ ...props.accessibilityState, expanded: expanded || visible }}
            accessible={!hidden} importantForAccessibility={hidden ? "no-hide-descendants" : "auto"}
            {...(Platform.OS === "web" ? { tabIndex: hidden ? -1 : 0, "aria-hidden": hidden || undefined } : {})}
            style={[{ minHeight: MIN_TOUCH, flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                gap: space.sm, paddingHorizontal: space.md, paddingVertical: 8, borderRadius: 22,
                borderCurve: "continuous", boxShadow: glass.panelShadow }, style,
                expanded && { flex: 1, borderRadius: 0, boxShadow: "none", borderBottomWidth: 0.5, borderBottomColor: glass.divider },
                hidden && { opacity: 0, pointerEvents: "none" }]}>
            {!expanded ? <><Gradient pointerEvents="none" colors={glass.popoverPanel} style={{ position: "absolute", inset: 0, borderRadius: 22 }} />
                <GlassLighting material={glass} radius={22} /></> : null}
            {leading}
            <Text style={{ ...type.label, color: glass.text, flex: 1, minWidth: 0 }}>{value || placeholder}</Text>
            <Ionicons accessible={false} name={expanded ? "chevron-up" : "chevron-down"} size={18} color={glass.accent} />
        </TouchableOpacity>
        {!expanded && (error || helper) ? <Text accessibilityRole={error ? "alert" : undefined}
            style={{ ...type.caption, marginTop: 4, color: error ? colors.danger : colors.textMuted }}>{error || helper}</Text> : null}
    </View>;
});
