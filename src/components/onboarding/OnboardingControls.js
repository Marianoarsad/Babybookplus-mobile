import React from "react";
import { Animated, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { MIN_TOUCH, onboardingMaterial as p, type } from "../../theme";
import Gradient from "../ui/Gradient";
import useSoftPress from "../ui/useSoftPress";

export function OnboardingProgressIndicator({ index, onSelect }) {
    return <View style={styles.dots}>
        {[0, 1, 2].map(i => <Pressable key={i} onPress={() => onSelect(i)} style={styles.dotTarget}
            accessibilityRole="button" accessibilityLabel={`Go to slide ${i + 1} of 3`}
            accessibilityState={{ selected: i === index }}>
            <Gradient colors={i === index ? p.activeDot : p.dot} style={styles.dot} />
        </Pressable>)}
    </View>;
}

export function OnboardingButton({ label, onPress, circular = false, glass = false, disabled = false, blurTarget }) {
    const { respond, transform } = useSoftPress(0.97);
    return <Animated.View style={[circular ? styles.circle : styles.wide, { transform }]}>
        <Pressable onPress={onPress} disabled={disabled} onPressIn={() => respond(true)} onPressOut={() => respond(false)}
            onBlur={() => respond(false)} accessibilityRole="button" accessibilityLabel={label}
            style={({ pressed }) => [styles.button, circular && styles.circle, glass && styles.glass, pressed && styles.pressed]}>
            {glass ? <View pointerEvents="none" style={styles.glassClip}>
                {Platform.OS === "web" ? <View style={[StyleSheet.absoluteFill, styles.webBlur]} /> :
                    <BlurView style={StyleSheet.absoluteFill} intensity={30} tint="systemUltraThinMaterialLight"
                        blurTarget={blurTarget} blurMethod={Platform.OS === "android" ? "dimezisBlurViewSdk31Plus" : undefined} />}
            </View> : <Gradient pointerEvents="none" colors={p.primary} start={{ x: 0.2, y: 0 }} end={{ x: 0.65, y: 1 }}
                style={[StyleSheet.absoluteFill, styles.fill, circular && { borderRadius: 30 }]} />}
            {!circular ? <Text style={[styles.label, glass && styles.glassLabel]}>{label}</Text> : null}
            {!glass ? <Ionicons name="arrow-forward" size={circular ? 29 : 24} color={p.white} accessible={false} allowFontScaling={false} style={{ width: 32, height: 32, lineHeight: 32, textAlign: "center", includeFontPadding: false, flexShrink: 0 }} /> : null}
        </Pressable>
    </Animated.View>;
}

const styles = StyleSheet.create({
    dots: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
    dotTarget: { width: 20, minHeight: MIN_TOUCH, alignItems: "center", justifyContent: "center" },
    dot: { width: 9, height: 9, borderRadius: 4.5, boxShadow: p.dotShadow },
    wide: { width: "100%" }, circle: { width: 60, height: 60, borderRadius: 30, paddingHorizontal: 0, paddingVertical: 0 },
    button: { width: "100%", minHeight: 54, borderRadius: 28, paddingHorizontal: 20, paddingVertical: 14,
        flexDirection: "row", gap: 14, alignItems: "center", justifyContent: "center", boxShadow: p.buttonShadow,
        backgroundColor: p.primary[1] },
    fill: { borderRadius: 28, boxShadow: p.buttonHighlight },
    label: { ...type.bodyStrong, color: p.white, textAlign: "center", flexShrink: 1 },
    glass: { backgroundColor: p.glass, borderWidth: 1, borderColor: p.glassEdge, boxShadow: p.glassShadow },
    glassClip: { ...StyleSheet.absoluteFill, overflow: "hidden", borderRadius: 28 },
    glassLabel: { color: p.azure }, webBlur: { backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" },
    pressed: { opacity: 0.94 },
});
