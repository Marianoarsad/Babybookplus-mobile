import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { type } from "../../theme";
import Gradient from "./Gradient";
import { GrowthIcon } from "./RecordIcon";

export function HistoryBackground({ item = false }) {
    const { colors } = useTheme();
    const material = colors.growthHistory;
    return <Gradient pointerEvents="none" accessible={false} colors={material[item ? "item" : "panel"]}
        style={[StyleSheet.absoluteFill, { borderRadius: item ? 24 : 28,
            boxShadow: "inset 0 1px 2px " + material.highlight }]} />;
}

export function MeasurementHistoryRow({ date, age }) {
    const { colors } = useTheme();
    const material = colors.growthHistory;
    return <View style={{ minHeight: 80, padding: 14, borderRadius: 24, flexDirection: "row", alignItems: "center", gap: 12 }}>
        <HistoryBackground item />
        <GrowthIcon size={52} />
        <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ ...type.bodyStrong, fontSize: 17, color: material.title }}>{date}</Text>
            {age ? <Text style={{ ...type.caption, color: material.secondary, marginTop: 3 }}>{age}</Text> : null}
        </View>
        <Ionicons name="chevron-forward" size={21} color={material.chevron} accessible={false} />
    </View>;
}
