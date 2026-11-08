// Snapshot fixtures only. Imports fail if the viewer gains an API or record-write dependency.
const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path");
const { transformSync } = require("@babel/core");
const root = path.resolve(__dirname, "../..");
const compile = source => transformSync(source, { babelrc: false, configFile: false,
    plugins: ["@babel/plugin-transform-react-jsx", "@babel/plugin-transform-modules-commonjs"] }).code;
function pure(relative) {
    const file = path.resolve(root, relative);
    if (file.endsWith(".cjs")) return require(file);
    const module = { exports: {} };
    new Function("require", "module", "exports", compile(fs.readFileSync(file, "utf8")))(name =>
        pure(path.resolve(path.dirname(file), name + (path.extname(name) ? "" : ".js"))), module, module.exports);
    return module.exports;
}
const dates = pure("utils/dates.js"), theme = pure("theme.js");
let slots = [], cursor = 0, palette = theme.PALETTES.boy, fontScale = 1;
const react = { createElement: (type, props, ...children) => ({ type, props: { ...props, children: children.flat(Infinity).filter(x => x != null && x !== false) } }),
    useMemo: fn => fn(), useState: initial => { const store = slots, i = cursor++;
        if (!(i in store)) store[i] = typeof initial === "function" ? initial() : initial;
        return [store[i], next => { store[i] = typeof next === "function" ? next(store[i]) : next; }]; } };
const imports = {
    react: { __esModule: true, default: react, ...react },
    "react-native": { Text: "Text", View: "View", StyleSheet: { create: x => x }, useWindowDimensions: () => ({ fontScale }) },
    "@expo/vector-icons": { Ionicons: "Icon" }, "../../context/ThemeContext": { useTheme: () => ({ colors: palette }) },
    "../../theme": theme, "../../utils/adapters": pure("utils/adapters.js"), "../../utils/dates": dates,
    "../../utils/milkTypeHistory": pure("utils/milkTypeHistory.js"),
    "../../utils/milkFeedingChart": pure("utils/milkFeedingChart.js"), "../../utils/feedingStats": pure("utils/feedingStats.js"),
    "./ConsultationsAppointmentsCard": { DashboardSurface: "Surface", DashboardControl: "Control", DashboardListTransition: "Transition" },
    "./RecordIcon": { MilkIcon: "MilkIcon" }, "./MilkFeedingStackedChart": { __esModule: true, default: "MilkChart", MilkAnalyticIcon: "MetricIcon" },
    "./PlanDetail": { __esModule: true, default: "Detail" },
};
function load(file, extra = {}) {
    const module = { exports: {} };
    new Function("require", "module", "exports", compile(fs.readFileSync(path.join(__dirname, file), "utf8")))(name => {
        const dependency = { ...imports, ...extra };
        assert(name in dependency, `Unexpected viewer dependency ${name}`); return dependency[name];
    }, module, module.exports);
    return module.exports;
}
// The filter itself is covered by its interaction check; reuse its real range builder here.
const filter = { exports: {} };
new Function("require", "module", "exports", compile(fs.readFileSync(path.join(__dirname, "NutritionDateFilter.js"), "utf8")))(name => imports[name] || {}, filter, filter.exports);
imports["./NutritionDateFilter"] = { __esModule: true, default: "DateFilter", nutritionDateView: filter.exports.nutritionDateView };
const Analytics = load("MilkTypeAnalytics.js");
imports["./MilkTypeAnalytics"] = Analytics;
const UI = load("ViewerMilkTypeCard.js");
const all = tree => tree && typeof tree === "object" ? [tree, ...(tree.props.children || []).flatMap(all)] : [];
const find = (tree, match) => all(tree).find(match);
const text = tree => tree && typeof tree === "object" ? (tree.props.children || []).map(text).join(" ") : String(tree ?? "");
const rows = [
    { entry_type: "milk", milk_type: "Formula", quantity: "100", unit: "mL", entry_date: "2024-03-01", entry_time: "09:00", formula_brand: "Shared brand", notes: "Shared note" },
    { entry_type: "milk", milk_type: "Mixed", quantity: "60", breastmilk_quantity: "30", unit: "mL", entry_date: "2024-03-01" },
    { entry_type: "milk", milk_type: "Breastmilk", feed_method: "breast", duration_minutes: "12", entry_date: "2024-02-29" },
    { entry_type: "milk", feed_method: "bottle", entry_date: "2024-03-01" },
    { entry_type: "solid", entry_date: "2024-03-01" },
    { entry_type: "milk", milk_type: "Formula", entry_date: "2024-03-02" },
];
const original = JSON.stringify(rows), capturedAt = "2024-03-01T23:30:00Z";
const data = UI.viewerMilkData(rows, capturedAt, "2023-12-01");
assert.equal(data.referenceDate, "2024-03-01"); assert.equal(data.minimumDate, "2023-12-01");
assert.equal(new Set(data.feeds.map(feed => feed.id)).size, data.feeds.length, "Missing snapshot IDs never collapse rows");
assert(data.feeds.every(feed => feed.entryType === "milk"));
assert.equal(UI.viewerMilkData(rows, "invalid", null).referenceDate, "2024-03-02");
assert.equal(UI.viewerMilkData(rows, "2024-03-01 invalid timestamp", null).capturedDay, undefined);
assert.equal(UI.viewerMilkData([], null, "invalid").referenceDate, dates.todayLocal());
assert.equal(UI.viewerMilkData([{ entry_type: "milk", entry_date: "2100-01-01" }], null).referenceDate, dates.todayLocal(), "A future log cannot move an undated snapshot into the future");
assert.equal(UI.viewerMilkData(null, capturedAt).unavailable, true);
assert.equal(UI.viewerMilkData([], capturedAt).unavailable, false);
assert.equal(UI.viewerMilkData([], capturedAt, "2025-01-01").minimumDate, undefined);
const periods = Array.from({ length: 24 }, (_, i) => ({ milk_type: "Formula", start_date: `2024-02-${String(i + 1).padStart(2, "0")}`, end_date: null, notes: `Period ${i}` }));
let props = { rows, periods, capturedAt, dob: "2023-12-01" };
const draw = changes => { cursor = 0; props = { ...props, ...changes }; return UI.default(props); };
let tree = draw();
assert.equal(tree.type, Analytics.default); assert.equal(tree.props.readOnly, true);
const noHistory = tree => {
    assert(!find(tree, node => node.props.accessibilityLabel === "Milk Type History"));
    assert(!find(tree, node => node.props.testID === "viewer-milk-period"));
    assert(!find(tree, node => node.props.accessibilityLabel === "Show more milk-type periods"));
    assert(!text(tree).includes("Period 23"));
};
noHistory(tree);
tree.props.onOpenEntry(data.feeds[0]); tree = draw();
const detail = find(tree, node => node.type === "Detail");
assert.equal(detail.props.visible, true); assert.equal(detail.props.plan.notes, "Shared note");
assert.equal(detail.props.onEdit, undefined); assert.equal(detail.props.onDelete, undefined);
assert(detail.props.plan.details.some(row => row.label === "Amount" && row.value === "100 mL"));
detail.props.onClose(); tree = draw(); assert.equal(find(tree, node => node.type === "Detail").props.visible, false);
const mixed = UI.viewerMilkDetail(data.feeds[1]);
assert(mixed.details.some(row => row.label === "Formula amount" && row.value === "60 mL"));
assert(mixed.details.some(row => row.label === "Breastmilk amount" && row.value === "30 mL"));
assert(!UI.viewerMilkDetail(data.feeds[2]).details.some(row => row.label === "Amount"));
assert(UI.viewerMilkDetail(data.feeds[2]).details.some(row => row.label === "Duration" && row.value === "12 min"));
assert(UI.viewerMilkDetail({}).details.some(row => row.label === "Feeding method" && row.value === "Not recorded"));
for (const periods of [undefined, []]) { slots = []; tree = draw({ periods }); noHistory(tree); }
// The actual shared analytics and read-only chart details remain available.
tree = draw({ periods });
slots = []; const analyticsProps = { ...tree.props, minimumDate: "2023-12-01" };
const drawAnalytics = () => { cursor = 0; return Analytics.default(analyticsProps); };
let analytics = drawAnalytics();
const chart = tree => find(tree, node => node.type === "MilkChart");
assert.deepEqual(chart(analytics).props.chart.window.from, "2024-02-01", "Thirty inclusive days include leap day");
assert.equal(chart(analytics).props.chart.total, 3); assert.equal(chart(analytics).props.chart.excluded, 1);
assert.equal(chart(analytics).props.chart.totals.Mixed, 1); assert.equal(chart(analytics).props.readOnly, true);
assert(text(analytics).includes("uncategorized milk entry"));
const dateFilter = find(analytics, node => node.type === "DateFilter");
assert.equal(dateFilter.props.referenceDate, "2024-03-01");
dateFilter.props.onChange({ dateRange: { from: "2024-02-29", to: "2024-02-29" }, preset: null }); analytics = drawAnalytics();
assert.equal(chart(analytics).props.chart.total, 1); assert.equal(chart(analytics).props.chart.totals.Breastmilk, 1);
noHistory(analytics);
for (const palettes of [theme.PALETTES, theme.DARK_PALETTES]) for (const name of ["boy", "girl", "neutral"]) {
    palette = palettes[name]; analytics = drawAnalytics();
    assert.equal(find(analytics, node => node.props.testID === "milk-analysis").props.style.boxShadow, palette.milkTypeDashboard.chartShadow);
}
fontScale = 2; analytics = drawAnalytics();
find(analytics, node => node.props.testID === "milk-type-card").props.onLayout({ nativeEvent: { layout: { width: 288 } } });
analytics = drawAnalytics(); assert.equal(find(analytics, node => node.props.testID === "milk-metrics").props.style[1].flexDirection, "column");
slots = []; cursor = 0;
const emptyAnalytics = Analytics.default({ feeds: [], readOnly: true, referenceDate: "2024-03-01" });
assert(text(emptyAnalytics).includes("0% of feeds"));
slots = []; cursor = 0;
const missingAnalytics = Analytics.default({ feeds: [], readOnly: true, unavailable: true, referenceDate: "2024-03-01" });
assert(text(missingAnalytics).includes("Unavailable")); assert(!text(missingAnalytics).includes("0% of feeds"));
assert.equal(JSON.stringify(rows), original, "Viewer never mutates source records");
console.log("Viewer Milk Type passed: snapshot dates/permissions boundary, shared analytics, Mixed/exclusions, read-only details, removed period history, legacy/empty data, six themes and text scaling.");
