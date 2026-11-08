// node components/ui/InfoCallout.check.js - isolated presentation and tip lifecycle; no API/storage writes.
const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path");
const { transformSync } = require("@babel/core");
const compile = file => transformSync(fs.readFileSync(path.join(__dirname, file), "utf8"), { babelrc: false, configFile: false,
    plugins: ["@babel/plugin-transform-react-jsx", "@babel/plugin-transform-modules-commonjs"] }).code;
const theme = { exports: {} };
new Function("module", "exports", compile("../../theme.js"))(theme, theme.exports);
const nodes = tree => tree && typeof tree === "object" ? [tree, ...tree.props.children.flatMap(nodes)] : [];
const text = tree => tree && typeof tree === "object" ? tree.props.children.map(text).join("") : String(tree ?? "");
const platform = { OS: "web", Version: 35 };
let palette, cursor = 0, states = [], effects = [], seenResult = false, dismissed = [];
const react = { createElement: (type, props, ...children) => ({ type, props: { ...props,
    children: children.flat(Infinity).filter(v => v != null && v !== false) } }), useId: () => ":info:",
    useState(initial) { const i = cursor++; if (!(i in states)) states[i] = initial; return [states[i], v => states[i] = v]; },
    useEffect(fn) { if (!effects.length) effects.push(fn); } };
const imports = { react: { __esModule: true, default: react, ...react },
    "react-native": { Platform: platform, View: "View", Text: "Text", Pressable: "Pressable", StyleSheet: { absoluteFill: { position: "absolute" } } },
    "@expo/vector-icons": { Ionicons: "Ionicons" },
    "react-native-svg": { __esModule: true, default: "Svg", Defs: "Defs", LinearGradient: "LinearGradient", Rect: "Rect", Stop: "Stop" },
    "../../theme": theme.exports,
    "../../context/ThemeContext": { useTheme: () => ({ colors: palette }) }, "./Gradient": { __esModule: true, default: "Gradient" },
    "../../utils/firstRun": { seen: async () => seenResult, markSeen: key => dismissed.push(key) } };
function load(file) { const m = { exports: {} }; new Function("require", "module", "exports", compile(file))(
    name => { assert(name in imports, name); return imports[name]; }, m, m.exports); return m.exports.default; }
const Inset = load("NeumorphicInsetSurface.js");
imports["./NeumorphicInsetSurface"] = { __esModule: true, default: Inset };
const RawInfo = load("InfoCallout.js");
const Info = props => { const node = RawInfo(props); assert.equal(node.type, Inset); return Inset(node.props); };
for (const set of [theme.exports.PALETTES, theme.exports.DARK_PALETTES]) for (palette of Object.values(set)) {
    const action = react.createElement("Link", { accessibilityRole: "link", onPress() {} }, "Read policy");
    let calls = 0;
    const tree = Info({ message: "Long contextual message that wraps naturally.", title: "Context", action, onDismiss: () => calls++ });
    assert(text(tree).includes("ContextLong contextual message"));
    assert(nodes(tree).includes(action), "Preserve the interactive action node and callback");
    const surface = tree.props.style[0];
    assert(surface.boxShadow.includes("inset")); assert.equal(surface.height, undefined);
    assert.equal(surface.backgroundColor, palette.infoCallout.surface);
    const layout = tree.props.style[1][0];
    assert.equal(layout.padding, palette.infoCallout.padding); assert.equal(layout.gap, palette.infoCallout.gap);
    assert.equal(layout.flexDirection, "row"); assert.equal(surface.borderRadius, palette.infoCallout.radius);
    const button = nodes(tree).find(n => n.props.accessibilityRole === "button");
    button.props.onPress(); assert.equal(calls, 1); assert.equal(button.props.style({}).width, 44);
    assert.equal(tree.props.accessible, undefined, "Do not group interactive descendants behind a single accessible parent");
    assert(!nodes(Info({ message: "Text only", icon: false })).some(n => n.type === "Gradient"));
}
palette = theme.exports.PALETTES.boy;
platform.OS = "android"; platform.Version = 28;
assert(nodes(Info({ message: "Older Android" })).some(n => n.type === "Svg"));
platform.Version = 29;
assert(!nodes(Info({ message: "Native inset shadows" })).some(n => n.type === "Svg"));
for (const set of [theme.exports.PALETTES, theme.exports.DARK_PALETTES]) for (palette of Object.values(set)) {
    const material = { surface: palette.primarySoft, radius: theme.exports.radius.pill };
    for (const version of [28, 29]) {
        platform.Version = version;
        const surface = Inset({ material, children: "Timestamp" });
        assert.equal(surface.props.style[0].backgroundColor, material.surface);
        assert.equal(surface.props.style[0].borderRadius, material.radius);
        assert.equal(surface.props.material, undefined, "Material overrides are not forwarded to native/DOM views");
        if (version === 28) {
            assert.equal(surface.props.style[0].boxShadow, undefined);
            assert.equal(nodes(surface).find(n => n.type === "Rect").props.rx, material.radius);
            assert(nodes(surface).filter(n => n.type === "Stop").some(n => n.props.stopColor === material.surface));
        } else assert.equal(surface.props.style[0].boxShadow, palette.infoCallout.insetShadow);
    }
}
platform.OS = "web";
imports["./InfoCallout"] = { __esModule: true, default: "InfoCallout" };
const Tip = load("TipStrip.js");
async function main() {
    const render = () => { cursor = 0; return Tip({ tipKey: "growth", children: "Existing tip copy" }); };
    assert.equal(render(), null); effects[0](); await new Promise(setImmediate);
    let tip = render(); assert.equal(tip.props.message, "Existing tip copy"); tip.props.onDismiss();
    assert.equal(render(), null); assert.deepEqual(dismissed, ["growth"]);
    states = []; effects = []; seenResult = true;
    assert.equal(render(), null); effects[0](); await new Promise(setImmediate); assert.equal(render(), null);
    console.log("InfoCallout passed: six palettes, recessed/fallback surfaces, natural height, optional content, action accessibility and persistent tip dismissal.");
}
main().catch(e => { console.error(e); process.exitCode = 1; });
