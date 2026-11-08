// Actual date JSX and wheel handlers; no API, native install or stored record writes.
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),{transformSync}=require("@babel/core");
const compile=source=>transformSync(source,{babelrc:false,configFile:false,plugins:["@babel/plugin-transform-react-jsx","@babel/plugin-transform-modules-commonjs"]}).code;
const pure=file=>{const m={exports:{}};new Function("module","exports",compile(fs.readFileSync(path.join(__dirname,file),"utf8")))(m,m.exports);return m.exports};
const theme=pure("../../theme.js"),dates=pure("../../utils/dates.js"),pickers=pure("../../utils/pickers.js");
const source=fs.readFileSync(path.join(__dirname,"DateField.js"),"utf8");
const nodes=t=>t&&typeof t==="object"?[t,...(t.props.children||[]).flatMap(nodes)]:[];
const style=n=>Object.assign({},...[n.props.style].flat(Infinity).filter(Boolean));
function harness({view="date",os="web",version=35,blur=true,reduced=false,transparent=true,palette=theme.PALETTES.boy,...props}={}) {
    const slots=[],effects=[],timers=new Map();let cursor=0,dirty=false,serial=0;
    const React={createElement:(type,props,...children)=>({type,props:{...props,children:children.flat(Infinity).filter(v=>v!=null&&v!==false)}}),
        useMemo:fn=>fn(),useRef:v=>{const i=cursor++;return slots[i]||=( {current:v})},
        useState:v=>{const i=cursor++;if(!(i in slots))slots[i]=typeof v==="function"?v():v;return[slots[i],next=>{next=typeof next==="function"?next(slots[i]):next;if(!Object.is(next,slots[i])){slots[i]=next;dirty=true}}]},
        useEffect:(fn,deps)=>{const i=cursor++,old=slots[i];if(!old||deps.some((v,j)=>!Object.is(v,old.deps[j])))effects.push(()=>{old?.cleanup?.();slots[i]={deps,cleanup:fn()}})}};
    const imports={react:{__esModule:true,default:React,...React},"react-native":{View:"View",Text:"Text",ScrollView:"ScrollView",TouchableOpacity:"TouchableOpacity",Platform:{OS:os,Version:version},StyleSheet:{create:v=>v,absoluteFill:{position:"absolute",inset:0},hairlineWidth:1},useWindowDimensions:()=>({width:320,height:568}),AccessibilityInfo:{isReduceTransparencyEnabled:async()=>!transparent,addEventListener:()=>({remove(){}})}},
        "expo-blur":{BlurView:"BlurView"},"react-native-safe-area-context":{useSafeAreaInsets:()=>({top:20,bottom:10})},"@expo/vector-icons":{Ionicons:"Icon"},"../../theme":theme,
        "../../context/ThemeContext":{useTheme:()=>({colors:palette,scheme:os==="dark"?"dark":"light"})},"../../utils/dates":dates,"../../utils/pickers":pickers,"../../utils/numericInput.cjs":require("../../utils/numericInput.cjs"),"../../context/GlassTargetContext":{useGlassTarget:()=>props.inheritedTarget || null},"./RecordFormSheet":{useRecordForm:()=>false},"./Field":{FieldShell:"FieldShell"}};
    for(const name of ["AppModal","Gradient","GlassLighting"])imports["./"+name]={__esModule:true,default:name};
    imports["./useReducedMotion"]={__esModule:true,default:()=>reduced};
    globalThis.CSS={supports:()=>blur};globalThis.matchMedia=()=>({matches:!transparent,addEventListener(){},removeEventListener(){}});
    const m={exports:{}};
    new Function("require","module","exports","setTimeout","clearTimeout",compile(source)+"\nexports.check={WheelColumn,WheelPickerModal,wheelGeometry,PrimaryButton,makeStyles,dateWheelStyles};")(name=>{assert(name in imports,name);return imports[name]},m,m.exports,(fn,delay)=>{const id=++serial;timers.set(id,{fn,delay});return id},id=>timers.delete(id));
    const input=view==="wheel"?{values:[1,2,3,4,5],value:3,label:"Day",compact:true,active:true,styles:m.exports.check.dateWheelStyles(palette),onChange(){},...props}:{visible:true,value:"2024-01-31",accessibilityLabel:"Starting Date",onChange(){},onClose(){},...props};
    const Component=view==="wheel"?m.exports.check.WheelColumn:m.exports.DateWheelPicker;
    const draw=()=>{let tree,count=0;do{dirty=false;cursor=0;tree=Component(input);if(view!=="wheel")tree=m.exports.check.WheelPickerModal({...tree.props,children:tree.props.children});effects.splice(0).forEach(fn=>fn());assert(++count<10)}while(dirty);return tree};
    const get=id=>nodes(draw()).find(n=>n.props.testID===id);
    const columns=()=>nodes(draw()).filter(n=>n.type?.name==="WheelColumn");
    const button=label=>nodes(draw()).find(n=>["TextButton","PrimaryButton"].includes(n.type?.name)&&n.props.label===label);
    return{input,draw,get,columns,button,module:m.exports,timers,flush:delay=>{for(const[id,t]of timers)if(t.delay===delay){timers.delete(id);t.fn()}},unmount:()=>slots.forEach(s=>s?.cleanup?.())};
}
(async()=>{
for(const palettes of[theme.PALETTES,theme.DARK_PALETTES])for(const palette of Object.values(palettes)){
    const h=harness({palette}),p={...palette.dateWheelGlass,...palette.overlayGlass};
    assert.equal(style(h.get("date-wheel-overlay")).backgroundColor,"transparent");assert(!style(h.get("date-wheel-overlay")).backdropFilter);assert.equal(style(h.get("date-wheel-overlay")).paddingTop,36);assert.equal(style(h.get("date-wheel-overlay")).paddingBottom,26);
    assert.equal(style(h.get("glass-date-wheel")).backdropFilter,"blur(28px)");assert.equal(style(h.get("glass-date-wheel")).maxWidth,380);assert.equal(style(h.get("glass-date-wheel")).borderRadius,28);
    assert.equal(nodes(h.draw()).filter(n=>n.props.testID==="date-wheel-divider").length,2);assert.equal(style(h.get("date-wheel-selection")).height,44);
    assert.deepEqual(h.columns().map(n=>n.props.label),["Day","Month","Year"]);assert.deepEqual(p.active,["#5B9DFF","#236BDF","#1558C8"]);
    assert.deepEqual(h.button("Done").props.material,p);assert.equal(h.button("Cancel").props.styles.textButtonLabel.color,p.secondary);
    let commits=[],closed=0;h.input.onChange=v=>commits.push(v);h.input.onClose=()=>closed++;
    h.columns().find(n=>n.props.label==="Month").props.onChange(2);assert.equal(commits.length,0);assert.equal(h.columns()[0].props.value,29);
    h.columns()[2].props.onChange(2025);assert.equal(h.columns()[0].props.value,28);h.button("Cancel").props.onPress();assert.equal(closed,1);assert.equal(commits.length,0);
    h.input.visible=false;h.draw();h.input.visible=true;h.draw();assert.equal(h.columns()[1].props.value,1);assert.equal(h.columns()[0].props.value,31);
    h.columns()[1].props.onChange(2);h.button("Done").props.onPress();assert.deepEqual(commits,["2024-02-29"]);assert.equal(closed,2);h.unmount();
}
for(const os of ["web","ios","android"]) for(const palette of [...Object.values(theme.PALETTES),...Object.values(theme.DARK_PALETTES)]) {
    const h=harness({os,palette});
    for(const scale of [1,1.3,2]) for(const styles of [h.module.check.makeStyles(palette,scale),h.module.check.dateWheelStyles(palette,scale)]) {
        for(const kind of ["primaryButton","textButton"]) {
            assert.equal(styles[kind].alignItems,"center");assert.equal(styles[kind].justifyContent,"center");
            assert.equal(styles[kind+"Label"].textAlign,"center");assert.equal(styles[kind+"Label"].flexShrink,1);
            if(os==="android") assert.equal(styles[kind+"Label"].includeFontPadding,false);
        }
    }
    h.unmount();
}
const restricted=harness({value:"2026-10-01",minimumDate:"2026-10-05",maximumDate:"2026-10-20",availableDates:["2026-10-01","2026-10-10","2026-10-15","2026-11-01"],headerAccessory:"context modes"});
assert.deepEqual(restricted.columns()[0].props.values,[10,15]);assert.equal(restricted.columns()[0].props.value,10);assert(nodes(restricted.draw()).some(n=>n.props.children.includes("context modes")));restricted.unmount();
const empty=harness({availableDates:[]});assert.equal(empty.columns().length,0);assert(empty.button("Done").props.disabled);empty.unmount();
const bounded=harness({minimumDate:"2024-03-10",maximumDate:"2024-09-15"});bounded.columns()[1].props.onChange(12);assert.equal(bounded.columns()[1].props.value,9);assert.equal(bounded.columns()[0].props.value,15);bounded.unmount();
for(const setting of[{blur:false},{os:"android"},{transparent:false}]){
 const h=harness(setting);assert(!style(h.get("glass-date-wheel")).backdropFilter);assert(!h.get("date-wheel-local-blur"));const g=nodes(h.draw()).find(n=>n.type==="Gradient");assert.deepEqual(g.props.colors,[theme.PALETTES.boy.overlayGlass.fallback,theme.PALETTES.boy.overlayGlass.fallback]);h.unmount();
}
const inherited=harness({os:"android",inheritedTarget:{current:"form"}});assert.equal(inherited.get("date-wheel-local-blur").props.blurTarget.current,"form");inherited.unmount();
const legacy=harness({os:"android",version:30,blurTarget:{}});assert.equal(legacy.get("date-wheel-local-blur").props.blurMethod,"dimezisBlurView");assert.equal(legacy.get("date-wheel-local-blur").props.intensity,100);assert.equal(legacy.get("date-wheel-local-blur").props.blurReductionFactor,4);legacy.unmount();
const native=harness({os:"android",blurTarget:{}});assert.equal(native.get("date-wheel-local-blur").props.blurMethod,"dimezisBlurViewSdk31Plus");native.unmount();
const ios=harness({os:"ios",transparent:false});ios.draw();await Promise.resolve();assert(!ios.get("date-wheel-local-blur"));ios.unmount();
const reduced=harness({reduced:true});assert.equal(reduced.draw().props.animationType,"none");assert(reduced.columns().every(n=>n.props.reducedMotion));reduced.unmount();
let chosen=[];const wheel=harness({view:"wheel",onChange:v=>chosen.push(v)}),scroll=()=>nodes(wheel.draw()).find(n=>n.type==="ScrollView"),moves=[];
scroll().props.ref.current={scrollTo:args=>moves.push(args)};scroll().props.onLayout();assert.deepEqual(moves.at(-1),{x:0,y:88,animated:false});
assert.equal(scroll().props.snapToInterval,44);assert.equal(scroll().props.decelerationRate,"normal");
scroll().props.onScrollBeginDrag();scroll().props.onMomentumScrollEnd({nativeEvent:{contentOffset:{y:132}}});assert.deepEqual(chosen,[4]);wheel.input.value=4;wheel.draw();
wheel.input.value=5;wheel.draw();assert.equal(moves.at(-1).animated,true);scroll().props.onScroll({nativeEvent:{contentOffset:{y:90}}});assert.deepEqual(chosen,[4]);
scroll().props.onScrollBeginDrag();scroll().props.onScrollEndDrag({nativeEvent:{contentOffset:{y:44}}});wheel.flush(100);assert.equal(chosen.at(-1),2);
const texts=nodes(wheel.draw()).filter(n=>n.type==="Text");assert.equal(style(texts[4]).opacity,1);assert.equal(style(texts[3]).opacity,.76);assert.equal(style(texts[0]).opacity,.44);
wheel.input.reducedMotion=true;wheel.input.value=3;wheel.draw();assert.equal(moves.at(-1).animated,false);wheel.unmount();assert.equal(wheel.timers.size,0);
const regular=harness({view:"wheel",compact:false});assert.equal(nodes(regular.draw()).find(n=>n.type==="ScrollView").props.snapToInterval,64);assert(nodes(regular.draw()).filter(n=>n.type==="Text").every(n=>style(n).opacity!==.44));regular.unmount();
const monthFit=harness({view:"wheel",values:["September","October","November"],value:"October",label:"Month"});monthFit.draw().props.onLayout({nativeEvent:{layout:{width:118}}});
const monthTexts=nodes(monthFit.draw()).filter(n=>n.type==="Text");assert(monthTexts.every(n=>style(n).fontSize<24&&style(n).fontSize>=20));assert(monthTexts.every(n=>n.props.children[0].length>=7));monthFit.unmount();
for(const scale of [1,1.3,2])for(const compact of [false,true]) {
 const {row,viewport,frame,padding,top}=wheel.module.check.wheelGeometry(scale,compact);
 assert.equal((frame-viewport)/2+padding+row/2,top+row/2,"Selected row and band share a center");
 assert(row >= (compact?30:44)*scale,"Scaled text fits its row");
}
console.log("Glass date wheel checks passed: six palettes, transparent overlay/local blur/fallbacks, date drafts/leap/bounds/restrictions, actions, fading, stable scroll/snap guards and reduced motion. Other wheels keep 64dp geometry.");
})().catch(e=>{console.error(e);process.exitCode=1});
