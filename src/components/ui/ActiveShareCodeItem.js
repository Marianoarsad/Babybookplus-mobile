import React from "react";
import { Image, Platform, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { space, type } from "../../theme";
import { shareExpiryText } from "../../utils/activeShares";
import NeumorphicInsetSurface from "./NeumorphicInsetSurface";
import Gradient from "./Gradient";

export default function ActiveShareCodeItem({ count, expiresAt, now, loading = false, unavailable = false, onPress }) {
    const { colors } = useTheme(), p = colors.infoCallout;
    const title = loading ? "Loading share codes…" : unavailable ? "Share code status unavailable"
        : `${count} active share code${count === 1 ? "" : "s"}`;
    const expiry = !loading && !unavailable && count > 0 ? shareExpiryText(expiresAt, now) : null;
    const subtitle = expiry ? `${count === 1 ? "Expires" : "Next code expires"} ${expiry}` : null;
    return <Pressable testID="active-share-code-item" onPress={onPress} accessibilityRole="button"
        accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
        accessibilityHint="Open active and recent shares" accessibilityState={{ busy: loading }}
        style={({ pressed, hovered, focused }) => ({ borderRadius: p.radius, marginBottom: space.lg,
            opacity: pressed ? 0.88 : hovered ? 0.96 : 1,
            ...(Platform.OS === "web" ? { outlineStyle: focused ? "solid" : "none", outlineWidth: 2,
                outlineOffset: 3, outlineColor: p.focus } : {}) })}>
        <NeumorphicInsetSurface testID="active-share-code-surface" style={{ minHeight: 80, padding: p.padding,
            gap: p.gap, flexDirection: "row", alignItems: "center" }}>
            <View accessible={false} aria-hidden importantForAccessibility="no-hide-descendants" pointerEvents="none">
                <Gradient colors={colors.shareSurface.control} style={{ width: 48, height: 48, borderRadius: 24,
                    alignItems: "center", justifyContent: "center", boxShadow: p.iconShadow }}>
                    <Image source={require("../../assets/header/qr-blue.png")} resizeMode="contain" style={{ width: 34, height: 34 }} />
                    <Gradient colors={[p.icon[0], colors.info]} style={{ position: "absolute", right: 5, bottom: 5,
                        width: 19, height: 19, borderRadius: 10, alignItems: "center", justifyContent: "center", boxShadow: p.iconShadow }}>
                        <Ionicons name="checkmark" size={15} color={p.onIcon} />
                    </Gradient>
                </Gradient>
            </View>
            <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                <Text style={{ ...type.bodyStrong, color: colors.info, fontSize: 15, lineHeight: 22 }}>{title}</Text>
                {subtitle ? <Text style={{ ...type.caption, color: p.text, lineHeight: 19 }}>{subtitle}</Text> : null}
            </View>
            <Ionicons accessible={false} name="chevron-forward" size={23} color={colors.info} />
        </NeumorphicInsetSurface>
    </Pressable>;
}
