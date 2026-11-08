import React from "react";
import { Platform, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { authMaterial as p, MIN_TOUCH } from "../../theme";
import Gradient from "./Gradient";

export default function AuthBackButton({ onPress, disabled = false, accessibilityLabel = "Back" }) {
    return <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled }} style={({ pressed, focused }) => [styles.button,
            disabled ? { opacity: 0.55 } : pressed && { opacity: 0.8 },
            Platform.OS === "web" && focused && { outlineStyle: "solid", outlineWidth: 2, outlineColor: p.focus, outlineOffset: 3 }]}>
        <Gradient pointerEvents="none" accessible={false} colors={p.control} style={styles.surface} />
        <Ionicons name="arrow-back" size={25} color={p.azure} />
    </Pressable>;
}

const styles = StyleSheet.create({
    button: { width: MIN_TOUCH, height: MIN_TOUCH, borderRadius: MIN_TOUCH / 2, alignItems: "center", justifyContent: "center", boxShadow: p.controlShadow },
    surface: { position: "absolute", inset: 0, borderRadius: MIN_TOUCH / 2, boxShadow: p.buttonHighlight },
});
