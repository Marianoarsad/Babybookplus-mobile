// Run: node components/ui/MemoriesMilestonesCard.check.js — no server or record writes.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { transformSync } = require("@babel/core");
const root = path.resolve(__dirname, "../..");
const compile = source => transformSync(source, { babelrc: false, configFile: false,
    plugins: ["@babel/plugin-transform-react-jsx", "@babel/plugin-transform-modules-commonjs"] }).code;
const themeModule = { exports: {} };
new Function("module", "exports", compile(fs.readFileSync(path.join(root, "theme.js"), "utf8")))(themeModule, themeModule.exports);
const theme = themeModule.exports;
let colors = theme.PALETTES.boy, width = 326, height = 844, fontScale = 1, sequence = 0, hooks;
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
    createElement(type, props, ...children) {
        const next = { ...props, children: children.flat(Infinity).filter(child => child !== false && child != null) };
        if (type === "AnchoredMenu" && props.trigger) next.children.unshift(props.trigger({ covered: !!props.visible }));
        return typeof type === "function" ? type(next) : { type, props: next };
    },
    useMemo: fn => fn(), useCallback: fn => fn, useContext: value => value,
    useState(initial) {
        if (!hooks) return [typeof initial === "number" ? width : initial, () => {}];
        const state = hooks, id = state.cursor++;
        if (!(id in state.slots)) state.slots[id] = initial;
        return [state.slots[id], value => { state.slots[id] = typeof value === "function" ? value(state.slots[id]) : value; }];
    },
    useId: () => `memory-${sequence++}`, memo: component => component,
    useEffect(fn, deps) {
        if (!hooks) return fn();
        const state = hooks, id = state.cursor++, previous = state.slots[id];
        if (!previous || deps.some((value, index) => value !== previous.deps[index])) state.pending.push(() => {
            previous?.cleanup?.(); state.slots[id] = { deps, cleanup: fn() };
        });
    },
    useRef(value) {
        if (!hooks) return { current: value };
        const id = hooks.cursor++;
        return hooks.slots[id] ||= { current: value };
    },
    isValidElement: element => Boolean(element?.type),
};
class Value { constructor(value) { this.value = value; } setValue(value) { this.value = value; } stopAnimation() {} interpolate(config) { return { value: this, ...config }; } }
const native = { View: "View", Text: "Text", TextInput: "TextInput", Image: "Image", Pressable: "Pressable", TouchableOpacity: "TouchableOpacity",
    Animated: { View: "AnimatedView", Value }, Easing: { out: value => value, quad: "quad" },
    Platform: { OS: "web" }, useWindowDimensions: () => ({ width, height, fontScale }),
    StyleSheet: { create: value => value, hairlineWidth: 1, absoluteFill: { position: "absolute", inset: 0 } } };
const svg = { __esModule: true, default: "Svg" };
for (const name of ["Circle", "Defs", "Ellipse", "LinearGradient", "Path", "Rect", "Stop"]) svg[name] = name;
const externals = { react: { __esModule: true, default: react, ...react }, "react-native": native,
    "react-native-svg": svg, "@expo/vector-icons": { Ionicons: "Ionicon" } };
const overrides = {
    "components/ui/SelectTrigger.js": { __esModule: true, default: "SelectTrigger" },
    "theme.js": theme,
    "context/ThemeContext.js": { useTheme: () => ({ colors }) },
    "context/ScrollContext.js": { __esModule: true, default: scrollContext },
    "components/ui/Gradient.js": { __esModule: true, default: "Gradient" },
    "components/ui/GlassLighting.js": { __esModule: true, default: "GlassLighting" },
    "components/ui/useSoftPress.js": { __esModule: true, default: () => ({ respond() {}, transform: [] }) },
    "components/ui/useReducedMotion.js": { __esModule: true, default: () => true },
    "components/ui/AnchoredMenu.js": { __esModule: true, default: "AnchoredMenu", AnchoredMenuItem: "AnchoredMenuItem" },
    "components/ui/Skeleton.js": { SkeletonBlock: "SkeletonBlock" },
};
const modules = new Map();
function load(relative) {
    const file = path.resolve(root, relative), key = path.relative(root, file).replaceAll("\\", "/");
    if (overrides[key]) return overrides[key];
    if (/\.png$/.test(file)) return key;
    if (modules.has(file)) return modules.get(file).exports;
    const module = { exports: {} }; modules.set(file, module);
    new Function("require", "module", "exports", "__DEV__", "globalThis", compile(fs.readFileSync(file, "utf8")))(name => {
        if (externals[name]) return externals[name];
        assert(name.startsWith("."), name);
        const target = path.resolve(path.dirname(file), name);
        return load(path.extname(target) ? target : target + ".js");
    }, module, module.exports, false, { ResizeObserver });
    return module.exports;
}
const { default: Card, MemoryGalleryGrid } = load("components/ui/MemoriesMilestonesCard.js");
const { MemoryVisualCard } = load("components/common/Cards.js");
const { default: MemoryDateRow } = load("components/ui/MemoryDateRow.js");
const { recordIconRegistry } = load("components/ui/RecordIcon.js");
const nodes = tree => tree && typeof tree === "object" ? [tree, ...(tree.props.children || []).flatMap(nodes)] : [];
const text = tree => tree && typeof tree === "object" ? (tree.props.children || []).map(text).join("") : String(tree ?? "");
const merge = styles => Object.assign({}, ...[styles].flat(Infinity).filter(Boolean));
const records = Object.freeze([
    Object.freeze({ id: "bike", title: "First Bike Ride", description: "Practiced pedaling with Papa.", date: "2029-02-28", photoUrl: "unchanged-bike.jpg" }),
    Object.freeze({ id: "helper", title: "Christmas Helper", description: "She decorated the lowest branches herself.", date: "2028-09-13", photoUrl: "unchanged-clouds.jpg" }),
    Object.freeze({ id: "birthday", title: "First Birthday", description: "A small garden celebration with family.", date: "2026-11-17", photoUrl: "unchanged-sunset.jpg" }),
    Object.freeze({ id: "home", title: "Welcome Home, Sofia", description: "Our first weekend together.", date: "2025-11-18", photoUrl: "unchanged-coast.jpg" }),
]);
const before = JSON.stringify(records);
for (const palette of [theme.PALETTES.boy, theme.PALETTES.girl, theme.PALETTES.neutral,
    theme.DARK_PALETTES.boy, theme.DARK_PALETTES.girl, theme.DARK_PALETTES.neutral]) {
    colors = palette;
    for (const [available, scale, columns] of [[256, 1, 2], [326, 1, 2], [366, 1, 2], [210, 1, 1], [256, 1.5, 1]]) {
        width = available; fontScale = scale;
        let opened = null, viewed = 0;
        const tree = Card({ records, onOpenMemory: record => opened = record, onViewAll: () => viewed++ });
        const buttons = nodes(tree).filter(node => node.type === "Pressable");
        buttons.find(node => node.props.accessibilityLabel === "See all memories and milestones").props.onPress();
        assert.equal(viewed, 1);
        const cards = buttons.filter(node => node.props.accessibilityLabel?.startsWith("View "));
        assert.equal(cards.length, 4);
        cards.forEach((node, index) => { node.props.onPress(); assert.equal(opened, records[index]); });
        const itemWrappers = nodes(tree).filter(node => node.type === "AnimatedView" && merge(node.props.style).flex === 1);
        assert.equal(itemWrappers.length, 4);
        for (const item of itemWrappers) {
            const style = merge(item.props.style);
            assert.equal(style.flex, 1);
            assert.equal(style.minWidth, 0);
            assert.equal(style.overflow, "visible");
        }
        const rows = nodes(tree).filter(node => node.type === "View" && node.props.style?.flexDirection === "row" && node.props.style.gap === 12);
        assert.equal(rows.length, Math.ceil(records.length / columns));
        for (const row of rows) assert.equal(row.props.children.length, columns);
        assert.deepEqual(nodes(tree).filter(node => node.type === "Image" && node.props.source?.uri)
            .map(node => node.props.source.uri), records.map(record => record.photoUrl));
        assert.equal(nodes(tree).filter(node => node.type === "Image" && String(node.props.source).endsWith("calendar-blue.png")).length, 4);
        for (const expected of ["Memories & Milestones", "February 28 2029", "September 13 2028", "November 17 2026", "November 18 2025"])
            assert(text(tree).includes(expected), expected);
        assert.equal(cards[0].props.accessibilityRole, "button");
    }
    const milestone = MemoryVisualCard({ ...records[0], kind: "milestone" });
    assert(text(milestone).includes("Milestone"));
    assert.equal(nodes(milestone).filter(node => node.type === "Ionicon" && node.props.name === "image-outline").length, 0);
    const ordinary = MemoryVisualCard({ title: "Without photo" });
    assert.equal(nodes(ordinary).filter(node => node.type === "Ionicon" && node.props.name === "image-outline").length, 0);
    assert(nodes(ordinary).some(node => node.type === "Svg"), "Missing memory photos use the shared gallery artwork");
    assert(!text(ordinary).includes("Milestone"));
    assert.equal(MemoryDateRow({ date: "" }), null);
    assert(text(MemoryDateRow({ date: "invalid" })).includes("Date unavailable"));
    assert(text(Card({ records: [], onOpenMemory() {}, onViewAll() {} })).includes("No memories yet."));
    assert.deepEqual(palette.milestoneIcon.fabric, palette.recordCategory.milestone.body);
}
assert.equal(JSON.stringify(records), before, "Presentation never alters stored data or ordering");
assert.equal(recordIconRegistry.milestone, recordIconRegistry.milestones);
assert.notEqual(recordIconRegistry.milestone, recordIconRegistry.milk);
const home = fs.readFileSync(path.join(root, "components/Dashboard.js"), "utf8");
const growth = fs.readFileSync(path.join(root, "components/Growth.js"), "utf8");
assert(home.includes('records={memories.slice(0, 4)}') && home.includes('nav("growth", "gallery")'));
assert(growth.includes('result={galleryResult}') && growth.includes('visible: current.visible + 10'));
assert(!growth.includes('MemoryGalleryGrid'), "Home's two-column preview is separate from the full-width collection");
assert(!growth.includes('badge={item.kind') && !growth.includes('shortDate(item.date).replace'));
console.log("Memory gallery checks passed: six themes, responsive columns/large text, raw dates/calendar rows, original images/order, exact callbacks, empty/missing states and milestone identity.");

const { default: Collection, MemoryRecordRow, GalleryCategorySelect } = load("components/ui/MemoriesMilestonesCollection.js");
const { memoryGalleryView, GALLERY_DEFAULTS } = load("utils/memoryGallery.js");
const { DOMAINS } = load("utils/milestoneChecklist.js");
const luminance = hex => {
    const [r, g, b] = hex.slice(1).match(/../g).map(value => parseInt(value, 16) / 255)
        .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (ink, background) => {
    const a = luminance(ink), b = luminance(background);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
};
const collectionRecords = records.map((record, index) => Object.freeze({ ...record, kind: index < 2 ? "memory" : "milestone" }));
for (const palette of [theme.PALETTES.boy, theme.PALETTES.girl, theme.PALETTES.neutral,
    theme.DARK_PALETTES.boy, theme.DARK_PALETTES.girl, theme.DARK_PALETTES.neutral]) {
    colors = palette;
    for (const [available, scale] of [[288, 1], [358, 1], [398, 1], [288, 1.5]]) {
        width = available; fontScale = scale;
        let state = { ...GALLERY_DEFAULTS }, opened = null, more = 0;
        const draw = (items = collectionRecords, loading = false) => Collection({ view: state, result: memoryGalleryView(items, state), loading,
            onChangeView: patch => state = { ...state, ...patch, visible: 10 }, onShowMore: () => more++, onOpenRecord: record => opened = record });
        let tree = draw();
        assert(text(tree).includes("Memories & Milestones"));
        assert(!nodes(tree).some(node => node.props.accessibilityLabel?.startsWith("Add ")));
        const buttons = nodes(tree).filter(node => node.type === "Pressable");
        const rows = buttons.filter(node => node.props.accessibilityLabel?.startsWith("View "));
        assert.equal(rows.length, 4);
        for (const row of rows) {
            assert.equal(merge(row.props.style).width, "100%");
            assert.equal(merge(row.props.style).flexDirection, "row");
            row.props.onPress();
            assert(collectionRecords.includes(opened));
            assert.equal(nodes(row).filter(node => node.type === "Pressable").length, 1, "Chevron never adds a duplicate handler");
            assert(!text(row).includes("Not categorized"), "Unassigned records have no category badge");
            assert.equal(nodes(row).filter(node => node.type === "View" && merge(node.props.style).borderRadius === 999
                && nodes(node).some(child => child.type === "Text")).length, 1, "Only the record-kind badge remains");
        }
        for (const domain of DOMAINS) for (const kind of ["memory", "milestone"]) {
            const record = Object.freeze({ ...records[0], kind, developmentCategory: domain.key });
            const row = MemoryRecordRow({ record, compact: true, thumbnailWidth: 72, onOpen: value => opened = value });
            assert(text(row).includes(domain.label), "Every category is visible directly on the Gallery row");
            assert(text(row).includes(kind === "memory" ? "Memory" : "Milestone"), "Record kind remains distinct from its category");
            const label = nodes(row).find(node => node.type === "Text" && text(node) === domain.label);
            assert(label && label.props.numberOfLines === undefined, "Long category labels can wrap on phones and at larger text sizes");
            const material = palette.developmentChecklist.categoryArt[domain.key];
            assert.equal(merge(label.props.style).color, material.badgeInk);
            const badge = nodes(row).find(node => node.type === "View" && node.props.children.includes(label));
            assert.deepEqual(nodes(badge).find(node => node.type === "Gradient").props.colors, material.surface,
                "Gallery badge backgrounds reuse the Development Checklist icon surfaces");
            for (const background of material.surface) assert(contrast(material.badgeInk, background) >= 4.5,
                `${domain.label} badge text must be readable against every gradient endpoint`);
            const kindLabel = nodes(row).find(node => node.type === "Text" && text(node) === (kind === "memory" ? "Memory" : "Milestone"));
            const kindInk = kind === "milestone" ? palette.milestoneIcon.badgeInk : palette.memoriesSurface.accent;
            const kindSurface = kind === "milestone" ? palette.milestoneIcon.background : palette.memoriesSurface.control;
            assert.equal(merge(kindLabel.props.style).color, kindInk);
            const kindBadge = nodes(row).find(node => node.type === "View" && node.props.children.includes(kindLabel));
            assert.deepEqual(nodes(kindBadge).find(node => node.type === "Gradient").props.colors, kindSurface);
            if (kind === "milestone") for (const background of kindSurface) assert(contrast(kindInk, background) >= 4.5,
                "Yellow Milestone badges retain readable text in every theme");
            row.props.onPress();
            assert.equal(opened, record, "Opening details retains the exact record and developmental category");
        }
        assert.equal(buttons.filter(node => node.props.accessibilityLabel?.endsWith("total records")).length, 0,
            "Record type buttons must not remain in the toolbar");
        const menu = nodes(tree).find(node => node.type === "AnchoredMenu" && nodes(node).some(child => child.type === "AnchoredMenuItem" && child.props.label === "Oldest first"));
        assert.equal(menu.props.dimBackdrop, false);
        const choices = nodes(menu).filter(node=>node.type === "AnchoredMenuItem");
        assert.deepEqual(choices.map(node=>node.props.label),["All","Milestones","Memories","Newest first","Oldest first"]);
        assert.deepEqual(choices.filter(node=>node.props.selected).map(node=>node.props.label),["All","Newest first"]);
        assert(text(menu).includes("Record type") && text(menu).includes("Sort order"));
        nodes(tree).find(node => node.type === "TextInput").props.onChangeText("pedaling");
        assert.equal(state.visible, 10);
        tree = draw();
        assert.equal(nodes(tree).filter(node => node.props.accessibilityLabel?.startsWith("View ")).length, 1);
        nodes(tree).find(node => node.props.accessibilityLabel === "Milestones, 2 total records").props.onPress();
        tree = draw();
        assert(text(tree).includes("No matching memories or milestones found."));
        nodes(tree).find(node => node.props.accessibilityLabel === "Clear memories search").props.onPress();
        tree = draw();
        assert.equal(nodes(tree).filter(node => node.props.accessibilityLabel?.startsWith("View ")).length, 2);
        nodes(tree).find(node => node.type === "AnchoredMenuItem" && node.props.label === "Oldest first").props.onPress();
        tree = draw();
        assert.equal(nodes(tree).find(node => node.props.accessibilityLabel?.startsWith("View ")).props.accessibilityLabel, "View Welcome Home, Sofia");
        state = { ...GALLERY_DEFAULTS, visible: 2 };
        tree = draw();
        nodes(tree).find(node => node.props.accessibilityLabel === "Show more memories and milestones, 2 remaining").props.onPress();
        assert.equal(more, 1);
        state.visible = 10;
        tree = draw();
        assert(!nodes(tree).some(node => node.props.accessibilityLabel?.startsWith("Show more memories")));
        assert(text(draw([])).includes("No memories or milestones recorded yet."));
        assert(nodes(draw([], true)).some(node => node.props.accessibilityLabel === "Loading memories and milestones"));
        state={...GALLERY_DEFAULTS};tree=draw();
        nodes(tree).find(node=>node.type==="AnchoredMenuItem"&&node.props.label==="Movement & Physical").props.onPress();
        assert.equal(state.developmentCategory,"motor");assert.equal(state.visible,10);
        assert(text(draw()).includes("No matching memories or milestones found."));
        nodes(tree).find(node=>node.type==="AnchoredMenuItem"&&node.props.label==="Not categorized").props.onPress();
        assert.equal(state.developmentCategory,"uncategorized");
    }
}
assert.equal(new Set(Object.values(theme.PALETTES.boy.developmentChecklist.categoryArt).map(value => value.badgeInk)).size, 4);
const legacyMotor = MemoryRecordRow({ record: { kind: "milestone", title: "Sits without support" }, onOpen() {} });
assert.equal(merge(nodes(legacyMotor).find(node => node.type === "Text" && text(node) === "Movement & Physical").props.style).color,
    colors.developmentChecklist.categoryArt.motor.badgeInk, "Legacy category inference supplies the same badge color");
assert(growth.includes('setGalleryView({ ...GALLERY_DEFAULTS }); }, [profile.id]'));
assert(growth.includes('onOpenRecord={memory => setDetailMemory({ ...memory, childId: profile.id })}') && growth.includes('blurTarget={blurTarget}'));
assert(growth.includes('key={`gallery-${profile.id}`}'), "Collection reset key cannot collide with the date modal's profile key");
console.log("Chronological collection passed: full-width horizontal rows, exact record callbacks, search/category/sort contracts, backdrop-free glass menu, remaining counts, loading/empty states and six responsive palettes.");

for (const palette of [...Object.values(theme.PALETTES), ...Object.values(theme.DARK_PALETTES)]) {
    colors = palette;
    for (const [available, scale] of [[320, 1], [390, 1], [430, 1], [320, 1.6]]) {
        width = available; fontScale = scale;
        hooks = { slots: [], cursor: 0, pending: [] };
        let value = "all", geometry = { x: 16, y: 220, width: available - 32, height: 44 };
        const blurTarget = { current: "existing-screen-blur" };
        const draw = () => {
            hooks.cursor = 0;
            const tree = GalleryCategorySelect({ value, onSelect: selected => { value = selected; }, blurTarget });
            while (hooks.pending.length) hooks.pending.shift()();
            return nodes(tree).find(node => node.type === "AnchoredMenu");
        };
        let menu = draw();
        const control = () => menu.props.trigger({ covered: false });
        const element = { nodeType: 1, parentElement: { nodeType: 1 },
            measureInWindow: fn => fn(geometry.x, geometry.y, geometry.width, geometry.height) };
        control().props.ref.current = element;
        assert.equal(menu.props.appearance, "connectedSelect");
        assert.equal(menu.props.variant, "select");
        assert.equal(menu.props.dimBackdrop, false);
        assert.equal(menu.props.blurTarget, blurTarget);
        assert.equal(merge(control().props.style).minHeight, theme.MIN_TOUCH);
        assert.equal(merge(control().props.style).boxShadow, palette.growthDropdownGlass.panelShadow);
        assert.deepEqual(nodes(control()).find(node => node.type === "Gradient").props.colors, palette.growthDropdownGlass.popoverPanel);
        assert.equal(nodes(control()).find(node => node.type === "GlassLighting").props.material, palette.growthDropdownGlass);
        for (const option of [{ key: "all", label: "All categories" }, ...DOMAINS, { key: "uncategorized", label: "Not categorized" }]) {
            control().props.onPress(); menu = draw();
            assert.equal(menu.props.visible, true);
            assert.deepEqual(menu.props.anchor, geometry);
            assert.equal(scrollListeners.size, 1);
            assert.equal(observers.size, 1);
            assert.equal([...observers][0].targets.length, 2, "Observe trigger and its layout ancestors");
            const covered = menu.props.trigger({ covered: true });
            assert.equal(covered.props["aria-hidden"], true);
            assert.equal(covered.props.tabIndex, -1);
            assert.equal(covered.props.importantForAccessibility, "no-hide-descendants");
            assert.equal(menu.props.header.props["aria-expanded"], true);
            assert.equal(nodes(menu.props.header).find(node => node.type === "Ionicon").props.name, "chevron-up");
            const choices = nodes(menu).filter(node => node.type === "AnchoredMenuItem");
            assert.equal(choices.length, 6);
            assert.equal(choices.filter(node => node.props.selected).length, 1);
            assert(choices.every(node => node.props.variant === "connectedSelect"));
            choices.find(node => node.props.label === option.label).props.onPress(); menu = draw();
            assert.equal(value, option.key);
            assert.equal(menu.props.visible, false);
            assert(text(control()).includes(option.label));
            assert.equal(scrollListeners.size, 0); assert.equal(observers.size, 0);
        }
        control().props.onPress(); menu = draw();
        geometry = { ...geometry, y: 140 };
        for (const listener of [...scrollListeners]) listener();
        menu = draw(); assert.deepEqual(menu.props.anchor, geometry, "Open menu follows scrolling");
        geometry = { ...geometry, width: 260 };
        [...observers][0].callback(); menu = draw();
        assert.deepEqual(menu.props.anchor, geometry, "Open menu follows ancestor layout changes");
        menu.props.header.props.onPress(); menu = draw(); assert.equal(menu.props.visible, false);
        control().props.onPress(); menu = draw(); menu.props.onClose(); menu = draw();
        assert.equal(menu.props.visible, false, "Shared dismissal closes the category menu");
        control().props.onPress(); menu = draw();
        for (const slot of hooks.slots) slot?.cleanup?.();
        assert.equal(scrollListeners.size, 0); assert.equal(observers.size, 0, "Unmount removes anchor subscriptions");
        hooks = undefined;
    }
}
console.log("Gallery category glass selector passed: six themes, mobile/large text, connected material, all category callbacks, covered-trigger accessibility, scroll/layout anchoring and cleanup. Shared-menu checks cover fold/reduced-motion/dismissal internals.");

for (const palette of [...Object.values(theme.PALETTES), ...Object.values(theme.DARK_PALETTES)]) {
    colors = palette; width = 320; fontScale = 1.6;
    hooks = { slots: [], cursor: 0, pending: [] };
    let view = { ...GALLERY_DEFAULTS, query: "Sofia", developmentCategory: "motor", visible: 20 };
    const draw = () => {
        hooks.cursor = 0;
        const tree = Collection({ result: memoryGalleryView(collectionRecords, view), view, loading: false,
            onChangeView: patch => { view = { ...view, ...patch, visible: 10 }; }, onShowMore() {}, onOpenRecord() {} });
        while (hooks.pending.length) hooks.pending.shift()();
        return tree;
    };
    const menuOf = tree => nodes(tree).find(n => n.type === "AnchoredMenu"
        && nodes(n).some(child => child.props.label === "Oldest first"));
    const triggerOf = tree => nodes(tree).find(n => n.type === "SelectTrigger" && n.props.onAnchorChange);
    const open = () => {
        let tree = draw(); const trigger = triggerOf(tree);
        trigger.props.ref.current = { measureInWindow: fn => fn(120, 300, 180, 44) };
        trigger.props.onPress(); tree = draw();
        assert.equal(menuOf(tree).props.visible, true); return tree;
    };
    for (const [category, label] of [["all", "All"], ["milestone", "Milestones"], ["memory", "Memories"]]) {
        for (const [sort, order] of [["newest", "Newest first"], ["oldest", "Oldest first"]]) {
            let tree = open(), oldSort = view.sort;
            nodes(menuOf(tree)).find(n => n.type === "AnchoredMenuItem" && n.props.label === label).props.onPress();
            tree = draw(); assert.equal(menuOf(tree).props.visible, false);
            assert.equal(view.category, category); assert.equal(view.sort, oldSort);
            tree = open();
            nodes(menuOf(tree)).find(n => n.type === "AnchoredMenuItem" && n.props.label === order).props.onPress();
            tree = draw(); assert.equal(menuOf(tree).props.visible, false);
            assert.equal(view.category, category); assert.equal(view.sort, sort);
            assert.equal(view.query, "Sofia"); assert.equal(view.developmentCategory, "motor"); assert.equal(view.visible, 10);
            assert.equal(triggerOf(tree).props.value, order, "Closed label shows only the order");
            assert(triggerOf(tree).props.accessibilityLabel.includes(label));
            tree = open();
            assert.deepEqual(nodes(menuOf(tree)).filter(n => n.type === "AnchoredMenuItem" && n.props.selected)
                .map(n => n.props.label), [label, order]);
            menuOf(tree).props.onClose(); assert.equal(menuOf(draw()).props.visible, false);
        }
    }
    for (const slot of hooks.slots) slot?.cleanup?.(); hooks = undefined;
}
console.log("Combined Gallery filter passed: all six combinations, independent state, close/reopen, retained search/category, accessible selection and pagination reset.");
