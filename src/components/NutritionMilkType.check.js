// Actual form handlers with in-memory fixtures; no API or stored-record writes.
const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path");
const {parse} = require("@babel/parser");
const source = fs.readFileSync(path.join(__dirname,"NutritionTracker.js"),"utf8"), ast=parse(source,{sourceType:"module",plugins:["jsx"]});
function find(node,name) {
    if (!node || typeof node!=="object") return;
    if(node.type==="VariableDeclarator" && node.id.name===name) return node.init;
    for(const value of Object.values(node)) for(const child of Array.isArray(value)?value:[value]) { const found=find(child,name); if(found)return found; }
}
const code=name=>{const n=find(ast,name);return source.slice(n.start,n.end)};
const prefs=require("../utils/nutritionFormPrefs.cjs"), types=["Breastmilk","Formula","Mixed"];
let errors, updated, opened;
const validate=form=>new Function("form","isBreast","isFormulaScoopsValue","setErrors","MILK_TYPES",`return (${code("validate")})()`)(form,form.milkType==="Breastmilk"&&form.feedMethod==="breast",prefs.isFormulaScoopsValue,next=>errors=next,types);
const form={entryType:"milk",milkType:"Formula",feedMethod:"bottle",quantity:"100",durationMinutes:"",breastmilkQuantity:"30",formulaScoops:"1"};
for(const milkType of ["",null,undefined,"Invalid"]) { assert.equal(validate({...form,milkType}),false); assert.equal(errors.milkType,"Choose Breastmilk, Formula or Mixed."); }
for(const milkType of types) { assert.equal(validate({...form,milkType}),true); assert.equal(errors.milkType,undefined); }
assert(validate({...form,milkType:"Breastmilk",feedMethod:"breast",quantity:""}),"No invented breast quantity/duration required");
assert(validate({entryType:"solid",foodIntroduced:"Lugaw"}),"Solids do not require milk type");
const edit=new Function("setEditingId","setErrors","setForm","setShowModal","MILK_TYPES","UNITS","formulaScoopsOrDefault","todayLocal",`return (${code("openEdit")})`)(()=>{},()=>{},next=>updated=next,next=>opened=next,types,["mL","oz"],prefs.formulaScoopsOrDefault,()=>"2026-10-24");
edit({id:"legacy",entryType:"milk",milkType:"",feedMethod:"breast"});assert.equal(updated.milkType,"");assert(opened);assert.equal(validate(updated),false);
edit({id:"typed",entryType:"milk",milkType:"Mixed"});assert.equal(updated.milkType,"Mixed");
assert.equal(prefs.nutritionFormDefaults({milk:{milkType:"Formula"}},"milk","2026-10-24","10:00").milkType,"Formula");
assert.equal(prefs.nutritionFormDefaults(null,"milk","2026-10-24","10:00").milkType,"Breastmilk");
assert(source.includes("Milk Type (required)"));assert(source.includes("errors.milkType ? <Text accessibilityRole="));
console.log("Milk form checks passed: required inline type, valid preselection, explicit legacy correction and unchanged solid/breastfeeding validation.");
