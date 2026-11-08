// Run: node components/ui/AnchoredMenu.check.js — real menu lifecycle, no server or record writes.
const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path");
const { transformSync } = require("@babel/core");
const compile = source => transformSync(source, { babelrc: false, configFile: false,
    plugins: ["@babel/plugin-transform-modules-commonjs", "@babel/plugin-transform-react-jsx"] }).code;
const themeModule = { exports: {} };
new Function("module", "exports", compile(fs.readFileSync(path.join(__dirname, "../../theme.js"), "utf8")))(themeModule, themeModule.exports);
const theme = themeModule.exports;
const nodes = node => node && typeof node === "object" ? [node, ...node.props.children.flatMap(nodes)] : [];
const flatten = styles => Object.assign({}, ...[styles].flat(Infinity).filter(Boolean));
function harness(platform = "web", palette = theme.PALETTES.boy) {
    const slots = [], effects = [], animations = [], scrolls = [];
    let cursor = 0, reduced = false, dimensions = { width: 390, height: 844 }, insets = { top: 0, bottom: 0, left: 0, right: 0 }, sdk = 35, webBlur = false;
    const react = {
        Fragment: "Fragment", createElement: (type, props, ...children) => ({ type, props: { ...props, children: children.flat(Infinity).filter(v => v != null && v !== false) } }),
        useMemo: fn => fn(), useRef: initial => { const i = cursor++; return slots[i] ||= { current: initial }; },
        useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = initial;
            return [slots[i], value => slots[i] = typeof value === "function" ? value(slots[i]) : value]; },
        useEffect(fn, deps) { const i = cursor++, previous = slots[i];
            if (!previous || deps.some((v, n) => v !== previous.deps[n])) effects.push(() => {
                previous?.cleanup?.(); slots[i] = { deps, cleanup: fn() };
            }); },
    };
    class Value {
        constructor(value) { this.value = value; }
        setValue(value) { this.value = value; }
        stopAnimation() { if (this.running) { this.running.stopped = true; this.running.complete?.({ finished: false }); this.running = null; } }
        interpolate(config) { return { source: this, ...config }; }
    }
    const native = { View: "View", Text: "Text", ScrollView: "ScrollView", Pressable: "Pressable", TouchableOpacity: "TouchableOpacity",
        Platform: { OS: platform, get Version() { return sdk; } }, StyleSheet: { create: v => v, flatten, hairlineWidth: 1, absoluteFill: {}, absoluteFill: {} },
        useWindowDimensions: () => dimensions, Easing: { bezier: (...v) => v },
        Animated: { ScrollView: "AnimatedScrollView", View: "AnimatedView", Value, timing(value, config) {
            const entry = { ...config, value, stopped: false, finish() { if (!this.stopped) { value.setValue(this.toValue); this.complete?.({ finished: true }); } } };
            return { start(complete) { entry.complete = complete; animations.push(entry); value.running = entry; } };
        } },
    };
    const imports = { "../../context/GlassTargetContext": {useGlassTarget:()=>null}, "../../utils/confirmationPosition.cjs": require("../../utils/confirmationPosition.cjs"), react: { __esModule: true, default: react, ...react }, "react-native": native,
        "expo-blur": { BlurView: "BlurView" }, "react-native-svg": { __esModule: true, default: "Svg", Path: "Path" },
        "react-native-safe-area-context": { useSafeAreaInsets: () => insets },
        "@expo/vector-icons": { Ionicons: "Icon" }, "../../theme": theme,
        "../../context/ThemeContext": { useTheme: () => ({ colors: palette, scheme: Object.values(theme.DARK_PALETTES).includes(palette) ? "dark" : "light" }) },
        "./AppModal": { __esModule: true, default: "Modal" }, "./Gradient": { __esModule: true, default: "Gradient" },
        "./GlassLighting": { __esModule: true, default: "GlassLighting" },
        "./useReducedMotion": { __esModule: true, default: () => reduced },
    };
    const module = { exports: {} };
    new Function("require", "module", "exports", "globalThis", compile(fs.readFileSync(path.join(__dirname, "AnchoredMenu.js"), "utf8")))(
        name => { assert(name in imports, name); return imports[name]; }, module, module.exports, { CSS: { supports: () => webBlur } });
    const options = { exports: {} };
    new Function("require", "module", "exports", compile(fs.readFileSync(path.join(__dirname, "OptionSheet.js"), "utf8")))(
        name => name === "./AnchoredMenu" ? module.exports : imports[name], options, options.exports);
    let props = { visible: true, variant: "select", anchor: { x: 24, y: 180, width: 300, height: 52 },
        initialScrollOffset: 132, onClose() {}, children: "Options" };
    function draw(changes) {
        props = { ...props, ...changes }; cursor = 0;
        const tree = module.exports.default(props);
        const scroll = nodes(tree).find(n => n.type === "AnimatedScrollView");
        if (scroll) scroll.props.ref.current = { scrollTo: value => scrolls.push(value) };
        while (effects.length) effects.shift()();
        return tree;
    }
    const panel = tree => nodes(tree).find(n => n.type === "AnimatedView" && n.props.accessibilityViewIsModal);
    const content = tree => nodes(tree).find(n => n.type === "AnimatedScrollView");
    return { draw, panel, content, animations, scrolls,
        drawItem(props) { cursor = 0; return module.exports.AnchoredMenuItem(props); },
        drawOptions: props => draw(options.exports.default(props).props),
        motion: value => reduced = value,
        resize: value => dimensions = value,
        safeArea: value => insets = value, sdk: value => sdk = value, webBlur: value => webBlur = value };
}

for (const platform of ["web", "ios", "android"]) {
    const auth = harness(platform);
    auth.resize({ width: 320, height: 568 });
    let authTree = auth.draw({ flipWhenNeeded: true, surfaceStyle: { backgroundColor: theme.authMaterial.controlBase },
        dimBackdrop: false, anchor: { x: 20, y: 450, width: 280, height: 52 } });
    auth.content(authTree).props.onContentSizeChange(280, 220); authTree = auth.draw();
    const authPanel = flatten(auth.panel(authTree).props.style);
    assert(authPanel.top < 450 && authPanel.top >= 0, "A short-screen role menu opens above its trigger");
    assert(authPanel.top + authPanel.height.outputRange[1] <= 568);
    assert.equal(authPanel.backgroundColor, theme.authMaterial.controlBase);
    authTree = auth.draw({ anchor: { x: 20, y: 100, width: 280, height: 52 } });
    assert(flatten(auth.panel(authTree).props.style).top > 100, "The role menu opens below when there is room");
    const h = harness(platform);
    let tree = h.draw();
    assert.equal(h.panel(tree).props.onLayout, undefined, "Fold targets must not be measured from the animated outer viewport");
    assert.equal(typeof h.content(tree).props.onContentSizeChange, "function");
    h.content(tree).props.onContentSizeChange(298, 114);
    tree = h.draw();
    assert.deepEqual(flatten(h.panel(tree).props.style).height.outputRange, [0, 116], "Include the panel border");
    assert.equal(h.animations.at(-1).duration, 220);
    assert.equal(h.animations.at(-1).useNativeDriver, false);
    assert.equal(h.scrolls.at(-1).y, 132);
    for (const intermediate of [0, 2, 25, 78]) {
        h.animations.at(-1).value.setValue(intermediate / 116);
        h.panel(tree).props.onLayout?.({ nativeEvent: { layout: { height: intermediate } } });
        tree = h.draw();
        assert.equal(flatten(h.panel(tree).props.style).height.outputRange[1], 116, "Intermediate frames cannot shrink the target");
    }
    h.animations.at(-1).finish();
    assert.equal(flatten(h.panel(h.draw()).props.style).opacity.value, 1);

    let selected;
    const options = harness(platform);
    let optionTree = options.drawOptions({ visible: true, anchor: { x: 20, y: 170, width: 300, height: 58 }, title: "Choose an age",
        selectedKey: 9, options: [{ key: 9, label: "9 months", note: "Your baby" }, { key: 12, label: "12 months" }],
        onSelect: value => selected = value, onClose() {} });
    options.content(optionTree).props.onContentSizeChange(298, 160); optionTree = options.draw();
    assert.equal(flatten(options.panel(optionTree).props.style).height.outputRange[1], 218);
    const choices = nodes(optionTree).filter(n => n.props.label === "9 months" || n.props.label === "12 months");
    assert.equal(choices[0].props.selected, true);
    assert.equal(choices[0].props.accessibilityLabel, "9 months, Your baby");
    choices[1].props.onPress();
    assert.equal(selected, 12, "OptionSheet preserves the numeric age key");
    h.content(tree).props.onContentSizeChange(298, 0);
    tree = h.draw();
    assert.equal(flatten(h.panel(tree).props.style).height.outputRange[1], 116, "Ignore transient zero content measurements");
    h.content(tree).props.onContentSizeChange(298, 900);
    tree = h.draw();
    const capped = flatten(h.panel(tree).props.style);
    assert.equal(capped.height.outputRange[1], capped.maxHeight, "Long lists scroll within the existing viewport cap");
    h.resize({ width: 320, height: 640 }); tree = h.draw();
    const compact = flatten(h.panel(tree).props.style);
    assert.equal(compact.height.outputRange[1], compact.maxHeight);
    assert(compact.height.outputRange[1] < capped.height.outputRange[1]);
    h.content(tree).props.onContentSizeChange(298, 153);
    tree = h.draw();
    assert.equal(flatten(h.panel(tree).props.style).height.outputRange[1], 155, "Wrapped/changed content replaces the natural measurement");
    tree = h.draw({ visible: false });
    const exit = h.animations.at(-1);
    tree = h.draw({ visible: true }); tree = h.draw();
    assert(exit.stopped, "Reopening cancels the old close animation");
    assert.equal(flatten(h.panel(tree).props.style).height.outputRange[1], 155, "Reopen without a content event cannot deadlock at zero");
    h.animations.at(-1).finish();
    tree = h.draw({ visible: false }); h.animations.at(-1).finish();
    assert.equal(h.draw(), null, "Completed close releases the modal");
    tree = h.draw({ visible: true }); tree = h.draw();
    h.content(tree).props.onContentSizeChange(298, 76); tree = h.draw();
    assert.equal(flatten(h.panel(tree).props.style).height.outputRange[1], 78);
    h.motion(true); tree = h.draw();
    assert.equal(h.animations.at(-1).duration, 0, "Reduced motion has no tween");
    h.animations.at(-1).finish();
    assert.equal(flatten(h.panel(h.draw()).props.style).opacity.value, 1);

    for (const mode of [{ variant: "menu" }, { variant: "menu", appearance: "glass", animation: "warp", dimBackdrop: false }]) {
        const other = harness(platform);
        let menu = other.draw(mode);
        if (mode.appearance) other.panel(menu).props.onLayout({ nativeEvent: { layout: { height: 270 } } });
        menu = other.draw();
        const style = flatten(other.panel(menu).props.style);
        assert.equal(style.height, undefined, "Ordinary/glass menus keep their existing non-fold sizing");
        assert.equal(other.content(menu).props.onContentSizeChange, undefined);
        assert.equal(style.transform.length, mode.appearance ? 2 : 1);
    }
}
for (const platform of ["web", "ios", "android"]) {
    const h = harness(platform);
    h.webBlur(true);
    h.resize({ width: 320, height: 640 });
    let tree = h.draw({ variant: "menu", appearance: "neumorphic", maxWidth: 340, bottomClearance: 76,
        dimBackdrop: false, anchor: { x: 252, y: 128, width: 44, height: 44 } });
    let style = flatten(h.panel(tree).props.style);
    assert.equal(style.width, 288);
    assert.equal(style.top, 184, "Date popover always stays beneath the calendar");
    assert.equal(style.maxHeight, 364, "Below-only popover scrolls above the tab bar");
    assert.equal(flatten(nodes(tree).find(n => n.type === "AnimatedView" && !n.props.accessibilityViewIsModal).props.style).backgroundColor, "transparent");
    assert(!nodes(tree).some(n => n.type === "BlurView"), "Opaque material never samples the page");
    assert(nodes(tree).some(n => n.type === "Path"), "Pointer follows the calendar");
    for (const [width, maxWidth] of [[360, 340], [390, 340], [400, 340], [430, 430 * 0.84], [646, 540]]) {
        h.resize({ width: 320, height: 640 });
        tree = h.draw({ maxWidth, viewport: { width, height: 800 },
            anchor: { x: width - 64, y: 98, width: 44, height: 44 } });
        style = flatten(h.panel(tree).props.style);
        assert.equal(style.width, Math.min(maxWidth, width - 32));
        assert(style.left >= 16 && style.left + style.width <= width - 16, `Popover fits ${width}dp viewport`);
        assert(nodes(tree).some(n => n.type === "Path"), "Pointer stays with Calendar after resizing");
    }
    h.resize({ width: 390, height: 320 });
    tree = h.draw({ viewport: undefined, anchor: { x: 322, y: 85, width: 44, height: 44 } });
    style = flatten(h.panel(tree).props.style);
    assert.equal(style.top, 141);
    assert.equal(style.maxHeight, 87, "Landscape keeps the popover below and scrolls internally");
    h.motion(true); h.draw(); assert.equal(h.animations.at(-1).duration, 0);
}
console.log("Anchored menus passed: stable natural height, intermediate frames, borders, caps/resizing, changing content, scroll offset, reopen/cancellation, reduced motion, and scale/glass modes on web/iOS/Android mocks.");

for (const platform of ["web", "ios", "android"]) {
    for (const palette of [...Object.values(theme.PALETTES), ...Object.values(theme.DARK_PALETTES)]) {
        const h = harness(platform, palette), target = { current: {} };
        h.webBlur(true);
        let tree = h.draw({ variant: "menu", appearance: "actions", blurTarget: target,
            anchor: { x: 330, y: 12, width: 44, height: 44 }, onClose() {} });
        h.panel(tree).props.onLayout({ nativeEvent: { layout: { height: 340 } } }); tree = h.draw();
        let style = flatten(h.panel(tree).props.style);
        assert.equal(style.width, 300); assert.equal(style.top, 68); assert.equal(style.borderRadius, 26);
        if (platform === "web") {
            assert.equal(style.backdropFilter, "blur(28px)", "The animated panel samples the page directly, without an opacity ancestor");
            assert(!nodes(tree).some(n => n !== h.panel(tree) && flatten(n.props.style).backdropFilter), "No nested backdrop sampler can be isolated by animated opacity");
        }
        assert.equal(style.backgroundColor, "transparent"); assert.equal(flatten(h.content(tree).props.contentContainerStyle).gap, 0);
        const scrim = nodes(tree).find(n => n.type === "AnimatedView" && !n.props.accessibilityViewIsModal);
        assert.equal(flatten(scrim.props.style).backgroundColor, "transparent");
        assert(nodes(tree).some(n => n.props.material && JSON.stringify(n.props.material) === JSON.stringify({...palette.actionMenuGlass,...palette.overlayGlass})));
        assert(nodes(tree).some(n => n.type === "Path"), "Action menu has a trigger pointer");
        if (platform !== "web") assert.equal(nodes(tree).find(n => n.type === "BlurView").props.blurTarget, target);
        tree = h.draw({ anchor: { x: 330, y: 720, width: 44, height: 44 } });
        style = flatten(h.panel(tree).props.style); assert(style.top < 720 - 340); assert(style.transformOrigin.endsWith("bottom"));
        h.resize({ width: 320, height: 300 }); h.safeArea({ top: 20, bottom: 20, left: 40, right: 40 });
        tree = h.draw({ anchor: { x: 240, y: 20, width: 44, height: 44 } }); style = flatten(h.panel(tree).props.style);
        assert.equal(style.width, 240); assert.equal(style.left, 40); assert(style.top + style.maxHeight <= 280);
        assert(style.maxHeight < 340, "Short screens scroll the action rows");
        h.motion(true); h.draw(); assert.equal(h.animations.at(-1).duration, 0);
        if (platform === "android") {
            h.sdk(30); tree = h.draw(); const legacyBlur = nodes(tree).find(n => n.type === "BlurView"); assert.equal(legacyBlur.props.blurMethod,"dimezisBlurView"); assert.equal(legacyBlur.props.intensity,100);
        }
        if (platform === "web") {
            h.webBlur(false); tree = h.draw();
            assert.equal(flatten(h.panel(tree).props.style).backdropFilter, undefined);
            assert(nodes(tree).some(n => n.type === "Gradient" && n.props.colors[0] === palette.overlayGlass.fallback));
        }
        let pressed = 0;
        const item = harness(platform, palette), props = { variant: "action", label: "Remove from Favorites", leading: "Icon", divider: true, onPress: () => pressed++ };
        let row = item.drawItem(props); assert.equal(flatten(row.props.style).minHeight, 56); assert.equal(flatten(row.props.style).borderBottomWidth, 1);
        const label = nodes(row).find(n => n.type === "Text"); assert.equal(label.props.numberOfLines, undefined);
        assert.equal(flatten(label.props.style).color, palette.actionMenuGlass.text);
        row.props.onPress(); assert.equal(pressed, 1);
        row.props.onFocus(); row = item.drawItem(props);
        if (platform === "web") assert.equal(flatten(row.props.style).outlineWidth, 2);
        row = item.drawItem({ ...props, disabled: true }); assert(row.props.disabled && row.props.accessibilityState.disabled);
        assert.equal(flatten(row.props.style).opacity, 0.5);
    }
}
console.log("Action menus passed: six palettes, scoped material/rows, icon slots/dividers, focus/disabled actions, local blur/fallback, pointer/flipping, safe-area sizing, short-screen scrolling and reduced motion.");

for (const platform of ["web", "ios", "android"]) {
    for (const appearance of [undefined, "glass", "actions"]) {
        const h = harness(platform);
        let tree = h.draw({ variant: "menu", appearance, anchor: { x: 330, y: 540, width: 44, height: 44 } });
        h.panel(tree).props.onLayout?.({ nativeEvent: { layout: { height: 340 } } });
        tree = h.draw(); h.animations.at(-1).finish();
        const open = flatten(h.panel(tree).props.style);
        tree = h.draw({ visible: false, anchor: null });
        const exit = h.animations.at(-1);
        exit.value.setValue(0.5);
        tree = h.draw();
        const closing = flatten(h.panel(tree).props.style);
        for (const key of ["left", "top", "width", "maxHeight", "transformOrigin"])
            assert.equal(closing[key], open[key], `${platform}/${appearance}: clearing the trigger must not move the exit frame (${key})`);
        tree = h.draw({ visible: true, anchor: { x: 300, y: 20, width: 44, height: 44 } });
        tree = h.draw();
        assert(exit.stopped, "Reopening cancels the old exit callback");
        exit.finish();
        assert(h.panel(h.draw()), "A cancelled exit must not unmount the reopened menu");
        assert.equal(flatten(h.panel(tree).props.style).top, appearance ? 76 : 68);
        h.animations.at(-1).finish(); h.draw({ visible: false, anchor: null });
        h.animations.at(-1).finish(); assert.equal(h.draw(), null);
    }
}
console.log("Menu exit positions survive cleared anchors and interrupted closes on all platforms.");

for (const platform of ["web", "ios", "android"]) {
    for (const palette of [...Object.values(theme.PALETTES), ...Object.values(theme.DARK_PALETTES)]) {
        const h = harness(platform, palette), coverage = [];
        const trigger = ({ covered }) => { coverage.push(covered); return { type: "Trigger", props: { covered, children: [] } }; };
        const anchor = { x: 240, y: 320, width: 128, height: 44 };
        let tree = h.draw({ visible: false, anchor, variant: "select", appearance: "connectedSelect", trigger,
            header: { type: "Header", props: { children: [] } }, blurTarget: { current: {} }, initialScrollOffset: 0 });
        assert.equal(coverage.at(-1), false); assert(!h.panel(tree));
        tree = h.draw({ visible: true }); tree = h.draw();
        let style = flatten(h.panel(tree).props.style);
        assert.equal(coverage.at(-1), true);
        assert.deepEqual(style.height.outputRange, [44, 44], "The header stays visible while natural options are measured");
        h.content(tree).props.onContentSizeChange(128, 156); tree = h.draw();
        style = flatten(h.panel(tree).props.style);
        assert.equal(style.left, 240); assert.equal(style.top, 320); assert.equal(style.width, 128);
        assert.equal(style.borderRadius, 22); assert.equal(style.opacity, 1);
        assert.equal(style.borderWidth, 0); assert.equal(style.paddingHorizontal, 0);
        assert.deepEqual(style.height.outputRange, [44, 200]); assert.equal(h.animations.at(-1).duration, 220);
        assert.equal(h.content(tree).props.showsVerticalScrollIndicator, false, "Normal closing folds must not flash a scrollbar");
        assert.equal(h.panel(tree).props.onLayout, undefined, "Connected folds cannot measure animated outer frames");
        assert(!nodes(tree).some(n => n.type === "Path"), "A connected selector has no detached pointer");
        assert.equal(flatten(nodes(tree).find(n => n.type === "AnimatedView" && !n.props.accessibilityViewIsModal).props.style).backgroundColor, "transparent");
        assert(nodes(tree).some(n => n.type === "Header"));
        assert.equal(flatten(h.content(tree).props.contentContainerStyle).padding, 8);
        h.animations.at(-1).finish(); tree = h.draw({ visible: false, anchor: null });
        h.animations.at(-1).value.setValue(0.5); tree = h.draw();
        assert.equal(coverage.at(-1), true, "Original trigger remains covered during closing");
        style = flatten(h.panel(tree).props.style); assert.equal(style.left, 240); assert.equal(style.top, 320);
        const exit = h.animations.at(-1);
        tree = h.draw({ visible: true, anchor }); tree = h.draw(); assert(exit.stopped);
        assert.deepEqual(flatten(h.panel(tree).props.style).height.outputRange, [44, 200]);
        h.resize({ width: 320, height: 420 }); h.safeArea({ top: 20, bottom: 20, left: 0, right: 0 });
        tree = h.draw({ anchor: { x: 160, y: 370, width: 128, height: 44 } }); style = flatten(h.panel(tree).props.style);
        assert.equal(style.width, 128); assert.equal(style.top, undefined);
        assert.equal(style.bottom, 6, "Upward header remains aligned with the trigger bottom");
        assert.equal(style.height.outputRange[1], 200, "Available space above avoids unnecessary scrolling");
        h.content(tree).props.onContentSizeChange(128, 500); tree = h.draw();
        assert.equal(flatten(h.panel(tree).props.style).height.outputRange[1], style.maxHeight, "Wrapped rows remain scrollable");
        h.motion(true); h.draw(); assert.equal(h.animations.at(-1).duration, 0);
        h.draw({ visible: false, anchor: null }); h.animations.at(-1).finish(); tree = h.draw();
        assert.equal(coverage.at(-1), false); assert(!h.panel(tree));
        const rowHarness = harness(platform, palette);
        const row = rowHarness.drawItem({ variant: "connectedSelect", selected: true, label: "Height" });
        assert.equal(flatten(row.props.style).minHeight, 44);
        assert.equal(flatten(row.props.style).backgroundColor, "transparent");
        assert.equal(row.props.accessibilityState.selected, true);
        if (platform === "web") assert.equal(row.props["aria-pressed"], true);
        assert(nodes(row).some(n => n.type === "Gradient" && n.props.colors === palette.growthDropdownGlass.selected));
        assert.equal(nodes(row).find(n => n.type === "Text").props.numberOfLines, undefined);
    }
}
console.log("Connected growth selectors passed: six palettes/three platforms, shared width/header, seamless corners, no backdrop/pointer, natural reveal, covered trigger lifecycle, viewport scrolling, interruption and reduced motion.");

for (const platform of ["web", "ios", "android"]) for (const palettes of [theme.PALETTES, theme.DARK_PALETTES]) {
    for (const palette of Object.values(palettes)) {
        const h = harness(platform, palette); let closed = 0;
        h.resize({ width: 320, height: 380 }); h.webBlur(true);
        const footer = { type: "PinnedFooter", props: { children: [] } };
        let tree = h.draw({ variant: "menu", appearance: "profilePicker", maxWidth: 296,
            dimBackdrop: false, bottomClearance: 80, anchor: { x: 10, y: 10, width: 100, height: 44 },
            footer, onAfterClose: () => closed++ });
        let style = flatten(h.panel(tree).props.style);
        assert.equal(style.width, 288); assert.equal(style.left, 16); assert.equal(style.top, 66);
        assert.equal(style.maxHeight, 218); assert.equal(style.borderRadius, 26);
        assert(!h.content(tree).props.children.includes(footer), "Footer is not part of the scrolling list");
        assert(nodes(tree).includes(footer));
        assert.equal(flatten(h.content(tree).props.style).flexShrink, 1);
        assert(nodes(tree).some(n => n.type === "Path" && n.props.d === "M1 11 L10 1 L19 11"));
        assert.equal(flatten(nodes(tree).find(n => n.type === "AnimatedView" && n !== h.panel(tree)).props.style).backgroundColor, "transparent");
        assert.equal(style.transform[1].scale.outputRange[0], 0.98);
        h.resize({ width: 768, height: 1024 });
        tree = h.draw({ anchor: { x: 200, y: 10, width: 100, height: 44 } });
        style = flatten(h.panel(tree).props.style);
        assert.equal(style.left, 200, "Picker left-aligns below the name on wide screens");
        assert.equal(style.width, 296); assert.equal(style.maxHeight, 420);
        h.motion(true); tree = h.draw(); assert.equal(h.animations.at(-1).duration, 0);
        assert.equal(flatten(h.panel(tree).props.style).transform[1].scale.outputRange[0], 1);
        h.draw({ visible: false, anchor: null }); h.animations.at(-1).finish(); tree = h.draw();
        assert(!h.panel(tree)); assert.equal(closed, 1);
        h.draw(); assert.equal(closed, 1, "No repeated close callbacks");
        const missing = harness(platform, palette);
        assert(!missing.panel(missing.draw({ appearance: "profilePicker", anchor: null })), "No unanchored picker flash");
    }
}
console.log("Profile picker menu passed: transparent scrim, local glass, pointer, left anchoring, bounded geometry, pinned footer, reduced motion and one completed-exit callback across six themes/three platforms.");

{
    const h=harness();let value;
    const item=h.drawItem({label:"Delete",onPressWithAnchor:anchor=>value=anchor});
    item.props.ref.current={measureInWindow:cb=>cb(250,500,100,52)};
    item.props.onPress();assert.deepEqual(value,{x:250,y:500,width:100,height:52});
    let ordinary=0;h.drawItem({label:"Select",onPress:()=>ordinary++}).props.onPress();assert.equal(ordinary,1);
}

for (const platform of ["web", "ios", "android"]) {
    const h = harness(platform);
    let tree = h.draw({ visible: true, anchor: { x: 20, y: 600, width: 300, height: 52 }, variant: "select", appearance: "connectedSelect" });
    h.content(tree).props.onContentSizeChange(300, 350); tree = h.draw();
    const style = flatten(h.panel(tree).props.style);
    assert.equal(style.left, 20); assert.equal(style.width, 300);
    assert.equal(style.top, undefined, "Upward selectors do not shift the trigger header");
    assert.equal(style.bottom, 844 - 600 - 52, "Upward fold stays attached to the input bottom");
}
