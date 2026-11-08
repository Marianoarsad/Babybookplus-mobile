import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import ScrollContext from "../../context/ScrollContext";
import { MIN_TOUCH, space, type } from "../../theme";
import AnchoredMenu, { AnchoredMenuItem } from "./AnchoredMenu";
import Gradient from "./Gradient";
import GlassLighting from "./GlassLighting";

export default function MilkMeasureSelect({ selected, options, onSelect, blurTarget }) {
    const { colors } = useTheme(), glass = colors.growthDropdownGlass;
    const styles = useMemo(() => makeStyles(glass), [glass]);
    const [open, setOpen] = useState(false), [anchor, setAnchor] = useState(null);
    const trigger = useRef(null);
    const { width, height, fontScale } = useWindowDimensions();
    const { scrollY, headerHeight, tabBarHeight } = useContext(ScrollContext);
    const updateAnchor = useCallback(() => {
        trigger.current?.measureInWindow((x, y, width, height) => {
            setAnchor(previous => previous?.x === x && previous?.y === y && previous?.width === width && previous?.height === height
                ? previous : { x, y, width, height });
        });
    }, []);
    useEffect(() => { setOpen(false); }, [selected.key]);
    useEffect(() => {
        if (!open) return;
        updateAnchor();
        const listener = scrollY.addListener(updateAnchor);
        const observer = Platform.OS === "web" && globalThis.ResizeObserver ? new globalThis.ResizeObserver(updateAnchor) : null;
        let node = trigger.current;
        while (observer && node?.nodeType === 1) { observer.observe(node); node = node.parentElement; }
        return () => { scrollY.removeListener(listener); observer?.disconnect(); };
    }, [open, width, height, fontScale, headerHeight, tabBarHeight, scrollY, updateAnchor]);
    const openMenu = () => trigger.current?.measureInWindow((x, y, width, height) => {
        setAnchor({ x, y, width, height }); setOpen(true);
    });
    const header = (expanded = false, covered = false) => <TouchableOpacity
        ref={expanded ? undefined : trigger} testID={expanded ? "milk-measure-header" : "milk-measure-select"}
        onPress={expanded ? () => setOpen(false) : openMenu}
        onLayout={!expanded && open ? updateAnchor : undefined}
        style={[styles.control, expanded && styles.header, covered && { opacity: 0, pointerEvents: "none" }]}
        aria-hidden={covered || undefined} accessible={!covered}
        importantForAccessibility={covered ? "no-hide-descendants" : "auto"}
        {...(Platform.OS === "web" ? { tabIndex: covered ? -1 : 0 } : {})}
        accessibilityRole="button" accessibilityState={{ expanded }} aria-expanded={expanded}
        accessibilityLabel={`Milk chart measure, ${selected.label}`}>
        {!expanded ? <>
            <Gradient pointerEvents="none" colors={glass.popoverPanel} style={styles.face} />
            <GlassLighting material={glass} radius={22} />
        </> : null}
        <Text style={styles.label}>{selected.label}</Text>
        <Ionicons accessible={false} name={expanded ? "chevron-up" : "chevron-down"} size={18} color={glass.accent} />
    </TouchableOpacity>;
    return <AnchoredMenu visible={open} anchor={anchor} onClose={() => setOpen(false)}
        appearance="connectedSelect" variant="select" dimBackdrop={false} blurTarget={blurTarget}
        trigger={({ covered }) => header(false, covered)} header={header(true)}>
        {options.map(option => <AnchoredMenuItem key={option.key} label={option.label} selected={selected.key === option.key}
            variant="connectedSelect" accessibilityLabel={`Show ${option.label}`}
            onPress={() => { setOpen(false); onSelect(option.key); }} />)}
    </AnchoredMenu>;
}

const makeStyles = glass => StyleSheet.create({
    control: { minWidth: 128, maxWidth: "100%", minHeight: MIN_TOUCH, flexShrink: 1, alignSelf: "flex-start",
        flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.sm,
        paddingHorizontal: space.md, paddingVertical: 8, borderRadius: 22, borderCurve: "continuous",
        backgroundColor: "transparent", boxShadow: glass.panelShadow },
    header: { flex: 1, minWidth: 0, alignSelf: "stretch", borderRadius: 0, boxShadow: "none",
        borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: glass.divider },
    face: { ...StyleSheet.absoluteFill, borderRadius: 22 },
    label: { ...type.label, color: glass.text, flexShrink: 1, minWidth: 0 },
});
