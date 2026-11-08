import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {Text} from 'react-native';
import {PALETTES, DARK_PALETTES} from '../src/theme';
let mockColors = PALETTES.boy;
jest.mock('../src/context/ThemeContext', () => ({useTheme: () => ({colors: mockColors})}));
jest.mock('../src/components/ui/Gradient', () => ({__esModule:true, default:'Gradient'}));
jest.mock('../src/components/ui/GlassLighting', () => ({__esModule:true, default:'Lighting'}));
jest.mock('../src/components/ui/useReducedMotion', () => ({__esModule:true, default:()=>false}));
jest.mock('@expo/vector-icons', () => ({Ionicons:'Icon'}));
jest.mock('../src/components/ui/AnchoredMenu', () => ({__esModule:true, default:'Menu', AnchoredMenuItem:'Option'}));
import SelectTrigger from '../src/components/ui/SelectTrigger';
import OptionSheet from '../src/components/ui/OptionSheet';

for (const [index, colors] of [...Object.values(PALETTES), ...Object.values(DARK_PALETTES)].entries()) {
 test(`shared selector material ${index} preserves labels, errors and action`,()=>{
  mockColors=colors; const press=jest.fn(); let tree;
  act(()=>{tree=renderer.create(<SelectTrigger label="Blood Type" value="A+" required error="Choose a value" onPress={press}/>)});
  expect(tree.root.findByType('Gradient').props.colors).toBe(colors.growthDropdownGlass.popoverPanel);
  expect(tree.root.findByType('Lighting').props.radius).toBe(22);
  const control=tree.root.findAll(n=>n.props.accessibilityRole==='button' && n.props.onPress)[0];
  act(()=>control.props.onPress({})); expect(press).toHaveBeenCalledTimes(1);
  expect(tree.root.findAllByType(Text).some(n=>n.props.children==='Choose a value')).toBe(true);
  act(()=>tree.unmount());
 });
}
test('option menu preserves selected keys, notes, clear values and connected header',()=>{
 const select=jest.fn(), close=jest.fn(); let tree;
 act(()=>{tree=renderer.create(<OptionSheet visible anchor={{x:16,y:300,width:330,height:52}}
  options={[{key:'',label:'Not linked',note:'Leave unlinked'},{key:'a',label:'A very long condition label'}]}
  selectedKey="a" onSelect={select} onClose={close}/>)});
 const menu=tree.root.findByType('Menu');
 expect(menu.props.appearance).toBe('connectedSelect'); expect(menu.props.dimBackdrop).toBe(false);
 expect(menu.props.header.props.value).toBe('A very long condition label');
 const options=tree.root.findAllByType('Option'); expect(options[1].props.selected).toBe(true); expect(options[0].props.variant).toBe('connectedSelect');
 expect(options[0].props.note).toBe('Leave unlinked');
 act(()=>options[0].props.onPress());expect(select).toHaveBeenCalledWith('');
 act(()=>menu.props.header.props.onPress());expect(close).toHaveBeenCalledTimes(1);
 act(()=>tree.unmount());
});
test('expanded and covered triggers have the correct chevron and accessibility state',()=>{
 let tree;act(()=>{tree=renderer.create(<SelectTrigger expanded value="Height"/>)});
 expect(tree.root.findByType('Icon').props.name).toBe('chevron-up');
 expect(tree.root.findAllByType('Gradient')).toHaveLength(0);
 act(()=>tree.update(<SelectTrigger covered value="Height"/>));
 expect(tree.root.findAll(n=>n.props.importantForAccessibility==='no-hide-descendants').length).toBeGreaterThan(0);
 act(()=>tree.unmount());
});
