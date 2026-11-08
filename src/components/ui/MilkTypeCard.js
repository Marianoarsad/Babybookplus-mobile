import React from "react";
import MilkTypeAnalytics from "./MilkTypeAnalytics";

export default function MilkTypeCard({ feeds, today, minimumDate, feedsUnavailable, feedsFailed, onOpenEntry }) {
    return <MilkTypeAnalytics feeds={feeds} referenceDate={today} minimumDate={minimumDate}
        unavailable={feedsUnavailable} stale={feedsFailed} onOpenEntry={onOpenEntry} />;
}
