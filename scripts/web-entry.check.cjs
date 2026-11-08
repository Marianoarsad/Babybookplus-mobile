const assert = require('node:assert/strict');
const fs = require('node:fs');
const {transformSync} = require('@babel/core');
const calls = [], App = {};
const code = transformSync(fs.readFileSync(`${__dirname}/../index.js`, 'utf8'), {
  configFile: false, babelrc: false,
  plugins: ['@babel/plugin-transform-modules-commonjs'],
}).code;
new Function('require', code)(name => {
  if (name === 'react-native') return {AppRegistry: {registerComponent: (key, factory) => calls.push([key, factory()])}};
  if (name === 'expo') return {registerRootComponent: app => calls.push(['expo-root', app])};
  if (name === './App') return {__esModule: true, default: App};
  if (name === './app.json') return {name: 'BabyBookPlus'};
  throw new Error(name);
});
assert.deepEqual(calls, [['BabyBookPlus', App], ['expo-root', App]]);
console.log('Entry check passed: native app name retained and Expo mounts the web root.');
