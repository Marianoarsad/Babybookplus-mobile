import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {Text, TextInput} from 'react-native';
import {PALETTES, DARK_PALETTES, authMaterial, radius} from '../src/theme';
let mockColors = PALETTES.boy;
jest.mock('../src/context/ThemeContext', () => ({useTheme: () => ({colors: mockColors})}));
jest.mock('../src/components/ui/NeumorphicInsetSurface', () => ({__esModule:true, default:'InsetSurface'}));
jest.mock('@expo/vector-icons', () => ({Ionicons:'Icon'}));
jest.mock('react-native-safe-area-context', () => ({useSafeAreaInsets: () => ({top:0,left:0,right:0,bottom:0})}));
import Field, {FieldShell, SunkenInputSurface} from '../src/components/ui/Field';
import ScreenHeader from '../src/components/ui/ScreenHeader';
test('trailing units align with the input surface instead of labels and error text',()=>{
 mockColors=PALETTES.boy;let tree;
 act(()=>{tree=renderer.create(<Field label="Duration (optional)" value="18" numericMode="digits" error="Invalid duration"
  trailing={<Text>minutes</Text>}/>)});
 const row=tree.root.findByProps({testID:'field-control-row'});
 expect(row.props.style.alignItems).toBe('center');
 expect(row.findAllByType('InsetSurface')).toHaveLength(1);
 expect(row.findByProps({testID:'field-trailing'}).findByType(Text).props.children).toBe('minutes');
 expect(row.findAllByType(Text).some(n=>n.props.children==='Invalid duration')).toBe(false);
 act(()=>tree.unmount());
});
for (const [group, palettes] of Object.entries({light:PALETTES,dark:DARK_PALETTES})) {
  for (const [name, colors] of Object.entries(palettes)) test(`${group}/${name}: default fields use the approved inset material`, () => {
    mockColors=colors; let tree; act(()=>{tree=renderer.create(<FieldShell label="Name"><TextInput /></FieldShell>)});
    const surface=tree.root.findByType('InsetSurface');
    expect(surface.props.material.insetShadow).toBe(colors.sunkenInput.inputShadow);
    expect(surface.props.material.surface).toBe(colors.sunkenInput.inputBase);
    expect(surface.props.material.radius).toBe(radius.pill);
    act(()=>tree.unmount());
  });
}
test('auth retains its fixed material; multiline and custom search reuse the same surface',()=>{
  mockColors=PALETTES.boy;let tree;act(()=>{tree=renderer.create(<FieldShell appearance="auth" multiline label="Notes" error="Required"><TextInput multiline /></FieldShell>)});
  expect(tree.root.findByType('InsetSurface').props.material.insetShadow).toBe(authMaterial.inputShadow);
  expect(tree.root.findByType('InsetSurface').props.material.radius).toBe(radius.xl);
  expect(tree.root.findAllByType(Text).some(n=>n.props.children==='Required')).toBe(true);
  act(()=>tree.update(<SunkenInputSurface />));expect(tree.root.findByType('InsetSurface').props.pointerEvents).toBe('none');act(()=>tree.unmount());
});
test('numeric filtering, focus ring and disabled input behavior survive the material change',()=>{
 mockColors=PALETTES.boy;const change=jest.fn();let tree;act(()=>{tree=renderer.create(<Field label="Phone" value="" numericMode="digits" onChangeText={change} />)});
 act(()=>tree.root.findByType(TextInput).props.onChangeText('09a1-23'));expect(change).toHaveBeenCalledWith('09123');
 act(()=>tree.root.findByType(TextInput).props.onFocus({}));expect(tree.root.findByType('InsetSurface').props.style.borderColor).toBe(mockColors.sunkenInput.focus);
 act(()=>tree.update(<Field label="Phone" value="" editable={false} />));expect(tree.root.findByType(TextInput).props.editable).toBe(false);act(()=>tree.unmount());
});
test('secondary header displays only the arrow and title, retaining the Back accessible name',()=>{
 mockColors=PALETTES.boy;const back=jest.fn();let tree;act(()=>{tree=renderer.create(<ScreenHeader title="Baby Profile" onBack={back} />)});
 expect(tree.root.findAllByType(Text).map(n=>n.props.children)).toEqual(['Baby Profile']);
 const control=tree.root.findAll(n=>n.props.accessibilityLabel==='Back' && n.props.onPress)[0];act(()=>control.props.onPress());expect(back).toHaveBeenCalledTimes(1);act(()=>tree.unmount());
});
