// Actual JSX and state transitions with fictional data; no UI/runtime or API access.
const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path"), { transformSync } = require("@babel/core");
const compile = source => transformSync(source, { babelrc: false, configFile: false, plugins: ["@babel/plugin-transform-react-jsx", "@babel/plugin-transform-modules-commonjs"] }).code;
function pure(file) {
    const filename = path.resolve(__dirname, file), module = { exports: {} };
    if (filename.endsWith(".cjs") || filename.endsWith(".json")) return require(filename);
    new Function("require", "module", "exports", compile(fs.readFileSync(filename, "utf8")))(name => pure(path.resolve(path.dirname(filename), name + (path.extname(name) ? "" : ".js"))), module, module.exports);
    return module.exports;
}
const theme = pure("../../theme.js"), selectors = pure("../../utils/milkTypeHistory.js");
const all = tree => tree && typeof tree === "object" ? [tree, ...(["FeedingStackedPlot", "SolidFoodAnalytics"].includes(tree.type?.name) ? all(tree.type(tree.props)) : (tree.props.children || []).flatMap(all))] : [];
const find = (tree, predicate) => all(tree).find(predicate);
const text = tree => tree && typeof tree === "object" ? tree.type?.name === "SolidFoodAnalytics" ? text(tree.type(tree.props)) : (tree.props.children || []).map(text).join(" ") : String(tree ?? "");
const slots = []; let cursor = 0, fontScale = 1, palette = theme.PALETTES.boy;
const react = { createElement: (type, props, ...children) => ({ type, props: { ...props, children: children.flat(Infinity) } }), useMemo: fn => fn(), useId: () => "test",
    useState: initial => { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === "function" ? initial() : initial; return [slots[i], value => slots[i] = typeof value === "function" ? value(slots[i]) : value]; } };
const defaults = name => ({ __esModule: true, default: name });
const imports = { "./NeumorphicCard": {__esModule:true,default:"NeumorphicCard"}, "../ui/NeumorphicCard": {__esModule:true,default:"NeumorphicCard"},
    "./EntriesButton": { __esModule: true, default: "EntriesButton" }, react: { __esModule: true, default: react, ...react }, "react-native": { Platform: { OS: "web" }, View: "View", Text: "Text", FlatList: "FlatList", ScrollView: "ScrollView", Switch: "Switch", TextInput: "Input", Pressable: "Pressable", Animated: { View: "AnimatedView" }, StyleSheet: { create: s => s }, useWindowDimensions: () => ({ fontScale, height: 844 }) },
    "react-native-svg": { __esModule: true, default: "Svg", Defs: "Defs", Line: "Line", LinearGradient: "LinearGradient", Rect: "Rect", Stop: "Stop", Path: "Path", Text: "SvgText" },
    "@expo/vector-icons": { Ionicons: "Icon" }, "../../context/ThemeContext": { useTheme: () => ({ colors: palette }) }, "../../theme": theme,
    "../../utils/api": { api: { deleteRecord: async () => {} } }, "../../utils/useRecords": { useRecordSave: () => async () => {} }, "../../utils/dates": pure("../../utils/dates.js"),
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
imports["../../utils/solidFoods"] = pure("../../utils/solidFoods.js");
imports["../../utils/whoGrowth"] = pure("../../utils/whoGrowth.js");
imports["./SolidFoodIcon"] = defaults("SolidFoodIcon");
imports["./FoodCategoryIcon"] = defaults("FoodCategoryIcon");
const filterModule = { exports: {} };
new Function("require", "module", "exports", compile(fs.readFileSync(path.join(__dirname, "NutritionDateFilter.js"), "utf8")))(name => imports[name] || {}, filterModule, filterModule.exports);
imports["./NutritionDateFilter"] = { ...defaults("DateFilter"), nutritionDateView: filterModule.exports.nutritionDateView };
const moduleAnalytics = { exports: {} };
new Function("require", "module", "exports", compile(fs.readFileSync(path.join(__dirname, "SolidFoodAnalytics.js"), "utf8")))(name => { assert(name in imports, name); return imports[name]; }, moduleAnalytics, moduleAnalytics.exports);
imports["./SolidFoodAnalytics"] = moduleAnalytics.exports;
const moduleReaction = { exports: {} };
new Function("require", "module", "exports", compile(fs.readFileSync(path.join(__dirname, "RecordedFoodReactionItem.js"), "utf8")))(name => { assert(name in imports, name); return imports[name]; }, moduleReaction, moduleReaction.exports);
imports["./RecordedFoodReactionItem"] = moduleReaction.exports;
const moduleUI = { exports: {} };
new Function("require", "module", "exports", compile(fs.readFileSync(path.join(__dirname, "SolidFoodsCard.js"), "utf8")))(name => { assert(name in imports, name); return imports[name]; }, moduleUI, moduleUI.exports);
const UI = moduleUI.exports, S = imports["../../utils/solidFoods"], today = "2026-10-16";
const entries = Array.from({length:24}, (_,i) => ({ id:i+1, entryType:"solid", foodIntroduced:`Food ${i+1}`, date:today, foodCategory:S.FOOD_CATEGORIES[i%6] }));
entries[0] = {...entries[0], foodIntroduced:"Shrimp", reactionSeverity:"severe", reaction:"Rash around the arm appeared.", date:"2026-09-27"};
entries[1] = {...entries[1], foodIntroduced:"Scrambled eggs", reactionSeverity:"mild", reaction:"Mild rash around the mouth, resolved within hours.", date:"2026-07-12"};
entries[2] = {...entries[2], foodIntroduced:"Beef nilaga and rice", date:"2026-05-16"};
let opened = null, props = { entries, today, dob:"2025-11-14", onOpenEntry: entry=>opened=entry, onRetry(){} };
const render = changes => { cursor=0; props={...props,...changes}; return UI.default(props); };
const detail = tree => find(tree,n=>n.type==="Detail");
const active = tree => detail(tree)?.props.visible ? detail(tree) : {props:{children:tree.props.children.filter(n=>n?.type!=="Detail")}};
const rows = tree => all(active(tree)).filter(n=>n.type===UI.SolidFoodRow);
const button = (tree,label) => find(active(tree),n=>n.props.accessibilityLabel?.startsWith(label));
let tree=render();
const dateFilter = () => find(tree,n=>n.type==="DateFilter");
assert.equal(dateFilter().props.context,"solid");
assert.deepEqual(dateFilter().props.value.dateRange,{from:"2026-09-17",to:today});
assert.equal(find(tree,n=>n.type?.name==="FeedingStackedPlot").props.chart.total,22);
assert(text(tree).includes("Solid Food Consumption (Last 30 Days)"));
// Apply a shorter range through the production callback before inspecting daily data.
dateFilter().props.onChange({dateRange:{from:"2026-10-10",to:today},preset:null}); tree=render();

find(tree,n=>n.props.testID==="solid-food-card").props.onLayout({nativeEvent:{layout:{width:390}}});
find(tree,n=>n.props.onLayout && !n.props.testID).props.onLayout({nativeEvent:{layout:{width:294}}}); tree=render();
assert.equal(rows(tree).filter(n=>!n.props.reaction).length,3); assert.equal(rows(tree).filter(n=>n.props.reaction).length,2);
const recentIds = rows(tree).filter(n=>!n.props.reaction).map(n=>n.props.entry.id);
assert(!find(active(tree),n=>n.props.testID==="solid-food-search"));
assert(!find(tree,n=>n.props.testID?.startsWith("solid-range-")));
assert(dateFilter());
assert(!find(tree,n=>n.props.testID==="solid-active-range"));
assert.equal(find(tree,n=>n.type?.name==="FeedingStackedPlot").props.plotHeight,160);
assert.deepEqual(find(tree,n=>n.type?.name==="FeedingStackedPlot").props.chart.window.from,"2026-10-10");
assert.equal(find(tree,n=>n.props.testID==="solid-category-metrics").props.children.length,6);
assert.equal(find(tree,n=>n.props.testID==="solid-category-metrics").props.children[0].props.style[0].width,"48%");
assert(find(tree,n=>n.props.testID==="solid-y-axis"));
assert.equal(all(tree).filter(n=>n.props.testID?.startsWith("solid-date-")).length,7);
assert.equal(all(tree).filter(n=>n.props.testID?.startsWith("solid-segment-")).length,6);
assert.equal(all(tree).filter(n=>n.props.testID?.startsWith("solid-segment-") && n.type==="Path").length,1);
assert.equal(button(tree,"View all food reactions").props.appearance, "text");
assert.equal(button(tree,"View all solid food records").props.appearance, "text");
assert(!button(tree,"View solid food chart data and help"));
assert(button(tree,"View solid food chart data"));
assert.equal(find(tree,n=>n.props.testID==="solid-legend").props.children[0].props.style[1].width,"32%");
const metricCards = find(tree,n=>n.props.testID==="solid-category-metrics").props.children;
assert.equal(metricCards.reduce((sum, card)=>sum+Number(card.props.accessibilityLabel.match(/, (\d+)%/)[1]),0),100);
find(tree,n=>n.props.testID==="solid-food-card").props.onLayout({nativeEvent:{layout:{width:900}}});
find(tree,n=>n.props.onLayout && !n.props.testID).props.onLayout({nativeEvent:{layout:{width:804}}}); tree=render();
assert.equal(find(tree,n=>n.props.testID==="solid-category-metrics").props.children[0].props.style[1].flexDirection,"row");
assert.equal(find(tree,n=>n.props.testID==="solid-legend").props.style[1].width,300);
find(tree,n=>n.props.testID==="solid-food-card").props.onLayout({nativeEvent:{layout:{width:320}}});
find(tree,n=>n.props.onLayout && !n.props.testID).props.onLayout({nativeEvent:{layout:{width:224}}}); tree=render();
assert.equal(find(tree,n=>n.props.testID==="solid-legend").props.children[0].props.style[1].width,"49%");
assert.equal(text(find(tree,n=>n.props.testID===`solid-total-${today}`)),"21");
assert(all(tree).filter(n=>n.type==="Line").every(n=>n.props.y1===n.props.y2));
assert(!button(tree,"Add solid food"));
button(tree,"View all solid food records").props.onPress(); tree=render(); assert(detail(tree).props.visible); assert.equal(rows(tree).length,10);
assert.equal(detail(tree).props.plan.details.find(d=>d.label==="First solid food").value,"Beef nilaga and rice \u00b7 16 May 2026 \u00b7 6 months old");
button(tree,"Show more food records").props.onPress(); tree=render(); assert.equal(rows(tree).length,20);
button(tree,"Show more food records").props.onPress(); tree=render(); assert.equal(rows(tree).length,24); assert(!button(tree,"Show more food records"));
find(active(tree),n=>n.props.testID==="solid-food-search").props.onChangeText("arm"); tree=render(); assert.equal(rows(tree).length,1); assert.equal(rows(tree)[0].props.entry.foodIntroduced,"Shrimp");
rows(tree)[0].props.onOpen(rows(tree)[0].props.entry); assert.equal(opened.id,1); tree=render(); assert.equal(detail(tree).props.visible,false);
assert(!find(active(tree),n=>n.props.testID==="solid-food-search"));
assert.deepEqual(rows(tree).filter(n=>!n.props.reaction).map(n=>n.props.entry.id),recentIds,"History search never filters the main card");
button(tree,"View all solid food records").props.onPress(); tree=render();
assert.equal(find(active(tree),n=>n.props.testID==="solid-food-search").props.value,"arm","History query survives reopening");
button(tree,"Clear food search").props.onPress(); tree=render(); detail(tree).props.onClose(); tree=render();
button(tree,"View all food reactions").props.onPress(); tree=render(); assert.equal(rows(tree).length,2); assert.equal(rows(tree)[0].props.entry.foodIntroduced,"Shrimp"); detail(tree).props.onClose(); tree=render();
assert.equal(find(tree,n=>n.type?.name==="FeedingStackedPlot").props.chart.total,21);
assert.equal(find(tree,n=>n.props.testID==="solid-category-metrics").props.children.reduce((sum,n)=>sum+Number(n.props.accessibilityLabel.match(/, (\d+) entries/)[1]),0),21);
find(tree,n=>n.props.testID===`solid-segment-${today}-fruits`).props.onPress(); tree=render(); assert(detail(tree).props.visible); assert(detail(tree).props.plan.title.startsWith("Fruits"));
button(tree,"View food entry").props.onPress(); tree=render(); assert.equal(detail(tree).props.visible,false);
button(tree,"View solid food chart data").props.onPress(); tree=render(); assert(detail(tree).props.plan.notes.includes("Other includes entries without a recorded category"));
assert.equal(all(active(tree)).filter(n=>n.props.accessibilityLabel?.includes("entries. Fruits")).length,7); detail(tree).props.onClose();
slots.length=0; tree=render({entries:[]}); assert(text(tree).includes("No food reactions recorded.")); assert(text(tree).includes("No recorded solid food entries in this period.")); assert(find(tree,n=>n.props.testID==="solid-y-axis"));
tree=render({unavailable:true,failed:true}); assert(text(tree).includes("Unavailable")); assert(button(tree,"Retry loading solid foods")); assert(!text(tree).includes("No food reactions recorded."));
button(tree,"View all solid food records").props.onPress(); tree=render(); assert.equal(detail(tree).props.plan.details[0].value,"Unavailable"); detail(tree).props.onClose();
for (const paletteSet of [theme.PALETTES,theme.DARK_PALETTES]) for (const name of ["boy","girl","neutral"]) {
    palette=paletteSet[name]; tree=render({entries,unavailable:false,failed:false});
    for (const category of S.FOOD_CATEGORIES) assert(palette.solidFoodCategories[category].shadow);
}
palette=theme.PALETTES.boy; slots.length=0; cursor=0;
for (const entry of entries.slice(0,2)) {
    cursor=0;
    const shared=UI.SolidFoodRow({entry,reaction:true,onOpen:entry=>opened=entry});
    assert.equal(shared.type,moduleReaction.exports.default,"Parent reaction previews and full history reuse the shared row");
    const presentation=shared.type(shared.props), row=presentation.type(presentation.props);
    assert.equal(row.props.accessibilityRole,"button");
    assert(text(row).includes(entry.foodIntroduced));
    assert(text(row).includes(entry.reactionSeverity === "severe" ? "Severe" : "Mild"));
    assert.equal(find(row,n=>n.type==="Surface").props.colors,palette.clinicalSummary[entry.reactionSeverity].surface);
    row.props.onPress(); assert.equal(opened,entry,"The exact saved record still opens");
    assert.equal(opened.reaction,entry.reaction,"Detailed reaction report is preserved on the opened record");
}
const tracker=fs.readFileSync(path.join(__dirname,"../NutritionTracker.js"),"utf8"), registry=fs.readFileSync(path.join(__dirname,"RecordIcon.js"),"utf8");
assert(!tracker.includes('onAdd={() => openAdd("solid")}')); assert(tracker.includes('reactionSeverity: e.reactionSeverity || ""')); assert(tracker.includes('foodCategory: e.foodCategory || ""'));
assert(registry.includes('solid: SolidFoodIcon'));
slots.length=0; tree=render({entries,unavailable:false,failed:false,dob:"2026-10-15"});
const chartWindow = () => find(tree,n=>n.type?.name==="FeedingStackedPlot").props.chart.window;
assert.equal(chartWindow().from,"2026-10-15"); assert.equal(chartWindow().to,today);
tree=render({today:"2026-10-17"}); assert.equal(chartWindow().to,"2026-10-17");
tree=render({today:"2026-10-18"}); assert.equal(chartWindow().to,"2026-10-18");
slots.length=0; tree=render({dob:"2025-11-14"}); assert.equal(chartWindow().from,"2026-09-19");
dateFilter().props.onChange({dateRange:{from:"2026-09-27",to:"2026-09-27"},preset:null}); tree=render();
assert.equal(find(tree,n=>n.type?.name==="FeedingStackedPlot").props.chart.total,1);
assert.equal(find(tree,n=>n.props.testID==="solid-category-metrics").props.children.reduce((sum,n)=>sum+Number(n.props.accessibilityLabel.match(/, (\d+) entries/)[1]),0),1);
assert(text(tree).includes("Solid Food Consumption (Selected Range)"));
tree=render({today:"2026-10-19"}); assert.equal(chartWindow().to,"2026-09-27","Applied dates remain fixed when local today rolls");
slots.length=0; tree=render(); assert.equal(chartWindow().to,"2026-10-19","A new child starts with its own default");
assert(tracker.includes('key={`solid-foods-${id}`}'),"Child-keyed remount isolates transient UI state");
// All metric cards share a neutral material; narrow/large text layouts keep two columns.
for (const [width,scale,horizontal] of [[320,1,false],[360,1,true],[390,1,true],[430,1,true],[900,2,true],[390,2,false]]) {
    fontScale=scale;
    find(tree,n=>n.props.testID==="solid-food-card").props.onLayout({nativeEvent:{layout:{width}}}); tree=render();
    const cards=find(tree,n=>n.props.testID==="solid-category-metrics").props.children;
    assert.equal(cards.length,6);
    const base=cards[0].props.style[0];
    for (const card of cards) {
        assert.equal(card.props.style[0].width,"48%");
        assert.equal(Boolean(card.props.style[1]),horizontal);
        assert.equal(card.props.style[0].backgroundColor,base.backgroundColor);
        assert.equal(card.props.style[0].boxShadow,base.boxShadow);
        assert.equal(card.props.children[0].props.colors,palette.milkTypeDashboard.row);
        assert.equal(card.props.children[2].props.children[1].props.style[0].color,palette.appointmentDashboard.text);
    }
}
fontScale=1; slots.length=0; tree=render({entries:[]});
for(const card of find(tree,n=>n.props.testID==="solid-category-metrics").props.children) assert(text(card).includes("0% of entries"));
const iconModule={exports:{}};
new Function("require","module","exports",compile(fs.readFileSync(path.join(__dirname,"FoodCategoryIcon.js"),"utf8")))(name=>{
    if(name.endsWith(".png")) { assert(fs.existsSync(path.resolve(__dirname,name))); return name; }
    if(name==="react-native") return {...imports[name],Image:"Image"};
    assert(name in imports,name); return imports[name];
},iconModule,iconModule.exports);
for(const paletteSet of [theme.PALETTES,theme.DARK_PALETTES]) for(const name of ["boy","girl","neutral"]) {
    palette=paletteSet[name];
    for(const category of S.FOOD_CATEGORIES) {
        const icon=iconModule.exports.default({category,size:56});
        assert.equal(icon.props.accessible,false); assert.equal(icon.props.pointerEvents,"none");
        assert.equal(icon.props.style.width,56); assert.equal(icon.props.style.height,56);
        assert.equal(icon.props.children[0].props.colors,palette.solidFoodCategories[category].surface);
        assert.equal(icon.props.children[1].props.source,`../../assets/nutrition/food-${category}.png`);
    }
    assert.deepEqual(palette.solidFoodCategories.dairy.surface,palette.solidFoodCategories.grains.surface,"Dairy badge stays blue");
    assert.notDeepEqual(palette.solidFoodCategories.proteins.surface,palette.solidFoodCategories.dairy.surface);
}
console.log("Solid Foods JSX checks passed: complete dashboard, six responsive metrics, stacked axes/dates/gridlines/totals/rounding, shared reaction cards, history milestone/search/pagination, record/chart navigation, add, errors and shared icon.");
