import React from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import NeumorphicInsetSurface from "./NeumorphicInsetSurface";
import { useTheme } from "../../context/ThemeContext";
import Gradient from "./Gradient";
import { type } from "../../theme";

export default function InfoCallout({ message, title, icon, action, onDismiss, style, testID }) {
    const { colors } = useTheme(), p = colors.infoCallout;
    return <NeumorphicInsetSurface testID={testID} style={[{
        padding: p.padding, gap: p.gap, flexDirection: "row", alignItems: "center" }, style]}>
        {icon !== false ? <View accessible={false} aria-hidden importantForAccessibility="no-hide-descendants" pointerEvents="none"
            style={{ width: p.iconSize, height: p.iconSize, flexShrink: 0 }}>
            {icon || <Gradient colors={p.icon} style={{ width: p.iconSize, height: p.iconSize,
                borderRadius: p.iconSize / 2, alignItems: "center", justifyContent: "center", boxShadow: p.iconShadow }}>
                <Ionicons name="information" size={p.iconSize * 0.72} color={p.onIcon} />
            </Gradient>}
        </View> : null}
        {icon !== false ? <View accessible={false} aria-hidden style={{ width: 1, backgroundColor: p.divider, alignSelf: "stretch" }} /> : null}
        <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
            {title ? <Text style={{ ...type.bodyStrong, fontSize: p.fontSize, lineHeight: p.lineHeight, color: p.title }}>{title}</Text> : null}
            <Text style={{ ...type.body, fontSize: p.fontSize, lineHeight: p.lineHeight, color: p.text }}>{message}</Text>
            {action}
        </View>
        {onDismiss ? <Pressable onPress={onDismiss} accessibilityRole="button" accessibilityLabel="Dismiss tip"
            style={({ pressed, focused }) => ({ width: 44, minHeight: 44, alignItems: "center", justifyContent: "center",
                opacity: pressed ? 0.65 : 1, ...(Platform.OS === "web" && focused ? { outlineColor: p.focus } : {}) })}>
            <Ionicons accessible={false} name="close" size={20} color={p.text} />
        </Pressable> : null}
    </NeumorphicInsetSurface>;
}
