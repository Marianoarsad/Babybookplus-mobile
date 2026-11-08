import React from 'react';
import renderer, {act} from 'react-test-renderer';
import StartupGuard from '../src/components/StartupGuard';
const {chooseDevice, checkServices} = require('../scripts/android-dev.cjs');

test('missing services stop launch with the correct instructions', async () => {
  await expect(checkServices(async () => { throw new Error('offline'); })).rejects.toThrow('npm start');
  await expect(checkServices(async url => {
    if (url.includes('4000')) throw new Error('offline');
    return {ok: true, text: async () => 'packager-status:running'};
  }, 'http://localhost:4000')).rejects.toThrow('npm run dev');
  await expect(checkServices(async url => ({ok: true, text: async () =>
    url.includes('/api/health') ? '{"ok":true,"service":"babybook-api"}' : 'packager-status:running'}))).resolves.toBeUndefined();
});

test('device selection never guesses between emulators', () => {
  expect(chooseDevice('List of devices attached\nemulator-5554\tdevice\n')).toBe('emulator-5554');
  expect(() => chooseDevice('emulator-5554 device\nemulator-5556 device')).toThrow();
  expect(chooseDevice('emulator-5554 device\nemulator-5556 device', 'emulator-5556')).toBe('emulator-5556');
  expect(() => chooseDevice('emulator-5554 offline')).toThrow();
});

describe('startup deadline', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => { jest.restoreAllMocks(); jest.useRealTimers(); });
  test('a stalled startup exposes Retry and dismisses the native splash', async () => {
    const retry = jest.fn(), hide = jest.fn();
    let tree;
    await act(async () => { tree = renderer.create(<StartupGuard onRetry={retry} hideSplash={hide}>{() => null}</StartupGuard>); });
    act(() => jest.advanceTimersByTime(19999));
    expect(tree.root.findAllByProps({accessibilityLabel: 'Retry startup'})).toHaveLength(0);
    act(() => jest.advanceTimersByTime(1));
    const button = tree.root.findByProps({accessibilityLabel: 'Retry startup'});
    act(() => button.props.onPress());
    expect(retry).toHaveBeenCalledTimes(1);
    await act(async () => tree.root.findByType(require('react-native').View).props.onLayout());
    expect(hide).toHaveBeenCalledTimes(1);
    await act(async () => tree.unmount());
  });
  test('completed startup cancels the deadline and unmount clears timers', async () => {
    let tree;
    const child = jest.fn(() => null);
    const scheduled = jest.spyOn(global, 'setTimeout'), canceled = jest.spyOn(global, 'clearTimeout');
    await act(async () => { tree = renderer.create(<StartupGuard hideSplash={jest.fn()}>{child}</StartupGuard>); });
    expect(child).toHaveBeenCalled();
    const deadline = scheduled.mock.results[scheduled.mock.calls.findIndex(call => call[1] === 20000)].value;
    await act(async () => child.mock.calls[0][0]({session: true, fonts: true, assets: true}));
    act(() => jest.advanceTimersByTime(30000));
    expect(tree.root.findAllByProps({accessibilityLabel: 'Retry startup'})).toHaveLength(0);
    await act(async () => tree.unmount());
    expect(canceled).toHaveBeenCalledWith(deadline);
  });
  test('unmount cancels a still-pending startup deadline', async () => {
    const scheduled = jest.spyOn(global, 'setTimeout'), canceled = jest.spyOn(global, 'clearTimeout');
    let tree;
    await act(async () => { tree = renderer.create(<StartupGuard>{() => null}</StartupGuard>); });
    const deadline = scheduled.mock.results[scheduled.mock.calls.findIndex(call => call[1] === 20000)].value;
    await act(async () => tree.unmount());
    expect(canceled).toHaveBeenCalledWith(deadline);
  });

});
