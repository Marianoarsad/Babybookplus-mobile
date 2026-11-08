const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { transformSync } = require('@babel/core');
const source = fs.readFileSync(`${__dirname}/imagePicker.js`, 'utf8');
const code = transformSync(source, { babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-modules-commonjs'] }).code;
function load(os, picker) {
    const exports = {};
    vm.runInNewContext(code, { exports, console: { log() {} }, require: name => {
        if (name === 'react-native') return { Platform: { OS: os } };
        if (name === 'expo-image-picker' && picker) return picker;
        throw new Error('Unavailable');
    } });
    return exports;
}
async function main() {
    let opens = 0, permissions = 0, finish;
    const picker = {
        requestMediaLibraryPermissionsAsync: async () => { permissions++; return { granted: true }; },
        launchImageLibraryAsync: options => { assert.equal(options.quality, 0.7); opens++; return new Promise(resolve => { finish = resolve; }); },
    };
    const android = load('android', picker);
    const first = android.pickImage();
    assert.equal(await android.pickImage(), null); assert.equal(opens, 1); assert.equal(permissions, 0);
    finish({ assets: [{ uri: 'fixture:selected' }] }); assert.equal(await first, 'fixture:selected');
    const canceled = android.pickImage(); finish({ canceled: true }); assert.equal(await canceled, null);
    picker.launchImageLibraryAsync = async () => { throw new Error('Synthetic failure'); };
    assert.equal(await android.pickImage(), null);
    picker.launchImageLibraryAsync = async () => ({ uri: 'fixture:retry' });
    assert.equal(await android.pickImage(), 'fixture:retry', 'Failure releases the picker guard');
    for (const os of ['ios', 'web']) {
        const client = load(os, picker);
        assert.equal(await client.pickImage(), 'fixture:retry');
    }
    assert.equal(permissions, 2, 'Existing iOS/web permission behavior retained');
    picker.requestMediaLibraryPermissionsAsync = async () => ({ granted: false });
    assert.equal(await load('ios', picker).pickImage(), null);
    assert.equal(load('android', null).pickerAvailable(), false);
    assert.equal(await load('android', null).pickImage(), null);
    console.log('Picker checks passed: Android permission-free handoff, overlap guard, selection, cancel, error/retry and iOS/web compatibility.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
