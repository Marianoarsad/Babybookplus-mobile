import React from "react";
import { Image } from "react-native";

const artSize = (width, height, scale, ratio) => {
    const fittedWidth = Math.min(width * scale, height * ratio);
    return { width: fittedWidth, height: fittedWidth / ratio, aspectRatio: ratio, flexShrink: 0 };
};
export function BookCollage({ width, height }) {
    return <Image source={require("../../assets/onboarding-book-collage.png")} style={artSize(width, height, 1.18, 1.5)} resizeMode="contain" accessible
        accessibilityLabel="The white BabyBook seal smiling over an open blue baby book with feeding, growth and medical icons" />;
}
export function QrShareArt({ width, height }) {
    return <Image source={require("../../assets/onboarding-qr-hand.png")} style={artSize(width, height, 1, 1200 / 1296)} resizeMode="contain" accessible
        accessibilityLabel="A hand holding a blue phone with the BabyBook seal, consultation QR, read-only lock and access timer" />;
}
export function CareCircleArt({ width, height }) {
    return <Image source={require("../../assets/onboarding-care-circle.png")} style={artSize(width, height, 1.5, 1.5)} resizeMode="contain" accessible
        accessibilityLabel="A parent and the white BabyBook seal holding an open baby book in front of a protective medical shield" />;
}
