import React from 'react';
import renderer, {act} from 'react-test-renderer';
const mockPan = jest.fn(() => true);
const mockExpand = jest.fn();
const mockMotion = {presented:true, canExpand:true, isExpanded:false, height:500, shade:1,
 grabberPan:{panHandlers:{onStartShouldSetResponder:mockPan}}, expand:mockExpand, collapse:jest.fn(), dismiss:jest.fn(), startOpening:jest.fn()};
jest.mock('../src/components/ui/useBottomSheetMotion',()=>({__esModule:true,default:()=>mockMotion}));
jest.mock('../src/context/ThemeContext',()=>({useTheme:()=>({colors:require('../src/theme').PALETTES.boy,scheme:'light'})}));
jest.mock('../src/context/LanguageContext',()=>({useLanguage:()=>({t:k=>k})}));
jest.mock('react-native-safe-area-context',()=>({useSafeAreaInsets:()=>({top:24,left:0,right:0,bottom:0})}));
jest.mock('@expo/vector-icons',()=>({Ionicons:'Icon'}));
jest.mock('expo-blur',()=>({BlurTargetView:'BlurTarget',BlurView:'Blur'}));
jest.mock('../src/components/ui/AppModal',()=>({__esModule:true,default:'Modal'}));
jest.mock('../src/components/ui/Gradient',()=>({__esModule:true,default:'Gradient'}));
jest.mock('../src/components/ui/PulseLoader',()=>({__esModule:true,default:'Spinner'}));
import RecordFormSheet from '../src/components/ui/RecordFormSheet';
test('actual record form mounts the early-capture handle outside action buttons',()=>{
 let tree;act(()=>{tree=renderer.create(<RecordFormSheet visible title="Edit Solid Food Entry" onClose={()=>{}} onSubmit={()=>{}} />)});
 const handle=tree.root.findAll(n=>n.props.testID==='sheet-grabber' && n.props.onStartShouldSetResponder)[0];
 expect(handle.props.onStartShouldSetResponder).toBe(mockPan);expect(handle.props.pointerEvents).toBe('box-only');
 act(()=>handle.props.onAccessibilityAction({nativeEvent:{actionName:'increment'}}));expect(mockExpand).toHaveBeenCalledTimes(1);
 const save=tree.root.findAll(n=>n.props.accessibilityLabel==='Save'&&n.props.onPress)[0];
 expect(save.props.onStartShouldSetResponder).toBeUndefined();
 act(()=>tree.unmount());
});
