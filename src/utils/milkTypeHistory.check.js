// In-memory fixtures only: node utils/milkTypeHistory.check.js
const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path");
const { transformSync } = require("@babel/core");
const modules = new Map();
function load(file) {
    const filename = path.resolve(__dirname, file);
    if (filename.endsWith(".cjs")) return require(filename);
    if (modules.has(filename)) return modules.get(filename).exports;
    const module = { exports: {} }; modules.set(filename, module);
    const code = transformSync(fs.readFileSync(filename, "utf8"), { babelrc: false, configFile: false, plugins: ["@babel/plugin-transform-modules-commonjs"] }).code;
    new Function("require", "module", "exports", code)(name => load(path.resolve(path.dirname(filename), name + (path.extname(name) ? "" : ".js"))), module, module.exports);
    return module.exports;
}
const M = load("milkTypeHistory.js"), { buildRecordHtml } = load("pdfTemplate.js");
assert.equal(M.milkDay("2026-02-30"), null);
assert.equal(M.milkDay("2024-02-29").iso, "2024-02-29");
assert.equal(M.milkTypeWindow("7", [], "2026-10-15").from, "2026-10-09");
assert.equal(M.milkTypeWindow("all", [{ date: "2026-01-01" }], "2026-10-15").from, "2026-01-01");
const html = buildRecordHtml({}, { nutrition: [], milkTypePeriods: [{ notes: "Retired private note" }] }, { scope: new Set(["nutrition"]) });
assert(!html.includes("Milk Type Periods") && !html.includes("Retired private note"));
console.log("Milk date windows and removal of period PDF data passed.");
