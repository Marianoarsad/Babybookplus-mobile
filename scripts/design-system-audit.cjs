// Inventory only: syntax/import evidence is not a visual or accessibility pass.
const fs = require("node:fs"), path = require("node:path"), assert = require("node:assert/strict");
const { parseSync } = require("@babel/core");
const repo = path.resolve(__dirname, ".."), root = path.join(repo, "src");
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
const rel = file => path.relative(repo, file).split(path.sep).join("/");
const files = [path.join(root, "App.js"), ...walk(path.join(root, "components")), ...walk(path.join(root, "context"))]
    .filter(f => f.endsWith(".js") && !f.includes(".check."));
function visit(node, fn) {
    if (!node || typeof node !== "object") return;
    if (node.type) fn(node);
    for (const [key, value] of Object.entries(node)) if (!["loc", "start", "end", "extra"].includes(key)) {
        if (Array.isArray(value)) value.forEach(n => visit(n, fn)); else if (value && typeof value === "object") visit(value, fn);
    }
}
const modules = files.map(file => {
    const source = fs.readFileSync(file, "utf8"), ast = parseSync(source, { babelrc: false, configFile: false, sourceType: "module", parserOpts: { plugins: ["jsx"] } });
    const imports = [], controls = new Set(), components = [], materials = new Set();
    visit(ast, n => {
        if (n.type === "ImportDeclaration" || n.type === "ExportNamedDeclaration" && n.source) imports.push(n.source.value);
        if (n.type === "CallExpression" && n.callee.name === "require" && n.arguments[0]?.type === "StringLiteral") imports.push(n.arguments[0].value);
        if (n.type === "JSXOpeningElement") {
            const name = n.name.name || n.name.object?.name + "." + n.name.property?.name;
            if (name) controls.add(name);
        }
        if (n.type === "MemberExpression" && n.object.name === "colors" && n.property.name) materials.add(n.property.name);
        if (n.type === "FunctionDeclaration" || n.type === "VariableDeclarator" && ["ArrowFunctionExpression", "FunctionExpression"].includes(n.init?.type)) {
            const name = n.id?.name; let jsx = false;
            if (name && /^[A-Z]/.test(name)) { visit(n.body || n.init.body, x => { if (["JSXElement", "JSXFragment"].includes(x.type)) jsx = true; });
                if (jsx) components.push({ name, line: n.loc.start.line }); }
        }
    });
    return { file: rel(file), imports, controls: [...controls].sort(), components, materials: [...materials].sort(),
        hexLiterals: (source.match(/#[0-9a-fA-F]{3,8}\b/g) || []).length,
        fontSizeLiterals: (source.match(/fontSize:\s*\d/g) || []).length, lines: source.split("\n").length };
});
const known = new Map(modules.map(m => [path.resolve(repo, m.file), m]));
const resolve = (owner, spec) => spec.startsWith(".") ? ["", ".js", ".native.js", ".web.js"].map(ext => known.get(path.resolve(repo, path.dirname(owner.file), spec + ext))).filter(Boolean) : [];
for (const m of modules) m.consumers = modules.filter(other => other.imports.some(spec => resolve(other, spec).includes(m))).map(other => other.file);
const reachable = new Set();
function reach(m) { if (!m || reachable.has(m.file)) return; reachable.add(m.file); m.imports.flatMap(spec => resolve(m, spec)).forEach(reach); }
reach(modules.find(m => m.file === "src/App.js"));
const app = fs.readFileSync(path.join(root, "App.js"), "utf8");
const routes = [...new Set([...app.matchAll(/currentView === "([^"]+)"/g)].map(m => m[1]))].sort();
const rows = modules.flatMap(m => [
    { kind: "Module", name: path.basename(m.file, ".js"), source: m.file, line: 1, consumers: m.consumers.join("; "),
        reachability: reachable.has(m.file) ? "Import-reachable" : "No App import path detected", controls: m.controls.join("; "),
        material_refs: m.materials.join("; "), review: "Static scanned", verification: "Not verified", notes: "Import reachability does not prove navigation reachability; scanner does not judge styling." },
    ...m.components.map(c => ({ kind: "Component", name: c.name, source: m.file, line: c.line, consumers: m.consumers.join("; "), reachability: reachable.has(m.file) ? "Import-reachable" : "No App import path detected", controls: "See module row", material_refs: m.materials.join("; "), review: "Static scanned", verification: "Not verified", notes: "JSX-bearing named function; includes private subcomponents." }))
]);

const keys = ["kind","name","source","line","controls","material_refs","review","verification","notes"];
const csv = [keys, ...rows.map(row => keys.map(k => row[k] ?? ""))].map(row => row.map(v => '"' + String(v).replaceAll('"', '""') + '"').join(",")).join("\n");
assert.equal(new Set(modules.map(m => m.file)).size, modules.length);
assert(routes.includes("dashboard") && routes.includes("editBabyProfile"));
fs.writeFileSync(path.join(repo, "UI_INVENTORY.csv"), csv + "\n");
fs.mkdirSync(path.join(repo, ".cache"), {recursive:true});
fs.writeFileSync(path.join(repo, ".cache/ui-inventory.json"), JSON.stringify({routes, modules}, null, 2));
console.log(JSON.stringify({routes, modules:modules.length, components:rows.filter(r=>r.kind==="Component").length}));
