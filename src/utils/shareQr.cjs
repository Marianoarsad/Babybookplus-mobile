const {parseConsultationLink} = require('./consultationLinks.cjs');

function shareQr(share) {
    const payload = share?.qr_payload;
    const link = parseConsultationLink(payload);
    if (link && link.code === share.code) return {payload, web: true};
    const legacy = `BABYBOOK+CONSULT:${share?.code}`;
    if (/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(share?.code) && (!payload || payload === legacy)) {
        return {payload: legacy, web: false};
    }
    return {payload: null, web: false};
}
module.exports = {shareQr};
