import React, { useMemo, useState } from "react";
import { StyleSheet, Text } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { type } from "../../theme";
import { nutritionToApp } from "../../utils/adapters";
import { milkDay } from "../../utils/milkTypeHistory";
import { shortDate, todayLocal } from "../../utils/dates";
import MilkTypeAnalytics from "./MilkTypeAnalytics";
import PlanDetail from "./PlanDetail";
import { MilkIcon } from "./RecordIcon";

export function viewerMilkData(rows, capturedAt, dob) {
    const feeds = (Array.isArray(rows) ? rows : []).filter(row => row && typeof row === "object")
        .map((row, index) => ({ ...nutritionToApp(row), id: `snapshot-milk-${index}` }))
        .filter(feed => feed.entryType === "milk");
    const capturedDay = typeof capturedAt === "string" && Number.isFinite(Date.parse(capturedAt)) ? milkDay(capturedAt)?.iso : undefined;
    const today = todayLocal();
    const referenceDate = capturedDay || feeds.map(feed => milkDay(feed.date)?.iso).filter(date => date && date <= today).sort().at(-1) || today;
    const birth = milkDay(dob)?.iso;
    return { feeds, referenceDate, capturedDay, minimumDate: birth && birth <= referenceDate ? birth : undefined,
        unavailable: !Array.isArray(rows) };
}

export function viewerMilkDetail(feed) {
    if (!feed) return null;
    const amount = value => Number.isFinite(value) ? `${value} ${feed.unit || "(unit not recorded)"}` : null;
    return { title: `${feed.milkType || "Milk"} feeding`, categoryLabel: "Shared milk feed", date: feed.date, time: feed.time,
        showReminder: false, showNotes: true, notes: feed.notes,
        details: [
            { label: "Milk type", value: feed.milkType || "Not recorded" },
            { label: "Feeding method", value: ({ breast: "At the breast", bottle: "Bottle" })[feed.feedMethod] || "Not recorded" },
            feed.formulaBrand ? { label: "Formula brand", value: feed.formulaBrand } : null,
            Number.isFinite(feed.formulaScoops) ? { label: "Scoops", value: String(feed.formulaScoops) } : null,
            amount(feed.quantity) ? { label: feed.milkType === "Mixed" ? "Formula amount" : "Amount", value: amount(feed.quantity) } : null,
            amount(feed.breastmilkQuantity) ? { label: "Breastmilk amount", value: amount(feed.breastmilkQuantity) } : null,
            Number.isFinite(feed.durationMinutes) ? { label: "Duration", value: `${feed.durationMinutes} min` } : null,
        ].filter(Boolean) };
}

export default function ViewerMilkTypeCard({ rows, capturedAt, dob }) {
    const { colors } = useTheme(), p = { ...colors.appointmentDashboard, ...colors.milkTypeDashboard };
    const styles = useMemo(() => makeStyles(p), [p]);
    const data = useMemo(() => viewerMilkData(rows, capturedAt, dob), [rows, capturedAt, dob]);
    const [selected, setSelected] = useState(null);
    const notice = <Text style={styles.caption}>{data.capturedDay ? `Shared snapshot as of ${shortDate(data.capturedDay)}.`
        : "Snapshot capture date unavailable; the initial range uses the latest dated shared milk entry, when available."} Only shared records are shown.</Text>;
    return <MilkTypeAnalytics feeds={data.feeds} referenceDate={data.referenceDate} minimumDate={data.minimumDate}
        unavailable={data.unavailable} readOnly onOpenEntry={setSelected} notice={notice}>
        <PlanDetail visible={Boolean(selected)} plan={viewerMilkDetail(selected)} heroContent={<MilkIcon size={56} />} onClose={() => setSelected(null)} />
    </MilkTypeAnalytics>;
}

const makeStyles = p => StyleSheet.create({
    caption: { ...type.caption, color: p.secondary, lineHeight: 19, flexShrink: 1 },
});
