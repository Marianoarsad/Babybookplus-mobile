import React from "react";
import { MIN_TOUCH } from "../../theme";
import SelectTrigger from "./SelectTrigger";
import AnchoredMenu, { AnchoredMenuItem } from "./AnchoredMenu";

// A scrolling anchored selector for longer input-bound lists. It shares the
// same trigger-width, backdrop-free fold as every compact select while keeping
// the current choice near the visible portion of a long list.
export default function OptionSheet({
    visible,
    anchor,
    title,
    options = [],
    selectedKey,
    onSelect,
    onClose,
    blurTarget,
    headerLabel,
    leading,
}) {
    const selectedIndex = options.findIndex((option) => option.key === selectedKey);
    const initialScrollOffset = selectedIndex > 0
        ? Math.max(0, selectedIndex - 1) * MIN_TOUCH
        : 0;

    return (
        <AnchoredMenu
            visible={visible && !!anchor}
            anchor={anchor}
            onClose={onClose}
            variant="select" appearance="connectedSelect" dimBackdrop={false} blurTarget={blurTarget}
            header={<SelectTrigger expanded leading={leading} value={headerLabel || options.find(option => option.key === selectedKey)?.label || title || "Choose an option"} onPress={onClose} />}
            initialScrollOffset={initialScrollOffset}
        >
            {options.map((option) => (
                <AnchoredMenuItem
                    key={String(option.key)}
                    label={option.label}
                    note={option.note}
                    disabled={option.disabled}
                    selected={option.key === selectedKey}
                    variant="connectedSelect"
                    onPress={() => onSelect(option.key)}
                    accessibilityLabel={option.note ? `${option.label}, ${option.note}` : option.label}
                />
            ))}
        </AnchoredMenu>
    );
}
