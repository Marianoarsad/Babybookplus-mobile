// Run: node components/ui/EntriesButton.check.js. No records, server or device required.
const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path");
const { transformSync } = require("@babel/core"), { parse } = require("@babel/parser");
const root = path.resolve(__dirname, "../.."), read = file => fs.readFileSync(path.join(root, file), "utf8");
const compile = source => transformSync(source, { babelrc: false, configFile: false,
    plugins: ["@babel/plugin-transform-react-jsx", "@babel/plugin-transform-modules-commonjs"] }).code;
const themeModule = { exports: {} };
new Function("module", "exports", compile(read("theme.js")))(themeModule, themeModule.exports);
const theme = themeModule.exports;
let slots = [], cursor = 0, effects = [], reduced = false, colors = theme.PALETTES.boy;
const animations = [], presses = [];
const react = { createElement: (type, props, ...children) => ({ type, props: { ...props, children: children.flat(Infinity) } }),
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = initial;
        return [slots[i], next => slots[i] = typeof next === "function" ? next(slots[i]) : next]; },
    useRef(initial) { const i = cursor++; return slots[i] ||= { current: initial }; },
    useEffect(fn, deps) { const i = cursor++, old = slots[i]; if (!old || deps.some((value, n) => value !== old.deps[n])) effects.push(() => {
        old?.cleanup?.(); slots[i] = { deps, cleanup: fn() }; }); } };
class Value {
    constructor(value) { this.value = value; }
    setValue(value) { this.value = value; }
    stopAnimation() {}
    interpolate(config) { return { value: this, ...config }; }
}
const imports = { react: { __esModule: true, default: react, ...react },
    "react-native": { Pressable: "Pressable", Text: "Text", Platform: { OS: "web" }, Easing: { bezier: (...v) => v },
        StyleSheet: { create: x => x, absoluteFill: { position: "absolute", inset: 0 } },
        Animated: { Value, View: "AnimatedView", timing(value, options) { const animation = { value, ...options, start() { animations.push(this); }, stop() { this.stopped = true; } }; return animation; } } },
    "@expo/vector-icons": { Ionicons: "Icon" }, "../../theme": theme,
    "../../context/ThemeContext": { useTheme: () => ({ colors }) }, "./Gradient": { __esModule: true, default: "Gradient" },
    "./useReducedMotion": { __esModule: true, default: () => reduced },
    "./useSoftPress": { __esModule: true, default: () => ({ respond: value => presses.push(value), transform: [] }) } };
const load = file => { const module = { exports: {} }; new Function("require", "module", "exports", compile(read(file)))(name => {
    assert(name in imports, name); return imports[name]; }, module, module.exports); return module.exports.default; };
const Button = load("components/ui/EntriesButton.js"); imports["./EntriesButton"] = { __esModule: true, default: Button };
const More = load("components/ui/ShowMore.js");
const nodes = tree => tree && typeof tree === "object" ? [tree, ...(tree.props.children || []).flatMap(nodes)] : [];
const style = node => Object.assign({}, ...[node.props.style].flat(Infinity).filter(Boolean));
const draw = (props = {}) => { cursor = 0; const tree = Button({ label: "Show entries", ...props }); effects.splice(0).forEach(fn => fn()); return tree; };
const reset = () => { slots.forEach(slot => slot?.cleanup?.()); slots = []; effects = []; animations.length = 0; };
for (const palettes of [theme.PALETTES, theme.DARK_PALETTES]) for (const palette of Object.values(palettes)) {
    colors = palette; reset(); let calls = 0;
    let tree = draw({ onPress: () => calls++ }); assert.equal(animations.length, 0, "Pagination has no disclosure animation");
    assert.equal(style(tree).minHeight, 48); assert.equal(style(tree).borderRadius, 24);
    const glyph = nodes(tree).find(n => n.type === "Icon"); assert.equal(glyph.props.size, 22); assert.equal(glyph.props.color, colors.feedingBreakdown.azure);
    assert.equal(nodes(tree).find(n => n.type === "Gradient").props.colors, colors.feedingBreakdown.control);
    tree.props.onPress(); assert.equal(calls, 1);
    tree.props.onPressIn(); tree = draw(); assert.equal(style(nodes(tree).find(n => n.type === "AnimatedView")).boxShadow, colors.feedingBreakdown.pressedShadow);
    tree.props.onBlur(); tree = draw(); assert.equal(style(nodes(tree).find(n => n.type === "AnimatedView")).boxShadow, colors.feedingBreakdown.itemShadow);
    tree.props.onFocus({ currentTarget: { matches: () => true } }); tree = draw(); assert.equal(style(tree).outlineStyle, "solid");
}
reset(); reduced = false;
draw({ expanded: false, "aria-controls": "entries" }); let tree = draw({ expanded: true, label: "Hide entries", "aria-controls": "entries" });
const opening = animations.at(-1); assert.equal(opening.duration, 260); assert.equal(opening.toValue, 1);
opening.value.setValue(0.5); tree = draw({ expanded: true }); assert.equal(opening.value.value, 0.5, "Rerender preserves intermediate rotation");
assert.equal(tree.props["aria-expanded"], true); assert.equal(tree.props.accessibilityState.expanded, true);
draw({ expanded: false }); assert(opening.stopped, "Interrupted rotation is cancelled"); assert.equal(animations.at(-1).toValue, 0);
reduced = true; tree = draw({ expanded: true }); assert.equal(opening.value.value, 1); assert(animations.at(-1).stopped);
tree = draw({ disabled: true }); assert.equal(tree.props.disabled, true); assert.equal(tree.props.accessibilityState.disabled, true);
reset(); assert(presses.includes(true) && presses.includes(false));
for (const total of [0, 10, 11, 24]) {
    let visible = 10;
    while (true) {
        const more = More({ total, visible, onPress: () => visible += 10, noun: "records" });
        if (total <= visible) { assert.equal(more, null); break; }
        assert.equal(more.type, Button); assert.equal(more.props.label, `Show more (${total - visible} remaining)`); more.props.onPress();
    }
}
// Prevent a custom Show more button from silently reintroducing another design.
let definitions = 0;
function inspect(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const file = path.join(directory, entry.name);
        if (entry.isDirectory()) { inspect(file); continue; }
        if (!entry.name.endsWith(".js") || entry.name.endsWith(".check.js")) continue;
        const ast = parse(fs.readFileSync(file, "utf8"), { sourceType: "module", plugins: ["jsx"] });
        const walk = node => {
            if (!node || typeof node !== "object") return;
            if (node.type === "JSXOpeningElement") {
                const more = ["accessibilityLabel", "label"].some(name => {
                    const label = node.attributes.find(a => a.name?.name === name)?.value;
                    const value = label?.type === "StringLiteral" ? label.value : label?.expression?.quasis?.[0]?.value.raw;
                    return value?.startsWith("Show more");
                });
                if (more) { definitions++; assert.equal(node.name.name, "EntriesButton", file); }
            }
            Object.values(node).forEach(value => { if (Array.isArray(value)) value.forEach(walk); else if (value && typeof value === "object") walk(value); });
        }; walk(ast);
    }
}
inspect(path.join(root, "components")); assert.equal(definitions, 13);
console.log("Entries buttons passed: shared app-wide rendering, six themes, exact callbacks/counts, exhaustion, press/focus, disclosure interruption, reduced motion and accessibility.");
