export function activeSharesAt(rows, now) {
    return (Array.isArray(rows) ? rows : []).filter(row => row?.status === "active"
        && Number.isFinite(Date.parse(row.expiration_date)) && Date.parse(row.expiration_date) > now)
        .sort((a, b) => Date.parse(a.expiration_date) - Date.parse(b.expiration_date));
}

export function shareExpiryText(iso, now) {
    const ms = Date.parse(iso) - now;
    if (!Number.isFinite(ms) || ms <= 0) return null;
    const mins = Math.max(1, Math.round(ms / 60000));
    return mins < 60 ? `in ${mins} min` : `in ${Math.round(mins / 60)} h`;
}
