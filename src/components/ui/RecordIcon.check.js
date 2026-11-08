// Run: node components/ui/RecordIcon.check.js. No API calls or saved records.
const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path");
const { transformSync } = require("@babel/core");
const root = path.resolve(__dirname, "../..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const compile = source => transformSync(source, { babelrc: false, configFile: false,
    plugins: ["@babel/plugin-transform-react-jsx", "@babel/plugin-transform-modules-commonjs"] }).code;
const themeModule = { exports: {} };
new Function("module", "exports", compile(read("theme.js")))(themeModule, themeModule.exports);
const theme = themeModule.exports;
let colors = theme.PALETTES.boy, serial = 0, usage = {}, selected = [], writes = [];
const react = { createElement: (type, props, ...children) => ({ type, props: { ...props, children: children.flat(Infinity).filter(value => value != null && value !== false) } }),
    memo: fn => fn, useId: () => "category-test-" + serial++, useMemo: fn => fn(), useCallback: fn => fn,
    useEffect() {}, useState: () => [usage, next => { usage = next; }] };
const native = { View: "View", Text: "Text", TouchableOpacity: "Button", ScrollView: "Scroll", Image: "Image",
    StyleSheet: { create: value => value, absoluteFill: { position: "absolute", inset: 0 } },
    Animated: { View: "AnimatedView" }, useWindowDimensions: () => ({ height: 844, fontScale: 1 }) };
const svg = { __esModule: true, default: "Svg", ...Object.fromEntries(["Circle", "Defs", "Ellipse", "G", "ClipPath", "LinearGradient", "RadialGradient", "Path", "Rect", "Stop"].map(name => [name, name])) };
const cache = new Map();
function load(file) {
    file = file.replaceAll("\\", "/");
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} }; cache.set(file, module);
    new Function("require", "module", "exports", compile(read(file)))(name => {
        if (name === "react") return { __esModule: true, default: react, ...react };
        if (name === "react-native") return native;
        if (name === "react-native-svg") return svg;
        if (name === "@expo/vector-icons") return { Ionicons: "Icon" };
        if (name === "react-native-safe-area-context") return { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) };
        if (name.endsWith("ThemeContext")) return { useTheme: () => ({ colors }) };
        if (name.endsWith("/theme")) return theme;
        if (name.endsWith("responsive")) return { recordSheetHeight: () => 640, expandedSheetHeight: () => 740 };
        if (name.endsWith("storageAdapter")) return { storage: { setItem: (...args) => { writes.push(args); return Promise.resolve(); } } };
        if (name.endsWith("useBottomSheetMotion")) return { __esModule: true, default: () => ({ presented: true, dismiss: callback => callback?.(), height: 640, pan: { panHandlers: {} }, grabberPan: { panHandlers: {} } }) };
        if (name.endsWith("AppModal")) return { __esModule: true, default: "Modal" };
        if (name.endsWith("Gradient")) return { __esModule: true, default: "Gradient" };
        if (name.endsWith(".png")) return name;
        return load(path.relative(root, path.resolve(root, path.dirname(file), name + ".js")));
    }, module, module.exports);
    return module.exports;
}
const walk = node => node && typeof node === "object" ? [node, ...(node.props.children || []).flatMap(walk)] : [];
const expand = node => !node || typeof node !== "object" ? node : typeof node.type === "function" ? expand(node.type(node.props))
    : { ...node, props: { ...node.props, children: node.props.children.map(expand) } };
const luminance = hex => hex.slice(1).match(/../g).map(value => parseInt(value, 16) / 255).map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4).reduce((sum, value, i) => sum + value * [0.2126, 0.7152, 0.0722][i], 0);
const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05);
const icons = load("components/ui/RecordIcon.js");
assert.equal(icons.recordIconRegistry.recordsViewed, icons.RecordsViewedIcon);
for (const size of [24, 32, 48]) {
    const tree = expand(icons.default({ category: "recordsViewed", size }));
    assert.equal(tree.props.style.width, size);
    assert.equal(tree.props.style.height, size);
    assert.equal(walk(tree).filter(node => node.type === "Image").length, 1, "Records Viewed renders one supplied badge");
    assert(!walk(tree).some(node => node.type === "Gradient"), "The embedded badge has no second background");
}
const expected = { milk: "#2F7BF6", food: "#FF951C", growth: "#F25B9B", vaccine: "#8B5CF6", checkup: "#F8FBFF", medication: "#27C97B", condition: "#EF4444", hospitalStay: "#4F46E5", milestone: "#F5B800", memory: "#F58AB8" };
for (const palettes of [theme.PALETTES, theme.DARK_PALETTES]) for (colors of Object.values(palettes)) {
    assert.deepEqual(Object.keys(icons.recordCategoryRegistry), Object.keys(expected));
    assert.deepEqual(colors.feedingToday.mintIcon, colors.recordCategory.food.surface);
    assert.equal(colors.feedingBreakdown.mint, colors.recordCategory.food.ink);
    assert.deepEqual(colors.feedingBreakdown.ringSolid, colors.recordCategory.food.body);
    assert.equal(colors.nutritionMixGradient.solid[1], colors.recordCategory.food.primary);
    for (const [category, primary] of Object.entries(expected)) {
        const p = icons.recordCategoryMaterial(colors, category);
        assert.equal(p.primary, primary);
        for (const surface of p.surface) assert(contrast(p.ink, surface) >= 4.5, `${category}: readable category text`);
        for (const size of [24, 32, 36, 44, 48, 56, 64]) {
            const tree = expand(icons.default({ category, size }));
            assert.equal(tree.props.style.width, size); assert.equal(tree.props.style.height, size);
            assert(walk(tree).some(node => node.type === "Svg"), `${category} has custom artwork`);
            const header = expand(icons.default({ category, size, showBackground: false }));
            assert(!walk(header).some(node => node.type === "Gradient" || node.type === "Circle" && [45, 49].includes(node.props.r)), `${category}: standalone header`);
        }
    }
    for (const [alias, key] of [["solid", "food"], ["vaccination", "vaccine"], ["Illness", "condition"], ["Medication", "medication"], ["hospitalization", "hospitalStay"], ["milestones", "milestone"], ["appointments", "checkup"], ["memories", "memory"]]) {
        assert.equal(icons.default({ category: alias }).type, icons.recordCategoryRegistry[key]);
        assert.equal(icons.recordCategoryMaterial(colors, alias), colors.recordCategory[key]);
    }
    assert.equal(icons.default({ category: "unknown" }), null);
    const allergyImage = walk(expand(icons.default({ category: "Allergy" }))).find(node => node.type === "Image");
    assert.equal(allergyImage.props.style.zIndex, 1, "Raster artwork stays above its native surface");
    assert.equal(allergyImage.props.style.position, "relative");
    for (const alias of ["medicalHistory", "medical-history", "Medical History"]) {
        assert.equal(icons.default({ category: alias }).type, icons.MedicalHistoryIcon);
    }
    for (const size of [24, 32, 48, 64]) {
        const tree = expand(icons.default({ category: "medicalHistory", size }));
        assert.equal(tree.props.style.width, size); assert.equal(tree.props.style.height, size);
        assert.equal(walk(tree).find(n => n.type === "Svg").props.viewBox, "0 0 100 100");
        assert(walk(tree).some(n => n.type === "Circle" && n.props.r === "49"));
        assert(!walk(expand(icons.default({ category: "medicalHistory", size, showBackground: false })))
            .some(n => n.type === "Circle" && n.props.r === "49"));
    }
    for (const category of ["checkup", "memory", "medicalHistory"]) {
        const first = expand(icons.default({ category, showBackground: false })), second = expand(icons.default({ category }));
        const ids = tree => walk(tree).filter(n => n.props.id).map(n => n.props.id);
        assert(!ids(first).some(id => ids(second).includes(id)), "Repeated icons have independent SVG references");
        for (const n of walk(first)) for (const attribute of ["fill", "clipPath"]) {
            const ref = String(n.props[attribute] || "").match(/^url\(#(.+)\)$/);
            if (ref) assert(ids(first).includes(ref[1]), "All artwork gradients and clips resolve locally");
        }
        assert.equal(first.props.style.backgroundColor, undefined, "Bare artwork has no enclosing fill");
        assert(!walk(first).some(n => n.type === "Text" || n.type === "Image"), "Artwork is vector-only without labels");
        if (category === "checkup") {
            assert(walk(first).some(n => n.type === "Circle" && n.props.cx === "75" && n.props.r === "20.5"), "Medical badge overlaps the lower-right corner");
            assert.equal(walk(first).filter(n => n.type === "Rect" && n.props.width === "9" && n.props.height === "9" && n.props.rx === "2").length, 6);
        } else if (category === "memory") {
            assert.equal(walk(first).filter(n => n.type === "G" && n.props.transform?.startsWith("rotate")).length, 2);
            assert(walk(first).some(n => n.type === "Circle" && n.props.r === "7.2"), "Gallery has its small sun");
        } else {
            assert.equal(first.props.style.boxShadow, undefined, "Header artwork has no enclosing shadow");
            assert.equal(walk(first).filter(n => n.type === "Rect" && n.props.height === "3").length, 3, "Clipboard has three record lines");
            assert(walk(first).some(n => n.type === "Stop" && n.props.stopColor === colors.keepsakeArtwork.azure[1]), "Clipboard keeps the shared blue artwork palette");
        }
    }
    const active = expand(icons.default({ category: "medication", record: { resolved: false } }));
    const finished = expand(icons.default({ category: "medication", record: { resolved: true } }));
    assert.deepEqual(walk(active).filter(n => n.type === "Stop").map(n => n.props.stopColor), walk(finished).filter(n => n.type === "Stop").map(n => n.props.stopColor));
}
const sheet = load("components/ui/ActionSheet.js").default;
const routes = [["milk", "nutrition", "milk"], ["food", "nutrition", "solid"], ["growth", "growth", "metrics"], ["vaccine", "health", "vaccine"], ["checkup", "health", "checkup"], ["medication", "health", "medication"], ["condition", "health", "illness"], ["hospitalStay", "health", "hospitalization"], ["milestone", "growth", "memory"]];
usage = {};
let tree = sheet({ visible: true, onSelect: (...args) => selected.push(args) });
const buttons = walk(tree).filter(node => node.type === "Button" && /^Add /.test(node.props.accessibilityLabel || ""));
assert.equal(buttons.length, 12);
assert.deepEqual(buttons.slice(0, 3).map(button => button.props.accessibilityLabel), ["Add Milk", "Add Food", "Add Growth"]);
buttons.slice(3).forEach((button, i) => {
    assert.equal(walk(button).find(node => node.type === icons.default).props.category, routes[i][0]);
    button.props.onPress(); assert.deepEqual(selected.at(-1), routes[i].slice(1));
});
assert.equal(writes.length, 9);
usage = { hospitalization: 9, memory: 12, illness: 8 };
tree = sheet({ visible: true, onSelect() {} });
assert.deepEqual(walk(tree).filter(node => node.type === icons.default).slice(0, 3).map(node => node.props.category), ["milestone", "hospitalStay", "condition"]);
usage = { milkTypePeriod: 100 };
tree = sheet({ visible: true, onSelect() {} });
assert.equal(walk(tree).find(node => node.type === "Button" && /^Add /.test(node.props.accessibilityLabel || "")).props.accessibilityLabel, "Add Milk");
console.log("Record icons passed: ten categories plus Medical History, aliases, six palettes, 24/32/48/64 sizes, independent SVG references, clipboard/medical badge/photo layers, header backgrounds, unchanged approved colors and creation routes.");
