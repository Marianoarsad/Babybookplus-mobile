const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { transformSync } = require("@babel/core");
const { parse } = require("@babel/parser");

const root = path.resolve(__dirname, "..");
const activitySource = fs.readFileSync(path.join(__dirname, "apiActivity.cjs"), "utf8");
const apiSource = fs.readFileSync(path.join(__dirname, "api.js"), "utf8");
const compiled = transformSync(apiSource, { configFile: false, babelrc: false,
    plugins: [require("@babel/plugin-transform-modules-commonjs")] }).code;
function client(fetch, token = async () => null) {
    const timers = new Map();
    let nextTimer = 0;
    const module = { exports: {} };
    vm.runInNewContext(activitySource, { module,
        setTimeout: (work, duration) => { assert.equal(duration, 150); timers.set(++nextTimer, work); return nextTimer; },
        clearTimeout: (id) => timers.delete(id),
    });
    const activity = module.exports;
    const exports = {};
    vm.runInNewContext(compiled, { exports, process: { env: {} }, fetch,
        FormData: class { append() {} },
        require: (name) => {
            if (name === "react-native") return { Platform: { OS: "web" } };
            if (name === "./apiActivity.cjs") return activity;
            if (name === "./apiConfig.cjs") return require('./apiConfig.cjs');
            if (name === "./recordStore.cjs") return require("./recordStore.cjs");
            if (name === "./storageAdapter") return { storage: { getItem: token } };
            if (["@react-native-async-storage/async-storage", "expo-secure-store"].includes(name)) return {};
            throw new Error(`Unexpected module: ${name}`);
        },
    });
    return { api: exports.api, activity, idle() {
        const pending = [...timers.values()]; timers.clear(); pending.forEach((work) => work());
    } };
}
const response = (data, ok = true) => ({ ok, status: ok ? 200 : 422, text: async () => JSON.stringify(data) });

(async () => {
    const requests = [];
    const c = client(() => new Promise(resolve => requests.push(resolve)));
    const a = c.api.listRecords(981, "growth", { background: true });
    const b = c.api.listRecords(981, "growth", { loading: "nonblocking" });
    await new Promise(setImmediate);
    assert.equal(requests.length, 1, "Equivalent reads share one network request");
    requests.shift()(response([{ id: 1, date_recorded: "2026-01-01" }]));
    assert.deepEqual(await a, await b);
    const next = c.api.listRecords(981, "growth", { background: true });
    await new Promise(setImmediate);
    assert.equal(requests.length, 1, "Completed reads do not suppress explicit refresh");
    requests.shift()(response([], false));
    await assert.rejects(next);
    const retry = c.api.listRecords(981, "growth", { background: true });
    await new Promise(setImmediate);
    assert.equal(requests.length, 1, "Failed reads release their pending entry");
    requests.shift()(response([])); await retry;
    console.log("Read deduplication checks passed.");
})().catch(error => { console.error(error); process.exitCode = 1; });
