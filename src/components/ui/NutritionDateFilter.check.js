// Run: node components/ui/NutritionDateFilter.check.js. In-memory dates only.
const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path");
const { transformSync } = require("@babel/core");
const root = path.resolve(__dirname, "../..");
const compile = source => transformSync(source, { babelrc: false, configFile: false,
    plugins: ["@babel/plugin-transform-modules-commonjs", "@babel/plugin-transform-react-jsx"] }).code;
function load(file, imports = {}) {
    const module = { exports: {} };
    new Function("require", "module", "exports", compile(fs.readFileSync(path.join(root, file), "utf8")))(name => {
        assert(name in imports, `Unexpected import: ${name}`); return imports[name];
    }, module, module.exports);
    return module.exports;
}
const dates = load("utils/dates.js"), logic = load("utils/dateFilter.js", { "./dates": dates });
const theme = load("theme.js"), translations = load("translations.js").translations;
const trackerSource = fs.readFileSync(path.join(root, "components/NutritionTracker.js"), "utf8");
assert(trackerSource.includes('minimumTitleWidth={112}') && trackerSource.includes('action={<View style={styles.chartControls}>'));
assert(trackerSource.indexOf('<NutritionDateFilter') < trackerSource.indexOf('name="tune"'));
assert(trackerSource.includes('onPress={openScopeMenu}'), "The separate chart filter retains its handler");
const today = dates.todayLocal();
const yesterday = dates.toLocalISO(new Date(new Date(`${today}T00:00:00`).getTime() - 86400000));
const earlier = dates.toLocalISO(new Date(new Date(`${today}T00:00:00`).getTime() - 2 * 86400000));
const birth = `${Number(today.slice(0, 4)) - 1}-01-01`;
const nodes = tree => tree && typeof tree === "object" ? [tree, ...(tree.props.children || []).flatMap(nodes)] : [];
const slots = []; let cursor = 0;
const React = { Fragment: "Fragment", createElement: (type, props, ...children) => ({ type, props: { ...props, children: children.flat(Infinity).filter(x => x != null && x !== false) } }),
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === "function" ? initial() : initial;
        return [slots[i], next => { slots[i] = typeof next === "function" ? next(slots[i]) : next; }]; },
    useRef(initial) { const i = cursor++; return slots[i] ||= { current: initial }; },
    useCallback: fn => fn, useMemo: fn => fn, useContext: context => context, useEffect() {} };
const scroll = { scrollY: { addListener() {}, removeListener() {} }, headerHeight: 50, tabBarHeight: 76 };
let viewport = { width: 390, height: 844, fontScale: 1 };
const filterModule = load("components/ui/NutritionDateFilter.js", {
    react: { __esModule: true, default: React, ...React },
    "react-native": { Image: "Image", Platform: { OS: "web" }, StyleSheet: { create: x => x, hairlineWidth: 1 }, Text: "Text", View: "View",
        useWindowDimensions: () => viewport },
    "@expo/vector-icons": { Ionicons: "Icon" },
    "../../context/ScrollContext": { __esModule: true, default: scroll },
    "../../context/ThemeContext": { useTheme: () => ({ colors: theme.PALETTES.boy }) },
    "../../context/LanguageContext": { useLanguage: () => ({ t: key => translations.en[key] || key }) },
    "../../theme": theme, "../../utils/dates": dates, "../../utils/dateFilter": logic,
    "./AnchoredMenu": { __esModule: true, default: "Menu" },
    "./AnimatedReveal": { __esModule: true, default: "Reveal" },
    "./ConsultationsAppointmentsCard": { DashboardControl: "Control" },
    "./DateField": { DateWheelPicker: "DateWheel" },
    "../../assets/navbar/calendar-blue.png": "calendar-blue.png",
});
const Component = filterModule.default;
const original = { dateRange: { from: earlier, to: today }, preset: null,
    yearRange: { from: Number(today.slice(0, 4)), to: Number(today.slice(0, 4)) } };
const applied = [];
const props = { value: original, minimumDate: birth, availableDates: [earlier, yesterday, today],
    onChange(next) { applied.push(next); props.value = next; } };
function render() { cursor = 0; const tree = Component(props);
    const trigger = nodes(tree).find(node => node.type === "View" && node.props.ref);
    trigger.props.ref.current = { measureInWindow: callback => callback(276, 140, 44, 44) };
    return tree;
}
const get = (id, tree = render()) => nodes(tree).find(node => node.props.testID === id);
const menu = (tree = render()) => nodes(tree).find(node => node.type === "Menu");
const wheel = (tree = render()) => nodes(tree).find(node => node.type === "DateWheel");
assert.deepEqual(Component && logic.dateFilterDraft(original).dateRange, original.dateRange);
assert.equal(get("nutrition-date-trigger").props.accessibilityLabel, `Filter nutrition dates, ${dates.numericDateRange(earlier, today)}`);
get("nutrition-date-trigger").props.onPress();
assert.equal(menu().props.visible, true);
assert.equal(menu().props.appearance, "neumorphic");
assert.equal(menu().props.maxWidth, 340);
assert.deepEqual(menu().props.viewport, { width: 390, height: 844 });
assert.equal(menu().props.bottomClearance, 76);
assert.equal(menu().props.anchor.x, 276);
assert(!nodes(menu()).some(node => node.type === "Text" && node.props.children.includes?.(dates.numericDateRange(earlier, today))),
    "Applied dates stay in the trigger label, not in a redundant popover line");
assert.equal(nodes(render()).find(node => node.type === "Reveal").props.expanded, false);
get("nutrition-date-custom-toggle").props.onPress();
assert.equal(nodes(render()).find(node => node.type === "Reveal").props.expanded, true);
assert.equal(wheel(), undefined, "Do not mount the picker portal behind the filter before it is opened");
get("nutrition-date-from").props.onPress();
assert.equal(wheel().props.visible, true);
assert.deepEqual(wheel().props.availableDates, props.availableDates);
wheel().props.onClose();
assert.equal(wheel(), undefined, "Closing the picker removes its portal");
assert.equal(applied.length, 0, "Picker cancellation leaves applied dates untouched");
get("nutrition-date-from").props.onPress();
wheel().props.onChange(yesterday); wheel().props.onClose();
assert.equal(applied.length, 0, "Picker Done only changes the popover draft");
assert.equal(get("nutrition-date-apply").props.disabled, false);
get("nutrition-date-apply").props.onPress();
assert.equal(applied.length, 1);
assert.deepEqual(applied[0].dateRange, { from: yesterday, to: today });
assert.equal(applied[0].preset, null);
assert.equal(menu().props.visible, false);
get("nutrition-date-trigger").props.onPress();
assert.equal(nodes(render()).find(node => node.type === "Reveal").props.expanded, false, "Custom section starts collapsed on every open");
get("nutrition-date-preset-week").props.onPress();
assert.equal(applied.length, 2, "Preset applies immediately");
assert.equal(applied[1].preset, "week");
get("nutrition-date-trigger").props.onPress();
assert.equal(get("nutrition-date-preset-week").props.active, true, "Applied preset keeps its raised blue selected state");
get("nutrition-date-preset-week").props.onPress();
assert.equal(applied[2].preset, "week", "Re-selecting an active preset does not toggle it off");
get("nutrition-date-trigger").props.onPress();
get("nutrition-date-custom-toggle").props.onPress();
get("nutrition-date-to").props.onPress(); wheel().props.onChange(earlier); wheel().props.onClose();
menu().props.onClose();
assert.equal(applied.length, 3, "Outside dismissal discards pending edits");
get("nutrition-date-trigger").props.onPress();
assert.equal(get("nutrition-date-to").props.accessibilityLabel.includes(dates.shortDate(applied[2].dateRange.to)), true);
assert.equal(applied[2].dateRange.to >= applied[2].dateRange.from, true);
assert.deepEqual(original.dateRange, { from: earlier, to: today }, "Source date view is not mutated");
for (const [width, expected] of [[320, 340], [360, 340], [400, 340], [430, 430 * 0.84], [646, 540]]) {
    viewport = { ...viewport, width };
    assert.equal(menu().props.maxWidth, expected, `Responsive width at ${width}dp`);
    assert.equal(menu().props.viewport.width, width, "The modal receives the updated parent viewport");
}
console.log("Nutrition date filter passed: anchored trigger, collapsed custom range, picker draft/cancel/apply, preset reselect, and outside dismissal.");
const nutritionValue = props.value, nutritionSlots = slots.splice(0), nutritionApplied = JSON.stringify(props.value);
props.context = "milk"; props.value = original;
get("milk-date-trigger").props.onPress();
assert(nodes(menu()).some(n => n.type === "Text" && n.props.children.includes("Filter Milk Records")));
assert(nodes(menu()).some(n => n.type === "Text" && n.props.children.includes("Choose a date range to update milk feeding records.")));
assert(!get("nutrition-date-trigger"));
assert.equal(get("milk-date-trigger").props.accessibilityLabel, `Filter milk dates, ${dates.numericDateRange(earlier, today)}`);
assert.equal(nodes(render()).find(n => n.type === "Reveal").props.expanded, false);
get("milk-date-preset-year").props.onPress();
assert.equal(props.value.preset, "year");
assert.equal(JSON.stringify(nutritionValue), nutritionApplied, "Milk applies never mutate the Nutrition filter's range");
get("milk-date-trigger").props.onPress(); get("milk-date-custom-toggle").props.onPress();
get("milk-date-from").props.onPress(); wheel().props.onChange(yesterday); wheel().props.onClose();
const beforeCancel = applied.length;
nodes(menu()).find(n => n.props.accessibilityLabel === "Cancel").props.onPress();
assert.equal(applied.length, beforeCancel); assert.equal(props.value.preset, "year");
const milkValue = props.value, milkApplied = JSON.stringify(milkValue);
slots.splice(0); props.context = "solid"; props.value = original;
get("solid-date-trigger").props.onPress();
assert(nodes(menu()).some(n=>n.type==="Text" && n.props.children.includes("Filter Solid Food Records")));
assert(nodes(menu()).some(n=>n.type==="Text" && n.props.children.includes("Choose a date range to update solid food records.")));
assert.equal(get("solid-date-trigger").props.accessibilityLabel,`Filter solid food dates, ${dates.numericDateRange(earlier,today)}`);
assert(!get("milk-date-trigger") && !get("nutrition-date-trigger"));
assert.equal(nodes(render()).find(n=>n.type==="Reveal").props.expanded,false);
get("solid-date-custom-toggle").props.onPress(); get("solid-date-from").props.onPress();
wheel().props.onChange(yesterday); wheel().props.onClose(); get("solid-date-apply").props.onPress();
assert.deepEqual(props.value.dateRange,{from:yesterday,to:today});
assert.equal(JSON.stringify(milkValue),milkApplied); assert.equal(JSON.stringify(nutritionValue),nutritionApplied);
slots.splice(0, slots.length, ...nutritionSlots); delete props.context; props.value = nutritionValue;
assert(get("nutrition-date-trigger")); assert.equal(JSON.stringify(props.value), nutritionApplied);
assert(nodes(menu()).some(n => n.type === "Text" && n.props.children.includes("Filter Nutrition Records")));
console.log("Milk context passed: shared styling/controls, contextual copy, draft cancellation and independent instance state.");

// Unsaved defaults are 30 local calendar days; saved views remain authoritative.
assert.deepEqual(filterModule.nutritionDateView(null, null, "2026-10-25").dateRange, { from: "2026-09-26", to: "2026-10-25" });
assert.deepEqual(filterModule.nutritionDateView(null, null, "2024-03-01").dateRange, { from: "2024-02-01", to: "2024-03-01" });
assert.deepEqual(filterModule.nutritionDateView(null, "2026-10-20", "2026-10-25").dateRange, { from: "2026-10-20", to: "2026-10-25" });
assert.deepEqual(filterModule.nutritionDateView(original, birth).dateRange, original.dateRange);
slots.splice(0); props.context = "growth"; props.value = original;
get("growth-date-trigger").props.onPress();
assert(nodes(menu()).some(n => n.type === "Text" && n.props.children.includes("Filter Growth Records")));
assert(nodes(menu()).some(n => n.type === "Text" && n.props.children.includes("Choose a date range to update growth measurements.")));
assert.equal(menu().props.dimBackdrop, false);
get("growth-date-preset-month").props.onPress();
assert.equal(props.value.preset, "month");
get("growth-date-trigger").props.onPress(); get("growth-date-custom-toggle").props.onPress();
get("growth-date-to").props.onPress(); wheel().props.onChange(yesterday); wheel().props.onClose();
const growthPending = applied.length;
nodes(menu()).find(n => n.props.accessibilityLabel === "Cancel").props.onPress();
assert.equal(applied.length, growthPending);
assert.equal(JSON.stringify(nutritionValue), nutritionApplied);
assert.equal(JSON.stringify(milkValue), milkApplied);
for (const language of Object.values(translations)) {
    assert(language.dateFilterGrowthTitle && language.dateFilterGrowthHelp);
}
console.log("Growth context and 30-day defaults passed: localized copy, shared actions, cancellation and independent saved ranges.");

// Exercise Growth's real header callback and legacy saved-view shape.
const growthSource = fs.readFileSync(path.join(root, "components/Growth.js"), "utf8");
const growthAst = require("@babel/parser").parse(growthSource, { sourceType: "module", plugins: ["jsx"] });
const astNodes = node => !node || typeof node !== "object" ? [] : [node, ...Object.values(node).flatMap(value => Array.isArray(value) ? value.flatMap(astNodes) : astNodes(value))];
const astAll = astNodes(growthAst);
const attr = (n, name) => n.openingElement.attributes.find(a => a.name?.name === name);
const sharedSource = fs.readFileSync(path.join(root, "components/ui/GrowthMeasurementsCard.js"), "utf8");
const sharedAst = require("@babel/parser").parse(sharedSource, { sourceType: "module", plugins: ["jsx"] });
const sharedAll = astNodes(sharedAst);
const growthFilter = sharedAll.find(n => n.type === "JSXElement" && n.openingElement.name.name === "NutritionDateFilter");
assert.equal(attr(growthFilter, "context").value.value, "growth");
const measurements = sharedAll.find(n => n.type === "JSXElement" && n.openingElement.name.name === "SectionContainerCard" && attr(n, "minimumTitleWidth"));
const headerAction = attr(measurements, "action").value.expression;
assert(astNodes(headerAction).includes(growthFilter));
assert(astNodes(headerAction).some(n => n.type === "JSXAttribute" && n.name.name === "onPress" && n.value.expression.name === "openMetricMenu"));
const parentCard = astAll.find(n => n.type === "JSXElement" && n.openingElement.name.name === "GrowthMeasurementsCard");
assert(!growthSource.includes("GlassDateRangeFilterModal") && !growthSource.includes("dateSelectText"));
assert(growthSource.includes("recentDateRange(30, dateOfBirth)"));
const callback = attr(parentCard, "onDateViewChange").value.expression;
const savedYear = { from: 2025, to: 2025 }, updates = {};
const applyGrowth = new Function("setDateRange", "setAppliedDatePreset", "setYearRange", "onDateViewChange", "yearRange",
    "return (" + growthSource.slice(callback.start, callback.end) + ")")(
        value => updates.dateRange = value, value => updates.preset = value, value => updates.yearRange = value,
        value => updates.saved = value, savedYear);
applyGrowth({ dateRange: { from: earlier, to: today }, preset: null, yearRange: { from: 2026, to: 2026 } });
assert.deepEqual(updates.saved, { dateRange: { from: earlier, to: today }, appliedDatePreset: null, yearRange: savedYear });
applyGrowth({ dateRange: { from: "2026-01-01", to: "2026-12-31" }, preset: "year", yearRange: { from: 2026, to: 2026 } });
assert.equal(updates.saved.yearRange.from, 2026); assert.equal(updates.saved.appliedDatePreset, "year");
assert.notEqual(updates.saved.yearRange, savedYear);
console.log("Growth integration passed: header controls, existing chart handler, 30-day fallback and saved-view compatibility.");

// Snapshot references affect only callers opting in; parent defaults above remain unchanged.
slots.length = 0; applied.length = 0;
Object.assign(props, { context: "milk", referenceDate: "2024-03-01", minimumDate: "2023-12-01",
    availableDates: ["2024-02-29", "2024-03-01", "2024-03-02"],
    value: filterModule.nutritionDateView(null, "2023-12-01", "2024-03-01") });
get("milk-date-trigger").props.onPress(); get("milk-date-preset-month").props.onPress();
assert.deepEqual(applied[0].dateRange, { from: "2024-03-01", to: "2024-03-01" });
get("milk-date-trigger").props.onPress(); get("milk-date-custom-toggle").props.onPress();
get("milk-date-to").props.onPress(); assert.equal(wheel().props.maximumDate, "2024-03-01");
wheel().props.onChange("2024-03-02"); wheel().props.onClose();
assert.equal(get("milk-date-apply").props.disabled, true, "Dates after the snapshot cannot be applied");
menu().props.onClose(); assert.equal(applied.length, 1, "Cancel does not apply snapshot drafts");
get("milk-date-trigger").props.onPress(); get("milk-date-preset-year").props.onPress();
assert.deepEqual(applied[1].dateRange, { from: "2024-01-01", to: "2024-12-31" }, "Keep existing full-year bucket semantics");
assert.equal(applied[1].yearRange.to, 2024, "No years after the snapshot are offered");
console.log("Snapshot filter reference passed: captured-month presets, date-wheel cap, validation, cancellation and full-year compatibility.");
