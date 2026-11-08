const {shareQr} = require('../src/utils/shareQr.cjs');
const {apiPorts, checkServices} = require('../scripts/android-dev.cjs');
const {generateMatrix} = require('../src/utils/qrcode');
const fs = require('node:fs');
const {readBarcodes, prepareZXingModule} = require('zxing-wasm/reader');
const code = 'AB7K-2P9Q', payload = `https://babybook-plus.expo.app/#consult=${code}&token=${'a'.repeat(43)}`;

test('hosted account restoration never reuses the old local token', async () => {
  const {transformSync} = require('@babel/core');
  const source = fs.readFileSync(require.resolve('../src/utils/api.js'), 'utf8');
  const compiled = transformSync(source, {babelrc:false,configFile:false,plugins:['@babel/plugin-transform-modules-commonjs']}).code;
  const keys = [], module = {exports:{}};
  const imports = {
    'react-native':{Platform:{OS:'web'}}, 'expo-secure-store':{}, '@react-native-async-storage/async-storage':{},
    './apiConfig.cjs':require('../src/utils/apiConfig.cjs'),
    './apiActivity.cjs':require('../src/utils/apiActivity.cjs'), './recordStore.cjs':require('../src/utils/recordStore.cjs'),
    './storageAdapter':{storage:{getItem:async key=>{keys.push(key);return key==='bb_token'?'old-local-token':null;}}},
  };
  new Function('require','module','exports',compiled)(name=>{if(!(name in imports))throw Error(name);return imports[name];},module,module.exports);
  expect(await module.exports.getToken()).toBeNull();
  expect(keys).toEqual(['bb_token_hosted']);
});

test('only trusted complete matching links are labeled browser-compatible', () => {
  expect(shareQr({code, qr_payload: payload})).toEqual({payload, web: true});
  expect(shareQr({code})).toEqual({payload: `BABYBOOK+CONSULT:${code}`, web: false});
  for (const bad of [payload.replace(code, 'ZZZZ-2222'), payload.replace('https:', 'http:'), payload.replace('babybook-plus.expo.app', 'evil.example'), payload.replace('a'.repeat(43), 'short')]) {
    expect(shareQr({code, qr_payload: bad})).toEqual({payload: null, web: false});
  }
});

test('hosted launch checks the hosted service and needs no local API forwarding', async () => {
  const urls = [], request = async url => { urls.push(url); return {ok: true, text: async () => url.endsWith('/status') ? 'packager-status:running' : '{"service":"babybook-api"}'}; };
  await checkServices(request);
  expect(urls).toEqual(['http://localhost:8083/status', 'https://babybook-xi2w.onrender.com/api/health']);
  expect(apiPorts('https://babybook-xi2w.onrender.com')).toEqual([]);
  expect(apiPorts('http://localhost:4000')).toEqual([4000]);
});

test.each([208,256,326])('independent decoder reads the full HTTPS QR with quiet zone at %i dp', async (size) => {
  prepareZXingModule({overrides: {wasmBinary: fs.readFileSync(require.resolve('zxing-wasm/reader/zxing_reader.wasm'))}});
  const matrix = generateMatrix(payload, 'M'), cell = Math.floor(size / (matrix.length + 8)), width = cell * (matrix.length + 8);
  const data = new Uint8ClampedArray(width * width * 4).fill(255);
  matrix.forEach((row,y) => row.forEach((dark,x) => { if (dark) for (let dy=0;dy<cell;dy++) for(let dx=0;dx<cell;dx++) {
    const p=(((y+4)*cell+dy)*width+(x+4)*cell+dx)*4; data[p]=22; data[p+1]=32; data[p+2]=42;
  }}));
  const decoded = await readBarcodes({data,width,height:width},{formats:['QRCode']});
  expect(decoded).toHaveLength(1); expect(decoded[0].text).toBe(payload);
});
