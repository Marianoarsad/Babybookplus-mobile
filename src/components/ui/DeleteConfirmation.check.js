// Real dialog JSX and actual deletion handlers, with in-memory deferred requests only.
const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path");
const { transformSync } = require("@babel/core"), { parse } = require("@babel/parser");
const compile = source => transformSync(source, { babelrc: false, configFile: false, plugins: ["@babel/plugin-transform-react-jsx", "@babel/plugin-transform-modules-commonjs"] }).code;
function pure(file) {
    const filename = path.resolve(__dirname, file), module = { exports: {} };
    if (filename.endsWith(".cjs")) return require(filename);
    new Function("require", "module", "exports", compile(fs.readFileSync(filename, "utf8")))(name => pure(path.resolve(path.dirname(filename), name + (path.extname(name) ? "" : ".js"))), module, module.exports);
    return module.exports;
}
const theme = pure("../../theme.js"), source = fs.readFileSync(path.join(__dirname, "RecordFormSheet.js"), "utf8");
const nodes = tree => tree && typeof tree === "object" ? [tree, ...(tree.props.children || []).flatMap(nodes)] : [];
const rgba = color => color.startsWith("#") ? [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16)).concat(1) : color.match(/[\d.]+/g).map(Number);
const over = (color, background) => { const [r,g,b,a=1] = rgba(color); return [r,g,b].map((c,i) => c*a+background[i]*(1-a)); };
const luminance = rgb => rgb.map(v => { v/=255; return v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4; }).reduce((sum,v,i)=>sum+v*[0.2126,0.7152,0.0722][i],0);
const contrast = (ink, surface) => { const [a,b]=[luminance(rgba(ink).slice(0,3)),luminance(surface)].sort((a,b)=>a-b); return (b+0.05)/(a+0.05); };
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
function harness({ view = "confirmation", os = "web", version = 35, blur = true, reduced = true, transparent = true, palette = theme.PALETTES.boy, ...props } = {}) {
    const slots = [], effects = [], animations = []; let cursor = 0;
    const React = { createElement: (type, props, ...children) => ({ type, props: { ...props, children: children.flat(Infinity) } }),
        createContext: () => ({ Provider: "Provider" }), useContext() {}, useId: () => "fixture", useMemo: fn => fn(),
        useRef(value) { const i = cursor++; return slots[i] ||= { current: value }; },
        useState(value) { const i = cursor++; if (!(i in slots)) slots[i] = typeof value === "function" ? value() : value; return [slots[i], next => slots[i] = typeof next === "function" ? next(slots[i]) : next]; },
        useEffect(fn, deps) { const i = cursor++, old = slots[i]; if (!old || deps.some((v, j) => !Object.is(v, old.deps[j]))) effects.push(() => { old?.cleanup?.(); slots[i] = { deps, cleanup: fn() }; }); } };
    class Value { constructor(v) { this.value = v; } stopAnimation() {} setValue(v) { this.value = v; } interpolate(config) { return config; } }
    const imports = { "./GlassHeaderButton":{__esModule:true,default:"GlassHeaderButton"}, "./ScreenHeader":{__esModule:true,default:"ScreenHeader",useDetailHeader:()=>({headerProps:{},scrollProps:{},contentStyle:{}})}, "../../context/GlassTargetContext": { useGlassTarget:()=>null, GlassTargetContext: {Provider:"GlassProvider"} }, "./SheetGrabber": {__esModule:true,default:"SheetGrabber"}, "./NeumorphicCard": {__esModule:true,default:"NeumorphicCard"}, "../ui/NeumorphicCard": {__esModule:true,default:"NeumorphicCard"},
        react: { __esModule: true, default: React, ...React },
        "react-native": { View: "View", Text: "Text", Pressable: "Pressable", TouchableOpacity: "TouchableOpacity", ScrollView: "ScrollView", Platform: { OS: os, Version: version },
            Animated: { Value, View: "AnimatedView", timing: (v, config) => ({ start: () => { animations.push(config); v.setValue(config.toValue); }, stop() {} }) },
            Easing: { bezier: (...args) => args }, Keyboard: { dismiss() {} }, StyleSheet: { create: v => v, absoluteFill: {}, absoluteFill: {} },
            useWindowDimensions: () => ({ width: 320, height: 568, fontScale: 2 }), findNodeHandle: () => null,
            AccessibilityInfo: { announceForAccessibility() {}, isReduceTransparencyEnabled: async () => !transparent, addEventListener: () => ({ remove() {} }) } },
        "expo-blur": { BlurTargetView: "BlurTargetView", BlurView: "BlurView" }, "@expo/vector-icons": { Ionicons: "Icon" },
        "react-native-safe-area-context": { useSafeAreaInsets: () => ({ top: 20, bottom: 10 }) },
        "../../context/ThemeContext": { useTheme: () => ({ colors: palette, scheme: "light" }) }, "../../context/LanguageContext": { useLanguage: () => ({ t: k => k }) },
        "../../utils/confirmationPosition.cjs": require("../../utils/confirmationPosition.cjs"), "../../utils/dates": {shortDate: value=>value,shortTime:value=>value}, "../../utils/responsive": {}, "../../context/ScrollContext": {}, "../../theme": theme, "./recordFormActions.cjs": require("./recordFormActions.cjs"), "./Field": {},
    };
    for (const name of ["Button", "AppModal", "Gradient", "GlassLighting", "KeyboardAvoider", "useBottomSheetMotion"]) imports["./" + name] = { __esModule: true, default: name };
    imports["./useReducedMotion"] = { __esModule: true, default: () => reduced };
    globalThis.CSS = { supports: () => blur }; globalThis.requestAnimationFrame = () => 1; globalThis.cancelAnimationFrame = () => {};
    const module = { exports: {} };
    new Function("require", "module", "exports", compile(view === "detail" ? fs.readFileSync(path.join(__dirname,"PlanDetail.js"),"utf8") : source))(name => { assert(name in imports, name); return imports[name]; }, module, module.exports);
    const input = { visible: true, anchor: {x:100,y:400,width:80,height:48}, title: "Delete solid food entry?", message: "Delete this solid food entry? This cannot be undone.", onConfirm() {}, onCancel() {}, ...props };
    const draw = () => { cursor = 0; const tree = (view === "detail" ? module.exports.default : module.exports.DeleteConfirmation)(input); effects.splice(0).forEach(fn => fn()); return tree; };
    const get = id => nodes(draw()).find(n => n.props.testID === id);
    const buttons = () => nodes(draw()).filter(n => n.type?.name === "ConfirmationButton");
    const layout = () => {
        const overlay = get("delete-confirmation-overlay");
        if (!overlay) return;
        overlay.props.ref.current = { measureInWindow: cb => cb(0,0,320,568) };
        overlay.props.onLayout();
        get("delete-confirmation").props.onLayout({nativeEvent:{layout:{height:240}}}); draw();
    };
    draw(); draw(); layout();
    return { input, draw, get, buttons, animations, layout, unmount: () => slots.forEach(s => s?.cleanup?.()) };
}
async function check() {
    for (const palettes of [theme.PALETTES, theme.DARK_PALETTES]) for (const name of ["boy", "girl", "neutral"]) {
        const p = {...palettes[name].confirmationGlass,...palettes[name].overlayGlass};
        for(const backdrop of [[0,0,0],[255,255,255]]) for(const surface of p.panel) {
            const panel=over(surface,backdrop);
            assert(contrast(p.text,panel)>=4.5); assert(contrast(p.secondary,panel)>=4.5);
            for(const fill of p.destructive) assert(contrast(p.destructiveInk,over(fill,panel))>=4.5);
            for(const fill of p.cancel) assert(contrast(p.secondary,over(fill,panel))>=4.5,JSON.stringify({name,ink:p.secondary,fill,panel,ratio:contrast(p.secondary,over(fill,panel))}));
        }
        const h = harness({ palette: palettes[name] });
        assert.equal(h.get("delete-confirmation").props.role, "alertdialog");
        const style = h.get("delete-confirmation").props.style[0];
        assert.equal(style.position,"absolute");
        assert.equal(h.get("delete-confirmation").props.style[1].width,288);
        assert.equal(h.get("delete-confirmation").props.style[1].top,302);
        assert(!h.get("confirmation-blur"),"No viewport blur remains");
        assert(h.get("delete-confirmation").props.style.some(s=>s?.backdropFilter==="blur(28px)"),"Glass blur is local to the panel");
        assert.equal(h.get("confirmation-backdrop").props.style.backgroundColor,undefined);
        assert.equal(h.buttons().length, 2);
        assert.equal(h.buttons()[0].props.destructive, true); assert.equal(h.buttons()[1].props.label, "Cancel");
        assert.equal(h.buttons()[0].props.styles.button.minHeight, 52);
        assert.equal(h.buttons()[0].props.styles.actions.gap, 12);
        assert.equal(h.get("delete-confirmation").props.style[1].maxHeight, 506);
        h.unmount();
    }
    const legacy = harness({os:"android",version:30,blurTarget:{}}); assert.equal(legacy.get("confirmation-panel-blur").props.blurMethod,"dimezisBlurView"); legacy.unmount();
    for (const settings of [{ blur: false }, { os: "android" }]) {
        const h = harness(settings); assert(!h.get("confirmation-panel-blur"));
        const gradients = nodes(h.draw()).filter(n => n.type === "Gradient");
        assert.deepEqual(gradients[0].props.colors, [theme.PALETTES.boy.overlayGlass.fallback, theme.PALETTES.boy.overlayGlass.fallback]); h.unmount();
    }
    const native = harness({ os: "android", blurTarget: {} }); assert.equal(native.get("confirmation-panel-blur").props.blurMethod, "dimezisBlurViewSdk31Plus"); native.unmount();
    const reduceTransparency = harness({ os: "ios", transparent: false }); await Promise.resolve(); assert(!reduceTransparency.get("confirmation-panel-blur")); reduceTransparency.unmount();
    const moving = harness({ reduced: false }); assert.equal(moving.animations[0].duration, theme.motion.entrance.duration); moving.unmount();
    const reduced = harness(); assert.equal(reduced.animations.length, 0); reduced.unmount();
    let called = 0, canceled = 0, task = deferred();
    const h = harness({ onConfirm: () => { called++; return task.promise; }, onCancel: () => canceled++ });
    assert.equal(called, 0);
    h.buttons()[1].props.onPress(); assert.equal(canceled, 1); assert.equal(called, 0);
    const first = h.buttons()[0].props.onPress(); h.buttons()[0].props.onPress(); h.get("confirmation-backdrop").props.onPress();
    assert.equal(called, 1); assert.equal(canceled, 1); assert(h.buttons().every(b => b.props.disabled));
    assert(h.get("confirmation-backdrop").props.disabled);
    task.reject(new Error("Offline - try again")); await first;
    assert(nodes(h.draw()).some(n => n.props.accessibilityRole === "alert" && n.props.children[0] === "Offline - try again"));
    assert(!h.buttons()[0].props.disabled); assert(h.draw(), "Failure retains the dialog");
    task = deferred(); const retry = h.buttons()[0].props.onPress(); assert.equal(called, 2); task.resolve(true); await retry;
    assert(h.draw(), "Only the owner closes on success"); assert.equal(canceled, 1);
    task = deferred(); const stale = h.buttons()[0].props.onPress(); h.input.visible = false; assert.equal(h.draw(), null);
    h.input.visible = true; h.draw(); h.layout(); task.reject(new Error("Obsolete failure")); await stale;
    assert(!nodes(h.draw()).some(n => n.props.children?.includes("Obsolete failure"))); h.unmount();
    const revoke = harness({ deleteLabel: "Revoke Share", title: "Revoke share?", inline: true });
    assert.equal(revoke.buttons()[0].props.label, "Revoke Share"); assert.equal(revoke.draw().type, "View"); revoke.unmount();
    const busy = harness({ busy: true, onConfirm: () => called++, onCancel: () => canceled++ });
    const before = [called, canceled]; busy.buttons()[0].props.onPress(); busy.buttons()[1].props.onPress(); assert.deepEqual([called, canceled], before); busy.unmount();

    const point={x:40,y:500,width:240,height:52};let detailAnchor;
    const detail=harness({view:"detail",plan:{title:"Sample",date:"2026-10-24"},onDelete:anchor=>detailAnchor=anchor});
    const detailButton=nodes(detail.draw()).find(n=>n.props.accessibilityLabel==="Delete Sample");
    detailButton.props.ref.current={measureInWindow:cb=>cb(point.x,point.y,point.width,point.height)};
    detailButton.props.onPress();assert.deepEqual(detailAnchor,point);detail.unmount();

    // Evaluate the actual owner handlers so a UI rewrite cannot hide early dismissal.
    for (const [file, handler, record] of [["../NutritionTracker.js", "handleDelete", 7], ["../Growth.js", "handleDeleteGrowth", 7],
        ["../CalendarView.js", "handleDeleteEvent", { id: 7, sourceType: "custom", sourceId: 17, title: "Fixture" }],
        ["../CalendarView.js", "handleDeleteEvent", { id: 7, sourceType: "checkup", sourceId: 17, title: "Fixture" }]]) {
        const code = fs.readFileSync(path.join(__dirname, file), "utf8"), ast = parse(code, { sourceType: "module", plugins: ["jsx"] });
        let body;
        function walk(n) { if (!n || typeof n !== "object") return; if (n.type === "VariableDeclarator" && n.id.name === handler) body = code.slice(n.init.start, n.init.end); for (const v of Object.values(n)) if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === "object") walk(v); }
        walk(ast); assert(body, handler);
        for (const outcome of ["success", "failure", "stale"]) {
            let active = true, writes = 0; const dismissals = [], feedback = [], task = deferred();
            const env = { id: 1, childId: 1, profile: { id: 1 }, deletePending: { current: null }, isActive: () => active,
                api: { optimisticRecord: () => { writes++; return task.promise; }, deleteRecord: () => { writes++; return task.promise; } },
                PLAN_RESOURCES: { custom: "calendar-events", checkup: "checkups" }, loadEvents: async () => {}, t: k => k,
                toast: { success: x => feedback.push(x), error: x => feedback.push(x) }, setDeletingId() {}, setDeletingGrowthId() {}, setDeletingEventId() {} };
            for (const key of ["setShowModal", "setDetailEntry", "setOpenSwipeId", "setDeleteCandidate", "setDeleteGrowthCandidate", "setOpenGrowthSwipeId", "setDetailGrowth", "setShowMetricsModal", "setDetailEvent"]) env[key] = value => dismissals.push([key, value]);
            const run = new Function(...Object.keys(env), `return (${body});`)(...Object.values(env));
            const result = run(record); assert.equal(writes, 1); assert.equal(await run(record), false); assert.equal(writes, 1); assert.equal(dismissals.length, 0);
            if (outcome === "failure") task.reject(new Error("Offline")); else { if (outcome === "stale") active = false; task.resolve(); }
            assert.equal(await result, outcome === "success");
            assert.equal(dismissals.length > 0, outcome === "success");
            if (outcome === "stale") assert.equal(feedback.length, 0);
        }
    }
    assert(source.indexOf("</BlurTargetView>") < source.lastIndexOf("<DeleteConfirmation inline"), "Inline overlay is outside the sheet blur target and clipping");
    assert(source.includes('inert: confirming || undefined')); assert(source.includes('opacity: confirming ? 0 : motion.shade'));
    assert.equal(harness({anchor:null}).draw(),null,"Missing geometry never opens a centered modal");
    console.log("Delete confirmation passed: anchored local glass without viewport tint/blur, six palettes, blur fallbacks, motion, accessible actions, cancellation, duplicate guard, failure/retry and stale-safe success-only owner dismissal.");
}
check().catch(e => { console.error(e); process.exitCode = 1; });
