// Fixture-only rendering and service checks. Run from front-end.
const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path");
const { transformSync } = require("@babel/core");
const compile = file => transformSync(fs.readFileSync(path.resolve(__dirname, file), "utf8"), { babelrc: false, configFile: false,
    plugins: ["@babel/plugin-transform-react-jsx", "@babel/plugin-transform-modules-commonjs"] }).code;
const pure = file => { const m = { exports: {} }; new Function("module", "exports", compile(file))(m, m.exports); return m.exports; };
const theme = pure("../../theme.js"), relationship = pure("../../utils/relationship.js");
const nodes = n => n && typeof n === "object" ? [n, ...(n.props.children || []).flatMap(nodes)] : [];
const text = n => n && typeof n === "object" ? (n.props.children || []).map(text).join("") : String(n ?? "");
function harness(file) {
    const state = [], effects = [], calls = [], notices = [];
    let cursor = 0, pending, failure = false;
    const user = { email: "parent@example.test", phoneNumber: "09170000000", city: "Fixture City", consentDate: "2026-01-01", retentionUntil: "2027-01-01", consentReviewDue: false };
    const env = { language: "en", lead: "3", colors: theme.PALETTES.boy };
    const react = { createElement: (type, props, ...children) => ({ type, props: { ...props, children: children.flat(Infinity) } }),
        Fragment: "Fragment", useMemo: f => f(), useRef: initial => ({ current: initial }),
        useState(initial) { const i = cursor++; if (!(i in state)) state[i] = typeof initial === "function" ? initial() : initial;
            return [state[i], v => state[i] = typeof v === "function" ? v(state[i]) : v]; },
        useEffect(fn, deps) { const i = cursor++; if (!(i in state)) { state[i] = deps; effects.push(fn); } } };
    class Value { constructor(v) { this.value = v; } setValue(v) { this.value = v; } interpolate(v) { return v.outputRange[this.value]; } }
    const service = name => async payload => { calls.push({ name, payload }); if (pending) await pending; if (failure) throw Error("Fixture failure");
        return { user: { ...user, ...payload, email: payload?.newEmail || user.email } }; };
    const imports = { react: { __esModule: true, default: react, ...react },
        "react-native": { Platform: { OS: "web" }, View: "View", Text: "Text", Image: "Image", TouchableOpacity: "Touchable", Animated: { ScrollView: "Scroll", View: "AnimatedView", Value }, StyleSheet: { create: s => s }, Linking: { openURL: service("mail") } },
        "@expo/vector-icons": { Ionicons: "Icon" }, "../../theme": theme, "../../app.json": { expo: { version: "fixture-version" } },
        "../../utils/relationship": relationship, "../../utils/numericInput.cjs": require("../../utils/numericInput.cjs"),
        "../../utils/confirmationPosition.cjs": { measureConfirmationAnchor: (_, __, done) => done({ x: 10, y: 200, width: 280, height: 48 }) },
        "../../utils/api": { api: { me: async () => ({ user }), updateMe: service("profile"), changeEmail: service("email"), changePassword: service("password"), renewConsent: service("renew"), deleteAccount: service("delete") } },
        "../../utils/storageAdapter": { storage: { getItem: async () => env.lead, setItem: async (key, value) => { env.lead = value; calls.push({ name: key, payload: value }); } } },
        "../../utils/notifications": { notificationsAvailable: () => false },
        "../../context/ThemeContext": { useTheme: () => ({ colors: env.colors }) },
        "../../context/LanguageContext": { useLanguage: () => ({ language: env.language, setLanguage: key => env.language = key, t: key => key }) },
        "../../context/ScrollContext": { useScroll: () => ({ scrollProps: {} }) },
        "../../utils/responsive": { useScreenPadTop: () => 80, useScreenPadBottom: () => 140 },
        "./SettingsControls": { SettingsCard: "Card", selectionStyle: theme.settingsSelectionStyle },
        "../common/Cards": { RadioRow: "Radio" }, "../ui/Skeleton": { SkeletonBlock: "Skeleton" },
        "../ui/RecordFormSheet": { DeleteConfirmation: "DeleteConfirmation" },
        "../ui/Toast": { useToast: () => ({ success: msg => notices.push(msg), error: msg => notices.push(msg) }) } };
    for (const [name, type] of Object.entries({ Field: "Field", Button: "Button", Avatar: "Avatar", KeyboardAvoider: "Keyboard", InfoCallout: "Info", Gradient: "Gradient", AnimatedReveal: "Reveal" }))
        imports["../ui/" + name] = { __esModule: true, default: type };
    imports["../ui/useReducedMotion"] = { __esModule: true, default: () => true };
    imports["./ProfileSettingsIcon"] = { __esModule: true, default: "Artwork" };
    const m = { exports: {} };
    new Function("require", "module", "exports", compile(file))(name => {
        if (name.endsWith(".png")) return name;
        assert(name in imports, name); return imports[name];
    }, m, m.exports);
    const render = (props = {}) => { cursor = 0; return m.exports.default(props); };
    const settle = async () => { while (effects.length) effects.shift()(); for (let i = 0; i < 8; i++) await Promise.resolve(); };
    const find = (tree, kind, label) => nodes(tree).find(n => n.type === kind && (label == null || n.props.label === label || n.props.title === label || n.props.accessibilityLabel === label));
    return { env, user, calls, notices, render, settle, find, fail: value => failure = value, defer: value => pending = value };
}
(async () => {
    for (const palette of [theme.PALETTES.boy, theme.DARK_PALETTES.boy]) {
        for (const file of ["ThemePreferences.js", "LanguagePreferences.js", "GeneralSettings.js", "EditProfile.js", "ChangePassword.js", "PrivacySettings.js", "HelpSupport.js", "AboutApp.js"]) {
            const h = harness(file); h.env.colors = palette; let tree = h.render({ parentName: "Jamie Example" }); await h.settle(); tree = h.render({ parentName: "Jamie Example" });
            assert(nodes(tree).some(n => n.type === "Scroll")); assert(nodes(tree).some(n => n.type === "Card"));
            for (const field of nodes(tree).filter(n => n.type === "Field")) { assert.equal(field.props.appearance, "settings"); assert(!field.props.hideReveal); }
            for (const radio of nodes(tree).filter(n => n.type === "Radio")) assert.equal(radio.props.appearance, "settings");
        }
        assert.equal(theme.settingsSelectionStyle(palette, false).boxShadow, palette.profileSettings.insetShadow);
        assert.equal(theme.settingsSelectionStyle(palette, true).boxShadow, palette.profileSettings.iconShadow);
    }
    let h = harness("ThemePreferences.js"), picked = [], tree = h.render({ onThemeOverrideChange: k => picked.push(k), onSchemeOverrideChange: k => picked.push(k) });
    const radios = nodes(tree).filter(n => n.type === "Radio"); assert.equal(radios.length, 6);
    radios[1].props.onPress(); radios[5].props.onPress(); assert.deepEqual(picked, ["girl", "dark"]);
    h = harness("LanguagePreferences.js"); tree = h.render(); const langs = nodes(tree).filter(n => n.props.accessibilityRole === "radio");
    assert.equal(langs.length, 3); langs[2].props.onPress(); assert.equal(h.env.language, "tag"); assert(text(tree).includes("FIL"));
    h = harness("GeneralSettings.js"); h.render(); await h.settle(); tree = h.render();
    assert(h.find(tree, "Radio", "3 days before").props.selected); await h.find(tree, "Radio", "1 week before").props.onPress(); assert.equal(h.env.lead, "7"); assert(h.find(tree, "Info"));
    h = harness("EditProfile.js"); const props = { parentName: "Jamie Example", parentRelationship: "mother", onUpdateParentName: v => picked.push(v) };
    h.render(props); await h.settle(); tree = h.render(props);
    h.find(tree, "Field", "Full Name").props.onChangeText("   "); tree = h.render(props); await h.find(tree, "Button", "Save Changes").props.onPress(); assert.equal(h.calls.length, 0);
    h.find(tree, "Field", "Full Name").props.onChangeText(" Jamie Updated "); tree = h.render(props); await h.find(tree, "Button", "Save Changes").props.onPress(); assert.equal(h.calls[0].payload.fullName, "Jamie Updated"); assert(!("email" in h.calls[0].payload));
    tree = h.render(props); await h.find(tree, "Button", "Change Email").props.onPress(); assert.equal(h.calls.length, 1);
    h.find(tree, "Field", "New Email Address").props.onChangeText("new@example.test"); tree = h.render(props); await h.find(tree, "Button", "Change Email").props.onPress(); assert.equal(h.calls.length, 1);
    h.find(tree, "Field", "Current Password").props.onChangeText("fixture-current"); tree = h.render(props); h.fail(true); await h.find(tree, "Button", "Change Email").props.onPress(); tree = h.render(props); assert.equal(h.find(tree, "Field", "Current Password").props.value, "fixture-current"); assert.equal(h.find(tree, "Field", "Current Password").props.error, "Fixture failure");
    h.fail(false); await h.find(tree, "Button", "Change Email").props.onPress(); tree = h.render(props); assert.equal(h.find(tree, "Field", "Current Password").props.value, "");
    h = harness("ChangePassword.js"); tree = h.render(); await h.find(tree, "Button", "Update Password").props.onPress(); assert.equal(h.calls.length, 0);
    for (const [key, value] of [["Current Password", "fixture-current"], ["New Password", "NewFixture123!"], ["Confirm New Password", "different"]]) h.find(tree, "Field", key).props.onChangeText(value);
    tree = h.render(); await h.find(tree, "Button", "Update Password").props.onPress(); assert.equal(h.calls.length, 0);
    h.find(tree, "Field", "Confirm New Password").props.onChangeText("NewFixture123!"); tree = h.render(); h.fail(true); await h.find(tree, "Button", "Update Password").props.onPress(); assert(h.notices.includes("Fixture failure"));
    h.fail(false); await h.find(tree, "Button", "Update Password").props.onPress(); tree = h.render(); assert(nodes(tree).filter(n => n.type === "Field").every(n => n.props.value === ""));
    h = harness("PrivacySettings.js"); let deleted = 0; const privacyProps = { onAccountDeleted: () => deleted++ };
    h.render(privacyProps); await h.settle(); tree = h.render(privacyProps);
    assert(text(tree).includes("Not yet")); assert.equal(h.calls.length, 0);
    h.find(tree, "Button", "Withdraw & delete my data").props.onPress({}); tree = h.render(privacyProps); let dialog = h.find(tree, "DeleteConfirmation");
    assert(dialog.props.visible && dialog.props.anchor); assert.equal(h.calls.length, 0); dialog.props.onCancel(); tree = h.render(privacyProps); assert(!h.find(tree, "DeleteConfirmation").props.visible);
    h.find(tree, "Button", "Withdraw & delete my data").props.onPress({}); tree = h.render(privacyProps); h.fail(true); await h.find(tree, "DeleteConfirmation").props.onConfirm(); tree = h.render(privacyProps); assert.equal(deleted, 0); assert(h.find(tree, "DeleteConfirmation").props.visible);
    h.fail(false); let release; h.defer(new Promise(r => release = r)); const deletion = h.find(tree, "DeleteConfirmation").props.onConfirm(); tree = h.render(privacyProps); assert(h.find(tree, "DeleteConfirmation").props.busy); assert.equal(deleted, 0); release(); await deletion; assert.equal(deleted, 1); h.defer(null);
    await h.find(tree, "Button", "Renew data retention for another year").props.onPress(); assert(h.calls.some(c => c.name === "renew"));
    h = harness("HelpSupport.js"); tree = h.render(); let rows = nodes(tree).filter(n => typeof n.type === "function" && n.type.name === "FaqRow"); assert.equal(rows.length, 4); assert(rows.every(n => !n.props.open));
    rows[0].props.onPress(); tree = h.render(); rows = nodes(tree).filter(n => n.type?.name === "FaqRow"); assert(rows[0].props.open);
    rows[1].props.onPress(); tree = h.render(); rows = nodes(tree).filter(n => n.type?.name === "FaqRow"); assert(rows[1].props.open && !rows[0].props.open);
    h = harness("AboutApp.js"); assert(text(h.render()).includes("fixture-version"));
    console.log("Settings checks passed: all eight screens/light+dark, separate themes, language/reminder keys, account payloads/validation/failure retry, pending consent confirmation, one-open FAQs, configured version.");
})().catch(e => { console.error(e); process.exitCode = 1; });
