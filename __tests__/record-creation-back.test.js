import React from 'react';
import renderer, {act} from 'react-test-renderer';
import RecordCreationContext, {useRecordCreationBack} from '../src/context/RecordCreationContext';

test.each(['milk','solid','metrics','vaccine','checkup','medication','illness','hospitalization','memory'])('%s returns only its own creation flow', key=>{
 const close=jest.fn(), back=jest.fn(), finish=jest.fn(); let dismiss, tree;
 const flow={origin:{tab:key},back,finish};
 function Probe(props){dismiss=useRecordCreationBack(props);return null;}
 const draw=(props={})=><RecordCreationContext.Provider value={flow}><Probe visible creationKey={key} onClose={close} {...props}/></RecordCreationContext.Provider>;
 act(()=>{tree=renderer.create(draw())});expect(typeof dismiss).toBe('function');
 act(()=>dismiss());expect(close).toHaveBeenCalledTimes(1);expect(back).toHaveBeenCalledTimes(1);
 act(()=>tree.update(draw({record:{id:1}})));expect(dismiss).toBeNull();
 act(()=>tree.update(draw({creationKey:'unrelated'})));expect(dismiss).toBeNull();
 act(()=>tree.unmount());
});
test('successful closure finishes the origin without reopening the chooser; ordinary forms keep Close',()=>{
 const back=jest.fn(), finish=jest.fn();let tree,dismiss;
 function Probe(props){dismiss=useRecordCreationBack(props);return null;}
 const flow={origin:{tab:'milk'},back,finish};
 const draw=(visible,context=flow)=><RecordCreationContext.Provider value={context}><Probe visible={visible} creationKey="milk" onClose={()=>{}}/></RecordCreationContext.Provider>;
 act(()=>{tree=renderer.create(draw(true))});act(()=>tree.update(draw(false)));
 expect(finish).toHaveBeenCalledTimes(1);expect(back).not.toHaveBeenCalled();
 act(()=>tree.update(draw(true,null)));expect(dismiss).toBeNull();act(()=>tree.unmount());
});
