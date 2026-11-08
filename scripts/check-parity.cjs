const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const files = [];
function walk(dir) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, item.name);
    if (item.isDirectory()) walk(file);
    else if (/\.check\.(js|cjs)$/.test(file)) files.push(file);
  }
}
walk(path.join(root, 'src'));
const results = files.map(file => {
  const result = spawnSync(process.execPath, [file], { cwd: path.join(root, 'src'), encoding: 'utf8', timeout: 60000 });
  const passed = result.status === 0;
  console.log(`${passed ? 'PASS' : 'FAIL'} ${path.relative(root, file)}`);
  return { file: path.relative(root, file), passed, output: result.stdout + result.stderr, error: result.error?.message };
});
fs.mkdirSync(path.join(root, '.cache'), { recursive: true });
fs.writeFileSync(path.join(root, '.cache/parity-results.json'), JSON.stringify(results, null, 2));
console.log(`${results.filter(row => row.passed).length}/${results.length} checks passed; details: .cache/parity-results.json`);
process.exitCode = results.every(row => row.passed) ? 0 : 1;
