// In-memory checks: no accounts, native SDKs, network, or database.
const assert = require("node:assert/strict"), fs = require("node:fs");
const { transformSync } = require("@babel/core");
function harness(platform, configured = true, props = {}) {
    const state = [], effects = [], dependencies = [], cleanups = [];
    const errors = [], credentials = [], imports = [], responses = [], scripts = [];
    const window = {}, container = { innerHTML: "" };
    let cursor, callback, renders = 0, sdkError, lastTree;
    const React = {
        createElement(type, props, ...children) {
            if (type === "div" && props.ref) props.ref.current = container;
            return { type, props: { ...props, children: children.flat() } };
        },
        useRef(value) { const i = cursor++; return state[i] ||= { current: value }; },
        useState(value) { const i = cursor++; if (!(i in state)) state[i] = value;
            return [state[i], v => { state[i] = typeof v === "function" ? v(state[i]) : v; }]; },
        useEffect(fn, deps) { const i = cursor++;
            if (!dependencies[i] || deps.some((v, j) => v !== dependencies[i][j])) {
                dependencies[i] = deps; effects.push(() => { cleanups[i]?.(); cleanups[i] = fn(); });
            }
        },
    };
    const sdk = {
        GoogleOneTapSignIn: { configure: options => assert.equal(options.webClientId, "test-client"),
            checkPlayServices: async () => { if (sdkError) throw sdkError; },
            signIn: async () => responses.shift(), createAccount: async () => responses.shift(),
            presentExplicitSignIn: async () => responses.shift() },
        isCancelledResponse: r => r?.type === "cancelled",
        isNoSavedCredentialFoundResponse: r => r?.type === "missing",
        isSuccessResponse: r => r?.type === "success",
    };
    const document = { createElement: () => ({ remove() { this.removed = true; } }), head: { appendChild: s => scripts.push(s) } };
    const code = transformSync(fs.readFileSync(`${__dirname}/SocialSignIn.${platform}.js`, "utf8"), {
        configFile: false, babelrc: false,
        plugins: ["@babel/plugin-transform-react-jsx", "@babel/plugin-transform-modules-commonjs"],
    }).code;
    const mod = { exports: {} };
    new Function("require", "module", "exports", "process", "window", "document", code)(name => {
        if (name === "react") return { __esModule: true, default: React, ...React };
        if (name === "react-native") return { View: "View", Text: "Text" };
        if (name.endsWith("/ThemeContext")) return { useTheme: () => ({ colors: { danger: "red" } }) };
        if (name.endsWith("/theme")) return { space: { sm: 8, md: 12 } };
        if (name.endsWith("/AuthControls")) return { SocialAuthButton: "Button" };
        if (name === "react-native-nitro-google-signin") { imports.push(name); return sdk; }
        if (name.includes("fbsdk")) throw new Error("Facebook must not load");
        return { __esModule: true, default: name };
    }, mod, mod.exports, { env: configured ? { EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: "test-client" } : {} }, window, document);
    const draw = () => {
        cursor = 0;
        const tree = mod.exports.default({ onError: e => errors.push(e), onCredential: async (...args) => credentials.push(args), ...props });
        lastTree = tree;
        while (effects.length) effects.shift()();
        const nodes = n => n && typeof n === "object" ? [n, ...n.props.children.flatMap(nodes)] : [];
        return nodes(tree).find(n => n.type === "Button");
    };
    return { draw, errors, credentials, imports, responses, scripts, props,
        failSdk(error) { sdkError = error; },
        load() { window.google = { accounts: { id: { initialize: o => { callback = o.callback; }, renderButton: () => renders++ } } }; scripts.at(-1).onload(); },
        credential: value => callback(value), get renders() { return renders; }, get tree() { return lastTree; } };
}
const settle = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
async function main() {
    for (const platform of ["native", "web"]) {
        const empty = harness(platform, false);
        assert(empty.draw().props.disabled); assert.equal(empty.scripts.length, 0); assert.equal(empty.imports.length, 0);
    }
    const n = harness("native");
    const button = n.draw(); assert(!button.props.disabled); assert.equal(n.imports.length, 0);
    n.responses.push({ type: "missing" }, { type: "missing" }, { type: "success", data: { idToken: "token" } });
    await Promise.all([button.props.onPress(), button.props.onPress()]);
    assert.deepEqual(n.credentials, [["google", "token"]]);
    assert.equal(n.imports.length, 1); assert(!n.draw().props.busy);
    n.responses.push({ type: "cancelled" }); await n.draw().props.onPress(); assert.equal(n.errors.length, 0);
    n.responses.push({ type: "success", data: {} }); await n.draw().props.onPress(); assert.match(n.errors.at(-1).message, /did not complete/);
    n.failSdk(Object.assign(new Error("Cancelled"), { code: "SIGN_IN_CANCELLED" }));
    await n.draw().props.onPress(); assert.equal(n.errors.length, 1);
    n.failSdk(new Error("Play Services unavailable")); await n.draw().props.onPress(); assert.match(n.errors.at(-1).message, /Play Services/);
    n.failSdk(new Error("getCredentialAsync no provider dependencies found\nNative stack"));
    await n.draw().props.onPress();
    assert.match(n.errors.at(-1).message, /updated Google Play services/);
    assert(!n.errors.at(-1).message.includes("Native stack"));
    n.draw(); assert(JSON.stringify(n.tree).includes("requires updated Google Play services"), "Compatibility errors remain visible below the native button");
    n.failSdk(null); n.responses.push({ type: "success", data: { idToken: "retry" } });
    await n.draw().props.onPress(); assert.equal(n.credentials.length, 2);
    n.draw(); assert(!JSON.stringify(n.tree).includes("requires updated Google Play services"), "A successful retry clears the compatibility error");
    n.props.disabled = true; await n.draw().props.onPress(); assert.equal(n.credentials.length, 2);

    const w = harness("web"); w.draw(); assert.equal(w.scripts.length, 1);
    w.scripts[0].onerror(); await settle();
    assert(w.scripts[0].removed); assert.equal(w.errors.length, 1);
    w.draw().props.onPress(); w.draw(); assert.equal(w.scripts.length, 2);
    w.load(); await settle(); assert.equal(w.draw(), undefined); assert.equal(w.renders, 1);
    await Promise.all([w.credential({ credential: "web-token" }), w.credential({ credential: "duplicate" })]);
    assert.deepEqual(w.credentials, [["google", "web-token"]]);
    w.props.disabled = true; assert(w.draw().props.disabled);
    await w.credential({ credential: "disabled" }); assert.equal(w.credentials.length, 1);
    w.props.disabled = false; w.draw();
    await w.credential({}); assert.match(w.errors.at(-1).message, /did not complete/);
    await w.credential({ credential: "retry" }); assert.equal(w.credentials.length, 2);
    w.props.onCredential = async () => { throw new Error("Backend unavailable"); }; w.draw();
    await w.credential({ credential: "failure" }); assert.match(w.errors.at(-1).message, /Backend/);
    console.log("Google native/web checks passed: deferred SDK, one provider, fallback, token validation, cancellation, duplicate taps, disabled state, script retry and backend recovery.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
