import React from "react";
import { Image, View } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { DashboardSurface as Surface } from "./ConsultationsAppointmentsCard";

// Local analytics artwork; the shared SolidFoodIcon record identity is unchanged.
const artwork = {
    fruits: require("../../assets/nutrition/food-fruits.png"),
    vegetables: require("../../assets/nutrition/food-vegetables.png"),
    grains: require("../../assets/nutrition/food-grains.png"),
    proteins: require("../../assets/nutrition/food-proteins.png"),
    dairy: require("../../assets/nutrition/food-dairy.png"),
    other: require("../../assets/nutrition/food-other.png"),
};

export default function FoodCategoryIcon({ category, size = 48 }) {
    const { colors } = useTheme(), material = colors.solidFoodCategories[category];
    return <View accessible={false} pointerEvents="none" style={{ width: size, height: size, flexShrink: 0, borderRadius: size / 2, alignItems: "center", justifyContent: "center", boxShadow: material.shadow }}>
        <Surface colors={material.surface} highlight={colors.appointmentDashboard.highlight} radius={size / 2} />
        <Image accessible={false} source={artwork[category]} resizeMode="contain" style={{ width: size, height: size }} />
    </View>;
}
