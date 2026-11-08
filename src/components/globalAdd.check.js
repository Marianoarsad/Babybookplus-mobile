// Run: node components/globalAdd.check.js. Uses actual navigation effects and fictional state only.
const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path");
const { parse } = require("@babel/parser"), { transformFromAstSync } = require("@babel/core");
const read = file => fs.readFileSync(path.join(__dirname, file), "utf8");
const nodes = value => !value || typeof value !== "object" ? []
    : [value, ...Object.values(value).flatMap(child => Array.isArray(child) ? child.flatMap(nodes) : nodes(child))];
const ast = file => parse(read(file), { sourceType: "module", plugins: ["jsx"] });
for (const file of ["ui/ImmunizationRecordsCard.js", "ui/ConsultationsAppointmentsCard.js", "ui/HospitalStaysCard.js",
    "ui/IllnessesConditionsCard.js", "ui/MilkTypeCard.js", "ui/SolidFoodsCard.js", "Growth.js", "Health.js"]) {
    const tree = nodes(ast(file));
    assert(!tree.some(n => n.type === "JSXOpeningElement" && n.name.name === "GlassFab"), `${file}: card FAB removed`);
    assert(!tree.some(n => n.type === "JSXAttribute" && n.name.name === "name" && n.value?.value === "add"), `${file}: card plus removed`);
    assert(!tree.some(n => n.type === "JSXAttribute" && n.name.name === "onAdd"), `${file}: unused card callback removed`);
}
assert.equal(nodes(ast("../App.js")).filter(n => n.type === "JSXOpeningElement" && n.name.name === "GlassFab").length, 1);
for (const file of ["ui/PlansDashboardCard.js", "ui/MedicineVisuals.js"]) {
    assert(!nodes(ast(file)).some(n => n.type === "JSXAttribute" && n.name.name === "name" && n.value?.value === "add"));
    assert(!nodes(ast(file)).some(n => n.type === "JSXText" && n.value.trim() === "+"));
}
assert(read("ui/PlansDashboardCard.js").includes(">Add plan</Text>"));
assert(read("ui/MedicineVisuals.js").includes(">Record a dose</Text>"));
assert(read("Dashboard.js").includes('label: "Record a growth measurement"'));
assert(read("NutritionTracker.js").includes('accessibilityLabel="Increase formula scoops"'));

const source = read("NutritionTracker.js");
assert(!source.includes("MilkPeriodEditor") && !source.includes("milkTypeCreate"));
assert(!read("ui/ActionSheet.js").includes("milkTypePeriod"));
assert(source.includes('initialAction === "milk" || initialAction === "solid"'));
console.log("Global Add passed: one FAB, retained feeding creation, retired period creation.");
