const {ensureDevice, emulatorArgs, DEFAULT_AVD} = require('../scripts/android-dev.cjs');

test('Windows launches reuse host IPv4 DNS without selecting a new provider', () => {
  expect(emulatorArgs('win32', ['192.0.2.1', '::1', '192.0.2.2']))
    .toEqual(['-avd', DEFAULT_AVD, '-dns-server', '192.0.2.1,192.0.2.2']);
  expect(emulatorArgs('win32', ['::1'])).toEqual(['-avd', DEFAULT_AVD]);
  expect(emulatorArgs('linux', ['192.0.2.1'])).toEqual(['-avd', DEFAULT_AVD]);
});

test('reuses the requested AVD even with another emulator connected', async () => {
  const launch = jest.fn();
  const run = args => args[0] === 'devices' ? 'emulator-5554 device\nemulator-5556 device'
    : args.includes('emu') ? (args[1] === 'emulator-5556' ? DEFAULT_AVD : 'Other_AVD') + '\r\r\nOK\r\r\n' : '1';
  await expect(ensureDevice(run, launch)).resolves.toBe('emulator-5556');
  expect(launch).not.toHaveBeenCalled();
});

test('starts a stopped AVD once and waits for a connected, fully booted device', async () => {
  let stage = 0;
  const run = args => args[0] === 'devices' ? (stage === 0 ? '' : 'emulator-5554 device')
    : args.includes('emu') ? DEFAULT_AVD + '\nOK\n' : stage === 2 ? '1' : '0';
  const launch = jest.fn(), wait = jest.fn(async () => { stage++; });
  await expect(ensureDevice(run, launch, undefined, wait)).resolves.toBe('emulator-5554');
  expect(launch).toHaveBeenCalledTimes(1);
  expect(wait).toHaveBeenCalledTimes(2);
});

test('preserves an explicit connected device override', async () => {
  const launch = jest.fn();
  await expect(ensureDevice(() => 'phone-serial device', launch, 'phone-serial')).resolves.toBe('phone-serial');
  expect(launch).not.toHaveBeenCalled();
  await expect(ensureDevice(() => '', launch, 'phone-serial')).rejects.toThrow('not connected');
});

test('requires a serial if two running instances have the target AVD name', async () => {
  const run = args => args[0] === 'devices' ? 'emulator-5554 device\nemulator-5556 device' : DEFAULT_AVD;
  const launch = jest.fn();
  await expect(ensureDevice(run, launch)).rejects.toThrow('Multiple');
  expect(launch).not.toHaveBeenCalled();
});

test('reports launch failures and boot timeouts instead of waiting forever', async () => {
  await expect(ensureDevice(() => '', async () => { throw Error('AVD missing'); })).rejects.toThrow('AVD missing');
  const clock = jest.spyOn(Date, 'now').mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValue(180001);
  try {
    await expect(ensureDevice(() => '', async () => {}, undefined, async () => {})).rejects.toThrow('3 minutes');
  } finally { clock.mockRestore(); }
});
