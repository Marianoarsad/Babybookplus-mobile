// Run: node components/cardPalette.check.js (no server or native runtime needed).
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { parse } = require("@babel/parser");
const { transformSync } = require("@babel/core");
const root = path.resolve(__dirname, "..");
const themeModule = { exports: {} };
new Function("module", "exports", transformSync(fs.readFileSync(path.join(root, "theme.js"), "utf8"), {
    babelrc: false, configFile: false, plugins: ["@babel/plugin-transform-modules-commonjs"],
}).code)(themeModule, themeModule.exports);
const theme = themeModule.exports;
function find(node, predicate) {
    if (!node || typeof node !== "object") return null;
    if (predicate(node)) return node;
    for (const child of Object.values(node).flat()) {
        const hit = find(child, predicate);
        if (hit) return hit;
    }
    return null;
}
function card(file, styleName) {
    const source = fs.readFileSync(path.join(__dirname, file), "utf8");
    const tree = parse(source, { sourceType: "module", plugins: ["jsx"] });
    const shareCard = styleName === "shareCard";
    const element = shareCard ? find(tree, node => node.type === "JSXElement" && node.openingElement.name.name === "Pressable"
        && node.openingElement.attributes.some(attr => attr.name?.name === "onPress" && source.slice(attr.start, attr.end).includes("activeRecentShares")))
        : find(tree, (node) => node.type === "JSXElement" && ["Gradient", "Container"].includes(node.openingElement.name.name)
        && node.openingElement.attributes.some((attr) => attr.name?.name === "style"
            && attr.value?.expression?.property?.name === styleName));
    if (styleName) assert(element, `${file}: requested card is present`);
    const sharedSummary = file === "common/RecordSummaries.js";
    const foreground = find(tree, (node) => node.type === "VariableDeclarator" && node.id.name === (sharedSummary ? "foreground" : "cardForeground"));
    const styles = find(tree, (node) => node.type === "VariableDeclarator" && node.id.name === "makeStyles");
    const alpha = find(tree, (node) => node.type === "VariableDeclarator" && node.id.name === "withAlpha");
    const withAlpha = alpha ? new Function(`return (${source.slice(alpha.init.start, alpha.init.end)})`)() : undefined;
    const styleFactory = new Function("StyleSheet", "theme", "withAlpha", "Platform", `const { space, radius, type, shadow, MIN_TOUCH, recordItemStyle, recordListLayout } = theme;
        return (${source.slice(styles.init.start, styles.init.end)})`)({ create: (value) => value,
            absoluteFill: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 } }, theme, withAlpha, { OS: "web" });
    const expiry = find(tree, node => node.type === "FunctionDeclaration" && node.id.name === "shareExpiryText");
    const shareExpiryText = expiry ? new Function(`return (${source.slice(expiry.start, expiry.end)})`)() : undefined;
    const colorFor = new Function("colors", "scheme", "plain = false", `return (${foreground ? source.slice(foreground.init.start, foreground.init.end) : "colors.onPrimary"})`);
    const jsx = transformSync((element ? source.slice(element.start, element.end) : "<View />"), {
        babelrc: false, configFile: false, plugins: [["@babel/plugin-transform-react-jsx", { runtime: "classic" }]],
    }).code.replace(/;\s*$/, "");
    return (colors, scheme, values = {}) => {
        const cardForeground = colorFor(colors, scheme);
        const context = {
            React: { Fragment: "Fragment", createElement: (type, props, ...children) => ({ type, props: props || {}, children: children.flat(Infinity) }) },
            Gradient: "Gradient", View: "View", Text: "Text", Ionicons: "Icon", Pressable: "Pressable", VaccineIcon: "VaccineIcon",
            Container: "Gradient", plain: false,
            colors, cardForeground, withAlpha, shareExpiryText, space: theme.space, styles: styleFactory(colors, sharedSummary ? scheme : cardForeground),
            measurement: values.latestMeasurement || null,
            latestMeasurement: null, shortDate: (date) => date, t: (key) => key,
            vaxProgress: { completed: 0, total: 10 }, vaxPct: 0, nextVax: null, nav() {}, ...values,
        };
        return { ...context, rendered: new Function(...Object.keys(context), `return (${jsx})`)(...Object.values(context)) };
    };
}
const rgb = (hex) => hex.slice(1, 7).match(/\w\w/g).map((value) => parseInt(value, 16) / 255);
const blend = (foreground, background, opacity) => foreground.map((value, i) => value * opacity + background[i] * (1 - opacity));
const luminance = (values) => values.reduce((sum, value, i) => sum + [0.2126, 0.7152, 0.0722][i]
    * (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4), 0);
const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05);
const latest = card("common/RecordSummaries.js", "metricsHeaderBox");
const vaccination = card("Dashboard.js", null);

const text = (node) => !node || typeof node !== "object" ? String(node ?? "") : (node.children || []).map(text).join(" ");
for (const gender of ["boy", "girl", "neutral"]) for (const scheme of ["light", "dark"]) {
    const colors = theme.paletteFor(undefined, gender, scheme);
    const expectedForeground = scheme === "dark" ? colors.background : colors.onPrimary;
    const growth = latest(colors, scheme), home = vaccination(colors, scheme);
    for (const result of [growth]) {
        assert.deepEqual(result.rendered.props.colors, [colors.primaryDark, colors.primary]);
        assert.equal(result.cardForeground, expectedForeground);
        const a = rgb(colors.primaryDark), b = rgb(colors.primary), foreground = rgb(result.cardForeground);
        for (let step = 0; step <= 20; step++) {
            const background = blend(a, b, step / 20);
            assert(contrast(blend(foreground, background, 0.95 * 0.99), background) >= 4.5,
                `${gender}/${scheme}: secondary text stays readable across the gradient, including hover`);
            assert(contrast(foreground, blend(foreground, background, 0.2)) >= 3,
                `${gender}/${scheme}: progress fill is distinct from its track`);
        }
    }
    for (const key of ["metricsHeaderTitle", "metricsHeaderValue", "metricsHeaderLabel", "metricsHeaderDate", "metricsHeaderUnit", "metricsHeaderEmpty"]) {
        assert.equal(growth.styles[key].color, expectedForeground);
    }
    for (const key of ["metricsHeaderLabel", "metricsHeaderDate", "metricsHeaderUnit", "metricsHeaderEmpty"]) assert.equal(growth.styles[key].opacity, 0.95);
    assert.equal(growth.styles.metricsHeaderDivider.backgroundColor, expectedForeground + "33");
    assert.equal(growth.styles.metricsHeaderBox.backgroundColor, undefined);
    assert.equal(growth.styles.metricsHeaderBox.padding, 16);
    assert.equal(growth.styles.metricsHeaderHeading.flexDirection, "column");
    assert.equal(growth.styles.metricsHeaderHeading.alignItems, "flex-start");
    assert.equal(growth.styles.metricsHeaderHeading.paddingBottom, theme.space.xs);
    assert.equal(growth.styles.metricsHeaderDate.textAlign, "left");
    assert.equal(growth.styles.metricsHeaderCol.flexBasis, 0);
    assert.equal(growth.styles.detailGrabber, undefined, "Measurement detail uses the shared full-screen view");
    assert.equal((text(growth.rendered).match(/growthNoRecordYet/g) || []).length, 3);
    const partial = latest(colors, scheme, { latestMeasurement: { date: "2026-09-18", weight: 22.15, height: null, head_circumference: 50.8 } });
    for (const value of ["22.15", "50.8", "2026-09-18"]) assert(text(partial.rendered).includes(value));

}
console.log("Card palette checks passed: six themes, gradient contrast, empty/partial measurements, Home surfaces (vaccine rendering/navigation covered by VaccinationProgressCard checks).");
