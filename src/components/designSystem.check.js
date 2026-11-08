// Visual contracts only. No server, account, device or record mutations.
const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path");
const { transformSync } = require("@babel/core"), { parse } = require("@babel/parser");
const read = file => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const moduleTheme = { exports: {} };
new Function("module", "exports", transformSync(read("theme.js"), { configFile: false, babelrc: false,
    plugins: ["@babel/plugin-transform-modules-commonjs"] }).code)(moduleTheme, moduleTheme.exports);
const theme = moduleTheme.exports;
const luminance = hex => hex.slice(1).match(/../g).map(v => parseInt(v, 16) / 255)
    .map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
    .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05);
for (const p of [...Object.values(theme.PALETTES), ...Object.values(theme.DARK_PALETTES)]) {
    assert.equal(p.sunkenInput, p.profileSettings.field, "Settings and generic forms share one material identity");
    for (const ink of ["title", "secondary"]) for (const surface of p.sunkenInput.input)
        assert(contrast(p.sunkenInput[ink], surface) >= 4.5, `${ink} is readable on the input gradient`);
    for (const family of [p.plansDashboard, p.calendarSurface]) for (const surface of family.active)
        assert(contrast(p.calendarSurface.onActive, surface) >= 4.5, "Selected Calendar labels retain contrast throughout the base gradient");
}
for (const surface of theme.authMaterial.primary) assert(contrast(theme.authMaterial.white, surface) >= 4.5);
const walk = (node, fn) => { if (!node || typeof node !== "object") return; if (node.type) fn(node);
    for (const [key, value] of Object.entries(node)) if (!["loc", "start", "end"].includes(key))
        (Array.isArray(value) ? value : [value]).forEach(n => { if (n && typeof n === "object") walk(n, fn); }); };
const elements = file => { const found = []; walk(parse(read(file), { sourceType: "module", plugins: ["jsx"] }), n => { if (n.type === "JSXOpeningElement") found.push(n); }); return found; };
const attr = (node, name) => node.attributes.find(a => a.name?.name === name)?.value?.value;
const auth = elements("components/Auth.js");
assert(!auth.some(n => n.name.name === "Field"), "Auxiliary auth scenes must use the same recessed input as Login");
for (const title of ["Log In", "Create Account", "Send Reset Link", "Confirm and Link"])
    assert.equal(attr(auth.find(n => attr(n, "title") === title), "variant"), "auth");
const share = elements("components/ShareRecords.js");
assert.equal(attr(share.find(n => attr(n, "accessibilityLabel") === "What is this visit about?"), "appearance"), "neumorphic");
console.log("Design contracts passed: six themed input materials/contrast, Calendar and entry-button contrast, shared auth variants and recessed Share note. Native pixels and decorative highlights require visual QA.");
