const fs = require('node:fs');
const path = require('node:path');
import {StyleSheet} from 'react-native';

test('installed native StyleSheet provides the positioning used by visual layers', () => {
  expect(StyleSheet.absoluteFill).toEqual({
    position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
  });
  const styles = StyleSheet.create({face: {...StyleSheet.absoluteFill, borderRadius: 22}});
  expect(StyleSheet.flatten([styles.face, {left: 2}])).toMatchObject({
    position: 'absolute', top: 0, right: 0, bottom: 0, left: 2, borderRadius: 22,
  });
});

test('runtime source never uses the StyleSheet property removed from native', () => {
  const unsupported = [];
  function walk(directory) {
    for (const entry of fs.readdirSync(directory, {withFileTypes: true})) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (/\.[cm]?[jt]sx?$/.test(file) && !file.includes('.check.') &&
          /StyleSheet\.absoluteFillObject\b/.test(fs.readFileSync(file, 'utf8'))) {
        unsupported.push(path.relative(path.join(__dirname, '..'), file));
      }
    }
  }
  walk(path.join(__dirname, '../src'));
  expect(unsupported).toEqual([]);
});
