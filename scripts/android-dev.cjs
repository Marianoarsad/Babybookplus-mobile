const path = require('node:path');
const {spawn, spawnSync} = require('node:child_process');
const {getServers} = require('node:dns');
const {isIPv4} = require('node:net');
const DEFAULT_AVD = 'Pixel_6_API_30';

function emulatorArgs(platform = process.platform, servers = getServers()) {
  const args = ['-avd', DEFAULT_AVD];
  // Windows auto-detection can leave the guest using an unreachable resolver.
  const resolvers = platform === 'win32' ? servers.filter(isIPv4).slice(0, 4) : [];
  if (resolvers.length) args.push('-dns-server', resolvers.join(','));
  return args;
}

function chooseDevice(output, serial) {
  const devices = output.split(/\r?\n/).map(line => line.trim().split(/\s+/))
    .filter(([id, state]) => id && state === 'device');
  if (serial && devices.some(([id]) => id === serial)) return serial;
  if (serial) throw new Error(`ANDROID_SERIAL ${serial} is not connected.`);
  const emulators = devices.filter(([id]) => id.startsWith('emulator-'));
  if (emulators.length !== 1) throw new Error('Start one emulator, or set ANDROID_SERIAL to the intended device.');
  return emulators[0][0];
}
function apiPorts(apiBase) {
  const url = new URL(apiBase);
  return ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ? [Number(url.port || (url.protocol === 'https:' ? 443 : 80))] : [];
}
async function checkServices(request = fetch, apiBase = require('../src/utils/apiConfig.cjs').API_BASE_URL) {
  const local = apiPorts(apiBase).length > 0;
  for (const [url, instruction, expected, timeout] of [
    ['http://localhost:8083/status', 'In BabyBookPlus, run npm start.', 'packager-status:running', 3000],
    [`${apiBase}/api/health`, local ? 'In back-end, run npm run dev.' : 'Check the hosted API connection; the service may be waking up.', 'babybook-api', local ? 3000 : 60000],
  ]) {
    try {
      const response = await request(url, {signal: AbortSignal.timeout(timeout)});
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = await response.text();
      if (!body.includes(expected)) throw new Error('Unexpected service response');
    } catch (error) { throw new Error(`${url} is unavailable (${error.message}). ${instruction}`); }
  }
}
async function ensureDevice(run, launch, serial, wait = ms => new Promise(resolve => setTimeout(resolve, ms))) {
  if (serial) return chooseDevice(run(['devices']), serial);
  let launched = false;
  const deadline = Date.now() + 180000;
  while (Date.now() < deadline) {
    const devices = run(['devices']).split(/\r?\n/).map(line => line.trim().split(/\s+/))
      .filter(([id, state]) => id?.startsWith('emulator-') && state === 'device');
    const matches = devices.filter(([id]) => {
      try { return run(['-s', id, 'emu', 'avd', 'name']).trim().split(/\r?\n/)[0].trim() === DEFAULT_AVD; }
      catch { return false; }
    });
    if (matches.length > 1) throw new Error(`Multiple ${DEFAULT_AVD} devices are running. Set ANDROID_SERIAL.`);
    if (matches.length === 1) {
      const id = matches[0][0];
      try { if (run(['-s', id, 'shell', 'getprop', 'sys.boot_completed']).trim() === '1') return id; }
      catch { /* ADB can reconnect while Android boots. */ }
    } else if (!launched) {
      console.log(`Starting ${DEFAULT_AVD}; waiting for Android to boot...`);
      await launch();
      launched = true;
    }
    await wait(3000);
  }
  throw new Error(`${DEFAULT_AVD} did not finish booting within 3 minutes. Check its window in Android Studio.`);
}
async function main() {
  process.env.NODE_ENV ||= 'development';
  require('@expo/env').load(path.resolve(__dirname, '..'));
  const {API_BASE_URL} = require('../src/utils/apiConfig.cjs');
  const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk');
  const adb = path.join(sdk, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb');
  const emulator = path.join(sdk, 'emulator', process.platform === 'win32' ? 'emulator.exe' : 'emulator');
  function run(args) {
    const result = spawnSync(adb, args, {encoding: 'utf8', timeout: 15000, windowsHide: true});
    if (result.error || result.status !== 0) throw new Error(result.error?.message || result.stderr || result.stdout);
    return result.stdout;
  }
  async function launch() {
    const available = spawnSync(emulator, ['-list-avds'], {encoding: 'utf8', timeout: 15000, windowsHide: true});
    if (available.error || available.status !== 0) throw new Error(available.error?.message || available.stderr);
    if (!available.stdout.split(/\r?\n/).map(line => line.trim()).includes(DEFAULT_AVD)) {
      throw new Error(`AVD ${DEFAULT_AVD} is not installed. Available AVDs: ${available.stdout.trim() || '(none)'}`);
    }
    const child = spawn(emulator, emulatorArgs(), {detached: true, stdio: 'ignore', windowsHide: true});
    await new Promise((resolve, reject) => { child.once('spawn', resolve); child.once('error', reject); });
    child.unref();
  }
  const serial = await ensureDevice(run, launch, process.env.ANDROID_SERIAL);
  const build = process.argv.includes('--build');
  if (!build && !process.argv.includes('--prepare-only')) await checkServices();
  for (const port of new Set([...apiPorts(API_BASE_URL), 8083])) run(['-s', serial, 'reverse', `tcp:${port}`, `tcp:${port}`]);
  console.log(`Connected ${serial}: API ${API_BASE_URL}, migrated Metro 8083 forwarded.`);
  if (build) {
    const result = spawnSync(process.execPath, [require.resolve('expo/bin/cli'), 'run:android', '--device', serial,
      '--port', '8083', ...process.argv.slice(2).filter(arg => arg !== '--build')], {
      cwd: path.resolve(__dirname, '..'), stdio: 'inherit', windowsHide: true,
      env: {...process.env, ANDROID_HOME: sdk, ANDROID_SERIAL: serial},
    });
    if (result.error) throw result.error;
    process.exitCode = result.status ?? 1;
    return;
  }
  if (!process.argv.includes('--prepare-only')) {
    const installed = run(['-s', serial, 'shell', 'pm', 'path', 'com.babybookplus']);
    if (!installed.includes('package:')) throw new Error('Install the migrated client with npm run android first.');
    console.log(run(['-s', serial, 'shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d',
      'babybookplus-native://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8083', 'com.babybookplus']));
  }
}
module.exports = {chooseDevice, checkServices, ensureDevice, apiPorts, emulatorArgs, DEFAULT_AVD};
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
