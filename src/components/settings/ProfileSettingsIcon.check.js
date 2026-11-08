// Run from front-end: node components/settings/ProfileSettingsIcon.check.js.
const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path");
const { transformSync } = require("@babel/core");
const root = path.resolve(__dirname, "../..");
const compile = file => transformSync(fs.readFileSync(path.join(root, file), "utf8"), { babelrc: false, configFile: false,
    plugins: ["@babel/plugin-transform-react-jsx", "@babel/plugin-transform-modules-commonjs"] }).code;
const theme = { exports: {} };
new Function("module", "exports", compile("theme.js"))(theme, theme.exports);
let palette, state = [], cursor = 0, effects = [], deps = [];
const react = { createElement: (type, props, ...children) => ({ type, props: { ...props, children: children.flat(Infinity) } }),
    useId: () => "fixture-id",
    useState(initial) { const i = cursor++; if (!(i in state)) state[i] = initial; return [state[i], v => state[i] = v]; },
    useEffect(fn, values) { if (values.some((v, i) => deps[i] !== v)) { effects.push(fn); deps = values; } } };
function load(file) {
    const module = { exports: {} };
    const imports = { react: { __esModule: true, default: react, ...react }, "react-native": { View: "View", Image: "Image", Text: "Text" },
        "../../theme": theme.exports, "../../context/ThemeContext": { useTheme: () => ({ colors: palette }) },
        "../ui/ConsultationsAppointmentsCard": { DashboardSurface: "Surface" },
        "react-native-svg": { __esModule: true, default: "Svg", Defs: "Defs", LinearGradient: "LinearGradient", Stop: "Stop", Path: "Path" } };
    new Function("require", "module", "exports", compile(file))(name => {
        if (name.endsWith(".png")) { const asset = path.resolve(root, path.dirname(file), name); assert(fs.existsSync(asset), asset); return asset; }
        assert(name in imports, name); return imports[name];
    }, module, module.exports);
    return module.exports;
}
const icons = load("components/settings/ProfileSettingsIcon.js"), avatar = load("components/ui/Avatar.js");
const drawAvatar = props => { cursor = 0; return avatar.default(props); };
for (const palettes of [theme.exports.PALETTES, theme.exports.DARK_PALETTES]) for (palette of Object.values(palettes)) {
    assert.equal(Object.keys(icons.PROFILE_SETTINGS_ICONS).length, 12);
    assert(icons.PROFILE_SETTINGS_ICONS.reminders.endsWith(path.join("header", "notifications-blue.png")));
    for (const kind of Object.keys(icons.PROFILE_SETTINGS_ICONS)) {
        const tree = icons.default({ kind });
        assert.equal(tree.props.style.width, 44); assert.equal(tree.props.pointerEvents, "none"); assert(tree.props["aria-hidden"]);
        const [surface, image] = tree.props.children;
        assert.deepEqual(surface.props.colors, palette.profileSettings.iconSurface);
        assert.equal(image.props.source, icons.PROFILE_SETTINGS_ICONS[kind]); assert.equal(image.props.resizeMode, "contain");
        assert.equal(image.props.style.width, image.props.style.height);
        assert.equal(image.props.style.zIndex, 1, "Raster artwork stays above its native surface");
        assert.equal(image.props.style.position, "relative");
    }
    for (const kind of ["system", "light", "dark", "mail", "cloud"]) {
        const tree = icons.default({ kind });
        assert.equal(tree.props.children[1].props.children[0].type, "Svg");
        assert.equal(tree.props.children[1].props.children[0].props.viewBox, "0 0 48 48");
    }
    state = []; deps = []; effects = [];
    let fallback = drawAvatar({ name: "Jamie Example" });
    assert.equal(fallback.props.children[0].props.style.color, palette.primary, "Default callers retain their own palette");
    fallback = drawAvatar({ name: "Jamie Example", initialsColor: palette.profileSettings.accent });
    assert.equal(fallback.props.children[0].props.style.color, palette.profileSettings.accent);
    assert.equal(fallback.props.children[0].props.children[0], "JE");
    let photo = drawAvatar({ name: "Jamie Example", uri: "photo-one", initialsColor: palette.profileSettings.accent });
    while (effects.length) effects.shift()();
    assert.equal(photo.type, "Image"); photo.props.onError();
    fallback = drawAvatar({ name: "Jamie Example", uri: "photo-one", initialsColor: palette.profileSettings.accent });
    assert.equal(fallback.type, "View");
    drawAvatar({ name: "Jamie Example", uri: "photo-two" }); while (effects.length) effects.shift()();
    assert.equal(drawAvatar({ name: "Jamie Example", uri: "photo-two" }).props.source.uri, "photo-two");
}
console.log("Profile artwork passed: twelve assets and five scoped glyphs, consistent badges across six palettes, optional initials tint and unchanged photo failure/retry behavior.");
