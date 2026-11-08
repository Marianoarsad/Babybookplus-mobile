test('native registry and isolated source entry are preserved', () => {
  expect(require('../app.json').name).toBe('BabyBookPlus');
  expect(require('../package.json').dependencies['react-native']).toBe('0.88.1');
  expect(require('../app.json').expo.android.package).toBe('com.babybookplus');
});
