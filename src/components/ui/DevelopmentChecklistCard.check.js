// Run: node components/ui/DevelopmentChecklistCard.check.js — isolated fixtures, no server writes.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { transformSync } = require("@babel/core");
const root = path.resolve(__dirname, "../..");
const compile = source => transformSync(source, { babelrc: false, configFile: false,
    plugins: ["@babel/plugin-transform-react-jsx", "@babel/plugin-transform-modules-commonjs"] }).code;
const modules = new Map();
let colors, width = 390, height = 844, fontScale = 1, current, hook = 0;
const state = new Map();
const effects = new Map(), seenEffects = new Set(), pendingEffects = [];
const scrollListeners = new Set(), observers = new Set();
const scrollContext = { scrollY: {
    addListener(fn) { scrollListeners.add(fn); return fn; },
    removeListener(fn) { scrollListeners.delete(fn); },
} };
class ResizeObserver {
    constructor(callback) { this.callback = callback; this.targets = []; observers.add(this); }
    observe(node) { this.targets.push(node); }
    disconnect() { observers.delete(this); }
}
const react = {
    Fragment: "Fragment",
    createElement: (type, props, ...children) => ({ type, props: { ...props, children: children.flat(Infinity).filter(v => v != null && v !== false) } }),
    useMemo: fn => fn(), useCallback: fn => fn, useContext: value => value, useId: () => `${current}-${hook++}`,
    useState(initial) {
        const id = `${current}/${hook++}`;
        if (!state.has(id)) state.set(id, initial);
        return [state.get(id), value => state.set(id, typeof value === "function" ? value(state.get(id)) : value)];
    },
    useRef() {
        const id = `${current}/${hook++}`;
        if (!state.has(id)) state.set(id, { current: { measureInWindow: fn => fn(16, 180, width - 32, 58) } });
        return state.get(id);
    },
    useEffect(fn, deps) {
        const id = `${current}/${hook++}`, old = effects.get(id);
        seenEffects.add(id);
        if (!old || deps.some((value, index) => value !== old.deps[index])) pendingEffects.push(() => {
            old?.cleanup?.(); effects.set(id, { deps, cleanup: fn() });
        });
    },
};
const native = { View: "View", Text: "Text", Image: "Image", TouchableOpacity: "TouchableOpacity", Platform: { OS: "web" },
    useWindowDimensions: () => ({ width, height, fontScale }), StyleSheet: { create: s => s, hairlineWidth: 1, absoluteFill: { position: "absolute", inset: 0 } } };
const svg = { __esModule: true, default: "Svg" };
for (const name of ["Circle", "Defs", "LinearGradient", "Path", "Stop"]) svg[name] = name;
const mocks = {
    "context/ThemeContext.js": { useTheme: () => ({ colors }) },
    "context/ScrollContext.js": { __esModule: true, default: scrollContext },
    "components/ui/ConsultationsAppointmentsCard.js": { DashboardSurface: "Surface", DashboardControl: "Control" },
    "components/ui/RecordIcon.js": { __esModule: true, default: "RecordIcon" },
    "components/ui/AnimatedReveal.js": { __esModule: true, default: "AnimatedReveal" },
    "components/ui/Gradient.js": { __esModule: true, default: "Gradient" },
    "components/ui/GlassLighting.js": { __esModule: true, default: "GlassLighting" },
    "components/ui/AnchoredMenu.js": { __esModule: true, default: function Menu({ trigger, header, children, visible, ...props }) {
        return react.createElement("Menu", { ...props, trigger, header, visible }, trigger({ covered: false }),
            visible ? header : null, ...(visible ? children : []));
    }, AnchoredMenuItem: "MenuItem" },
};
function load(relative) {
    const file = path.resolve(root, relative), key = path.relative(root, file).replaceAll("\\", "/");
    if (mocks[key]) return mocks[key];
    if (file.endsWith(".png")) return key;
    if (modules.has(file)) return modules.get(file).exports;
    const module = { exports: {} }; modules.set(file, module);
    new Function("require", "module", "exports", "globalThis", compile(fs.readFileSync(file, "utf8")))(name => {
        if (name === "react") return { __esModule: true, default: react, ...react };
        if (name === "react-native") return native;
        if (name === "react-native-svg") return svg;
        if (name === "@expo/vector-icons") return { Ionicons: "Ionicon" };
        assert(name.startsWith("."), name);
        const target = path.resolve(path.dirname(file), name);
        return load(path.extname(target) ? target : target + ".js");
    }, module, module.exports, { ResizeObserver });
    return module.exports;
}
function render(node, location = "root") {
    if (!node || typeof node !== "object") return node;
    const id = `${location}/${node.props.key ?? ""}/${node.type.name || node.type}`;
    if (typeof node.type === "function") {
        current = id; hook = 0;
        return render(node.type(node.props), id);
    }
    return { ...node, props: { ...node.props, children: node.props.children.map((child, index) => render(child, `${id}/${index}`)) } };
}
const nodes = node => node && typeof node === "object" ? [node, ...node.props.children.flatMap(nodes)] : [];
const text = node => node && typeof node === "object" ? node.props.children.map(text).join("") : String(node ?? "");
const style = value => Object.assign({}, ...[value].flat(Infinity).filter(Boolean));
const { default: Card } = load("components/ui/DevelopmentChecklistCard.js");
const theme = load("theme.js"), M = load("utils/milestoneChecklist.js");
const items = Object.freeze(M.itemsForCheckpoint(9).map(Object.freeze));
const records = Object.freeze(items.filter(i => i.domain === "social" || i.title === "Sits without support")
    .map((item, index) => Object.freeze({ id: `record-${index}`, title: item.title, isCompleted: true,
        date: index < 3 ? "2026-10-18" : "2026-06-16", photoUrl: index < 3 ? "" : "original-wave.jpg", ageAchieved: index < 3 ? "" : "7 months" })));
const before = JSON.stringify(records);
let toggled = [], chosenAge;
const ageOptions = M.CHECKPOINTS.map(key => ({ key, label: M.bandLabel(key), note: key === 9 ? "Your baby" : null }));
const props = { items, milestones: records, selectedBand: 9, subtitle: "Localized checklist description",
    onToggle: title => toggled.push(title), ageOptions, onSelectAge: value => chosenAge = value, blurTarget: { current: "blur-target" } };
const show = (next = props, key = "development-baby") => {
    seenEffects.clear();
    const tree = render(react.createElement(Card, { ...next, key }));
    for (const [id, effect] of effects) if (!seenEffects.has(id)) { effect.cleanup?.(); effects.delete(id); }
    while (pendingEffects.length) pendingEffects.shift()();
    return tree;
};
const byId = (tree, id) => nodes(tree).find(node => node.props.testID === id);
const headers = tree => nodes(tree).filter(node => node.type === "Control" && node.props["aria-expanded"] != null);
const rows = tree => nodes(tree).filter(node => node.props.accessibilityRole === "checkbox");

for (const palette of [...Object.values(theme.PALETTES), ...Object.values(theme.DARK_PALETTES)]) {
    colors = palette;
    for (const [w, scale] of [[320, 1], [390, 1], [430, 1], [320, 1.6]]) {
        for (const effect of effects.values()) effect.cleanup?.();
        effects.clear(); state.clear(); width = w; fontScale = scale;
        let tree = show();
        assert(text(tree).includes("Development Checklist"));
        assert(text(tree).includes(props.subtitle));
        assert(text(tree).includes("4 of 11 recorded"));
        assert(text(tree).includes("36% complete"));
        assert.equal(nodes(tree).find(n => n.type === "RecordIcon").props.category, "milestone");
        assert.equal(rows(tree).length, 11);
        assert.equal(rows(tree).filter(r => r.props.accessibilityState.checked).length, 4);
        assert.equal(rows(tree).filter(r => r.props["aria-checked"]).length, 4);
        assert.deepEqual(headers(tree).map(h => h.props.accessibilityLabel.match(/\d of \d/)[0]), ["3 of 3", "0 of 2", "0 of 2", "1 of 4"]);
        for (const header of headers(tree)) {
            assert.equal(style(header.props.style).paddingBottom, 16);
            assert.equal(style(header.props.style).paddingTop, 12);
        }
        for (const reveal of nodes(tree).filter(n => n.type === "AnimatedReveal"))
            assert.equal(reveal.props.contentStyle.paddingTop, 12);
        assert.deepEqual(nodes(tree).filter(n => n.type === "Image" && n.props.source.uri).map(n => n.props.source.uri), ["original-wave.jpg"]);
        assert(text(tree).includes("Recorded 16 Jun 2026"));
        assert(text(tree).includes("7 months"));
        assert(text(tree).includes("Nothing here is a test or a score"));
        assert(text(tree).includes("ECCD Checklist"));
        assert.equal(byId(tree, "development-progress").props.accessibilityValue.now, 4);
        const control = byId(tree, "development-age");
        assert.equal(style(control.props.style).minHeight, 58);
        assert.equal(style(control.props.style).boxShadow, palette.growthDropdownGlass.panelShadow);
        assert(nodes(control).some(n => n.type === "Gradient" && n.props.colors === palette.growthDropdownGlass.popoverPanel));
        assert(nodes(control).some(n => n.type === "GlassLighting" && n.props.material === palette.growthDropdownGlass));
        byId(tree, "development-age").props.onPress();
        tree = show();
        const menu = nodes(tree).find(n => n.type === "Menu");
        assert.equal(menu.props.visible, true);
        assert.equal(menu.props.appearance, "connectedSelect");
        assert.equal(menu.props.dimBackdrop, false);
        assert.equal(menu.props.blurTarget, props.blurTarget);
        assert.deepEqual(menu.props.anchor, { x: 16, y: 180, width: width - 32, height: 58 });
        assert.equal(menu.props.initialScrollOffset, 2 * theme.MIN_TOUCH);
        assert.deepEqual(nodes(menu).filter(n => n.type === "MenuItem").map(n => [n.props.label, n.props.note]), ageOptions.map(o => [o.label, o.note]));
        const covered = render(menu.props.trigger({ covered: true }));
        assert.equal(covered.props["aria-hidden"], true);
        assert.equal(covered.props.tabIndex, -1);
        assert.equal(covered.props.accessible, false);
        assert.equal(byId(tree, "development-age-header").props.accessibilityState.expanded, true);
        assert.equal(nodes(menu).find(n => n.type === "MenuItem" && n.props.selected).props.label, "9 months");
        nodes(menu).find(n => n.type === "MenuItem" && n.props.label === "12 months").props.onPress();
        assert.equal(chosenAge, 12);
        tree = show();
        assert.equal(nodes(tree).find(n => n.type === "Menu").props.visible, false);
        assert.equal(scrollListeners.size, 0);
        toggled = [];
        rows(tree)[0].props.onPress();
        assert.deepEqual(toggled, [items[0].title]);
        headers(tree)[0].props.onPress(); tree = show();
        assert.equal(headers(tree)[0].props["aria-expanded"], false);
        assert.equal(headers(tree)[1].props["aria-expanded"], true);
        assert(rows(tree).slice(0, 3).every(r => r.props.tabIndex === -1));
        assert.equal(byId(tree, "development-progress").props.accessibilityValue.now, 4);
        tree = show({ ...props, items: M.itemsForCheckpoint(12), selectedBand: 12 });
        assert(headers(tree).every(h => h.props["aria-expanded"]));
        tree = show(props, "development-other-baby-9");
        assert(headers(tree).every(h => h.props["aria-expanded"]));
        tree = show({ ...props, busy: items[0].title, milestones: records.map((r, i) => i === 3 ? { ...r, _pending: true } : r) });
        assert.equal(rows(tree)[0].props.disabled, true);
        assert.equal(rows(tree).at(-1).props.disabled, true);
        assert.equal(rows(tree).at(-1).props.accessibilityState.busy, true);
    }
}
assert.equal(JSON.stringify(records), before);

// An open control tracks layout changes and releases subscriptions on dismissal.
let tree = show(), measured = { x: 16, y: 180, width: 288, height: 58 };
byId(tree, "development-age").props.ref.current = { nodeType: 1, parentElement: { nodeType: 1, parentElement: null },
    measureInWindow: fn => fn(...Object.values(measured)) };
byId(tree, "development-age").props.onPress(); tree = show();
measured = { x: 16, y: 110, width: 398, height: 72 }; width = 430; height = 650; fontScale = 1.6;
show(); tree = show();
assert.deepEqual(nodes(tree).find(n => n.type === "Menu").props.anchor, measured);
measured = { ...measured, y: 90 }; scrollListeners.forEach(fn => fn()); tree = show();
assert.deepEqual(nodes(tree).find(n => n.type === "Menu").props.anchor, measured);
assert.equal([...observers][0].targets.length, 2);
measured = { ...measured, y: 80 }; [...observers][0].callback(); tree = show();
assert.deepEqual(nodes(tree).find(n => n.type === "Menu").props.anchor, measured);
byId(tree, "development-age-header").props.onPress(); tree = show();
assert.equal(nodes(tree).find(n => n.type === "Menu").props.visible, false);
assert.equal(scrollListeners.size, 0); assert.equal(observers.size, 0);
byId(tree, "development-age").props.onPress(); tree = show();
nodes(tree).find(n => n.type === "Menu").props.onClose(); tree = show();
assert.equal(nodes(tree).find(n => n.type === "Menu").props.visible, false);
tree = show({ ...props, selectedBand: 60, ageOptions: ageOptions.map(option => ({ ...option, note: null })) });
byId(tree, "development-age").props.onPress(); tree = show({ ...props, selectedBand: 60, ageOptions: ageOptions.map(option => ({ ...option, note: null })) });
assert.equal(nodes(tree).find(n => n.type === "Menu").props.initialScrollOffset, 10 * theme.MIN_TOUCH);
assert(nodes(tree).filter(n => n.type === "MenuItem").every(n => !n.props.note));
tree = show(props, "development-new-baby");
assert.equal(nodes(tree).find(n => n.type === "Menu").props.visible, false);
assert.equal(scrollListeners.size, 0); assert.equal(observers.size, 0);

// Exercise Growth's real save callback with a disposable in-memory API, including rollback.
const growth = fs.readFileSync(path.join(root, "components/Growth.js"), "utf8");
assert(growth.includes('key={`development-${profile.id}`}'));
assert(growth.includes('ageOptions={bandOptions} onSelectAge={setSelectedBand} blurTarget={blurTarget}'));
assert(!growth.includes('bandSheetOpen') && !growth.includes('bandMenuAnchor'));
assert(growth.includes('}, [ownBand, profile.id]);'), "Switching babies resets the selected age even when their default bands match");
const handlerStart = growth.indexOf("const handleToggleMilestone =");
const handlerEnd = growth.indexOf("\n    };", handlerStart) + 7;
const handlerSource = growth.slice(handlerStart, handlerEnd);
let stored = records.map(r => ({ ...r })), calls = [], failNext = false, pendingTitle, errors = [];
const api = { async optimisticRecord(baby, type, action, id, payload, options) {
    calls.push({ baby, type, action, id, payload, options });
    if (failNext) throw new Error("Simulated failed save");
    if (id) stored = stored.map(r => r.id === id ? { ...r, isCompleted: payload.is_completed, date: payload.date_recorded } : r);
    else stored.push({ id: "created-once", title: payload.title, isCompleted: payload.is_completed, date: payload.date_recorded });
} };
const toggle = title => new Function("mstones", "findRecorded", "resolveDevelopmentCategory", "setMilestoneBusy", "api", "profile", "todayStr", "toast",
    `${handlerSource}; return handleToggleMilestone;`)(stored, M.findRecorded, M.resolveDevelopmentCategory,
        value => pendingTitle = typeof value === "function" ? value(pendingTitle) : value,
        api, { id: "disposable-baby" }, () => "2026-10-18", { error: value => errors.push(value) })(title);
(async () => {
    await toggle(items[3].title);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].action, "create");
    assert.equal(M.summarizeChecklist(items, stored).completed, 5);
    await toggle(items[3].title);
    assert.equal(calls[1].action, "update");
    assert.equal(calls[1].id, "created-once");
    assert.equal(stored.filter(r => r.title === items[3].title).length, 1);
    assert.equal(M.summarizeChecklist(items, stored).completed, 4);
    const saved = JSON.stringify(stored); failNext = true;
    await toggle(items[3].title);
    assert.equal(JSON.stringify(stored), saved);
    assert.equal(errors.length, 1);
    assert.equal(pendingTitle, null);
    console.log("Development checklist: six palettes, compact/large text, spacing, age/collapse, data, counts and mocked save checks passed");
})().catch(error => { console.error(error); process.exitCode = 1; });
