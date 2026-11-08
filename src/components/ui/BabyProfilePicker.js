import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, findNodeHandle, Image, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import ScrollContext from "../../context/ScrollContext";
import { type, space } from "../../theme";
import AnchoredMenu from "./AnchoredMenu";
import GlassLighting from "./GlassLighting";
import Gradient from "./Gradient";

function focus(node) {
    if (!node) return;
    if (Platform.OS === "web") node.focus?.();
    else {
        const handle = findNodeHandle(node);
        if (handle != null) AccessibilityInfo.setAccessibilityFocus(handle);
    }
}

export default function BabyProfilePicker({ visible, anchor, triggerRef, onAnchorChange, profiles, selectedId,
    alerts, brokenAvatars, onAvatarError, onSelect, onAddChild, onClose, blurTarget }) {
    const { colors } = useTheme(), material = useMemo(() => ({ ...colors.profilePickerGlass, ...colors.overlayGlass }), [colors]);
    const styles = useMemo(() => makeStyles(colors), [colors]);
    const viewport = useWindowDimensions();
    const { scrollY, headerHeight, tabBarHeight } = useContext(ScrollContext);
    const selectedRef = useRef(null), addRef = useRef(null), closing = useRef(false), pendingAdd = useRef(false), frame = useRef(null);
    const [focused, setFocused] = useState(null);
    const remeasure = useCallback(() => {
        triggerRef.current?.measureInWindow?.((x, y, width, height) => {
            if ([x, y, width, height].every(Number.isFinite) && width > 0 && height > 0) {
                onAnchorChange(previous => previous?.x === x && previous?.y === y && previous?.width === width && previous?.height === height
                    ? previous : { x, y, width, height });
            }
        });
    }, [triggerRef, onAnchorChange]);
    useEffect(() => {
        if (!visible) return;
        closing.current = pendingAdd.current = false;
        if (frame.current != null) cancelAnimationFrame(frame.current);
        remeasure();
        const listener = scrollY.addListener(remeasure);
        const observer = Platform.OS === "web" && globalThis.ResizeObserver ? new globalThis.ResizeObserver(remeasure) : null;
        let node = triggerRef.current;
        while (observer && node?.nodeType === 1) { observer.observe(node); node = node.parentElement; }
        return () => { scrollY.removeListener(listener); observer?.disconnect(); };
    }, [visible, viewport.width, viewport.height, viewport.fontScale, headerHeight, tabBarHeight, scrollY, remeasure, triggerRef]);
    useEffect(() => () => { if (frame.current != null) cancelAnimationFrame(frame.current); }, []);
    const dismiss = () => { if (!closing.current) { closing.current = true; onClose(); } };
    const afterClose = () => {
        const add = pendingAdd.current;
        pendingAdd.current = false;
        // Let the old modal leave the tree before focusing or presenting Add Child.
        frame.current = requestAnimationFrame(() => {
            frame.current = null;
            if (add) onAddChild();
            else focus(triggerRef.current);
        });
    };
    const onFocus = key => event => setFocused(Platform.OS === "web" && event.currentTarget?.matches?.(":focus-visible") ? key : null);
    const footer = <View style={styles.footer}>
        <View style={styles.divider} />
        <Pressable ref={addRef} testID="baby-picker-add" accessibilityRole="button" accessibilityLabel="Add another child"
            disabled={!visible} onFocus={onFocus("add-child")} onBlur={() => setFocused(null)}
            onPress={() => { if (closing.current) return; pendingAdd.current = true; dismiss(); }}
            style={({ pressed }) => [styles.add, pressed && styles.pressed, focused === "add-child" && styles.focused]}>
            <View pointerEvents="none" accessible={false} style={styles.plus}>
                <Gradient colors={material.icon} style={styles.circle} />
                <GlassLighting material={material} radius={20} />
                <Ionicons name="add" size={27} color={material.accent} />
            </View>
            <Text style={styles.addLabel}>Add another child</Text>
        </Pressable>
    </View>;
    return <AnchoredMenu visible={visible} anchor={anchor} appearance="profilePicker" maxWidth={296}
        dimBackdrop={false} blurTarget={blurTarget} viewport={viewport} bottomClearance={tabBarHeight + space.md}
        onClose={dismiss} onShow={() => focus(selectedRef.current || addRef.current)} onAfterClose={afterClose} footer={footer}>
        {profiles.map(profile => {
            const selected = profile.id === selectedId, alert = !!alerts[profile.id];
            return <Pressable key={profile.id} ref={selected ? selectedRef : undefined} testID={`baby-picker-${profile.id}`}
                accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={`${profile.name}${alert ? ", Needs attention" : ""}`}
                {...(Platform.OS === "web" ? { "aria-pressed": selected } : {})}
                disabled={!visible} onFocus={onFocus(profile.id)} onBlur={() => setFocused(null)}
                onPress={() => { if (closing.current) return; dismiss(); onSelect(profile); }}
                style={({ pressed }) => [styles.row, selected && styles.selected, pressed && styles.pressed, focused === profile.id && styles.focused]}>
                {selected ? <>
                    <Gradient pointerEvents="none" colors={material.selected} style={styles.selectedFace} />
                    <GlassLighting material={material} radius={18} selected panel />
                </> : null}
                <View pointerEvents="none" accessible={false} style={styles.avatar}>
                    <Gradient colors={material.icon} style={styles.circle} />
                    <GlassLighting material={material} radius={22} />
                    {profile.avatarUrl && !brokenAvatars.has(profile.id)
                        ? <Image accessible={false} source={{ uri: profile.avatarUrl }} resizeMode="cover" style={styles.photo}
                            onError={() => onAvatarError(profile.id)} />
                        : <Ionicons name="person" size={22} color={material.accent} />}
                </View>
                <View style={styles.information}>
                    <Text style={[styles.name, selected && styles.selectedName]}>{profile.name}</Text>
                    {alert ? <Text style={styles.alert}>Needs attention</Text> : null}
                </View>
                <View pointerEvents="none" accessible={false} style={styles.checkSlot}>
                    {selected ? <View testID="baby-picker-selected-check" style={styles.check}>
                        <Gradient colors={material.control} style={styles.circle} />
                        <GlassLighting material={material} radius={14} />
                        <Ionicons name="checkmark" size={18} color={material.accent} />
                    </View> : null}
                </View>
            </Pressable>;
        })}
    </AnchoredMenu>;
}

const makeStyles = colors => {
    const p = { ...colors.profilePickerGlass, ...colors.overlayGlass };
    return StyleSheet.create({
        row: { minHeight: 68, flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 18, backgroundColor: "transparent" },
        selected: { boxShadow: p.selectedShadow },
        selectedFace: { ...StyleSheet.absoluteFill, borderRadius: 18 },
        pressed: { opacity: 0.78 },
        focused: { outlineStyle: "solid", outlineColor: p.accent, outlineWidth: 2, outlineOffset: -2 },
        avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: p.controlShadow },
        circle: { ...StyleSheet.absoluteFill, borderRadius: 100, overflow: "hidden" },
        photo: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: p.rimLight },
        information: { flex: 1, minWidth: 0, gap: 3 },
        name: { ...type.bodyStrong, fontSize: 15, lineHeight: 21, color: p.text },
        selectedName: { color: p.accent },
        alert: { ...type.caption, fontSize: 12, lineHeight: 17, color: colors.danger },
        checkSlot: { width: 28, flexShrink: 0 },
        check: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", boxShadow: p.controlShadow },
        footer: { flexShrink: 0, paddingHorizontal: 10, paddingBottom: 6 },
        divider: { height: StyleSheet.hairlineWidth, backgroundColor: p.divider, marginHorizontal: 10 },
        add: { minHeight: 64, flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 10, borderRadius: 18 },
        plus: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", boxShadow: p.controlShadow },
        addLabel: { ...type.bodyStrong, fontSize: 15, lineHeight: 21, color: p.accent, flexShrink: 1 },
    });
};
