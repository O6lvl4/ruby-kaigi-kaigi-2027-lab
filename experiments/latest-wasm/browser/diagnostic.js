let worker;let generation=0;const $=s=>document.querySelector(s);const key='ruby-foundation-proof-stage-v1';
function record(stage,detail={}){const row={stage,time:new Date().toISOString(),...detail};$('#status').textContent=stage;$('#log').textContent+=JSON.stringify(row)+'\n';try{localStorage.setItem(key,JSON.stringify(row));}catch{}}
try{const last=localStorage.getItem(key);if(last)$('#log').textContent='前回の最終状態: '+last+'\n';}catch{}
function stop(log=true){generation++;worker?.terminate();worker=null;$('#start').disabled=false;$('#stop').disabled=true;if(log)record('検証を終了しました');}
$('#stop').onclick=()=>stop();
$('#start').onclick=()=>{if(worker)return;const current=++generation;$('#start').disabled=true;$('#stop').disabled=false;$('#view').replaceChildren();record('検証を開始');worker=new Worker('./proof.worker.js');worker.onmessage=({data})=>{if(current!==generation)return;if(data.type==='stage')record(data.stage,data.details);if(data.type==='success'){record('最小 Rails のテスト成功（iPhone 安定性は別途確認）',data.result);$('#view').innerHTML=data.result.html;stop(false);}if(data.type==='error'){record('検証失敗',{error:data.error});worker?.terminate();worker=null;$('#start').disabled=false;$('#stop').disabled=true;}};worker.onerror=event=>{record('Worker エラー',{error:event.message});worker?.terminate();worker=null;$('#start').disabled=false;$('#stop').disabled=true;};worker.postMessage({type:'start'});};
window.addEventListener('pagehide',()=>{worker?.terminate();worker=null;});

window.addEventListener('pageshow',event=>{if(event.persisted){stop(false);record('戻りました。検証を再開できます');}});
