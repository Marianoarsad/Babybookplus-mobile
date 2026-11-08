// Actual picker JSX and root integration; fictional in-memory records, no API calls.
const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path");
const { transformSync } = require("@babel/core"), { parse } = require("@babel/parser");
const root = path.resolve(__dirname, "../..");
const compile = source => transformSync(source, { configFile: false, babelrc: false,
    plugins: ["@babel/plugin-transform-modules-commonjs", "@babel/plugin-transform-react-jsx"] }).code;
const themeModule = { exports: {} };
new Function("module", "exports", compile(fs.readFileSync(path.join(root, "theme.js"), "utf8")))(themeModule, themeModule.exports);
const theme = themeModule.exports;
const nodes = node => node && typeof node === "object" ? [node, ...(node.props?.children || []).flatMap(nodes)] : [];
const flatten = style => Object.assign({}, ...[style].flat(Infinity).filter(Boolean));
function harness(colors, os = "web") {
    let cursor = 0, dimensions = { width: 390, height: 844, fontScale: 1 }, anchor, closes = 0, adds = 0, focused = 0;
    const slots = [], effects = [], frames = new Map(), selections = [], errors = [], removed = [];
    let next = 0;
    const scroll = { scrollY: { addListener: () => ++next, removeListener: id => removed.push(id) }, headerHeight: 60, tabBarHeight: 80 };
    const react = { createElement: (type, props, ...children) => ({ type, props: { ...props, children: children.flat(Infinity).filter(v => v != null && v !== false) } }),
        Fragment: "Fragment", useMemo: fn => fn(), useCallback: fn => fn, useContext: () => scroll,
        useRef: initial => { const i = cursor++; return slots[i] ||= { current: initial }; },
        useState: initial => { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], value => slots[i] = value]; },
        useEffect: (fn, deps) => { const i = cursor++, old = slots[i]; if (!old || deps.some((v, j) => v !== old.deps[j]))
            effects.push(() => { old?.cleanup?.(); slots[i] = { deps, cleanup: fn() }; }); },
    };
    const native = { AccessibilityInfo: { setAccessibilityFocus: () => focused++ }, findNodeHandle: () => 1,
        View: "View", Text: "Text", Image: "Image", Pressable: "Pressable", Platform: { OS: os },
        StyleSheet: { create: v => v, absoluteFill: {}, hairlineWidth: 1 }, useWindowDimensions: () => dimensions };
    const imports = { react: { __esModule: true, default: react, ...react }, "react-native": native,
        "@expo/vector-icons": { Ionicons: "Icon" }, "../../theme": theme,
        "../../context/ThemeContext": { useTheme: () => ({ colors }) }, "../../context/ScrollContext": { __esModule: true, default: scroll },
        "./AnchoredMenu": { __esModule: true, default: "AnchoredMenu" }, "./GlassLighting": { __esModule: true, default: "GlassLighting" },
        "./Gradient": { __esModule: true, default: "Gradient" } };
    const module = { exports: {} };
    new Function("require", "module", "exports", "requestAnimationFrame", "cancelAnimationFrame", compile(fs.readFileSync(path.join(__dirname, "BabyProfilePicker.js"), "utf8")))(
        name => { assert(name in imports, name); return imports[name]; }, module, module.exports,
        callback => { const id = ++next; frames.set(id, callback); return id; }, id => frames.delete(id));
    const profiles = [{ id: "a", name: "First Child", avatarUrl: "https://example.invalid/original-a.jpg", dateOfBirth: "2025-01-01", gender: "girl" },
        { id: "b", name: "Second Child", avatarUrl: "https://example.invalid/original-b.jpg" }, { id: "c", name: "A Long Complete Child Name That Must Wrap", avatarUrl: "" }];
    const props = { visible: true, anchor: { x: 10, y: 10, width: 100, height: 44 }, profiles, selectedId: "b", alerts: { a: true }, brokenAvatars: new Set(),
        triggerRef: { current: { focus: () => focused++, measureInWindow: callback => callback(10, 10, 100, 44) } },
        onAnchorChange: update => anchor = update(anchor), onClose: () => closes++, onSelect: p => selections.push(p), onAddChild: () => adds++, onAvatarError: id => errors.push(id) };
    const draw = changes => { Object.assign(props, changes); cursor = 0; const tree = module.exports.default(props); while (effects.length) effects.shift()(); return tree; };
    return { props, profiles, draw, nodes, errors, selections, removed, resize: value => dimensions = value,
        flush: () => { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(fn => fn()); },
        unmount: () => slots.forEach(slot => slot?.cleanup?.()), values: () => ({ adds, closes, focused, anchor, frames: frames.size }) };
}
for (const palettes of [theme.PALETTES, theme.DARK_PALETTES]) for (const [name, colors] of Object.entries(palettes)) {
    const h = harness(colors), original = JSON.stringify(h.profiles); let tree = h.draw();
    assert.equal(tree.props.appearance, "profilePicker"); assert.equal(tree.props.dimBackdrop, false);
    assert.equal(tree.props.maxWidth, 296); assert.equal(tree.props.bottomClearance, 80 + theme.space.md);
    const rows = () => tree.props.children;
    assert.deepEqual(rows().map(r => r.props.testID), ["baby-picker-a", "baby-picker-b", "baby-picker-c"]);
    assert.equal(rows().filter(r => r.props.accessibilityState.selected).length, 1);
    assert.equal(rows()[1].props["aria-pressed"], true);
    assert(rows()[0].props.accessibilityLabel.includes("Needs attention")); assert(!rows()[1].props.accessibilityLabel.includes("Needs attention"));
    assert.equal(nodes(tree).filter(n => n.props.testID === "baby-picker-selected-check").length, 1);
    assert.equal(nodes(rows()[0]).find(n => n.type === "Image").props.source.uri, h.profiles[0].avatarUrl);
    assert(nodes(rows()[2]).some(n => n.props.name === "person"));
    assert.equal(flatten(rows()[0].props.style({})).backgroundColor, "transparent");
    assert.equal(flatten(rows()[1].props.style({})).minHeight, 68);
    assert(nodes(rows()[2]).filter(n => n.type === "Text").every(n => n.props.numberOfLines == null));
    assert(!nodes(tree).filter(n => n.type === "Text").some(n => String(n.props.children).includes("2025")), "No age or gender subtitle");
    assert.equal(colors.profilePickerGlass.accent, (name === "girl" ? palettes.boy : colors).profilePickerGlass.accent, "Picker retains approved blue across child themes");
    rows()[1].props.ref.current = { focus: () => {} }; tree.props.onShow();
    nodes(rows()[0]).find(n => n.type === "Image").props.onError(); assert.deepEqual(h.errors, ["a"]);
    tree = h.draw({ brokenAvatars: new Set(["a"]) }); assert(!nodes(rows()[0]).some(n => n.type === "Image"));
    rows()[0].props.onPress(); rows()[0].props.onPress(); assert.equal(h.values().closes, 1); assert.equal(h.selections.length, 1);
    assert.equal(h.selections[0], h.profiles[0]); assert.equal(JSON.stringify(h.profiles), original);
    tree = h.draw({ visible: false }); tree.props.onAfterClose(); h.flush(); assert.equal(h.values().focused, 1);
    tree = h.draw({ visible: true, selectedId: "a" }); assert.equal(rows()[0].props.accessibilityState.selected, true);
    const footer = tree.props.footer, add = nodes(footer).find(n => n.props.testID === "baby-picker-add");
    assert.equal(flatten(footer.props.style).flexShrink, 0); assert.equal(flatten(add.props.style({})).minHeight, 64);
    add.props.onPress(); add.props.onPress(); assert.equal(h.values().adds, 0);
    tree = h.draw({ visible: false }); tree.props.onAfterClose(); assert.equal(h.values().adds, 0); h.flush();
    assert.equal(h.values().adds, 1); assert.equal(h.values().focused, 1, "Add Child owns the next focus");
    tree = h.draw({ visible: true, profiles: [h.profiles[0]] }); assert.equal(rows().length, 1); assert(tree.props.footer);
    tree = h.draw({ profiles: Array.from({ length: 20 }, (_, i) => ({ id: String(i), name: `Child ${i}` })) }); assert.equal(rows().length, 20);
    h.resize({ width: 320, height: 380, fontScale: 2 }); tree = h.draw(); assert.equal(tree.props.viewport.width, 320);
    tree.props.onClose(); tree = h.draw({ visible: false }); tree.props.onAfterClose();
    h.unmount(); h.flush(); assert.equal(h.values().frames, 0); assert(h.removed.length > 0);
}
const app = fs.readFileSync(path.join(root, "App.js"), "utf8"), ast = parse(app, { sourceType: "module", plugins: ["jsx"] });
const walk = node => !node || typeof node !== "object" ? [] : [node, ...Object.values(node).flatMap(v => Array.isArray(v) ? v.flatMap(walk) : walk(v))];
const declaration = name => walk(ast).find(n => n.type === "VariableDeclarator" && n.id.name === name).init;
let selectedId, gender;
new Function("setSelectedProfileId", "onThemeGenderChange", `return (${app.slice(declaration("selectProfile").start, declaration("selectProfile").end)})`)(id => selectedId = id, value => gender = value)({ id: "actual-id", gender: "boy" });
assert.equal(selectedId, "actual-id"); assert.equal(gender, "boy");
const picker = walk(ast).find(n => n.type === "JSXOpeningElement" && n.name?.name === "BabyProfilePicker");
for (const [prop, value] of [["profiles", "profiles"], ["alerts", "childAlerts"], ["onSelect", "selectProfile"], ["onAddChild", "openAddModal"], ["blurTarget", "blurTargetRef"]])
    assert.equal(picker.attributes.find(a => a.name?.name === prop).value.expression.name, value);
assert(app.includes('"aria-expanded": switcherOpen'));
console.log("Baby picker passed: six themes, source order/photos/alerts, exactly one selected row, wrapping/fallbacks, original IDs/theme switching, guarded callbacks, Add-after-exit/focus, single/many profiles, responsive remeasurement and cleanup. No records or APIs touched.");
