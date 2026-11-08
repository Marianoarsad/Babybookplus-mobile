import React from "react";
import { Platform, View } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { MIN_TOUCH, radius, space } from "../../theme";

export default function SheetGrabber({ motion, disabled = false }) {
    const { colors } = useTheme();
    if (!motion.canExpand) return null;
    const action = name => { if (!disabled) (name === "increment" ? motion.expand : motion.collapse)(); };
    return <View testID="sheet-grabber" {...motion.grabberPan.panHandlers} collapsable={false} pointerEvents="box-only"
        accessible accessibilityRole="adjustable" accessibilityLabel="Sheet height" accessibilityState={{ disabled }}
        accessibilityValue={{ text: motion.isExpanded ? "Expanded" : "Collapsed" }}
        accessibilityActions={[{ name: "increment", label: "Expand sheet" }, { name: "decrement", label: "Collapse sheet" }]}
        onAccessibilityAction={e => action(e.nativeEvent.actionName)}
        {...(Platform.OS === "web" ? { tabIndex: disabled ? -1 : 0, onKeyDown: e => {
            if (["ArrowUp", "ArrowDown", "Enter", " "].includes(e.key)) {
                e.preventDefault(); action(e.key === "ArrowUp" || (["Enter", " "].includes(e.key) && !motion.isExpanded) ? "increment" : "decrement");
            }
        } } : {})}
        style={{ minHeight: MIN_TOUCH, justifyContent: "center", alignItems: "center", gap: space.xs, touchAction: "none" }}>
        {[0, 1].map(key => <View key={key} pointerEvents="none" style={{ width: 44, height: 4, borderRadius: radius.pill, backgroundColor: colors.border }} />)}
    </View>;
}
