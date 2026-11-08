// Run: node components/Onboarding.check.js. Uses no account, API, or saved preferences.
const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path");
const { transformSync } = require("@babel/core");
const root = path.resolve(__dirname, "..");
const compile = source => transformSync(source, { babelrc: false, configFile: false,
    plugins: [require.resolve("@babel/plugin-transform-react-jsx"), require.resolve("@babel/plugin-transform-modules-commonjs")] }).code;
const theme = { exports: {} };
new Function("module", "exports", compile(fs.readFileSync(path.join(root, "theme.js"), "utf8")))(theme, theme.exports);
let size = { width: 390, height: 844, fontScale: 1 }, reduced = false, platform = "web";
const flatten = value => Array.isArray(value) ? Object.assign({}, ...value.map(flatten)) : value || {};
function harness() {
    const slots = [], animations = []; let cursor = 0, pending = [];
    const changed = (a, b) => !a || b.some((value, i) => value !== a[i]);
    const React = { createElement: (type, props, ...children) => ({ type, props: { ...props, children: children.flat(Infinity).filter(c => c != null && c !== false) } }),
        Fragment: "Fragment",
        useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], value => { slots[i] = value; }]; },
        useRef(initial) { return slots[cursor++] ||= { current: initial }; },
        useMemo(fn, deps) { const i = cursor++; if (changed(slots[i]?.deps, deps)) slots[i] = { deps, value: fn() }; return slots[i].value; },
        useEffect(fn, deps) { const i = cursor++; if (changed(slots[i]?.deps, deps)) pending.push(() => { slots[i]?.cleanup?.(); slots[i] = { deps, cleanup: fn() }; }); },
    };
    React.useCallback = (fn, deps) => React.useMemo(() => fn, deps);
    class Value {
        constructor(value) { this.value = value; }
        setValue(value) { this.value = value; }
        stopAnimation() {}
        interpolate(config) { return { source: this, ...config }; }
    }
    const native = { View: "View", Text: "Text", Image: "Image", Pressable: "Button", ScrollView: "Scroll",
        StyleSheet: { create: x => x, absoluteFill: { position: "absolute", inset: 0 } },
        Platform: { get OS() { return platform; } }, useWindowDimensions: () => size,
        Easing: { bezier: (...args) => args }, PanResponder: { create: handlers => ({ panHandlers: handlers }) },
        Animated: { View: "AnimatedView", Value, timing(value, config) { const from = value.value;
            const animation = { config, start() {}, stop() { this.stopped = true; }, advance(f) { value.setValue(from + (config.toValue - from) * f); } };
            animations.push(animation); return animation; } } };
    const cache = new Map();
    function load(file) {
        file = file.replaceAll("\\", "/");
        if (cache.has(file)) return cache.get(file).exports;
        const module = { exports: {} }; cache.set(file, module);
        new Function("require", "module", "exports", compile(fs.readFileSync(path.join(root, file), "utf8")))(name => {
            if (name === "react") return { __esModule: true, default: React, ...React };
            if (name === "react-native") return native;
            if (name === "expo-blur") return { BlurView: "Blur", BlurTargetView: "BlurTarget" };
            if (name === "@expo/vector-icons") return { Ionicons: "Icon" };
            if (name === "react-native-safe-area-context") return { useSafeAreaInsets: () => ({ top: 24, bottom: 20 }) };
            if (name.endsWith("/theme")) return theme.exports;
            if (name.endsWith("useReducedMotion")) return { __esModule: true, default: () => reduced };
            if (name.endsWith("useSoftPress")) return { __esModule: true, default: () => ({ respond() {}, transform: [] }) };
            if (name.endsWith("Gradient")) return { __esModule: true, default: "Gradient" };
            if (name.endsWith(".png")) return name;
            return load(path.relative(root, path.resolve(root, path.dirname(file), name + ".js")));
        }, module, module.exports);
        return module.exports;
    }
    return { load, animations, draw(fn) { cursor = 0; pending = []; const tree = fn(); pending.forEach(fn => fn()); return tree; },
        unmount() { slots.forEach(slot => slot?.cleanup?.()); } };
}
const nodes = n => n && typeof n === "object" ? [n, ...(n.props.children || []).flatMap(nodes)] : [];
const find = (tree, predicate) => nodes(tree).find(predicate);
const button = (tree, label) => find(tree, n => (n.type === "Button" || n.type?.name === "AuthBackButton") && n.props.accessibilityLabel === label);
const slide = (tree, i) => find(tree, n => n.props.testID === "onboarding-slide-" + (i + 1));
const h = harness(), moduleApi = h.load("components/Onboarding.js"), controls = h.load("components/onboarding/OnboardingControls.js");
let registered = 0, loggedIn = 0;
const draw = () => h.draw(() => moduleApi.default({ onGetStarted: () => registered++, onLogin: () => loggedIn++ }));
let tree = draw();
const dots = () => find(tree, n => n.type === controls.OnboardingProgressIndicator);
const action = label => find(tree, n => n.type === controls.OnboardingButton && n.props.label === label);
assert.equal(moduleApi.ONBOARDING_CARDS.length, 3);
assert.equal(moduleApi.ONBOARDING_CARDS[0].body, "Track feedings, growth, vaccines, checkups, and milestones—all in one BabyBook+.");
assert.equal(button(tree, "Back"), undefined);
assert(button(tree, "Skip introduction and create an account"));
assert.equal(slide(tree, 1).props["aria-hidden"], true);
action("Next, slide 2 of 3").props.onPress(); tree = draw();
assert.equal(dots().props.index, 1); assert(button(tree, "Back"));
h.animations.at(-1).advance(.5); assert(h.animations.at(-1).config.duration > 0);
action("Next, slide 3 of 3").props.onPress(); assert(h.animations.at(-2).stopped); tree = draw();
assert.equal(dots().props.index, 2);
assert.equal(button(tree, "Skip introduction and create an account"), undefined);
button(tree, "Back").props.onPress(); tree = draw(); assert.equal(dots().props.index, 1);
button(tree, "Back").props.onPress(); tree = draw(); assert.equal(dots().props.index, 0);
dots().props.onSelect(99); tree = draw(); assert.equal(dots().props.index, 2);
action("Create My BabyBook").props.onPress(); action("Create My BabyBook").props.onPress();
assert.equal(registered, 1); assert.equal(loggedIn, 0);
h.unmount(); assert(h.animations.at(-1).stopped);
for (const destination of ["Sign In", "Skip"]) {
    const fixture = harness(), Screen = fixture.load("components/Onboarding.js").default, Controls = fixture.load("components/onboarding/OnboardingControls.js");
    let count = 0;
    const render = () => fixture.draw(() => Screen({ onGetStarted: () => count++, onLogin: () => count++ }));
    let view = render();
    if (destination === "Sign In") {
        find(view, n => n.type === Controls.OnboardingProgressIndicator).props.onSelect(2); view = render();
        const signIn = find(view, n => n.type === Controls.OnboardingButton && n.props.label === "Sign In");
        signIn.props.onPress(); signIn.props.onPress();
    } else { button(view, "Skip introduction and create an account").props.onPress(); button(view, "Skip introduction and create an account").props.onPress(); }
    assert.equal(count, 1); fixture.unmount();
}
const responsive = harness(), Screen = responsive.load("components/Onboarding.js").default, Controls = responsive.load("components/onboarding/OnboardingControls.js");
const render = () => responsive.draw(() => Screen({ onGetStarted() {}, onLogin() {} }));
tree = render(); const responder = find(tree, n => n.props.testID === "onboarding-carousel").props;
find(tree, n => n.type === Controls.OnboardingProgressIndicator).props.onSelect(1); tree = render();
size = { width: 320, height: 568, fontScale: 2 }; tree = render();
assert.equal(flatten(slide(tree, 0).props.style).width, 320);
responder.onPanResponderMove(null, { dx: 80 });
const moving = flatten(slide(tree, 0).props.style).opacity.source;
assert.equal(moving.value, .75, "The original responder reads the resized width");
responder.onPanResponderRelease(null, { dx: -100, vx: -.5 }); tree = render();
assert.equal(find(tree, n => n.type === Controls.OnboardingProgressIndicator).props.index, 2);
reduced = true; tree = render(); const before = responsive.animations.length;
button(tree, "Back").props.onPress(); tree = render();
assert.equal(responsive.animations.length, before, "Reduced motion settles without starting an animation");
const progress = controls.OnboardingProgressIndicator({ index: 1, onSelect() {} });
assert.equal(nodes(progress).filter(n => n.type === "Button").length, 3);
assert.equal(flatten(progress.props.style).backgroundColor, undefined);
const dot = find(progress, n => n.type === "Gradient"); assert.equal(flatten(dot.props.style).width, 9);
for (platform of ["web", "android", "ios"]) {
    const glass = controls.OnboardingButton({ label: "Sign In", glass: true, blurTarget: {}, onPress() {} });
    assert.equal(Boolean(find(glass, n => n.type === "Blur")), platform !== "web");
    const next = controls.OnboardingButton({ label: "Next", circular: true, onPress() {} });
    const visual = button(next, "Next").props.style({ pressed: false });
    assert.equal(flatten(visual).width, 60); assert.equal(flatten(visual).paddingHorizontal, 0); assert.equal(flatten(visual).paddingVertical, 0); assert.equal(flatten(visual).borderWidth, undefined);
}
const arts = h.load("components/onboarding/OnboardingArt.js");
for (const Art of Object.values(arts)) if (typeof Art === "function") {
    const image = Art({ width: 272, height: 180 }), style = image.props.style;
    assert(style.width / style.aspectRatio <= 180.001, "Short-screen art stays within its slot");
    assert.equal(style.height, style.width / style.aspectRatio, "Web images need an explicit fitted height");
}
const app = fs.readFileSync(path.join(root, "App.js"), "utf8");
const revisit = harness(), Revisited = revisit.load("components/Onboarding.js").default;
let finale = revisit.draw(() => Revisited({ initialIndex: 2, onGetStarted() {}, onLogin() {} }));
assert.equal(flatten(slide(finale, 2).props.style).opacity.source.value, 2, "Returning from Login opens the final slide immediately");
assert(app.includes('initialIndex={authIntroVisible ? 2 : 0}'));
assert(app.includes('onBack={() => setAuthIntroVisible(true)}'));
assert(app.includes('markSeen("onboarding")')); assert(app.includes('setAuthScene("register")')); assert(app.includes('setAuthScene("login")'));
assert(!fs.readFileSync(path.join(root, "components/Onboarding.js"), "utf8").includes("ProgressRing"));
console.log("Onboarding checks passed: copy, Back/Next/dots/swipes, resizing, interrupted and reduced motion, duplicate completion, hidden slides, standalone controls, blur fallback and existing auth gates.");
Promise.all(["onboarding-book-collage.png", "onboarding-qr-hand.png", "onboarding-care-circle.png"].map(async name => {
    const Jimp = require("jimp-compact"), image = await Jimp.read(path.join(root, "assets", name));
    const { width, height, data } = image.bitmap;
    assert(width >= 1000 && height >= 1000, "Production art retains source resolution");
    for (const [x, y] of [[0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1]]) {
        assert.equal(Jimp.intToRGBA(image.getPixelColor(x, y)).a, 0, name + " has transparent corners");
    }
    let visible = 0, transparent = 0;
    for (let i = 3; i < data.length; i += 4) { if (data[i] >= 240) visible++; if (!data[i]) transparent++; }
    assert(visible > width * height * .1 && transparent > width * height * .1, "Real artwork and alpha must coexist");
})).then(() => console.log("Onboarding artwork checks passed: all three high-resolution RGBA assets have genuine transparency."))
    .catch(error => { console.error(error); process.exitCode = 1; });
