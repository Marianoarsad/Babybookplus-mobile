// Run: node components/ui/TodaysFeedingOverviewCard.check.js
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { transformSync } = require("@babel/core");
let palette, owner, fontScale = 1;
const react = {
    createElement: (type, props, ...children) => ({ type, props: props || {}, children: children.flat(Infinity).filter(child => child != null && child !== false) }),
    useMemo: fn => fn(),
    useState: initial => { const slot = owner.cursor++; owner.slots[slot] ??= initial;
        return [owner.slots[slot], next => { owner.slots[slot] = next; }]; },
};
const native = {
    Pressable: "Pressable", Text: "Text", View: "View",
    StyleSheet: { create: value => value, absoluteFill: { position: "absolute", inset: 0 } },
    useWindowDimensions: () => ({ fontScale }),
};
const compile = source => transformSync(source, { babelrc: false, configFile: false,
    plugins: [require.resolve("@babel/plugin-transform-modules-commonjs"), require.resolve("@babel/plugin-transform-react-jsx")] }).code;
const themeModule = { exports: {} };
new Function("module", "exports", compile(fs.readFileSync(path.join(__dirname, "../../theme.js"), "utf8")))(themeModule, themeModule.exports);
const palettes = [...Object.values(themeModule.exports.PALETTES), ...Object.values(themeModule.exports.DARK_PALETTES)];
const moduleUnderTest = { exports: {} };
const mock = name => {
    if (name === "react") return react;
    if (name === "react-native") return native;
    if (name === "@expo/vector-icons") return { Ionicons: "Ionicons" };
    if (name === "./RecordIcon") return { MilkIcon: "MilkIcon", SolidFoodIcon: "SolidFoodIcon" };
    if (name.endsWith("ThemeContext")) return { useTheme: () => ({ colors: palette }) };
    if (name.endsWith("theme")) return themeModule.exports;
    if (name.endsWith("dates")) return { durationText: value => `${value} min`, shortTime: value => value };
    if (name.endsWith("Cards")) return { SectionContainerCard: "SectionContainerCard" };
    return { __esModule: true, default: name.slice(2) };
};
new Function("require", "module", "exports", compile(fs.readFileSync(path.join(__dirname, "TodaysFeedingOverviewCard.js"), "utf8")))(mock, moduleUnderTest, moduleUnderTest.exports);
const { default: Card, recentFeedingAmount } = moduleUnderTest.exports;
const walk = node => node && typeof node === "object" ? [node, ...(node.children || []).flatMap(walk)] : [];
const render = (state, props) => { owner = state; state.cursor = 0; return Card(props); };
const styles = node => Object.assign({}, ...[node.props.style].flat());
const milk = { id: "m1", entryType: "milk", milkType: "Breastmilk", feedMethod: "bottle", quantity: 120, unit: "mL", time: "19:00" };
const solid = { id: "s1", entryType: "solid", foodIntroduced: "Rice", time: "18:00" };
const breast = { id: "m2", entryType: "milk", milkType: "Breastmilk", feedMethod: "breast", durationMinutes: 12, time: "17:00" };
assert.equal(recentFeedingAmount(milk), "120 mL");
assert.equal(recentFeedingAmount(solid), "");
assert.equal(recentFeedingAmount(breast), "12 min");
assert.equal(recentFeedingAmount({ ...milk, milkType: "Mixed", quantity: 80, breastmilkQuantity: 40, unit: "oz" }), "80 + 40 oz");
assert.equal(recentFeedingAmount({ ...milk, quantity: null }), "");
let viewed = 0, opened = null;
const summary = { totalEntries: 4, entries: [milk, solid, breast, { ...milk, id: "older", time: "09:00" }] };
const props = { summary, onViewAll: () => viewed++, onOpenEntry: id => { opened = id; } };
for (palette of palettes) {
    const state = { slots: [], cursor: 0 };
    let tree = render(state, props);
    const body = walk(tree).find(node => node.props.testID === "today-feeding-overview-body");
    body.props.onLayout({ nativeEvent: { layout: { width: 326 } } });
    tree = render(state, props);
    assert.equal(styles(walk(tree).find(node => node.props.testID === "today-feeding-overview-body")).flexDirection, "row");
    const rows = walk(tree).filter(node => node.props.testID === "today-feeding-overview-entry");
    assert.deepEqual(rows.map(row => row.props.key), ["m1", "s1", "m2"]);
    assert(rows[0].props.accessibilityLabel.includes("120 mL"));
    assert(!rows[1].props.accessibilityLabel.includes("mL"));
    assert(rows[2].props.accessibilityLabel.includes("12 min"));
    rows[1].props.onPress(); assert.equal(opened, "s1");
    tree.props.action.props.onPress();
    assert(walk(tree).some(node => node.props.accessibilityLabel === "4 feeds logged today"));
    body.props.onLayout({ nativeEvent: { layout: { width: 256 } } });
    tree = render(state, props);
    assert.equal(styles(walk(tree).find(node => node.props.testID === "today-feeding-overview-body")).flexDirection, "column");
    fontScale = 2;
    body.props.onLayout({ nativeEvent: { layout: { width: 326 } } });
    tree = render(state, props);
    assert.equal(styles(walk(tree).find(node => node.props.testID === "today-feeding-overview-body")).flexDirection, "column");
    fontScale = 1;
    const empty = render({ slots: [], cursor: 0 }, { ...props, summary: { totalEntries: 0, entries: [] } });
    assert(walk(empty).some(node => node.props.accessibilityLabel === "0 feeds logged today"));
    assert.equal(walk(empty).filter(node => node.props.testID === "today-feeding-overview-entry").length, 0);
    assert(walk(empty).some(node => node.children.includes("No feedings recorded today.")));
}
assert.equal(viewed, palettes.length);
console.log("Today’s Feeding overview checks passed.");
