// Synthetic CPU benchmark; not a native frame-time measurement.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {performance} = require('node:perf_hooks');
const {transformSync} = require('@babel/core');
function load(root) {
  const cache = new Map();
  function read(file) {
    file = path.resolve(file);
    if (!path.extname(file)) file += '.js';
    if (cache.has(file)) return cache.get(file).exports;
    const module = {exports: {}};
    cache.set(file, module);
    const code = transformSync(fs.readFileSync(file, 'utf8'), {babelrc:false, configFile:false,
      plugins:[require('@babel/plugin-transform-modules-commonjs')]}).code;
    // eslint-disable-next-line no-new-func -- Evaluate only local, Babel-transformed benchmark modules.
    new Function('require','module','exports',code)(name => read(path.join(path.dirname(file),name)), module,module.exports);
    return module.exports;
  }
  return read(path.join(root,'src/utils/memoryGallery.js')).memoryGalleryView;
}
const current = load(path.resolve(__dirname,'..'));
const baseline = process.argv[2] ? load(path.resolve(process.argv[2])) : null;
for (const count of [1000,15000,50000]) {
  const rows = Array.from({length:count},(_,i)=>({id:i,kind:'memory',title:'Synthetic record',
    date:new Date(Date.UTC(2020,0,1)+Math.floor(i/8)*86400000).toISOString().slice(0,10)}));
  if (baseline) assert.deepEqual(current(rows),baseline(rows));
  for (const [label,fn] of [['before',baseline],['after',current]]) {
    if (!fn) continue;
    fn(rows);
    const samples = Array.from({length:5},()=>{const start=performance.now();fn(rows);return performance.now()-start;}).sort((a,b)=>a-b);
    console.log(JSON.stringify({label,count,medianMs:Number(samples[2].toFixed(2)),maxMs:Number(samples[4].toFixed(2))}));
  }
}
