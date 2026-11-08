import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {Text, StyleSheet} from 'react-native';
import {PALETTES, DARK_PALETTES} from '../src/theme';
let mockColors=PALETTES.boy;
jest.mock('../src/context/ThemeContext',()=>({useTheme:()=>({colors:mockColors})}));
jest.mock('../src/components/ui/Gradient',()=>({__esModule:true,default:'Gradient'}));
jest.mock('../src/components/ui/PulseLoader',()=>({__esModule:true,default:'Loader'}));
jest.mock('@expo/vector-icons',()=>({Ionicons:'Icon'}));
jest.mock('expo-haptics',()=>({selectionAsync:jest.fn(()=>Promise.resolve())}));
import Button from '../src/components/ui/Button';

test('all button variants center the inline label/icon group and wrapping labels',()=>{
 for(const colors of [...Object.values(PALETTES),...Object.values(DARK_PALETTES)])
 for(const variant of ['primary','accent','secondary','ghost','danger','auth','authSecondary','settings','settingsSecondary'])
 for(const position of ['none','left','right']){
  mockColors=colors;let tree;const press=jest.fn();
  act(()=>{tree=renderer.create(<Button title={'A long label\nthat wraps'} variant={variant} icon={position==='none'?undefined:'arrow-forward'} iconPosition={position} fullWidth={false} onPress={press}/>)});
  const control=tree.root.findAll(n=>n.props.accessibilityRole==='button' && n.props.onPress)[0], outer=StyleSheet.flatten(typeof control.props.style==='function' ? control.props.style({}) : control.props.style);
  expect(outer.alignItems).toBe('center');expect(outer.justifyContent).toBe('center');
  const label=tree.root.findByType(Text);expect(label.props.style.textAlign).toBe('center');expect(label.props.style.flexShrink).toBe(1);
  const row=tree.root.findAll(n=>n.props.style?.flexDirection==='row')[0];
  expect(row.props.style.alignItems).toBe('center');expect(row.props.style.justifyContent).toBe('center');
  if(position!=='none') expect(tree.root.findByType('Icon').props.style?.position).not.toBe('absolute');
  act(()=>control.props.onPress({}));expect(press).toHaveBeenCalledTimes(1);act(()=>tree.unmount());
 }
});
test('loading, disabled and icon-only buttons retain their guards and content',()=>{
 let tree;const press=jest.fn();
 act(()=>{tree=renderer.create(<Button title="Save" loading onPress={press}/>)});
 expect(tree.root.findAllByType('Loader')).toHaveLength(1);
 act(()=>tree.root.findAll(n=>n.props.accessibilityRole==='button' && n.props.onPress)[0].props.onPress({}));expect(press).not.toHaveBeenCalled();
 act(()=>tree.update(<Button title="Delete" disabled onPress={press}/>));
 act(()=>tree.root.findAll(n=>n.props.accessibilityRole==='button' && n.props.onPress)[0].props.onPress({}));expect(press).not.toHaveBeenCalled();
 act(()=>tree.update(<Button title="Back" icon="chevron-back" iconOnly/>));
 expect(tree.root.findAllByType(Text)).toHaveLength(0);expect(tree.root.findAllByType('Icon')).toHaveLength(1);act(()=>tree.unmount());
});
