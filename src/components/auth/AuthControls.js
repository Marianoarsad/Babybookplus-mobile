import SelectTrigger from "../ui/SelectTrigger";
import OptionSheet from "../ui/OptionSheet";
import React, { useRef, useState } from "react";
import { Keyboard, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { authMaterial as p, MIN_TOUCH, type } from "../../theme";
import { RELATIONSHIPS } from "../../utils/relationship";
import Field, { FieldShell } from "../ui/Field";
import Gradient from "../ui/Gradient";
import AnchoredMenu from "../ui/AnchoredMenu";

export function NeumorphicInput({ icon, ...props }) {
    return <Field {...props} appearance="auth" leading={<Ionicons name={icon} size={22} color={p.azure} />} />;
}

export function SignupProgressIndicator({ step }) {
    return <View style={styles.dots} accessibilityLabel={`Step ${step} of 2`}>
        {[1, 2].map(value => <Gradient key={value} testID={`signup-dot-${value}`} accessible={false}
            colors={value === step ? p.activeDot : p.dot} style={styles.dot} />)}
    </View>;
}

export function RelationshipDropdown({ value, onChange, error }) {
    const target = useRef(null), [anchor, setAnchor] = useState(null);
    const selected = RELATIONSHIPS.find(option => option.key === value);
    const open = () => {
        Keyboard.dismiss();
        target.current?.measureInWindow((x, y, width, height) => setAnchor({ x, y, width, height }));
    };
    return <>
        <SelectTrigger ref={target} label="I am the baby's..." value={selected?.label} placeholder="Select your role"
            leading={<Ionicons name="people-outline" size={23} color={p.azure} />} error={error} visible={!!anchor} onAnchorChange={setAnchor} onPress={open} />
        <OptionSheet visible={!!anchor} anchor={anchor} onClose={() => setAnchor(null)}
            leading={<Ionicons name="people-outline" size={23} color={p.azure} />} options={RELATIONSHIPS} selectedKey={value} onSelect={key => { onChange(key); setAnchor(null); }} />
    </>;
}

export function PrivacyCheckbox({ checked, onChange, disabled }) {
    return <Pressable onPress={() => onChange(!checked)} disabled={disabled} accessibilityRole="checkbox"
        accessibilityLabel="I understand and agree to the privacy and data-retention terms."
        {...(Platform.OS === "web" ? { onKeyDown: event => {
            if (!disabled && (event.key === " " || event.key === "Spacebar")) {
                event.preventDefault(); if (!event.repeat) onChange(!checked);
            }
        }, "aria-checked": checked } : {})}
        accessibilityState={{ checked, disabled }} style={styles.checkboxRow}>
        <Gradient colors={p.input} style={styles.checkbox}>
            {checked ? <Ionicons name="checkmark" size={21} color={p.azure} /> : null}
        </Gradient>
        <Text style={styles.consent}>I understand and agree to the privacy and data-retention terms.</Text>
    </Pressable>;
}

export function SocialAuthButton({ label, icon, disabled, busy, onPress, children }) {
    return <Pressable accessibilityRole={children && !onPress && !disabled ? undefined : "button"} accessibilityLabel={label} disabled={disabled}
        {...(Platform.OS === "web" ? { "aria-busy": !!busy } : {})}
        accessibilityState={{ disabled, busy }} onPress={onPress}
        style={({ pressed }) => [styles.social, pressed && { opacity: 0.8 }]}>
        {children || <Ionicons name={icon} size={26} color={disabled ? p.muted : p.azure} />}
    </Pressable>;
}

const styles = StyleSheet.create({
    dots: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, height: MIN_TOUCH },
    dot: { width: 10, height: 10, borderRadius: 5, boxShadow: p.dotShadow },
    select: { minHeight: 52, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 15 },
    roleLabel: { ...type.bodyStrong, color: p.title, marginBottom: 8, marginLeft: 4 },
    role: { ...type.body, color: p.title, flex: 1 },
    menu: { backgroundColor: p.controlBase, borderColor: p.inputEdge, borderRadius: 20, boxShadow: p.controlShadow },
    option: { minHeight: MIN_TOUCH, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, flexDirection: "row", alignItems: "center" },
    checkboxRow: { minHeight: MIN_TOUCH, flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 14 },
    checkbox: { width: 30, height: 30, borderRadius: 9, boxShadow: p.inputShadow, alignItems: "center", justifyContent: "center" },
    consent: { ...type.body, color: p.secondary, flex: 1 },
    // Provider button colors follow Google branding rather than the app palette.
    social: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF", borderColor: "#747775", borderWidth: 1 },
});
