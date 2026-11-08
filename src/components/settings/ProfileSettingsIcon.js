import React, { useId } from "react";
import { Image, View } from "react-native";
import Svg, { Defs, LinearGradient, Stop, Path } from "react-native-svg";
import { useTheme } from "../../context/ThemeContext";
import { DashboardSurface as Surface } from "../ui/ConsultationsAppointmentsCard";

// Profile artwork is independent of record-category and header icon definitions.
export const PROFILE_SETTINGS_ICONS = Object.freeze({
    phone: require("../../assets/settings/phone.png"),
    location: require("../../assets/settings/location.png"),
    appearance: require("../../assets/settings/appearance.png"),
    language: require("../../assets/settings/language.png"),
    reminders: require("../../assets/header/notifications-blue.png"),
    person: require("../../assets/settings/person.png"),
    lock: require("../../assets/settings/lock.png"),
    privacy: require("../../assets/settings/privacy.png"),
    help: require("../../assets/settings/help.png"),
    book: require("../../assets/settings/book.png"),
    qr: require("../../assets/header/qr-blue.png"),
    calendar: require("../../assets/navbar/calendar-blue.png"),
});

const GLYPHS = {
    system: "M17 5h14a4 4 0 0 1 4 4v30a4 4 0 0 1-4 4H17a4 4 0 0 1-4-4V9a4 4 0 0 1 4-4zm1 5v26h12V10zm4 29h4v2h-4z",
    light: "M24 12a12 12 0 1 0 0 24 12 12 0 0 0 0-24zM22 2h4v7h-4zm0 37h4v7h-4zM2 22h7v4H2zm37 0h7v4h-7zM7 10l3-3 5 5-3 3zm26 26 3-3 5 5-3 3zM7 38l5-5 3 3-5 5zm26-26 5-5 3 3-5 5z",
    dark: "M34 5a19 19 0 1 0 9 27C25 39 14 18 34 5z",
    mail: "M8 10h32a4 4 0 0 1 4 4v22a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V14a4 4 0 0 1 4-4zm0 5 16 13 16-13v-1L24 25 8 14z",
    cloud: "M12 36a10 10 0 0 1-1-20A14 14 0 0 1 38 19a9 9 0 0 1-1 17z",
};

export default function ProfileSettingsIcon({ kind, size = 44 }) {
    const { colors } = useTheme(), p = colors.profileSettings;
    const ink = "settings-" + useId().replace(/:/g, "");
    return <View accessible={false} aria-hidden pointerEvents="none"
        style={{ width: size, height: size, borderRadius: size / 2, alignItems: "center",
            justifyContent: "center", flexShrink: 0, boxShadow: p.iconShadow }}>
        <Surface colors={p.iconSurface} highlight={p.highlight} radius={size / 2} />
        {GLYPHS[kind] ? <View style={{ width: size * 0.74, height: size * 0.74 }}>
            <Svg width="100%" height="100%" viewBox="0 0 48 48">
            <Defs><LinearGradient id={ink} x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0" stopColor={p.avatarRing[0]} /><Stop offset="0.45" stopColor={p.avatarRing[1]} />
                <Stop offset="1" stopColor={p.avatarRing[2]} />
            </LinearGradient></Defs>
            <Path d={GLYPHS[kind]} fill={`url(#${ink})`} stroke={p.highlight} strokeWidth="0.7" />
        </Svg></View> : <Image accessible={false} source={PROFILE_SETTINGS_ICONS[kind]} resizeMode="contain"
            style={{ position: "relative", zIndex: 1, width: size * 0.74, height: size * 0.74 }} />}
    </View>;
}
