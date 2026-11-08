import React from "react";
import { SectionContainerCard } from "../common/Cards";
import { DashboardSurface as Surface } from "../ui/ConsultationsAppointmentsCard";
import { useTheme } from "../../context/ThemeContext";
import { type } from "../../theme";

// Same materials as the Profile hub; only the destination's content differs.
export function SettingsCard({ children, style, ...props }) {
    const { colors } = useTheme(), p = colors.profileSettings;
    return <SectionContainerCard {...props}
        style={[{ backgroundColor: p.panel[0], borderWidth: 0, borderRadius: 24,
            padding: 16, marginBottom: 20, boxShadow: p.panelShadow }, style]}
        background={<Surface colors={p.panel} highlight={p.highlight} radius={24} />}
        titleStyle={{ ...type.heading, fontSize: 16, lineHeight: 22, color: p.text }}
        subtitleStyle={{ ...type.caption, color: p.muted }}>
        {children}
    </SectionContainerCard>;
}

export { settingsSelectionStyle as selectionStyle } from "../../theme";
