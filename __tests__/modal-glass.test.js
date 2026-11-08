import React from 'react';
import {View, Modal} from 'react-native';
import renderer, {act} from 'react-test-renderer';
import AppModal from '../src/components/ui/AppModal';
import {useGlassTarget} from '../src/context/GlassTargetContext';
const close = jest.fn();
let mockBusy = false;
jest.mock('expo-blur', () => ({BlurTargetView: require('react-native').View}));
jest.mock('../src/components/ui/DatabaseLoadingOverlay', () => () => null);
jest.mock('../src/context/DatabaseLoadingContext', () => ({
  ModalLayerContext: require('react').createContext(null),
  BlockedContent: ({children}) => children,
  useDatabaseLoading: () => ({busy: mockBusy, topModal: null, register: () => () => {}, focusTarget: null}),
}));
test('native modal captures are distinct and preserve acceleration overrides and busy close guards', async () => {
  const targets = [];
  function Probe(){targets.push(useGlassTarget());return <View/>;}
  let tree;
  await act(async () => {tree=renderer.create(<AppModal transparent onRequestClose={close}><Probe/><AppModal transparent hardwareAccelerated={false}><Probe/></AppModal></AppModal>);});
  expect(targets[0]).toBeTruthy();expect(targets[1]).toBeTruthy();expect(targets[0]).not.toBe(targets[1]);
  const modals=tree.root.findAllByType(Modal);
  expect(modals[0].props.hardwareAccelerated).toBe(true);expect(modals[1].props.hardwareAccelerated).toBe(false);
  modals[0].props.onRequestClose();expect(close).toHaveBeenCalledTimes(1);
  mockBusy=true;await act(async()=>tree.update(<AppModal transparent onRequestClose={close}><Probe/></AppModal>));
  tree.root.findByType(Modal).props.onRequestClose();expect(close).toHaveBeenCalledTimes(1);
  await act(async()=>tree.unmount());mockBusy=false;
});

