// Focused state/event regression tests. No browser claims: rendering is stubbed.
const test=require('node:test'), assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'../dist');
const src=fs.readFileSync(path.join(root,'app.js'),'utf8');
const core=require('../dist/core.js');
function fn(name){
 const at=src.indexOf('  function '+name+'(');assert(at>=0,name);
 const lineEnd=src.indexOf('\n',at);
 if(src.slice(at,lineEnd).endsWith('}'))return src.slice(at,lineEnd);
 return src.slice(at,src.indexOf('\n  }',at)+4);
}
function boot(){
 const seed={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'data.js'),'utf8'),seed);
 const elements=new Map();const cls={toggle(){},remove(){}};
 const el=id=>{if(!elements.has(id))elements.set(id,{value:'',open:false,scrollTop:42,classList:cls,querySelectorAll:()=>[],contains:()=>false});return elements.get(id)};
 const a={estado:JSON.parse(JSON.stringify(seed.window.DOCTEMPLATE_SEED)),rascunhos:new Map(),usarRascunho:false,
  seg:null,lado:null,bilateral:false,mecanismo:'',extras:[],regionId:'primary',vista:'frente',sujo:false,
  tplSel:null,abaAberta:null,buscaAba:'',editando:false,window:{},filtro:'all',focarBusca:false,
  clone:v=>JSON.parse(JSON.stringify(v)),uid:()=> 'new-region',$:el,DocCore:core,norm:core.normalize,
  pintaTudo(){a.renders++},renders:0,pintaNav(){a.navRenders++},navRenders:0,
  salvarJa(){a.saves++;a.sujo=false;return a.canSave},canSave:true,saves:0,
  agendarSalvar(){a.sujo=true},fecharMenu(){},mostraCorpo:()=>true,
  fixoDe:t=>t?.fixo||null,temLado:id=>!['cervical','lombar','toracica','pelve','torax'].includes(id),
  SEG:{joelho:{},lombar:{}},document:{},setTimeout:()=>{},resetMenuState(){a.abaAberta=null;a.buscaAba='';el('gs').value=''},
 };
 a.estado.usage={};a.estado.recent=[];a.estado.contexts={};
 a.tplAtual=()=>a.estado.sections.flatMap(s=>s.templates).find(t=>t.id===a.tplSel);
 a.contexts=()=>[...(a.seg?[{id:a.regionId,seg:a.seg,lado:a.lado,bilateral:a.bilateral}]:[]),...a.extras];
 vm.createContext(a);
 for(const name of ['aplicarPadroes','blocosAtuais','voltarAoEstadoInicial','abrirAba','abrirModelo','iniciarEscolha','sairDoMenu','removeRegion','addRegion','toggleRegion'])vm.runInContext(fn(name),a);
 return a;
}
test('progressive search only matches title substrings across all modules',()=>{
 const a=boot(),models=a.estado.sections.flatMap(s=>s.templates);
 for(const word of ['joelho','cortocontuso']){
  let previous=models;
  for(let n=1;n<=word.length;n++){
   const q=word.slice(0,n),hits=models.filter(t=>core.matches(t.title,q));
   assert(hits.length>0);assert(hits.every(t=>previous.includes(t)));previous=hits;
  }
 }
 assert.equal(models.filter(t=>core.matches(t.title,'cortocontuso')).length,1);
});
test('trauma defaults follow pathology including custom knee sprain',()=>{
 const a=boot();
 for(const [title,expected] of [['CONTUSÃO','trauma direto'],['FERIMENTO CORTOCONTUSO','trauma direto'],['ENTORSE DE JOELHO','entorse/torção'],['Entorse de tornozelo','entorse/torção'],['DOR NO JOELHO',''],['CONTUSÃO/ENTORSE','']]){
  a.mecanismo='';a.aplicarPadroes({id:'custom',title});assert.equal(a.mecanismo,expected,title);
 }
 a.mecanismo='queda de altura';a.aplicarPadroes({title:'CONTUSÃO'});assert.equal(a.mecanismo,'queda de altura');
});
test('avatar completes pending primary region without duplicate or ID loss',()=>{
 const a=boot();a.seg='joelho';a.toggleRegion({seg:'joelho',lado:'D'});
 assert.equal(a.lado,'D');assert.equal(a.extras.length,0);assert.equal(a.regionId,'primary');
});
test('avatar completes pending extra region without duplicate',()=>{
 const a=boot();a.seg='lombar';a.extras=[{id:'knee',seg:'joelho',lado:null}];
 a.toggleRegion({seg:'joelho',lado:'E'});assert.equal(a.extras.length,1);assert.equal(a.extras[0].lado,'E');assert.equal(a.extras[0].id,'knee');
});
test('list does not add a pending duplicate of a lateralized region',()=>{
 const a=boot();a.seg='joelho';a.lado='D';a.toggleRegion({seg:'joelho',lado:null});assert.equal(a.extras.length,0);
});
test('avatar removes an extra region when primary is empty',()=>{
 const a=boot();a.extras=[{id:'knee',seg:'joelho',lado:'D'}];a.toggleRegion({seg:'joelho',lado:'D'});
 assert.equal(a.seg,null);assert.equal(a.extras.length,0);
});
test('avatar keeps bilateral choices independent and toggles selected side',()=>{
 const a=boot();a.seg='joelho';a.lado='D';a.toggleRegion({seg:'joelho',lado:'E'});assert.equal(a.extras.length,1);
 a.toggleRegion({seg:'joelho',lado:'D'});assert.equal(a.lado,'E');assert.equal(a.extras.length,0);
});
test('new selection opens original while retaining unrelated and same-model drafts',()=>{
 const a=boot(),t=a.estado.sections[0].templates[0];
 a.rascunhos.set(t.id,[{title:'DRAFT',content:'previous encounter'}]);a.rascunhos.set('other',[{title:'OTHER',content:'keep'}]);
 a.estado.contexts[t.id]={seg:'joelho',lado:'D'};a.abrirModelo(a.estado.sections[0].id,t.id);
 assert.equal(a.usarRascunho,false);assert.equal(a.rascunhos.size,2);assert.deepEqual(a.blocosAtuais(),t.blocks);assert.equal(a.estado.contexts[t.id].lado,'D');
});
test('module change clears panes but preserves drafts',()=>{
 const a=boot();a.tplSel='old';a.seg='joelho';a.lado='D';a.usarRascunho=true;a.rascunhos.set('old',[]);
 a.abrirAba('ps');assert.equal(a.tplSel,null);assert.equal(a.seg,null);assert.equal(a.abaAberta,'ps');assert.equal(a.rascunhos.size,1);assert.equal(a.renders,1);
});
test('starting search preserves input text and result targets',()=>{
 const a=boot();a.tplSel='old';a.abaAberta='ps';a.buscaAba='corto';a.$('gs').value='corto';
 a.iniciarEscolha();assert.equal(a.tplSel,null);assert.equal(a.buscaAba,'corto');assert.equal(a.$('gs').value,'corto');assert.equal(a.navRenders,0);
});
test('failed save prevents resetting the current encounter',()=>{
 const a=boot();a.tplSel='old';a.seg='joelho';a.sujo=true;a.canSave=false;
 a.abrirAba('ps');assert.equal(a.tplSel,'old');assert.equal(a.seg,'joelho');assert.equal(a.renders,0);
});
test('outside interaction clears only navigation, keeping the chosen document',()=>{
 const a=boot();a.tplSel='current';a.seg='joelho';a.abaAberta='ps';a.$('gs').value='j';
 a.sairDoMenu({closest:()=>null});assert.equal(a.abaAberta,null);assert.equal(a.tplSel,'current');assert.equal(a.seg,'joelho');assert.equal(a.renders,0);
});
test('dialog interactions do not reset navigation',()=>{
 const a=boot();a.abaAberta='ps';a.sairDoMenu({closest:()=>({})});assert.equal(a.abaAberta,'ps');
});
test('opening module does not get closed by the same click after target detaches',()=>{
 const a=boot();let connected=true;const target={closest:()=>null};a.$('c1').contains=()=>connected;
 let listener,capture; a.document.addEventListener=(name,fn,phase)=>{listener=fn;capture=phase;};
 const registration=src.split('\n').find(line=>line.includes("document.addEventListener('click', e=>sairDoMenu(e.target)"));
 vm.runInContext(registration,a);
 const open=()=>{a.abrirAba('ps');connected=false;};
 if(capture){listener({target});open();}else{open();listener({target});}
 assert.equal(a.abaAberta,'ps');assert.equal(a.navRenders,1);
});
test('blur timer that could move click targets is removed',()=>assert(!src.includes('inp.addEventListener("blur"')));
test('avatar is cached by view and text rendering supports reuse',()=>{
 assert(src.includes("$('palco').dataset.view !== vista"));assert(src.includes('if (reuse) {'));assert(src.includes('docs.scrollTop = previousScroll'));
});
test('version identifiers and local script/style assets are consistent',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
 const release=src.match(/const RELEASE = "([^"]+)"/)[1];
 assert(html.includes('DocTemplate '+release));assert(html.includes('VERSÃO '+release));assert(sw.includes('doctemplate-'+release));
 for(const m of html.matchAll(/(?:src|href)="([^"#]+)"/g)){
  const file=m[1].split('?')[0];if(!/^https?:/.test(file))assert(fs.existsSync(path.join(root,file)),file);
  if(/\.(js|css)$/.test(file))assert(sw.includes('./'+m[1]),m[1]);
 }
});
