import assert from 'node:assert/strict';
import {initDiningGuide} from '../src/dining.js';
// Exercise empty results and boundary behavior independently of the growing real dataset.
const select={value:'0',addEventListener(type,listener){assert.equal(type,'change');this.change=listener;}};
const status={textContent:''},empty={hidden:true};
const cards=[{id:'27-seats-20-party',dataset:{groupCapacity:'20',totalSeats:'27'}},{id:'163-seats-50-party',dataset:{groupCapacity:'50',totalSeats:'163'}},{id:'unknown-party',dataset:{groupCapacity:'',totalSeats:'120'}}];
globalThis.document={getElementById:id=>({'dining-capacity':select,'dining-results':status,'dining-empty':empty}[id]),querySelectorAll:()=>cards};
initDiningGuide();
assert.ok(cards.every(c=>!c.hidden));
for(const [minimum,visible] of [[20,['27-seats-20-party','163-seats-50-party','unknown-party']],[30,['163-seats-50-party','unknown-party']],[50,['163-seats-50-party','unknown-party']],[60,['unknown-party']],[0,['27-seats-20-party','163-seats-50-party','unknown-party']]]){
 select.value=String(minimum);select.change();
 assert.deepEqual(cards.filter(c=>!c.hidden).map(c=>c.id),visible);
 assert.equal(empty.hidden,minimum!==60);
 assert.match(status.textContent,/人数要確認 1件/);
}
delete globalThis.document;
console.log('PASS capacity filtering uses party limits only; unknown, exact boundary, no-match and reset states');
