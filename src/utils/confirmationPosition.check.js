const assert = require("node:assert/strict");
const { measureConfirmationAnchor, confirmationPosition } = require("./confirmationPosition.cjs");
const rect = { x: 100, y: 300, width: 80, height: 52 };
let measured;
const trigger = { current: { measureInWindow: cb => cb(...Object.values(rect)) } };
measureConfirmationAnchor(trigger, {}, value => measured = value);
assert.deepEqual(measured, rect);
measureConfirmationAnchor(null, { nativeEvent: { pageX: 20, pageY: 600 } }, value => measured = value);
assert.deepEqual(measured, { x: 20, y: 600, width: 0, height: 0 });
measureConfirmationAnchor({ measureInWindow: cb => cb(NaN, 0, 0, 0) }, {}, value => measured = value, trigger);
assert.deepEqual(measured, rect, "Accessibility can anchor to the stable row");
let opened = false;
measureConfirmationAnchor(null, {}, () => opened = true); assert.equal(opened, false);
for (const width of [320, 360, 390, 430, 1024]) for (const height of [380, 800]) {
    const insets = { top: 24, bottom: 34, left: 0, right: 0 };
    for (const anchor of [rect, { x: 0, y: 0, width: 44, height: 44 }, { x: width - 44, y: height - 44, width: 44, height: 44 }]) {
        for (const panelHeight of [240, 900]) {
            const p = confirmationPosition(anchor, { width, height }, panelHeight, insets);
            assert(p.width <= 420 && p.left >= 16 && p.left + p.width <= width - 16);
            assert(p.top >= 40 && p.top + Math.min(panelHeight, p.maxHeight) <= height - 50);
        }
    }
}
const centered = confirmationPosition({ x: 140, y: 360, width: 80, height: 40 }, { width: 360, height: 800 }, 240);
assert.equal(centered.left + centered.width / 2, 180); assert.equal(centered.top + 120, 380);
assert.equal(confirmationPosition(null, { width: 320, height: 800 }, 240), null);
console.log("Confirmation positioning passed: trigger/tap/row capture, missing anchors, button-centered placement, safe areas and edge clamping.");
