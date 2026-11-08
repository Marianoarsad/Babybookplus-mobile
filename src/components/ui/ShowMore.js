import React from "react";
import { space } from "../../theme";
import EntriesButton from "./EntriesButton";

export default function ShowMore({ total, visible, onPress, noun = "items" }) {
    if (total <= visible) return null;
    const remaining = total - visible;
    return <EntriesButton onPress={onPress} style={{ marginTop: space.sm }}
        accessibilityLabel={`Show more ${noun}, ${remaining} remaining`}
        label={`Show more (${remaining} remaining)`} />;
}
