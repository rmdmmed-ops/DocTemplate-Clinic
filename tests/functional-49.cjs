// DOM-level functional tests; these do not replace browser/end-to-end QA.
const {parseHTML}=require('linkedom');
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),path=require('path');
const root=path.resolve(process.argv[2]||'dist');
function boot(saved){
 const {window}=parseHTML(fs.readFileSync(path.join(root,'index.html'),'utf8'));
 const storage=new Map(saved?[['doctemplate-ortopedia:4.0',saved]]:[]);let clipboard='';
 const proto=window.HTMLSelectElement.prototype;
 Object.defineProperty(proto,'value',{configurable:true,get(){return this._value??this.querySelector('option')?.value??''},set(v){this._value=v}});
 window.HTMLElement.prototype.focus=function(){window.document._focus=this};
 window.HTMLElement.prototype.select=function(){};
 window.HTMLElement.prototype.setSelectionRange=function(a,b){this.selectionStart=a;this.selectionEnd=b};
 window.HTMLElement.prototype.showModal=function(){this.open=true};window.HTMLElement.prototype.close=function(){this.open=false};
 const ctx={window,document:window.document,console,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},navigator:{clipboard:{writeText:async t=>clipboard=t}},Option:function(t,v){let e=window.document.createElement('option');e.textContent=t;e.value=v;return e},setTimeout:()=>1,clearTimeout:()=>{},FileReader:class{readAsText(f){this.result=f.content;this.pending=this.onload();ctx.pendingImport=this.pending;}},Blob,URL,Date,Map,Set,MouseEvent:window.Event};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(root,'core.js'),'utf8'),ctx);ctx.DocCore=window.DocCore;
 vm.runInContext(fs.readFileSync(path.join(root,'data.js'),'utf8'),ctx);
 let src=fs.readFileSync(path.join(root,'app.js'),'utf8');src=src.replace(/\}\)\(\);\s*$/,`window.test={open:abrirModelo,nav:pintaNav,render:pintaTudo,flush:salvarJa,state:()=>estado,drafts:()=>rascunhos,setContext:(a,b,x=[])=>{seg=a;lado=b;bilateral=false;extras=x;mecanismo='trauma direto';},text:preencher,addRegion,toggleRegion,model:tplAtual,saveContext:()=>estado.context, selectModule:id=>{abaAberta=id;buscaAba='';pintaNav();}};})();`);
 vm.runInContext(src,ctx);
 return {api:window.test,doc:window.document,event:(el,name)=>el.dispatchEvent(new window.Event(name,{bubbles:true})),storage,clip:()=>clipboard,ctx};
}
(async()=>{
 const t=boot(),a=t.api,d=t.doc;
 let count=0;function ok(name,f){f();count++;console.log('PASS '+name)}
 for(const sec of a.state().sections){a.selectModule(sec.id);const input=d.querySelector('.abaBusca input');input.value='zzznomatch';t.event(input,'input');ok('filter no results '+sec.label,()=>assert([...d.querySelectorAll('.tpl')].every(b=>b.hidden)));input.value=sec.templates[0].title.split(' ')[0];t.event(input,'input');ok('filter partial '+sec.label,()=>assert([...d.querySelectorAll('.tpl')].some(b=>!b.hidden)));}
 const legacy=JSON.parse(JSON.stringify(a.state()));legacy.version=49;const oldWound=legacy.sections.find(s=>s.id==='ps').templates.find(t=>t.id==='ps-ferimento-cortocontuso-8');oldWound.blocks[0].content='FERIMENTO HÁ ____ HORAS, MEDINDO ____ CM, COM BORDAS ____________________.';const legacyMigrated=boot(JSON.stringify(legacy));legacyMigrated.api.open('ps','ps-ferimento-cortocontuso-8');ok('new evolution wording replaces old blank lines on migration',()=>assert(!legacyMigrated.doc.querySelector('textarea').value.includes('___')));
 const cont=a.state().sections.find(s=>s.id==='ps').templates.find(t=>t.title==='CONTUSÃO');a.open('ps',cont.id);a.setContext('mao5','D');a.render();let area=d.querySelector('textarea');area.value+='\nOBSERVAÇÃO DE TESTE.';t.event(area,'input');a.setContext('mao1','E');a.render();ok('edited text follows new digit/side',()=>{assert(d.querySelector('textarea').value.includes('POLEGAR ESQUERDO'));assert(d.querySelector('textarea').value.includes('OBSERVAÇÃO DE TESTE.'));});
 ok('all variable blocks follow region',()=>assert([...d.querySelectorAll('textarea')].every(el=>el.value.includes('POLEGAR ESQUERDO'))));
 a.flush();const re=boot(t.storage.get('doctemplate-ortopedia:4.0'));ok('reload starts from the initial workspace',()=>assert.equal(re.doc.querySelectorAll('textarea').length,0));
 a.open('ps','ps-dor-lombar-11');a.render();ok('template default is the first selected region',()=>assert.equal(a.text('{{SEG}}'),'COLUNA LOMBAR'));
 a.toggleRegion({seg:'cervical',lado:null,bilateral:false});ok('additional region follows selection order',()=>assert.equal(a.text('{{SEG}}'),'COLUNA LOMBAR E COLUNA CERVICAL'));
 a.toggleRegion({seg:'lombar',lado:null,bilateral:false});ok('selected region toggles off',()=>assert.equal(a.text('{{SEG}}'),'COLUNA CERVICAL'));
 a.open('ps',cont.id);
 a.setContext('cervical',null,[{seg:'lombar',lado:null},{seg:'cotovelo',lado:'D'}]);a.render();ok('multi region grammar',()=>assert(a.text('{{NO_SEG}}').includes('NA COLUNA CERVICAL, NA COLUNA LOMBAR E NO COTOVELO DIREITO')));
 a.flush();a.open('ps',cont.id);ok('opening a model resets previous regions',()=>assert(!a.text('{{SEG}}').includes('COTOVELO DIREITO')));
 a.setContext(null,null,[{seg:'lombar'}]);ok('empty primary does not crash',()=>assert(a.text('{{NO_SEG}}').includes('NA COLUNA LOMBAR')));
 a.setContext('mao1','E');a.render();await d.getElementById('btCopiar').onclick?.();t.event(d.getElementById('btCopiar'),'click');await Promise.resolve();ok('copy all uses current original blocks',()=>assert(!t.clip().includes('OBSERVAÇÃO DE TESTE.')));
 ok('copy buttons have block names',()=>assert([...d.querySelectorAll('.bh button')].every(b=>b.textContent.startsWith('COPIAR '))));
 d.getElementById('editMode').onclick();ok('personalization starts from original text',()=>assert(!d.querySelector('textarea').value.includes('OBSERVAÇÃO DE TESTE.')));d.getElementById('addBlock').onclick();ok('new block has own copy button',()=>assert([...d.querySelectorAll('.bh button')].some(b=>b.textContent==='COPIAR NOVA CAIXA')));
 d.getElementById('editMode').onclick();a.flush();ok('saved personalization after reload',()=>assert(boot(t.storage.get('doctemplate-ortopedia:4.0')).api.state().sections.flatMap(s=>s.templates).find(t=>t.id===cont.id).blocks.some(b=>b.title==='NOVA CAIXA')));
 const p=d.getElementById('newModule').onclick();d.getElementById('actionInput').value='MÓDULO TESTE';d.getElementById('actionForm').onsubmit({preventDefault(){}});await p;ok('custom dialog creates module',()=>assert(a.state().sections.some(s=>s.label==='MÓDULO TESTE')));

 const importFile=async state=>{const el=d.getElementById('arquivo');el.files=[{content:JSON.stringify({state})}];t.event(el,'change');if(d.getElementById('actionDialog').open)d.getElementById('actionForm').onsubmit({preventDefault(){}});await t.ctx.pendingImport;};
 const original=JSON.parse(JSON.stringify(a.state()));original.drafts=Object.fromEntries(a.drafts());
 const imp={sections:[{id:'ps',label:'Pronto-Socorro',templates:[{id:cont.id,title:'CONTUSÃO IMPORTADA',blocks:[{title:'BLOCO','content':'NOVO {{NO_SEG}}'}]}]}],drafts:{[cont.id]:[{title:'BLOCO',content:'RASCUNHO IMPORTADO {{NO_SEG}}'}]}};
 await importFile(imp);await importFile(imp);
 ok('repeated import updates unique ID',()=>assert.equal(a.state().sections.flatMap(s=>s.templates).filter(x=>x.id===cont.id).length,1));
 ok('import keeps exported draft',()=>assert(a.drafts().get(cont.id)[0].content.includes('RASCUNHO IMPORTADO')));
 const moved=JSON.parse(JSON.stringify(imp));moved.sections[0].id='moved';await importFile(moved);
 ok('move imported model between modules without duplicates',()=>assert.equal(a.state().sections.flatMap(s=>s.templates).filter(x=>x.id===cont.id).length,1));
 const restore=d.getElementById('restoreImport').onclick();d.getElementById('actionForm').onsubmit({preventDefault(){}});await restore;
 ok('undo import recovers module and draft',()=>{assert(a.state().sections.find(s=>s.id==='ps').templates.some(t=>t.id===cont.id));assert(a.drafts().get(cont.id)[0].content.includes('RASCUNHO IMPORTADO'));});
 a.open('ps',cont.id);a.selectModule('ps');const remove=d.querySelector('.delete-module').onclick();d.getElementById('actionForm').onsubmit({preventDefault(){}});await remove;
 d.querySelector('#modeNote button').onclick();ok('undo module deletion restores module',()=>assert(a.state().sections.find(s=>s.id==='ps').templates.some(t=>t.id===cont.id)));
 const before=JSON.stringify(a.state());await importFile({sections:[{}]});ok('invalid import leaves state untouched',()=>assert.equal(JSON.stringify(a.state()),before));
 const invalid={sections:[],context:{extras:'invalid'}};ok('reject malformed context',()=>assert.throws(()=>t.ctx.DocCore.validate(invalid)));
 a.flush();const old=JSON.parse(t.storage.get('doctemplate-ortopedia:4.0'));old.version=4;const migrated=boot(JSON.stringify(old));ok('version migration retains model library',()=>assert(migrated.api.state().sections.find(s=>s.id==='ps').templates.some(t=>t.id===cont.id)));

 const movedState=JSON.parse(JSON.stringify(moved));movedState.version=4;
 const mm=boot(JSON.stringify(movedState));mm.api.flush();const mm2=boot(mm.storage.get('doctemplate-ortopedia:4.0'));
 ok('migration retains moved model across two reloads',()=>{const all=mm2.api.state().sections.flatMap(s=>s.templates);assert.equal(all.filter(t=>t.id===cont.id).length,1);assert(mm2.api.state().sections.find(s=>s.id==='moved').templates.some(t=>t.id===cont.id));});
 imp.contexts={[cont.id]:{seg:'mao1',lado:'E',bilateral:false,mecanismo:'queda',extras:[]}};await importFile(imp);a.open('ps',cont.id);
 ok('opening imported model starts with original context',()=>assert(!d.querySelector('textarea').value.includes('POLEGAR ESQUERDO')));
 const cp=d.getElementById('saveAsModel').onclick();d.getElementById('actionInput').value='CÓPIA TESTE';d.getElementById('actionForm').onsubmit({preventDefault(){}});await cp;
 ok('save as new opens with original context',()=>assert(!d.querySelector('textarea').value.includes('POLEGAR ESQUERDO')));
 a.setContext(null,null,[{seg:'cotovelo',lado:'D'},{seg:'mao',lado:'E'}]);a.render();const side=d.querySelector('#regionList select');side.value='E';side.onchange();ok('chip edits actual extra when primary empty',()=>assert(a.text('{{SEG}}').includes('COTOVELO ESQUERDO')));
 d.querySelector('#regionList button').onclick();ok('chip removes actual extra when primary empty',()=>assert(!a.text('{{SEG}}').includes('COTOVELO')));
 a.open('ps','ps-multissegmentar-49');a.setContext('cervical',null,[{id:'test-elbow',seg:'cotovelo',lado:'D'}]);a.render();
 ok('multisegment creates individual regional assessment blocks',()=>assert.equal(d.querySelectorAll('textarea').length,4));
 const regional=[...d.querySelectorAll('textarea')][2];regional.value+='\nACHADO DE TESTE.';t.event(regional,'input');a.setContext('cervical',null,[{id:'test-elbow',seg:'cotovelo',lado:'E'}]);a.render();
 ok('regional edit survives side change and updates bindings',()=>{const text=[...d.querySelectorAll('textarea')][2].value;assert(text.includes('COTOVELO ESQUERDO'));assert(text.includes('ACHADO DE TESTE.'));assert(!text.includes('COTOVELO DIREITO'));});
 a.flush();ok('regional blocks clear from the initial workspace after reload',()=>assert.equal(boot(t.storage.get('doctemplate-ortopedia:4.0')).doc.querySelectorAll('textarea').length,0));
 const previousClip=t.clip();t.event(d.getElementById('btCopiar'),'click');await Promise.resolve();
 ok('copy identifies unfinished case fields',()=>{assert.equal(t.clip(),previousClip);assert(d.getElementById('toast').textContent.startsWith('Preencha:'));});
 for(const box of d.querySelectorAll('textarea')){box.value=box.value.replace(/\[[^\]\n]+\]/g,'REGISTRADO');t.event(box,'input');}
 t.event(d.getElementById('btCopiar'),'click');await Promise.resolve();ok('copy all includes regional assessment',()=>assert(t.clip().includes('ACHADO DE TESTE.')));
 a.setContext('cervical',null);a.render();ok('removing region updates copy all',()=>{assert.equal(d.querySelectorAll('textarea').length,3);});

 a.setContext('cotovelo','D',[{id:'left-elbow',seg:'cotovelo',lado:'E'}]);a.render();
 let boxes=[...d.querySelectorAll('textarea')];boxes[1].value+='\nACHADO DIREITO';t.event(boxes[1],'input');boxes[2].value+='\nACHADO ESQUERDO';t.event(boxes[2],'input');
 d.querySelector('#regionList button').onclick();
 ok('removing first same-region selection preserves correct patient text',()=>{const box=[...d.querySelectorAll('textarea')][1].value;assert(box.includes('ACHADO ESQUERDO'));assert(!box.includes('ACHADO DIREITO'));});
 a.flush();ok('reload clears the previous document view',()=>assert.equal(boot(t.storage.get('doctemplate-ortopedia:4.0')).doc.querySelectorAll('textarea').length,0));
 // Editorial release: complete opening/render coverage plus actual copy and migration paths.
 for(const sec of a.state().sections)for(const model of sec.templates){a.open(sec.id,model.id);assert(d.querySelector('textarea'),model.id);}
 ok('all catalog models open and render',()=>assert(true));
 const rx='rx-dor-cronica-paracetamol-ou-dipirona-3';a.open('prescricoes',rx);
 ok('alternative prescriptions cannot be copied as a combined regimen',()=>assert.equal(d.getElementById('btCopiar').hidden,true));
 await d.querySelector('.bh button').onclick();
 ok('individual alternative copies only the selected drug',()=>{assert(t.clip().includes('PARACETAMOL 500 MG'));assert(!t.clip().includes('DIPIRONA 500 MG'));});
 a.render();ok('alternative choice survives rerender',()=>assert.equal(d.getElementById('btCopiar').hidden,true));
 a.open('ambulatorio','amb-primeira-consulta-ortopedia-geral-1');
 ok('followup date is rendered and remains editable',()=>{const text=d.querySelector('textarea').value;assert(/RETORNO EM \d{2}\/\d{2}\/\d{4}, ÀS 08H/.test(text));assert(!text.includes('{{RETORNO}}'));});
 const originalState=boot().api.state();originalState.version=53;const custom=originalState.sections.find(s=>s.id==='prescricoes').templates[0];custom.modified=1;custom.title='RECEITA PERSONALIZADA';custom.blocks[0].content='TEXTO PERSONALIZADO';
 const updated=boot(JSON.stringify(originalState));
 ok('editorial migration preserves explicitly personalized models',()=>assert.equal(updated.api.state().sections.find(s=>s.id==='prescricoes').templates.find(m=>m.id===custom.id).blocks[0].content,'TEXTO PERSONALIZADO'));
 a.open('descricoes','cir-fratura-de-clavicula-placa-e-parafusos-1');a.render();
 ok('billing reference is visible outside operative text',()=>{assert(d.querySelector('.coding-reference'));assert(!d.querySelector('textarea').value.includes('40301015'));});
 console.log(count+' DOM-level assertions passed');
})().catch(e=>{console.error(e);process.exitCode=1});
