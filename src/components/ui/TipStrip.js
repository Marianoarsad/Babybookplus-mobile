import React, { useEffect, useState } from "react";
import InfoCallout from "./InfoCallout";
import { seen, markSeen } from "../../utils/firstRun";
import { space } from "../../theme";

// One-time, dismissible tip shown the first time a parent opens a screen.
// Each `tipKey` is independent (dismissing Health's tip doesn't touch
// Growth's) and never reappears once dismissed — see utils/firstRun.js.
// Renders null while the "have I been seen?" check resolves and forever
// after dismissal, so it never flashes or pops back in.
export default function TipStrip({ tipKey, children, style }) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        let active = true;
        seen(tipKey).then((wasSeen) => {
            if (active && !wasSeen) setVisible(true);
        });
        return () => {
            active = false;
        };
    }, [tipKey]);

    if (!visible) return null;

    const dismiss = () => {
        setVisible(false);
        markSeen(tipKey);
    };

    return <InfoCallout message={children} onDismiss={dismiss} style={[{ margin: space.lg, marginBottom: space.sm }, style]} />;
}
