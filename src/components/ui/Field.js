import React, { useState } from "react";
import { Platform, View, Text, TextInput, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { authMaterial, radius, space, type, MIN_TOUCH } from "../../theme";
import NeumorphicInsetSurface from "./NeumorphicInsetSurface";
import { useTheme } from "../../context/ThemeContext";
import numericInput from "../../utils/numericInput.cjs";

const { decimalOnly, digitsOnly } = numericInput;

export function FieldShell({ label, required = false, focused = false, disabled = false,
    error, helper, multiline = false, style, children, trailing, appearance, borderRadius = multiline ? radius.xl : radius.pill }) {
    const { colors } = useTheme();
    const p = appearance === "auth" ? authMaterial : { ...authMaterial, ...colors.sunkenInput };
    const hasError = !!error;
    const borderColor = hasError ? colors.danger : disabled ? colors.border
        : focused ? p.focus : p.inputEdge;
    const labelColor = hasError ? colors.danger : disabled ? p.placeholder : p.secondary;

    return <View style={[{ marginBottom: space.md }, style]}>
        {label ? <Text style={{ ...type.caption, color: labelColor, fontWeight: "600", marginBottom: 6, marginLeft: 4 }}>
            {label}{required ? <Text style={{ color: colors.danger }}> *</Text> : null}
        </Text> : null}
        {trailing ? <View testID="field-control-row" style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
            <NeumorphicInsetSurface material={{ surface: p.inputBase, radius: borderRadius, insetShadow: p.inputShadow,
            innerShade: p.input[0], innerLight: p.input[p.input.length - 1] }}
            style={{ ...(trailing ? { flex: 1, minWidth: 0 } : {}), minHeight: multiline ? 96 : 52, position: "relative", justifyContent: multiline ? "flex-start" : "center",
                borderWidth: focused || hasError ? 1.5 : 1, borderColor, borderRadius, borderCurve: "continuous" }}>
            {children}
        </NeumorphicInsetSurface>
            <View testID="field-trailing" style={{ flexShrink: 0 }}>{trailing}</View>
        </View> : <NeumorphicInsetSurface material={{ surface: p.inputBase, radius: borderRadius, insetShadow: p.inputShadow,
            innerShade: p.input[0], innerLight: p.input[p.input.length - 1] }}
            style={{ ...(trailing ? { flex: 1, minWidth: 0 } : {}), minHeight: multiline ? 96 : 52, position: "relative", justifyContent: multiline ? "flex-start" : "center",
                borderWidth: focused || hasError ? 1.5 : 1, borderColor, borderRadius, borderCurve: "continuous" }}>
            {children}
        </NeumorphicInsetSurface>}
        {hasError && typeof error === "string" ? <Text selectable accessibilityRole="alert"
            style={{ ...type.caption, color: colors.danger, marginTop: space.xs }}>{error}</Text>
            : helper ? <Text style={{ ...type.caption, color: p.secondary, marginTop: space.xs }}>{helper}</Text> : null}
    </View>;
}

// Shared recessed text field. Numeric filtering, autofill and secure-entry
// behaviour stay here so every form gets the same visuals without duplicating logic.
export default function Field({ label, value, onChangeText, placeholder, prefix, error, helper,
    required = false, keyboardType, secureTextEntry, autoCapitalize, multiline, style, inputStyle,
    autoComplete, textContentType, inputMode, numericMode, maxLength, editable = true,
    hideReveal = false, leading, onFocus, onBlur, accessibilityLabel,
    selection, onSelectionChange, autoCorrect, appearance, borderRadius, trailing }) {
    const { colors } = useTheme();
    const p = appearance === "auth" ? authMaterial : { ...authMaterial, ...colors.sunkenInput };
    const [focused, setFocused] = useState(false);
    const [revealed, setRevealed] = useState(false);
    const canReveal = !!secureTextEntry && !hideReveal;

    return <FieldShell label={label} required={required} focused={focused} disabled={!editable}
        error={error} helper={helper} multiline={multiline} style={style} appearance={appearance} borderRadius={borderRadius} trailing={trailing}>
        <View style={{ flex: 1, justifyContent: multiline ? "flex-start" : "center" }}>
            <TextInput
                value={value}
                onChangeText={(next) => onChangeText?.(numericMode === "digits" ? digitsOnly(next)
                    : numericMode === "decimal" ? decimalOnly(next) : next)}
                onFocus={(event) => { setFocused(true); onFocus?.(event); }}
                onBlur={(event) => { setFocused(false); onBlur?.(event); }}
                placeholder={placeholder}
                placeholderTextColor={p.placeholder}
                keyboardType={keyboardType || (numericMode === "digits" ? "number-pad" : numericMode === "decimal" ? "decimal-pad" : undefined)}
                secureTextEntry={!!secureTextEntry && !revealed}
                autoCapitalize={autoCapitalize}
                autoCorrect={autoCorrect}
                selection={selection}
                onSelectionChange={onSelectionChange}
                multiline={multiline}
                autoComplete={autoComplete}
                textContentType={textContentType}
                inputMode={inputMode || (numericMode === "digits" ? "numeric" : numericMode === "decimal" ? "decimal" : undefined)}
                maxLength={maxLength}
                editable={editable}
                accessibilityLabel={accessibilityLabel || label}
                accessibilityHint={prefix ? `${prefix} is added automatically` : undefined}
                style={[{ minHeight: multiline ? 94 : 50,
                    paddingLeft: prefix ? space.lg + 30 : leading ? MIN_TOUCH : space.lg,
                    paddingRight: canReveal ? MIN_TOUCH + space.xs : space.lg,
                    paddingTop: multiline ? space.lg : 0, paddingBottom: multiline ? space.md : 0,
                    fontSize: type.body.fontSize, fontFamily: type.body.fontFamily,
                    color: editable ? p.title : p.secondary, textAlignVertical: multiline ? "top" : "center",
                    backgroundColor: "transparent", borderWidth: 0, borderRadius,
                    ...(Platform.OS === "web" && borderRadius != null ? { outlineStyle: "none" } : {}) }, inputStyle]}
            />
            {prefix ? <View pointerEvents="none" style={{ position: "absolute", left: space.lg,
                top: 0, bottom: 0, justifyContent: "center" }}>
                <Text style={{ ...type.body, color: editable ? p.title : p.secondary }}>{prefix}</Text>
            </View> : null}
            {leading && !prefix ? <View pointerEvents="none" style={{ position: "absolute", left: 0,
                top: 0, bottom: 0, width: MIN_TOUCH, alignItems: "center", justifyContent: "center" }}>{leading}</View> : null}
            {canReveal ? <TouchableOpacity onPress={() => setRevealed((current) => !current)}
                {...(Platform.OS === "web" ? { "aria-pressed": revealed } : {})}
                accessibilityRole="button" accessibilityState={{ selected: revealed }}
                accessibilityLabel={revealed ? "Hide password" : "Show password"} hitSlop={6}
                style={{ position: "absolute", right: 0, width: MIN_TOUCH, height: MIN_TOUCH,
                    alignItems: "center", justifyContent: "center" }}>
                <Ionicons name={revealed ? "eye-off-outline" : "eye-outline"} size={21} color={p.azure} />
            </TouchableOpacity> : null}
        </View>
    </FieldShell>;
}

// Custom search rows retain their controls and reuse the same recessed material.
export function SunkenInputSurface({ borderRadius = radius.pill, appearance }) {
    const { colors } = useTheme();
    const p = appearance === "auth" ? authMaterial : colors.sunkenInput;
    return <NeumorphicInsetSurface pointerEvents="none" accessible={false} material={{ surface: p.inputBase,
        radius: borderRadius, insetShadow: p.inputShadow, innerShade: p.input[0], innerLight: p.input[p.input.length - 1] }}
        style={{ position: "absolute", inset: 0 }} />;
}
