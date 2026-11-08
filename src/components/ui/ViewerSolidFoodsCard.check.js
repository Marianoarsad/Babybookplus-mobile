// In-memory snapshot fixtures; unexpected API/write dependencies fail the import boundary.
const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path");
const { transformSync } = require("@babel/core");
const root = path.resolve(__dirname, "../..");
const compile = source => transformSync(source, { babelrc: false, configFile: false,
    plugins: ["@babel/plugin-transform-react-jsx", "@babel/plugin-transform-modules-commonjs"] }).code;
function pure(relative) {
    const file = path.resolve(root, relative);
    if (file.endsWith(".cjs") || file.endsWith(".json")) return require(file);
    const module = { exports: {} };
    new Function("require", "module", "exports", compile(fs.readFileSync(file, "utf8")))(name =>
        pure(path.resolve(path.dirname(file), name + (path.extname(name) ? "" : ".js"))), module, module.exports);
    return module.exports;
}
const dates = pure("utils/dates.js"), theme = pure("theme.js"), selectors = pure("utils/viewerSolidFoods.js"), food = pure("utils/solidFoods.js");
let slots = [], cursor = 0, palette = theme.PALETTES.boy, fontScale = 1;
const react = { createElement: (type, props, ...children) => ({ type, props: { ...props, children: children.flat(Infinity).filter(x => x != null && x !== false) } }),
    useId: () => ":reaction-test:", useMemo: fn => fn(), useState: initial => { const store = slots, i = cursor++;
        if (!(i in store)) store[i] = typeof initial === "function" ? initial() : initial;
        return [store[i], next => { store[i] = typeof next === "function" ? next(store[i]) : next; }]; } };
const imports = { "./NeumorphicCard": {__esModule:true,default:"NeumorphicCard"}, "../ui/NeumorphicCard": {__esModule:true,default:"NeumorphicCard"},
    "./EntriesButton": { __esModule: true, default: "EntriesButton" },
    react: { __esModule: true, default: react, ...react },
    "react-native-svg": { __esModule: true, default: "Svg", Defs: "Defs", LinearGradient: "LinearGradient", Path: "Path", Stop: "Stop" },
    "react-native": { Text: "Text", View: "View", TextInput: "Input", Pressable: "Pressable", Platform: { OS: "web" }, StyleSheet: { create: x => x }, useWindowDimensions: () => ({ fontScale }) },
    "@expo/vector-icons": { Ionicons: "Icon" }, "../../context/ThemeContext": { useTheme: () => ({ colors: palette }) },
    "../../theme": theme, "../../utils/dates": dates, "../../utils/whoGrowth": pure("utils/whoGrowth.js"),
    "../../utils/viewerSolidFoods": selectors, "../../utils/solidFoods": food,
    "./ConsultationsAppointmentsCard": { DashboardSurface: "Surface", DashboardControl: "Control", DashboardListTransition: "Transition" },
    "./RecordIcon": { SolidFoodIcon: "SolidFoodIcon" }, "./SolidFoodsCard": { SolidFoodRow: "FoodRow" },
    "./FoodCategoryIcon": { __esModule: true, default: "FoodCategoryIcon" }, "./FeedingStackedPlot": { __esModule: true, default: "Plot" },
    "./PlanDetail": { __esModule: true, default: "Detail" },
};
function load(file, strict = true) {
    const module = { exports: {} };
    new Function("require", "module", "exports", compile(fs.readFileSync(path.join(__dirname, file), "utf8")))(name => {
        if (strict) assert(name in imports, `Unexpected viewer dependency ${name}`); return imports[name] || {};
    }, module, module.exports); return module.exports;
}
const filter = load("NutritionDateFilter.js", false);
imports["./NutritionDateFilter"] = { __esModule: true, default: "DateFilter", nutritionDateView: filter.nutritionDateView };
const Analytics = load("SolidFoodAnalytics.js"); imports["./SolidFoodAnalytics"] = Analytics;
const ReactionItem = load("RecordedFoodReactionItem.js").default;
imports["./RecordedFoodReactionItem"] = { __esModule: true, default: ReactionItem };
const UI = load("ViewerSolidFoodsCard.js");
const all = tree => tree && typeof tree === "object" ? [tree, ...(tree.props.children || []).flatMap(all)] : [];
const find = (tree, match) => all(tree).find(match);
const text = tree => tree && typeof tree === "object" ? (tree.props.children || []).map(text).join(" ") : String(tree ?? "");
const entry = (name, date, extra = {}) => ({ entry_type: "solid", food_introduced: name, entry_date: date, ...extra });
const rows = [entry("Banana", "2026-09-01", { entry_time: "08:00", food_category: "fruits" }),
    entry("Shrimp", "2026-09-01", { entry_time: "09:00", reaction_severity: "severe", reaction: "Older severe report" }),
    entry(" BANANA ", "2026-10-22", { food_category: "fruits" }),
    entry("Carrot", "2026-10-23", { food_category: "vegetables", reaction_severity: "mild", reaction: "Reported rash", notes: "Shared notes" }),
    entry("Egg", "2026-10-24", { food_category: "proteins", entry_time: "12:30" }),
    entry("", "2026-10-24"), entry("banana", "2026-10-24", { food_category: "fruits" }),
    entry("Peanut", null, { reaction: "Undated report" }), entry("Future", "2100-01-01"),
    { entry_type: "milk", entry_date: "2026-10-24" },
    ...Array.from({ length: 22 }, (_, i) => entry("Cereal", `2026-10-${String(i % 20 + 1).padStart(2, "0")}`))];
const original = JSON.stringify(rows), capturedAt = "2026-10-24T12:00:00Z", dob = "2026-01-01";
const data = selectors.viewerSolidData(rows, capturedAt, dob);
const range = { from: "2026-10-22", to: "2026-10-24" };
const chart = food.buildSolidFoodChart(data.solids, range, data.referenceDate);
assert.deepEqual(selectors.viewerSolidOverview(data, chart), { distinct: 3, introduced: 2, reactions: 1 });
assert.equal(chart.total, 5); assert.equal(chart.totals.other, 1);
assert.equal(Object.values(chart.displayPercentages).reduce((sum, value) => sum + value), 100);
assert.equal(data.first.foodIntroduced, "Banana"); assert.equal(data.first.date, "2026-09-01");
assert.equal(data.reactions.length, 3); assert.equal(data.reactions[0].foodIntroduced, "Shrimp");
assert(data.reactions.some(entry => entry.reaction === "Undated report"));
assert.equal(new Set(data.solids.map(entry => entry.id)).size, data.solids.length);
assert.equal(selectors.viewerSolidData(rows, "invalid", "invalid").capturedDay, undefined);
assert.equal(selectors.viewerSolidData(rows, "invalid").referenceDate, "2026-10-24");
assert.equal(selectors.viewerSolidData([], null).referenceDate, dates.todayLocal());
assert.equal(selectors.viewerSolidData([entry("Future", "2100-01-01")], null).referenceDate, dates.todayLocal());
assert.equal(selectors.viewerSolidData([], capturedAt, "2027-01-01").minimumDate, undefined);
assert.equal(selectors.viewerSolidData(null, capturedAt).unavailable, true);
assert.equal(selectors.viewerSolidData([], capturedAt).unavailable, false);
assert.deepEqual(selectors.viewerSolidOverview(data, food.buildSolidFoodChart(data.solids, { from: "2026-10-21", to: "2026-10-21" }, data.referenceDate)),
    { distinct: 0, introduced: 0, reactions: 0 }, "An empty selected range never invents counts");
let props = { rows, capturedAt, dob };
const draw = changes => { cursor = 0; props = { ...props, ...changes }; return UI.default(props); };
let tree = draw();
const analytics = tree => find(tree, node => node.type === Analytics.default);
const filterNode = tree => find(tree, node => node.type === "DateFilter");
const noHistory = tree => {
    assert(!find(tree, node => node.props.accessibilityLabel === "All shared food history"));
    assert(!find(tree, node => node.type === "Input"));
    assert(!find(tree, node => node.props.accessibilityLabel === "Show more shared food records"));
};
assert.equal(filterNode(tree).props.referenceDate, "2026-10-24");
assert.deepEqual(filterNode(tree).props.value.dateRange, { from: "2026-09-25", to: "2026-10-24" });
noHistory(tree);
filterNode(tree).props.onChange({ dateRange: range, preset: null }); tree = draw();
assert.equal(analytics(tree).props.chart.total, 5);
const overviewLabels = all(find(tree, node => node.props.testID === "viewer-solid-overview")).map(node => node.props.accessibilityLabel).filter(Boolean);
assert(overviewLabels.includes("Different foods, 3, selected range"));
assert(overviewLabels.includes("New in range, 2, selected range"));
assert(overviewLabels.includes("Reaction entries, 1, selected range"));
assert(text(tree).includes("01 Sep 2026"));
let previews = all(find(tree, node => node.props.testID === "viewer-solid-reactions")).filter(node => node.type === ReactionItem);
assert.equal(previews.length, 2); assert.equal(previews[0].props.entry.foodIntroduced, "Shrimp");
find(tree, node => node.props.accessibilityLabel === "View all shared food reactions").props.onPress(); tree = draw();
let detail = find(tree, node => node.type === "Detail");
assert.equal(detail.props.visible, true); assert.equal(detail.props.onEdit, undefined); assert.equal(detail.props.onDelete, undefined);
let reactionRows = all(detail).filter(node => node.type === ReactionItem); assert.equal(reactionRows.length, 3);
assert(reactionRows.some(node => node.props.entry.reaction === "Undated report"));
const reactionPresentation = props => { const element = ReactionItem(props); return element.type(element.props); };
const interactiveReaction = reactionPresentation(reactionRows[1].props);
assert.equal(interactiveReaction.type, "Pressable");
assert.equal(interactiveReaction.props.accessibilityRole, "button");
assert(interactiveReaction.props.accessibilityLabel.includes("Carrot"));
assert.equal(reactionPresentation({ entry: reactionRows[1].props.entry }).type, "View");
interactiveReaction.props.onPress(); tree = draw(); detail = find(tree, node => node.type === "Detail");
assert.equal(detail.props.plan.notes, "Shared notes"); assert(detail.props.plan.details.some(row => row.value === "Reported rash"));
detail.props.onClose(); tree = draw(); assert.equal(find(tree, node => node.type === "Detail").props.visible, false);
noHistory(tree);
filterNode(tree).props.onChange({ dateRange: { from: "2026-10-24", to: "2026-10-24" }, preset: null }); tree = draw();
noHistory(tree);
analytics(tree).props.onInspect(analytics(tree).props.chart.points[0]); tree = draw(); detail = find(tree, node => node.type === "Detail");
assert.equal(all(detail).filter(node => node.type === "FoodRow").length, 3);
analytics(tree).props.onInspect(analytics(tree).props.chart.points[0], "proteins"); tree = draw(); detail = find(tree, node => node.type === "Detail");
assert(detail.props.plan.title.startsWith("Proteins")); assert.equal(all(detail).filter(node => node.type === "FoodRow").length, 1);

assert(!UI.viewerSolidDetail({}).details.some(row => row.value === "All-day"));
assert.equal(UI.viewerSolidDetail({}).details.find(row => row.label === "Recorded severity").value, "Not recorded");
for (const paletteSet of [theme.PALETTES, theme.DARK_PALETTES]) for (const name of ["boy", "girl", "neutral"]) {
    palette = paletteSet[name]; tree = draw(); noHistory(tree); assert.equal(tree.props.style.marginBottom, 24);
    for (const severity of ["mild", "severe", undefined]) {
        const row = reactionPresentation({ entry: { reactionSeverity: severity } });
        assert.deepEqual(find(row, node => node.type === "Surface").props.colors, (palette.clinicalSummary[severity] || palette.clinicalSummary.unknown).surface);
        assert(text(row).includes("Food not recorded") && text(row).includes("Date not recorded"));
        assert.equal(row.props.style.minHeight, 76);
        assert.equal(row.props.style.flexWrap, "wrap");
    }
    const analysis = Analytics.default(analytics(tree).props);
    assert.equal(analysis.props.style.boxShadow, palette.solidFoodDashboard.chartShadow || palette.milkTypeDashboard.chartShadow);
}
slots = []; tree = draw({ rows: [] }); assert(text(tree).includes("No recorded food reactions"));
assert.equal(analytics(tree).props.chart.total, 0);
slots = []; tree = draw({ rows: undefined }); assert.equal(analytics(tree).props.unavailable, true);
assert(text(tree).includes("unavailable in this snapshot"));
slots = []; tree = draw({ rows: [entry("Undated", null, { reaction: "Retained" })], capturedAt: null, dob: null });
assert(text(tree).includes("No dated solid food records")); assert(text(tree).includes("Capture date unavailable"));
fontScale = 2; tree = draw(); assert.equal(find(tree, node => node.props.testID === "viewer-solid-overview").props.children[0].props.style[1].minWidth, 144);
assert.equal(JSON.stringify(rows), original, "Shared records are never mutated");
console.log("Viewer Solid Foods passed: snapshot boundaries, range-specific introductions/counts, category totals, severe/undated reactions, read-only details, removed full-history disclosure, retained chart/reaction details, six themes and unavailable/empty states.");
