const validRect = rect => rect && [rect.x, rect.y, rect.width, rect.height].every(Number.isFinite) && rect.width >= 0 && rect.height >= 0;

// Capture the control before its menu/tray closes. Keep coordinates out of record payloads.
function measureConfirmationAnchor(target, event, onMeasured, fallbackTarget) {
    const native = event?.nativeEvent || event || {};
    const tap = { x: native.clientX ?? native.pageX, y: native.clientY ?? native.pageY, width: 0, height: 0 };
    const fallback = () => {
        if (fallbackTarget) measureConfirmationAnchor(fallbackTarget, event, onMeasured);
        else if (validRect(tap) && (tap.x !== 0 || tap.y !== 0)) onMeasured(tap);
    };
    const node = target?.current || target;
    if (!node?.measureInWindow) { fallback(); return; }
    try {
        node.measureInWindow((x, y, width, height) => {
            const rect = { x, y, width, height };
            if (validRect(rect) && width > 0 && height > 0) onMeasured(rect);
            else fallback();
        });
    } catch (_) { fallback(); }
}

function confirmationPosition(anchor, viewport, panelHeight, insets = {}) {
    if (!validRect(anchor)) return null;
    const leftInset = (insets.left || 0) + 16, rightInset = (insets.right || 0) + 16;
    const topInset = (insets.top || 0) + 16, bottomInset = (insets.bottom || 0) + 16;
    const width = Math.max(0, Math.min(420, viewport.width * 0.9, viewport.width - leftInset - rightInset));
    const maxHeight = Math.max(0, viewport.height - topInset - bottomInset);
    const height = Math.min(panelHeight, maxHeight);
    return {
        width, maxHeight,
        left: Math.max(leftInset, Math.min(anchor.x + anchor.width / 2 - width / 2, viewport.width - rightInset - width)),
        top: Math.max(topInset, Math.min(anchor.y + anchor.height / 2 - height / 2, viewport.height - bottomInset - height)),
    };
}

module.exports = { measureConfirmationAnchor, confirmationPosition };
