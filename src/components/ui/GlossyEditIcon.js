import React from "react";
import { Image } from "react-native";
export default function GlossyEditIcon({ size = 28 }) {
    return <Image accessible={false} source={require("../../assets/profile/edit.png")} resizeMode="contain" style={{ width: size, height: size }} />;
}
