// Run: node components/ui/DatabaseLoadingOverlay.check.js. No requests or stored records.
const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path");
const { transformSync } = require("@babel/core");
const root = path.resolve(__dirname, "../..");
const compile = source => transformSync(source, { babelrc: false, configFile: false,
    plugins: [require.resolve("@babel/plugin-transform-react-jsx"), require.resolve("@babel/plugin-transform-modules-commonjs")] }).code;
const theme = { exports: {} };
new Function("module", "exports", compile(fs.readFileSync(path.join(root, "theme.js"), "utf8")))(theme, theme.exports);
const source = fs.readFileSync(path.join(__dirname, "DatabaseLoadingOverlay.js"), "utf8");
const nodes = node => node && typeof node === "object" ? [node, ...(node.props?.children || []).flatMap(nodes)] : [];
const find = (tree, testID) => nodes(tree).find(node => node.props?.testID === testID);
let nextId = 0;
function harness(platform = "web", palette = theme.exports.PALETTES.boy, initialReduced = false) {
    const slots = [], pending = [], loops = [], frames = new Map(), actions = [];
    let cursor = 0, listener, frameId = 0;
    const React = { createElement: (type, props, ...children) => ({ type, props: { ...props,
        children: children.flat(Infinity).filter(value => value != null && value !== false) } }),
        useRef(initial) { return slots[cursor++] ||= { current: initial }; },
        useId() { return slots[cursor++] ||= `:loader${++nextId}:`; },
        useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = initial;
            return [slots[i], value => { slots[i] = value; }]; },
        useEffect(fn, deps) { const i = cursor++, old = slots[i];
            if (!old || deps.some((value, n) => value !== old.deps[n])) pending.push(() => {
                old?.cleanup?.(); slots[i] = { deps, cleanup: fn() };
            }); } };
    class Value {
        constructor(value) { this.value = value; }
        setValue(value) { this.value = value; }
        interpolate(config) { return { source: this, ...config }; }
    }
    const native = { View: "View", Animated: { View: "AnimatedView", Value,
        timing: (value, config) => ({ value, config }),
        loop(timing) { const loop = { ...timing, starts: 0, stops: 0,
            start() { this.starts++; }, stop() { this.stops++; } }; loops.push(loop); return loop; } },
        Easing: { linear: "linear" }, Keyboard: { dismiss: () => actions.push("dismiss") },
        Platform: { OS: platform }, StyleSheet: { absoluteFill: { position: "absolute", inset: 0 } },
        findNodeHandle: () => 17,
        AccessibilityInfo: { isReduceMotionEnabled: async () => initialReduced,
            addEventListener(name, callback) { assert.equal(name, "reduceMotionChanged"); listener = callback; return { remove: () => actions.push("unsubscribe") }; },
            setAccessibilityFocus: value => actions.push(value), announceForAccessibility: label => actions.push(label) } };
    const svg = Object.fromEntries(["Circle", "Defs", "FeGaussianBlur", "Filter", "LinearGradient", "Stop"].map(name => [name, name]));
    const imports = { react: { __esModule: true, default: React, ...React }, "react-native": native,
        "react-native-svg": { __esModule: true, default: "Svg", ...svg }, "../../theme": theme.exports,
        "../../context/ThemeContext": { useTheme: () => ({ colors: palette }) },
        "../../context/LanguageContext": { useLanguage: () => ({ t: () => "Database activity" }) },
        "../../utils/api": { getApiActivitySnapshot: () => false } };
    const module = { exports: {} }, previous = { isConnected: true, focus: () => actions.push("restore") };
    const previousFocus = { current: previous };
    new Function("require", "module", "exports", "requestAnimationFrame", "cancelAnimationFrame", "document", compile(source))(
        name => { assert(name in imports, name); return imports[name]; }, module, module.exports,
        fn => { frames.set(++frameId, fn); return frameId; }, id => frames.delete(id), { activeElement: previous });
    return { loops, actions, reduce: value => listener(value),
        draw() { cursor = 0; const tree = module.exports.default({ previousFocus });
            tree.props.ref.current = { focus: () => actions.push("focus") };
            while (pending.length) pending.shift()(); return tree; },
        flushFrames() { const work = [...frames.values()]; frames.clear(); work.forEach(fn => fn()); },
        unmount() { slots.forEach(slot => slot?.cleanup?.()); } };
}

async function check() {
    for (const platform of ["web", "ios", "android"]) {
        const h = harness(platform);
        let tree = h.draw(); assert.equal(h.loops.length, 0, "Start safely static while reduced-motion preference resolves");
        await Promise.resolve(); tree = h.draw(); h.flushFrames();
        assert.equal(h.loops.length, 2); assert(h.loops.every(loop => loop.starts === 1));
        assert.deepEqual(h.loops.map(loop => loop.config), [1200, 1000].map(duration => ({ toValue: 1, duration,
            easing: "linear", useNativeDriver: platform !== "web", isInteraction: false })));
        for (const [name, radius, angle, end] of [["outer", 43, 135, "360deg"], ["inner", 28, -45, "-360deg"]]) {
            const motion = find(tree, `database-loader-${name}-motion`), arc = find(tree, `database-loader-${name}-arc`);
            const rotation = motion.props.style[1].transform[0].rotate;
            assert.deepEqual(rotation.inputRange, [0, 1]); assert.deepEqual(rotation.outputRange, ["0deg", end]);
            rotation.source.setValue(.25); assert.equal(rotation.source.value, .25);
            assert.equal(arc.props.r, radius); assert(Math.abs(arc.props.strokeWidth - 8.97) < 1e-10);
            assert.equal(arc.props.strokeLinecap, "round"); assert.equal(arc.props.cx, 48); assert.equal(arc.props.cy, 48);
            assert.equal(arc.props.strokeDasharray, `${radius * Math.PI * 1.5} ${radius * Math.PI * .5}`);
            assert.equal(arc.props.strokeDashoffset, -radius * Math.PI * angle / 180);
            const svg = motion.props.children[0];
            assert(Math.abs(svg.props.width / 104 - 112 / 96) < 1e-10);
            assert(Math.abs(svg.props.style.left + (48 + 4) * svg.props.width / 104 - 56) < 1e-10, "Padded art stays centered at 56dp");
        }
        assert.equal(nodes(tree).filter(node => node.type === "AnimatedView").length, 2);
        assert.equal(nodes(tree).filter(node => node.props?.testID?.endsWith("-arc")).length, 2);
        assert(h.actions.includes("dismiss")); assert(h.actions.includes("Database activity"));
        assert(h.actions.includes(platform === "web" ? "focus" : 17));
        h.reduce(true); tree = h.draw(); assert(h.loops.every(loop => loop.stops === 1));
        for (const name of ["outer", "inner"]) assert.equal(find(tree, `database-loader-${name}-motion`).props.style[1].transform[0].rotate.source.value, 0);
        h.reduce(false); tree = h.draw(); assert.equal(h.loops.length, 4);
        h.unmount(); assert(h.loops.every(loop => loop.stops === 1)); h.flushFrames();
        assert(h.actions.includes("unsubscribe"));
        if (platform === "web") assert(h.actions.includes("restore"));
    }
    for (const palette of [...Object.values(theme.exports.PALETTES), ...Object.values(theme.exports.DARK_PALETTES)]) {
        const h = harness("web", palette, true), tree = h.draw(); await Promise.resolve(); h.draw();
        assert.equal(h.loops.length, 0);
        assert.equal(tree.props.style[1].backgroundColor, "rgba(45,65,90,0.08976)");
        assert.equal(tree.props.children[0].props.style.width, 112);
        assert.equal(tree.props.children[0].props.style.height, 112);
        for (const [name, color] of [["outer", "blue"], ["inner", "pink"]]) {
            const arc = find(tree, `database-loader-${name}-arc`);
            assert.equal(arc.props.stroke, theme.exports.databaseLoaderColors[color].primary);
        }
        assert(nodes(tree).filter(node => node.type === "Circle").every(node => !node.props.stroke.startsWith("url(")), "All painted strokes are solid colors");
        assert.equal(nodes(tree).filter(node => node.type === "Circle").length, 6, "Only shadow, primary and subtle reflection per arc");
        assert(43 - 28 - 8.97 > 0, "Thicker strokes remain separated");
        let prevented = 0, stopped = 0;
        const event = { preventDefault: () => prevented++, stopPropagation: () => stopped++ };
        tree.props.onWheel(event); tree.props.onKeyDown(event);
        assert.equal(prevented, 2); assert.equal(stopped, 2);
        tree.props.onKeyDown({ ...event, ctrlKey: true }); assert.equal(prevented, 2);
        assert.equal(tree.props.onStartShouldSetResponder(), true);
        h.unmount();
    }
    const a = harness().draw(), b = harness().draw();
    assert.notEqual(nodes(a).find(node => node.type === "Filter").props.id, nodes(b).find(node => node.type === "Filter").props.id);
    assert(!/LinearGradient|RadialGradient/.test(source), "Loader contains no gradient fills, including reflections");
    assert.equal(theme.exports.databaseLoaderColors.blue.primary, "#5AA9F8");
    assert.equal(theme.exports.databaseLoaderColors.pink.primary, "#F47FB7");
    console.log("Pastel loader passed: 15% thicker solid arcs, light backdrop, original timing/directions/pose, two layers, centering, reduced motion, cleanup, focus and blocking.");
}
check().catch(error => { console.error(error); process.exitCode = 1; });
