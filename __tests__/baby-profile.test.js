const fs = require('node:fs');
const source = fs.readFileSync(require('node:path').join(__dirname, '../src/App.js'), 'utf8');
const handler = source.slice(source.indexOf('    const handleDeleteBaby = async'), source.indexOf('    useEffect(() => { setDeleteProfileTarget(null);'));
const store = require('../src/utils/recordStore.cjs');
function fixture(profiles = [{ id: 1 }, { id: 2 }]) {
  store.reset();
  const context = { deleteProfileTarget: { id: 1, epoch: store.getEpoch() }, deleteProfileLock: { current: false }, profileSaving: null,
    activeBabyId: { current: 1 }, recordStore: store, api: { deleteChild: jest.fn().mockResolvedValue(null) },
    editTarget: { current: {} }, profileFlow: { current: {} }, historyRef: { current: ['babyProfile'] },
    toast: { success: jest.fn() }, scroll: { resetScroll: jest.fn() } };
  for (const name of ['ProfileSaving','SelectedProfileId','BabyProfileTarget','HomeRestore','FormAvatarUri','BloodTypeMenuOpen','DeleteProfileTarget','CurrentView']) context['set'+name] = jest.fn();
  context.setProfiles = jest.fn(fn => { profiles = fn(profiles); });
  const run = new Function(...Object.keys(context), `${handler}; return handleDeleteBaby;`)(...Object.values(context));
  return { context, run, profiles: () => profiles };
}
test('deletion retires only the target child and returns to Home', async () => {
  const f = fixture(); const a = store.startFetch(1,'growth'), b = store.startFetch(2,'growth');
  store.acceptFetch(2,'growth',[{id:9}],b);
  await f.run();
  expect(f.profiles()).toEqual([{id:2}]); expect(f.context.api.deleteChild).toHaveBeenCalledWith(1);
  store.acceptFetch(1,'growth',[{id:3}],a); store.confirm(1,'growth',{id:4});
  expect(store.getRows(1,'growth')).toEqual([]); expect(store.getRows(2,'growth')).toEqual([{id:9}]);
  expect(()=>store.begin({child:1,resource:'growth',type:'create',body:{},entity:'new'})).toThrow(/deleted/);
  expect(f.context.setCurrentView).toHaveBeenCalledWith('dashboard');
});
test('last child leaves the existing empty-child gate in control', async()=>{ const f=fixture([{id:1}]);await f.run();expect(f.profiles()).toEqual([]); });
test('failure preserves profiles and exposes retry', async()=>{const f=fixture();f.context.api.deleteChild.mockRejectedValue(new Error('offline'));await expect(f.run()).rejects.toThrow('offline');expect(f.profiles()).toHaveLength(2);expect(f.context.deleteProfileLock.current).toBe(false);});
test('stale session never deletes another account child', async()=>{const f=fixture();store.reset();await f.run();expect(f.context.api.deleteChild).not.toHaveBeenCalled();});
test('duplicate confirmation sends one request', async()=>{const f=fixture();let finish;f.context.api.deleteChild.mockImplementation(()=>new Promise(resolve=>{finish=resolve}));const first=f.run();await f.run();expect(f.context.api.deleteChild).toHaveBeenCalledTimes(1);finish();await first;});
