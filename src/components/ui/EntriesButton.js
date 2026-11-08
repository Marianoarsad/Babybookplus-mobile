import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Platform, Pressable, StyleSheet, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { motion, type } from "../../theme";
import Gradient from "./Gradient";
import useReducedMotion from "./useReducedMotion";
import useSoftPress from "./useSoftPress";

export default function EntriesButton({ label, expanded, style, disabled, ...props }) {
    const { colors } = useTheme(), p = colors.feedingBreakdown;
    const { respond, transform } = useSoftPress();
    const [pressed, setPressed] = useState(false), [focused, setFocused] = useState(false);
    const reduced = useReducedMotion(), angle = useRef(new Animated.Value(expanded ? 1 : 0)).current;
    useEffect(() => {
        angle.stopAnimation();
        if (expanded === undefined || reduced !== false) { angle.setValue(expanded ? 1 : 0); return; }
        const animation = Animated.timing(angle, { toValue: expanded ? 1 : 0, duration: 260,
            easing: Easing.bezier(...motion.standard.bezier), useNativeDriver: Platform.OS !== "web" });
        animation.start(); return () => animation.stop();
    }, [expanded, reduced, angle]);
    const focus = event => setFocused(Platform.OS === "web" && Boolean(event.currentTarget?.matches?.(":focus-visible")));
    const press = down => { setPressed(down); respond(down); };
    return <Pressable {...props} disabled={disabled} accessibilityRole="button"
        accessibilityLabel={props.accessibilityLabel || label}
        accessibilityState={{ ...props.accessibilityState, ...(expanded === undefined ? {} : { expanded }), ...(disabled ? { disabled: true } : {}) }}
        aria-expanded={expanded} onPressIn={() => press(true)} onPressOut={() => press(false)}
        onFocus={focus} onKeyDown={focus} onBlur={() => { setFocused(false); press(false); }}
        style={[styles.button, style, disabled && { opacity: 0.5 }, Platform.OS === "web" && {
            outlineStyle: focused ? "solid" : "none", outlineWidth: 2, outlineOffset: 3, outlineColor: p.azure }]}>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: 24, transform,
            backgroundColor: p.control[0], boxShadow: pressed ? p.pressedShadow : p.itemShadow }]}>
            <Gradient pointerEvents="none" accessible={false} colors={p.control}
                style={[StyleSheet.absoluteFill, { borderRadius: 24, boxShadow: "inset 1px 2px 3px " + p.highlight }]} />
        </Animated.View>
        <Animated.View pointerEvents="none" style={{ transform: [{ rotate: angle.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] }) }] }}>
            <Ionicons accessible={false} name="chevron-down" size={22} color={p.azure} />
        </Animated.View>
        <Text style={[styles.label, { color: p.azure }]}>{label}</Text>
    </Pressable>;
}

const styles = StyleSheet.create({
    button: { minHeight: 48, borderRadius: 24, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 12 },
    label: { ...type.label, flexShrink: 1, textAlign: "center" },
});
