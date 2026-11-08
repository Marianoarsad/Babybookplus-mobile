const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path"), { transformSync } = require("@babel/core");
const compile = file => transformSync(fs.readFileSync(path.resolve(__dirname, file), "utf8"), { babelrc: false, configFile: false,
    plugins: ["@babel/plugin-transform-react-jsx", "@babel/plugin-transform-modules-commonjs"] }).code;
const m = { exports: {} }; new Function("module", "exports", compile("../../theme.js"))(m, m.exports); const theme = m.exports;
let colors, state = [], cursor = 0;
const react = { createElement: (type, props, ...children) => ({ type, props: { ...props, children: children.flat(Infinity) } }),
    useState(initial) { const i = cursor++; if (!(i in state)) state[i] = initial; return [state[i], v => state[i] = typeof v === "function" ? v(state[i]) : v]; } };
const imports = { react: { __esModule: true, default: react, ...react },
    "react-native": { Platform: { OS: "web" }, View: "View", Text: "Text", TextInput: "Input", TouchableOpacity: "Touchable", Pressable: "Pressable" },
    "@expo/vector-icons": { Ionicons: "Icon" }, "../../theme": theme, "./Gradient": { __esModule: true, default: "Gradient" },
    "./PulseLoader": { __esModule: true, default: "Loader" }, "../../context/ThemeContext": { useTheme: () => ({ colors }) },
    "../../utils/numericInput.cjs": require("../../utils/numericInput.cjs"),
    "../common/Cards": { SectionContainerCard: "Card" }, "../ui/ConsultationsAppointmentsCard": { DashboardSurface: "Surface" } };
function load(file) { const mod = { exports: {} }; new Function("require", "module", "exports", compile(file))(name => {
    assert(name in imports, name); return imports[name];
}, mod, mod.exports); return mod.exports; }
const field = load("../ui/Field.js"), button = load("../ui/Button.js").default, card = load("SettingsControls.js").SettingsCard;
const nodes = n => n && typeof n === "object" ? [n, ...(n.props.children || []).flatMap(nodes)] : [];
const find = (n, type) => nodes(n).find(n => n.type === type);
for (const palettes of [theme.PALETTES, theme.DARK_PALETTES]) for (colors of Object.values(palettes)) {
    const shell = field.FieldShell({ label: "Name", appearance: "settings" });
    assert.equal(shell.props.children[0].props.style.color, colors.profileSettings.field.secondary);
    assert.deepEqual(find(shell, "Gradient").props.colors, colors.profileSettings.field.input);
    assert.equal(find(shell, "Gradient").props.style.boxShadow, colors.profileSettings.field.inputShadow);
    const auth = field.FieldShell({ label: "Name", appearance: "auth" });
    assert.deepEqual(find(auth, "Gradient").props.colors, theme.authMaterial.input);
    assert.deepEqual(find(field.FieldShell({ appearance: "neumorphic" }), "Gradient").props.colors, colors.sunkenInput.input);
    state = []; cursor = 0; let tree = field.default({ label: "Password", secureTextEntry: true, appearance: "settings", value: "fixture-only" });
    assert.equal(find(tree, "Input").props.secureTextEntry, true); assert.equal(find(tree, "Input").props.style[0].color, colors.profileSettings.field.title);
    find(tree, "Touchable").props.onPress(); cursor = 0; tree = field.default({ label: "Password", secureTextEntry: true, appearance: "settings", value: "fixture-only" });
    assert.equal(find(tree, "Input").props.secureTextEntry, false); assert.equal(find(tree, "Touchable").props["aria-pressed"], true);
    let calls = 0; const pending = button({ title: "Save", variant: "settings", loading: true, onPress: () => calls++ });
    assert(pending.props.disabled); pending.props.onPress(); assert.equal(calls, 0); assert(find(pending, "Loader"));
    const regularPending = button({ title: "Save", loading: true });
    assert.equal(regularPending.props["aria-busy"], true); assert.equal(regularPending.props["aria-disabled"], true);
    const secondary = button({ title: "Secondary", variant: "settingsSecondary" }); assert.deepEqual(find(secondary, "Gradient").props.colors, colors.profileSettings.control);
    const legacy = button({ title: "Auth", variant: "authSecondary" }); assert.deepEqual(find(legacy, "Gradient").props.colors, theme.authMaterial.control);
    const settingsCard = card({ title: "Settings" }); assert.equal(settingsCard.props.background.props.radius, 24); assert.equal(settingsCard.props.style[0].boxShadow, colors.profileSettings.panelShadow);
}
console.log("Settings controls passed: six palettes, themed recessed fields, unchanged Auth materials, reveal semantics, busy button guard, secondary materials and shared Profile elevation.");
