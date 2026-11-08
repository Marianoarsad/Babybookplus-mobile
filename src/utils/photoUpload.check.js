const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { Buffer } = require('node:buffer');
const { TextEncoder, TextDecoder } = require('node:util');
const { transformSync } = require('@babel/core');
const { parse } = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const store = require('./recordStore.cjs');
const root = path.resolve(__dirname, '../..');
function load(file, mocks, globals = {}) {
    const exports = {};
    const code = transformSync(fs.readFileSync(file, 'utf8'), { filename: file, configFile: false, babelrc: false,
        plugins: [...(file.endsWith('.ts') ? ['@babel/plugin-transform-typescript'] : []), '@babel/plugin-transform-modules-commonjs'] }).code;
    vm.runInNewContext(code, { exports, Blob, Uint8Array, TextEncoder, ...globals, require: name => {
        assert(name in mocks, `Unexpected import: ${name}`); return mocks[name];
    } });
    return exports;
}
const expo = relative => path.join(root, 'node_modules/expo/src', relative);
const { installFormDataPatch } = load(expo('winter/FormData.ts'), {});
const { convertFormDataAsync } = load(expo('winter/fetch/convertFormData.ts'), {
    '../../utils/blobUtils': { blobToArrayBufferAsync: blob => blob.arrayBuffer() },
});
class NativeForm { constructor() { this._parts = []; } }
installFormDataPatch(NativeForm);
const fixture = new Uint8Array([1, 2, 3, 4]);
let fileOptions = {}, networkError, requests = [];
class NativeFile {
    constructor(uri) { Object.assign(this, { uri, name: uri.split('/').pop(), exists: true, size: 4, type: 'image/jpeg' }, fileOptions); }
    async bytes() { if (this.readFailure) throw new Error('Synthetic read permission lost'); return fixture; }
}
function client(os) {
    return load(path.join(__dirname, 'api.js'), {
        'react-native': { Platform: { OS: os } }, 'expo-file-system': { File: NativeFile },
        '@react-native-async-storage/async-storage': {}, 'expo-secure-store': { getItemAsync: async () => 'synthetic-token' },
        './storageAdapter': { storage: { getItem: async () => 'synthetic-token' } },
        './apiActivity.cjs': { trackApiActivity: fn => fn() }, './recordStore.cjs': store,
        './apiConfig.cjs': { API_BASE_URL: 'https://local.test', HOSTED_API: 'https://local.test' },
    }, { FormData: os === 'web' ? FormData : NativeForm, fetch: async (url, options) => {
        if (url === 'blob:synthetic') return { ok: true, blob: async () => new Blob([fixture], { type: 'image/png' }) };
        if (networkError) throw networkError;
        assert.equal(options.headers.Authorization, 'Bearer synthetic-token');
        assert.equal(options.headers['Content-Type'], undefined, 'Fetch supplies multipart boundary');
        const encoded = await convertFormDataAsync(options.body, 'test-boundary');
        const body = new TextDecoder().decode(encoded.body);
        assert(body.includes('name="photo"; filename="photo.'));
        assert(Buffer.from(encoded.body).includes(Buffer.from(fixture)), 'Photo bytes survive encoding');
        requests.push({ url, body });
        return { ok: true, text: async () => JSON.stringify({ id: 1 }) };
    } });
}
async function checkProfileRetries() {
    const source = fs.readFileSync(path.join(root, 'src/App.js'), 'utf8');
    const ast = parse(source, { sourceType: 'module', plugins: ['jsx'] });
    const handlers = {};
    traverse(ast, { VariableDeclarator(p) {
        if (['handleAddProfile', 'handleEditProfile'].includes(p.node.id.name)) handlers[p.node.id.name] = source.slice(p.node.init.start, p.node.init.end);
    } });
    let profiles = [{ id: 1, currentWeight: 9 }], errors = [], navigated = 0, creates = 0, updates = 0, fail = true;
    const context = {
        ...Object.fromEntries([...source.matchAll(/\bform[A-Z]\w*/g)].map(match => [match[0], ''])),
        ...Object.fromEntries([...source.matchAll(/\bsetForm[A-Z]\w*/g)].map(match => [match[0], () => {}])),
        formName: 'Synthetic', formAvatarUri: 'file:///synthetic.png', profileSaving: null,
        recordStore: store, editTarget: { current: { id: 1, epoch: store.getEpoch() } }, activeBabyId: { current: 1 }, addedProfileId: { current: null },
        profileFormToChild: () => ({}), childToProfile: row => row,
        setProfiles: fn => { profiles = fn(profiles); }, setProfileSaving: value => { context.profileSaving = value; },
        setFormAvatarUri: value => { context.formAvatarUri = value; },
        toast: { error: message => errors.push(message) }, goBack: () => { navigated++; },
        selectProfile: () => {}, scheduleUpcomingVaccineReminders: () => {}, setShowAddProfileModal: () => {},
        api: { createChild: async () => { creates++; return { id: 2 }; }, updateChild: async id => { updates++; return { id }; },
            uploadChildAvatar: async id => { if (fail) throw new Error('Synthetic upload failure'); return { id, avatar_url: 'synthetic-result' }; } },
    };
    const run = name => vm.runInNewContext(`(${handlers[name]})()`, context);
    await run('handleEditProfile');
    assert.match(errors.at(-1), /Profile saved, but its photo/); assert.equal(navigated, 0);
    assert.equal(context.formAvatarUri, 'file:///synthetic.png'); assert.equal(profiles[0].currentWeight, 9);
    fail = false; await run('handleEditProfile');
    assert.equal(navigated, 1); assert.equal(context.formAvatarUri, ''); assert.equal(profiles[0].avatar_url, 'synthetic-result');
    context.formAvatarUri = 'file:///synthetic.png'; fail = true;
    await run('handleAddProfile'); assert.equal(creates, 1); assert.equal(context.addedProfileId.current, 2);
    assert.match(errors.at(-1), /without creating another profile/); assert.equal(context.formAvatarUri, 'file:///synthetic.png');
    const priorUpdates = updates;
    fail = false; await run('handleAddProfile'); assert.equal(creates, 1); assert.equal(updates, priorUpdates + 1);
    assert.equal(profiles.filter(p => p.id === 2).length, 1); assert.equal(context.formAvatarUri, '');
    const priorCalls = updates;
    store.reset(); await run('handleEditProfile'); assert.equal(updates, priorCalls, 'Stale session cannot save another child');
}
async function main() {
    const legacy = new NativeForm(); legacy.append('photo', { uri: 'file:///synthetic.jpg', name: 'synthetic.jpg', type: 'image/jpeg' });
    await assert.rejects(convertFormDataAsync(legacy), /Unsupported FormDataPart/, 'Reproduce original failure with installed SDK');
    const { api } = client('android');
    for (const [ext, mime] of [['jpg', 'image/jpeg'], ['png', 'image/png'], ['gif', 'image/gif'], ['webp', 'image/webp'], ['heic', 'image/heic']]) {
        fileOptions = { type: mime };
        await api.uploadChildAvatar(1, `file:///synthetic.${ext}`);
        assert(requests.at(-1).body.includes(`content-type: ${mime}`));
        assert(requests.at(-1).body.includes(`filename="photo.${ext}"`));
    }
    fileOptions = { type: 'image/png', name: '42' };
    await api.uploadChildAvatar(1, 'content://synthetic/42');
    assert(requests.at(-1).body.includes('filename="photo.png"'));
    fileOptions = {};
    await api.uploadAttachment(1, { recordType: 'growth', recordId: 7, photoUri: 'file:///synthetic.jpg' });
    assert(requests.at(-1).body.includes('name="record_id"\r\n\r\n7'));
    await api.uploadMemory(1, { photoUri: 'file:///synthetic.jpg', caption: 'Synthetic' });
    await api.createMilestoneWithPhoto(1, { title: 'Synthetic' }, 'file:///synthetic.jpg');
    const before = requests.length;
    for (const [options, message] of [[{ exists: false }, /no longer readable/], [{ size: 0 }, /no longer readable/], [{ readFailure: true }, /no longer readable/],
        [{ size: 8 * 1024 * 1024 + 1 }, /8 MB/], [{ type: 'image/svg+xml' }, /Choose a JPG/]]) {
        fileOptions = options;
        await assert.rejects(api.uploadChildAvatar(1, 'file:///synthetic.jpg'), message);
    }
    assert.equal(requests.length, before, 'Invalid files never reach server');
    fileOptions = {};
    for (const [cause, message] of [[new Error('Unsupported FormDataPart implementation'), /prepare the photo/], [new Error('Offline'), /connect to the server/]]) {
        networkError = cause;
        await assert.rejects(api.uploadChildAvatar(1, 'file:///synthetic.jpg'), error => message.test(error.message) && error.cause === cause);
    }
    networkError = null;
    await client('web').api.uploadChildAvatar(1, 'blob:synthetic');
    assert(requests.at(-1).body.includes('content-type: image/png'));
    await checkProfileRetries();
    console.log('Photo upload checks passed: installed Expo serializer, four callers, metadata, limits, safe errors, browser Blob and profile retries/session guards.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
