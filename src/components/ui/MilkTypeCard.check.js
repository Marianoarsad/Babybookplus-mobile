// Actual JSX and state transitions with fictional data; no UI/runtime or API access.
const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path"), { transformSync } = require("@babel/core");
const compile = source => transformSync(source, { babelrc: false, configFile: false, plugins: ["@babel/plugin-transform-react-jsx", "@babel/plugin-transform-modules-commonjs"] }).code;
function pure(file) {
    const filename = path.resolve(__dirname, file), module = { exports: {} };
    if (filename.endsWith(".cjs")) return require(filename);
    new Function("require", "module", "exports", compile(fs.readFileSync(filename, "utf8")))(name => pure(path.resolve(path.dirname(filename), name + (path.extname(name) ? "" : ".js"))), module, module.exports);
    return module.exports;
}
const theme = pure("../../theme.js"), selectors = pure("../../utils/milkTypeHistory.js");
const all = tree => tree && typeof tree === "object" ? [tree, ...(tree.type?.name === "FeedingStackedPlot" ? all(tree.type(tree.props)) : (tree.props.children || []).flatMap(all))] : [];
const find = (tree, predicate) => all(tree).find(predicate);
const text = tree => tree && typeof tree === "object" ? (tree.props.children || []).map(text).join(" ") : String(tree ?? "");
let slots = []; const analyticsSlots = []; let cursor = 0, fontScale = 1, palette = theme.PALETTES.boy;
const react = { createElement: (type, props, ...children) => ({ type, props: { ...props, children: children.flat(Infinity) } }), useMemo: fn => fn(), useId: () => "test",
    useRef: initial => { const i = cursor++; return slots[i] ||= {current:initial}; },
    useState: initial => { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === "function" ? initial() : initial; const store = slots; return [store[i], value => store[i] = typeof value === "function" ? value(store[i]) : value]; } };
const defaults = name => ({ __esModule: true, default: name });
const periodSaves = [], saveTargets = [];
const imports = { "./NeumorphicCard": {__esModule:true,default:"NeumorphicCard"}, "../ui/NeumorphicCard": {__esModule:true,default:"NeumorphicCard"},
    "./EntriesButton": { __esModule: true, default: "EntriesButton" }, react: { __esModule: true, default: react, ...react }, "react-native": { Platform: { OS: "web" }, View: "View", Text: "Text", Image: "Image", FlatList: "FlatList", ScrollView: "ScrollView", Switch: "Switch", TextInput: "Input", Pressable: "Pressable", Animated: { View: "AnimatedView" }, StyleSheet: { create: s => s }, useWindowDimensions: () => ({ fontScale, height: 844 }) },
    "react-native-svg": { __esModule: true, default: "Svg", Defs: "Defs", Line: "Line", LinearGradient: "LinearGradient", Rect: "Rect", Stop: "Stop", Path: "Path", Text: "SvgText" },
    "@expo/vector-icons": { Ionicons: "Icon" }, "../../context/ThemeContext": { useTheme: () => ({ colors: palette }) }, "../../theme": theme,
    "../../utils/api": { api: { deleteRecord: async () => {} } }, "../../utils/useRecords": { useRecordSave: (...args) => { saveTargets.push(args); return async body => periodSaves.push(body); } }, "../../utils/dates": pure("../../utils/dates.js"),
    "../../utils/milkFeedingChart": pure("../../utils/milkFeedingChart.js"), "../../utils/feedingStats": pure("../../utils/feedingStats.js"),
    "../../utils/milkTypeHistory": selectors, "./ConsultationsAppointmentsCard": { DashboardSurface: "Surface", DashboardControl: "Control", DashboardListTransition: "Transition" },
    "./MilkIcon": defaults("MilkIcon"), "./AnimatedReveal": defaults("Reveal"), "./RecordFormSheet": { ...defaults("Form"), DeleteConfirmation: "Delete", RecordFormGroup: "Group" },
    "./DateField": { DateField: "Date" }, "./Field": defaults("Field"), "./PlanDetail": defaults("Detail"), "./Skeleton": { SkeletonBlock: "Skeleton" },
    "./AppModal": defaults("Modal"), "./KeyboardAvoider": defaults("KeyboardAvoider"), "./useBottomSheetMotion": { ...defaults(() => ({ presented: true, dismiss() {}, pan: { panHandlers: {} } })) },
    "./useSoftPress": defaults(() => ({ respond() {}, transform: [] })), "react-native-safe-area-context": { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) } };
const modulePlot = { exports: {} };
imports["./RecordIcon"] = { MilkIcon: "MilkIcon", SolidFoodIcon: "SolidFoodIcon" };
new Function("require", "module", "exports", compile(fs.readFileSync(path.join(__dirname, "FeedingStackedPlot.js"), "utf8")))(name => { assert(name in imports, name); return imports[name]; }, modulePlot, modulePlot.exports);
imports["./FeedingStackedPlot"] = modulePlot.exports;
const moduleChart = { exports: {} };
new Function("require", "module", "exports", compile(fs.readFileSync(path.join(__dirname, "MilkFeedingStackedChart.js"), "utf8")))(name => { if (name.endsWith(".png")) return name; assert(name in imports, name); return imports[name]; }, moduleChart, moduleChart.exports);
imports["./MilkFeedingStackedChart"] = moduleChart.exports;
const filterModule = { exports: {} };
new Function("require", "module", "exports", compile(fs.readFileSync(path.join(__dirname, "NutritionDateFilter.js"), "utf8")))(name => imports[name] || {}, filterModule, filterModule.exports);
imports["./NutritionDateFilter"] = { __esModule: true, default: "DateFilter", nutritionDateView: filterModule.exports.nutritionDateView };
const analyticsModule = { exports: {} };
new Function("require", "module", "exports", compile(fs.readFileSync(path.join(__dirname, "MilkTypeAnalytics.js"), "utf8")))(name => { assert(name in imports, name); return imports[name]; }, analyticsModule, analyticsModule.exports);
imports["./MilkTypeAnalytics"] = analyticsModule.exports;
const moduleUI = { exports: {} };
new Function("require", "module", "exports", compile(fs.readFileSync(path.join(__dirname, "MilkTypeCard.js"), "utf8")))(name => { assert(name in imports, name); return imports[name]; }, moduleUI, moduleUI.exports);
const UI = moduleUI.exports, today = "2026-10-15";
const feeds = [{ id: "a", entryType: "milk", milkType: "Formula", date: "2026-10-01" },
 { id: "b", entryType: "milk", milkType: "Formula", date: "2026-10-01" },
 { id: "c", entryType: "milk", milkType: "Formula", date: "2026-10-03" }];
for (const palettes of [theme.PALETTES, theme.DARK_PALETTES]) for (palette of Object.values(palettes)) {
 slots = []; cursor = 0;
 const wrapper = UI.default({ feeds, today });
 const tree = analyticsModule.exports.default(wrapper.props);
 assert(text(tree).includes("Days recorded:") && text(tree).includes("First:") && text(tree).includes("Last:"));
 assert(!text(tree).includes("Currently on") && !text(tree).includes("Saved Periods"));
 const chart = find(tree, n => n.type === moduleChart.exports.default).props.chart;
 assert.deepEqual(chart.recordedDays.Formula, { days: 2, first: "2026-10-01", last: "2026-10-03" });
 assert.equal(chart.totals.Formula, 3);
 slots = []; cursor = 0;
 const unavailable = analyticsModule.exports.default({ feeds: [], referenceDate: today, unavailable: true });
 assert(text(unavailable).includes("Unavailable"));
}
for (fontScale of [1, 2]) {
 slots = []; cursor = 0;
 let tree = analyticsModule.exports.default({ feeds, referenceDate: today });
 tree.props.onLayout({ nativeEvent: { layout: { width: 320 } } }); cursor = 0;
 tree = analyticsModule.exports.default({ feeds, referenceDate: today });
 const metrics = find(tree, n => n.props.testID === "milk-metrics");
 assert.equal(Boolean(metrics.props.style[1]), fontScale === 2);
 const formula = all(metrics).find(n => n.props.accessibilityLabel?.startsWith("Formula,"));
 assert(formula.props.accessibilityLabel.includes("2 days recorded"));
}
console.log("Milk Type passed: unique dates, unavailable states, six themes, enlarged-text layout fallback, accessible summaries and retired period UI.");
