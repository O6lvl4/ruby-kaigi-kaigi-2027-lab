import assert from 'node:assert/strict';
import {matchesDiningFilter} from '../src/dining.js';
const venues=[{id:'27-seats-20-party',groupCapacity:20,totalSeats:27,area:'橘通西'},{id:'163-seats-50-party',groupCapacity:50,totalSeats:163,area:'橘通東'},{id:'unknown-party',groupCapacity:null,totalSeats:120,area:'橘通西'}];
for(const [minimum,ids] of [[20,['27-seats-20-party','163-seats-50-party','unknown-party']],[30,['163-seats-50-party','unknown-party']],[50,['163-seats-50-party','unknown-party']],[60,['unknown-party']],[0,['27-seats-20-party','163-seats-50-party','unknown-party']]])assert.deepEqual(venues.filter(v=>matchesDiningFilter(v,minimum)).map(v=>v.id),ids);
assert.deepEqual(venues.filter(v=>matchesDiningFilter(v,30,'橘通西')).map(v=>v.id),['unknown-party']);
assert.deepEqual(venues.filter(v=>matchesDiningFilter(v,0,'橘通東')).map(v=>v.id),['163-seats-50-party']);
assert.deepEqual(venues.filter(v=>matchesDiningFilter(v,100,'不明')).map(v=>v.id),[]);
console.log('PASS shared capacity/area filters: exact boundary, total-seats exclusion, unknown, empty and reset');
