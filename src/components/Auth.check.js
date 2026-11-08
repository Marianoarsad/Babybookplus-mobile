// Run: node components/Auth.check.js. In-memory UI/API checks; never creates an account.
const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path");
const { transformSync } = require("@babel/core");
const root = path.resolve(__dirname, "..");
const compile = source => transformSync(source, { babelrc: false, configFile: false,
    plugins: [require.resolve("@babel/plugin-transform-react-jsx"), require.resolve("@babel/plugin-transform-modules-commonjs")] }).code;
const theme = { exports: {} };
new Function("module", "exports", compile(fs.readFileSync(path.join(root, "theme.js"), "utf8")))(theme, theme.exports);
const p = theme.exports.authMaterial;
let size = { width: 390, height: 844, fontScale: 1 };
const nodes = node => node && typeof node === "object" ? [node, ...(node.props?.children || []).flatMap(nodes)] : [];
const find = (tree, pred) => nodes(tree).find(pred);
function harness(scene = "register") {
    const state = [], calls = [], messages = [], results = {}, callbacks = [];
    let cursor = 0;
    const React = { Fragment: "Fragment", createElement: (type, props, ...children) => ({ type, props: { ...props,
        children: children.flat(Infinity).filter(value => value != null && value !== false) } }),
        useState(initial) { const i = cursor++; if (!(i in state)) state[i] = initial;
            return [state[i], value => { state[i] = typeof value === "function" ? value(state[i]) : value; }]; },
        useRef(initial) { return state[cursor++] ||= { current: initial }; }, useMemo: fn => fn(), useCallback: fn => fn, useEffect() {} };
    const api = new Proxy({}, { get: (_, name) => async body => { calls.push({ name, body });
        if (results[name] instanceof Error) throw results[name];
        return typeof results[name] === "function" ? results[name](body) : results[name] || { user: { fullName: "Parent" }, token: "mock-only" }; } });
    const native = { View: "View", Text: "Text", TextInput: "TextInput", Image: "Image", Pressable: "Pressable", TouchableOpacity: "TouchableOpacity", ScrollView: "ScrollView",
        Platform: { OS: "web" }, Keyboard: { dismiss() {} }, StyleSheet: { create: x => x, absoluteFill: { position: "absolute", inset: 0 } }, useWindowDimensions: () => size };
    const cache = new Map();
    function load(file, env = {}) {
        const key = file + JSON.stringify(env);
        if (cache.has(key)) return cache.get(key).exports;
        const mod = { exports: {} }; cache.set(key, mod);
        new Function("require", "module", "exports", "process", compile(fs.readFileSync(path.join(root, file), "utf8")))(name => {
            if (name === "react") return { __esModule: true, default: React, ...React };
            if (name === "react-native") return native;
            if (name === "expo-blur") return { BlurTargetView: "BlurTargetView" };
            if (name.endsWith("/GlassTargetContext")) return { GlassTargetContext: { Provider: "GlassTargetProvider" } };
            if (name === "@expo/vector-icons") return { Ionicons: "Icon" };
            if (name === "react-native-safe-area-context") return { useSafeAreaInsets: () => ({ top: 24, bottom: 20 }) };
            if (name.endsWith("/theme")) return theme.exports;
            if (name.endsWith("/api")) return { api };
            if (name.endsWith("/relationship")) return { RELATIONSHIPS: ["mother", "father", "grandparent", "guardian", "other"].map(key => ({ key, label: key[0].toUpperCase() + key.slice(1) })) };
            if (name.endsWith("/ThemeContext")) return { useTheme: () => ({ colors: theme.exports.PALETTES.boy }) };
            if (name.endsWith("/Toast")) return { useToast: () => ({ error: message => messages.push(message) }) };
            if (name.endsWith(".png")) return name;
            if (name.endsWith("/AuthControls")) return { NeumorphicInput: "Input", PrivacyCheckbox: "Consent", RelationshipDropdown: "Role", SignupProgressIndicator: "Dots", SocialAuthButton: "SocialAuthButton" };
            if (name.endsWith("/Field")) return { __esModule: true, default: "Field", FieldShell: "FieldShell" };
            if (name === "react-native-nitro-google-signin") return { GoogleOneTapSignIn: { configure() {} } };
            if (name === "react-native-fbsdk-next") return {};
            if (name === "expo-haptics") return { selectionAsync: async () => {} };
            return { __esModule: true, default: name.split("/").at(-1) };
        }, mod, mod.exports, { env });
        return mod.exports;
    }
    const Auth = load("components/Auth.js").default;
    const draw = () => { cursor = 0; return Auth({ initialScene: scene, onLoginSuccess: (...args) => callbacks.push(["login", ...args]),
        onProfessional: () => callbacks.push(["professional"]), onBack: () => callbacks.push(["back"]) }); };
    const field = (tree, label) => find(tree, node => ["Input", "Field"].includes(node.type) && node.props.label === label);
    const button = (tree, label) => find(tree, node => [node.props?.title, node.props?.label, node.props?.action, node.props?.accessibilityLabel].includes(label) && node.props.onPress);
    return { draw, field, button, calls, messages, results, callbacks, load, render(fn) { cursor = 0; return fn(); } };
}
function fill(h, values) { for (const [label, value] of Object.entries(values)) h.field(h.draw(), label).props.onChangeText(value); }
const valid = { "First name": "  María Clara  ", Surname: " de la Cruz  ", "Email address": " parent@example.com ", Password: "secure123", "Confirm password": "secure123" };
async function main() {
    const h = harness();
    assert(!nodes(h.draw()).some(node => node.props?.prompt === "Already have an account?"));
    h.button(h.draw(), "Continue").props.onPress();
    assert.equal(h.field(h.draw(), "First name").props.error, "First name is required");
    assert.equal(h.field(h.draw(), "Surname").props.error, "Surname is required");
    fill(h, { ...valid, "Email address": "bad", Password: "short", "Confirm password": "wrong" });
    h.button(h.draw(), "Continue").props.onPress();
    for (const label of ["Email address", "Password", "Confirm password"]) assert(h.field(h.draw(), label).props.error);
    fill(h, valid); h.button(h.draw(), "Continue").props.onPress();
    let tree = h.draw();
    assert.equal(find(tree, node => node.type === "Dots").props.step, 2);
    assert.equal(find(tree, node => node.type === "Consent").props.checked, false);
    await h.button(tree, "Create Account").props.onPress();
    tree = h.draw(); assert(find(tree, node => node.type === "Role").props.error);
    assert.equal(h.calls.length, 0);
    for (const role of ["mother", "father", "grandparent", "guardian", "other"]) {
        find(h.draw(), node => node.type === "Role").props.onChange(role);
        assert.equal(find(h.draw(), node => node.type === "Role").props.value, role);
    }
    find(h.draw(), node => node.type === "Consent").props.onChange(true);
    h.button(h.draw(), "Back").props.onPress();
    assert.equal(h.field(h.draw(), "First name").props.value, valid["First name"]);
    h.button(h.draw(), "Continue").props.onPress();
    assert.equal(find(h.draw(), node => node.type === "Role").props.value, "other");
    h.button(h.draw(), "Read the full privacy agreement").props.onPress();
    assert(find(h.draw(), node => node.type?.name === "PrivacyModal").props.visible);
    h.results.register = new Error("Server unavailable");
    await h.button(h.draw(), "Create Account").props.onPress();
    assert(h.messages.includes("Server unavailable"));
    let resolve;
    h.results.register = () => new Promise(done => { resolve = done; });
    const action = h.button(h.draw(), "Create Account").props.onPress;
    const pending = action(); await action();
    assert.equal(h.calls.length, 2, "A second press while pending must not make a duplicate request");
    assert(h.button(h.draw(), "Create Account").props.loading);
    assert.deepEqual(h.calls.at(-1).body, { fullName: "María Clara de la Cruz", email: "parent@example.com", password: "secure123", relationship: "other", consentAccepted: true });
    resolve({ user: { fullName: "María Clara de la Cruz" }, token: "mock-only" }); await pending;
    assert.equal(h.callbacks.at(-1)[0], "login");

    const login = harness("login");
    await login.button(login.draw(), "Log In").props.onPress(); assert.equal(login.calls.length, 0);
    fill(login, { "Email address": " parent@example.com ", Password: "password" });
    login.results.login = new Error("Invalid credentials");
    await login.button(login.draw(), "Log In").props.onPress(); assert(login.messages.includes("Invalid credentials"));
    delete login.results.login; await login.button(login.draw(), "Log In").props.onPress();
    assert.deepEqual(login.calls.at(-1), { name: "login", body: { email: "parent@example.com", password: "password" } });
    login.button(login.draw(), "Forgot password?").props.onPress();
    fill(login, { "Email address": "parent@example.com" });
    await login.button(login.draw(), "Send Reset Link").props.onPress(); assert.equal(login.calls.at(-1).name, "forgotPassword");
    login.button(login.draw(), "Back to login").props.onPress();
    login.button(login.draw(), "Healthcare professional access").props.onPress();
    login.button(login.draw(), "Back").props.onPress();
    assert(login.callbacks.some(item => item[0] === "professional")); assert(login.callbacks.some(item => item[0] === "back"));
    login.button(login.draw(), "Create an account").props.onPress(); assert(login.field(login.draw(), "First name"));
    login.button(login.draw(), "Back").props.onPress(); assert(login.button(login.draw(), "Log In"));

    for (const status of ["authenticated", "registration_required", "link_required"]) {
        const social = harness("login");
        social.results.socialAuth = { status, user: {}, token: "mock", socialToken: "ticket", profile: { name: "María Clara de la Cruz", email: "verified@example.com", provider: "google" } };
        await find(social.draw(), node => node.type === "SocialSignIn").props.onCredential("google", "credential");
        if (status === "authenticated") assert.equal(social.callbacks.at(-1)[0], "login");
        else if (status === "link_required") {
            fill(social, { "Current BabyBook+ password": "password" });
            await social.button(social.draw(), "Confirm and Link").props.onPress();
            assert.deepEqual(social.calls.at(-1), { name: "socialLink", body: { socialToken: "ticket", password: "password" } });
        } else {
            assert.equal(social.field(social.draw(), "Email address").props.editable, false);
            assert.equal(social.field(social.draw(), "First name").props.value, "");
            fill(social, { "First name": "María Clara", Surname: "de la Cruz", "Create a backup password": "secure123", "Confirm password": "secure123" });
            social.button(social.draw(), "Continue").props.onPress();
            find(social.draw(), node => node.type === "Role").props.onChange("mother");
            find(social.draw(), node => node.type === "Consent").props.onChange(true);
            await social.button(social.draw(), "Create Account").props.onPress();
            assert.equal(social.calls.at(-1).name, "socialRegister");
            assert.equal(social.calls.at(-1).body.fullName, "María Clara de la Cruz");
            assert.equal(social.calls.at(-1).body.socialToken, "ticket");
        }
    }
    for (const width of [320, 360, 390, 430]) {
        for (const fontScale of [1, 1.6]) {
            size = { width, height: 844, fontScale };
            const tree = harness().draw(), name = find(tree, node => node.type === "Input" && node.props?.label === "First name");
            assert.equal(!!name.props.style, (Math.min(width, 430) - (width <= 320 ? 40 : 48)) / fontScale >= 324);
            const image = find(tree, node => node.type === "Image"); assert(image.props.style[1].width < width);
        }
    }
    const c = harness(), controls = c.load("components/auth/AuthControls.js");
    const dots = controls.SignupProgressIndicator({ step: 2 });
    assert.equal(nodes(dots).filter(node => node.type === "Gradient").length, 2);
    assert.deepEqual(nodes(dots).find(node => node.props?.testID === "signup-dot-2").props.colors, p.activeDot);
    for (const checked of [false, true]) {
        let changed;
        const tree = controls.PrivacyCheckbox({ checked, onChange: value => { changed = value; } });
        tree.props.onPress(); assert.equal(changed, !checked); assert.equal(tree.props.accessibilityState.checked, checked);
        assert.equal(tree.props["aria-checked"], checked);
        changed = undefined; let prevented = false;
        tree.props.onKeyDown({ key: " ", preventDefault() { prevented = true; } });
        assert.equal(changed, !checked); assert(prevented);
    }
    let consentChanged = false;
    controls.PrivacyCheckbox({ checked: false, disabled: true, onChange: () => { consentChanged = true; } }).props.onKeyDown({ key: " ", preventDefault() {} });
    assert.equal(consentChanged, false);
    let selected;
    const dropdown = () => controls.RelationshipDropdown({ value: selected, onChange: value => { selected = value; } });
    let menu = c.render(dropdown);
    find(menu, node => node.props?.ref).props.ref.current = { measureInWindow: fn => fn(24, 400, 342, 52) };
    find(menu, node => node.type === "SelectTrigger").props.onPress();
    menu = c.render(dropdown); assert(find(menu, node => node.type === "OptionSheet").props.visible);
    find(menu, node => node.type === "OptionSheet").props.onSelect("grandparent"); assert.equal(selected, "grandparent");
    assert.equal(find(c.render(dropdown), node => node.type === "OptionSheet").props.visible, false);
    for (const platform of ["web", "native"]) {
        const provider = harness(), Component = provider.load(`components/auth/SocialSignIn.${platform}.js`).default;
        const tree = provider.render(() => Component({}));
        const buttons = nodes(tree).filter(node => node.type === "SocialAuthButton");
        assert.equal(buttons.length, 1); assert(buttons.every(node => node.props.disabled));
        assert(!JSON.stringify(tree).includes("setup pending"));
    }
    const f = harness(), { default: Field, FieldShell } = f.load("components/ui/Field.js");
    const drawField = () => Field({ label: "Password", secureTextEntry: true, appearance: "auth", value: "private", autoComplete: "current-password" });
    let fieldTree = f.render(drawField);
    assert.equal(find(fieldTree, node => node.type === "TextInput").props.secureTextEntry, true);
    find(fieldTree, node => node.props?.accessibilityLabel === "Show password").props.onPress();
    fieldTree = f.render(drawField);
    assert.equal(find(fieldTree, node => node.type === "TextInput").props.secureTextEntry, false);
    find(fieldTree, node => node.type === "TextInput").props.onFocus({});
    assert.equal(f.render(drawField).props.focused, true);
    const shell = f.render(() => FieldShell({ label: "Email address", appearance: "auth", focused: true }));
    assert(nodes(shell).some(node => node.type === "Gradient" && node.props.style.boxShadow.includes("inset 3px 4px")));
    assert.equal(find(shell, node => node.props.style?.borderCurve === "continuous").props.style.borderRadius, theme.exports.radius.lg);
    const capsule = f.render(() => FieldShell({ label: "Consultation Code", appearance: "auth", borderRadius: theme.exports.radius.pill }));
    assert.equal(find(capsule, node => node.props.style?.borderCurve === "continuous").props.style.borderRadius, theme.exports.radius.pill);
    assert.equal(find(capsule, node => node.type === "Gradient").props.style.borderRadius, theme.exports.radius.pill);
    assert.equal(f.render(() => Field({ label: "Code", appearance: "auth", borderRadius: theme.exports.radius.pill })).props.borderRadius, theme.exports.radius.pill);
    const capsuleInput = find(f.render(() => Field({ label: "Code", appearance: "auth", borderRadius: theme.exports.radius.pill })), node => node.type === "TextInput");
    assert.equal(capsuleInput.props.style[0].borderRadius, theme.exports.radius.pill);
    assert.equal(capsuleInput.props.style[0].outlineStyle, "none", "The shell's existing blue focus edge replaces a square browser outline");
    assert.equal(find(f.render(drawField), node => node.type === "TextInput").props.style[0].outlineStyle, undefined);
    assert(!nodes(f.render(() => FieldShell({ label: "Ordinary field" }))).some(node => node.type === "Gradient"));
    const b = harness(), Button = b.load("components/ui/Button.js").default;
    let submitted = 0;
    const raised = Button({ title: "Log In", variant: "auth", icon: "arrow-forward", iconPosition: "right", onPress: () => submitted++ });
    const face = find(raised, node => node.type === "Gradient"); assert.deepEqual(face.props.colors, p.primary);
    const accessArtwork = login.button(login.draw(), "Healthcare professional access").props.icon;
    assert.equal(accessArtwork.type, "Image"); assert(accessArtwork.props.source.endsWith("/navbar/health-blue.png"));
    assert.equal(accessArtwork.props.accessible, false);
    assert(nodes(Button({ title: "Healthcare professional access", variant: "authSecondary", icon: accessArtwork })).includes(accessArtwork));
    const rightArtwork = Button({ title: "Artwork", variant: "auth", icon: accessArtwork, iconPosition: "right" });
    assert(find(rightArtwork, node => node.type === "View" && node.props.style?.right === 0));
    assert(raised.props.style({}).some(style => style?.boxShadow?.includes("0 8px 18px")));
    Button({ title: "Log In", variant: "auth", loading: true, onPress: () => submitted++ }).props.onPress();
    assert.equal(submitted, 0);
    assert(!nodes(Button({ title: "Ordinary button" })).some(node => node.type === "Gradient"));
    const Back = b.load("components/ui/AuthBackButton.js").default;
    let wentBack = 0;
    const back = Back({ onPress: () => wentBack++ });
    const backStyle = Object.assign({}, ...back.props.style({}).filter(Boolean));
    assert.equal(back.props.accessibilityLabel, "Back");
    assert.deepEqual([backStyle.width, backStyle.height, backStyle.borderRadius], [44, 44, 22]);
    assert.equal(backStyle.boxShadow, p.controlShadow);
    assert.equal(find(back, node => node.type === "Icon").props.name, "arrow-back");
    assert.equal(find(back, node => node.type === "Icon").props.color, p.azure);
    assert.deepEqual(find(back, node => node.type === "Gradient").props.colors, p.control);
    assert(back.props.style({ focused: true }).some(style => style?.outlineColor === p.focus));
    back.props.onPress(); assert.equal(wentBack, 1);
    const disabledBack = Back({ disabled: true, onPress() {} });
    assert.equal(disabledBack.props.disabled, true);
    assert.equal(disabledBack.props.accessibilityState.disabled, true);
    assert(disabledBack.props.style({}).some(style => style?.opacity === 0.55));
    for (const name of ["auth-login-hero.png", "auth-register-hero.png", "auth-details-hero.png"]) {
        const image = await require("jimp-compact").read(path.join(root, "assets", name));
        const { width, height, data } = image.bitmap;
        assert.equal(width / height, 1.5); assert(width >= 1000);
        for (const [x, y] of [[0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1]]) assert.equal(data[(y * width + x) * 4 + 3], 0);
        let visible = 0, clear = 0;
        for (let i = 3; i < data.length; i += 4) { if (data[i] >= 240) visible++; if (!data[i]) clear++; }
        assert(visible > width * height * .1 && clear > width * height * .1);
    }
    console.log("Auth checks passed: credentials, split names, payloads, consent/roles, duplicate submission, errors, social flows, navigation, responsive layouts and disabled providers.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
