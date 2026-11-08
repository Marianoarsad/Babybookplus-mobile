const assert=require('node:assert/strict'),fs=require('node:fs'),{parse}=require('@babel/parser');
const source=fs.readFileSync(__dirname+'/Dashboard.js','utf8');
const walk=n=>!n||typeof n!=='object'?[]:[n,...Object.values(n).flatMap(v=>Array.isArray(v)?v.flatMap(walk):walk(v))];
const nodes=walk(parse(source,{sourceType:'module',plugins:['jsx']}));
const variable=name=>nodes.find(n=>n.type==='VariableDeclarator'&&n.id.name===name);
const snippet=n=>source.slice(n.start,n.end);
const items=(growth,vaccine,shares,nav)=>new Function('growthRows','vaxProgress','activeShares','nav','return '+snippet(variable('setupItems').init))(growth,{completed:vaccine},shares,nav);
for(let count=1;count<=4;count++) {
 let routes=[]; const rows=items(count>=2?[{}]:[],count>=3?1:0,count>=4?[{}]:[],(...args)=>routes.push(args));
 assert.equal(new Function('setupItems','return '+snippet(variable('setupDoneCount').init))(rows),count);
 rows.slice(1).forEach(r=>r.onPress());
 assert.deepEqual(routes,[['growth','metrics'],['health','immunizations'],['share']]);
}
let dismissed=false,seen=[];
const effect=nodes.find(n=>n.type==='CallExpression'&&n.callee.name==='useEffect'&&snippet(n).includes('if (setupComplete'));
const run=(complete,hidden)=>new Function('setupComplete','setupDismissed','markSeen','setSetupDismissed','return ('+snippet(effect.arguments[0])+')')(complete,hidden,k=>seen.push(k),v=>dismissed=v)();
run(false,false);assert.equal(dismissed,false);run(true,false);assert.equal(dismissed,true);assert.deepEqual(seen,['setup']);
dismissed=false;seen=[];new Function('markSeen','setSetupDismissed','return ('+snippet(variable('dismissSetup').init)+')')(k=>seen.push(k),v=>dismissed=v)();assert(dismissed);assert.deepEqual(seen,['setup']);
for(const [os,version,target,expected] of [['android',30,{},false],['android',31,{},true],['android',35,null,false],['ios',17,null,true],['web',0,null,false]])assert.equal(new Function('Platform','backgroundBlurTarget','return '+snippet(variable('nativeBlur').init))({OS:os,Version:version},target),expected);
const rowDisabled=nodes.find(n=>n.type==='JSXAttribute'&&n.name.name==='disabled'&&snippet(n).includes('item.done'));
for(const item of [{done:true,onPress(){}},{done:false,onPress(){}},{done:false}])assert.equal(new Function('item','return '+snippet(rowDisabled.value.expression))(item),item.done||!item.onPress);
for(const [dismissed,complete,shown] of [[null,false,false],[false,false,true],[false,true,false],[true,false,false]])assert.equal(new Function('setupDismissed','setupComplete','return '+snippet(variable('showSetupCard').init))(dismissed,complete),shown);
assert(!source.includes('textDecorationLine: "line-through"'));
assert(source.includes('minHeight: MIN_TOUCH'));assert(source.includes('minWidth: 0'));
const app=fs.readFileSync(__dirname+'/../App.js','utf8');assert(app.includes('backgroundBlurTarget={pageBlurTargetRef}'));assert(app.indexOf('</BlurTargetView>',app.indexOf('ref={pageBlurTargetRef}'))<app.indexOf('<Dashboard'));
console.log('Setup checklist: dynamic progress, navigation, dismissal/completion persistence, API30 fallback, supported blur and safe target wiring passed.');
