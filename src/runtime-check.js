import {readStage,saveStage,stageLabel} from './runtime-status.js';
const BUILD=import.meta.env.VITE_BUILD_ID || 'local';
const $=id=>document.getElementById(id);
let worker,sequence=0,running=false,record=readStage(),pending=new Map();
function display(){
  $('saved-stage').textContent=record?`最後の記録：${record.stage}`:'このブラウザには、まだ起動の記録がありません';
  $('saved-detail').textContent=record?JSON.stringify(record,null,2):'';
}
function stage(state,message){record={build:BUILD,state,stage:stageLabel(message),at:new Date().toISOString(),source:'isolated-check'};const saved=saveStage(record);display();$('check-status').textContent=record.stage+(saved?'':'（ブラウザ内への保存ができませんでした）');}
function rpc(type,extra={}){return new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});worker.postMessage({id,type,...extra});});}
function stop(){worker?.terminate();worker=null;for(const call of pending.values())call.reject(new Error('起動チェックを中断しました'));pending.clear();running=false;}
function passed(message){const item=document.createElement('li');item.textContent=message;$('check-results').append(item);}
$('run-check').addEventListener('click',async()=>{
  if(running)return;running=true;$('run-check').disabled=true;$('check-results').replaceChildren();stage('booting','Ruby/Wasm の起動準備');
  worker=new Worker(new URL('./rails.worker.js',import.meta.url),{type:'module'});
  const timeout=setTimeout(()=>{stage('error','起動チェックが3分以内に完了しませんでした');stop();$('run-check').disabled=false;},180000);
  worker.onmessage=({data})=>{if(data.type==='progress'){stage('booting',data.message);return;}const call=pending.get(data.id);if(!call)return;pending.delete(data.id);data.error?call.reject(new Error(data.error)):call.resolve(data.result);};
  worker.onerror=event=>{event.preventDefault();stage('error',event.message||'Ruby worker error');stop();};
  try{
    const ruby=await rpc('boot',{mode:'probe'});if(ruby.railsLoaded)throw new Error('Ruby-only check loaded Rails unexpectedly');passed('1. Ruby の単独起動：完了');stage('booting','Ruby 完了。Rails を起動中');
    await rpc('probe_rails');passed('2. Rails の起動：完了');stage('booting','Rails 完了。ERB の本文を生成中');
    const result=await rpc('request',{request:{method:'GET',path:'/summary',accept:'text/html'}});
    if(result.status!==200 || result.headers['x-summary-renderer']!=='Rails-ActionView-ERB' || result.headers['x-ruby-platform']!=='wasm32-wasi' || !result.body.includes('data-renderer="rails-erb"'))throw new Error('Rails の実行結果を確認できませんでした');
    passed('3. Rails / ERB の本文生成：完了（地図なし）');stage('ready','Ruby・Rails・本文生成が完了。地図は起動していません');
  }catch(error){if(running)stage('error',error.message||String(error));}
  finally{clearTimeout(timeout);stop();$('run-check').disabled=false;}
});
$('copy-stage').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(record?JSON.stringify(record,null,2):'起動記録なし');$('copy-status').textContent='コピーしました';}catch{$('copy-status').textContent='コピーできませんでした。上の記録を選択してコピーできます';}});
display();
