const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const createServer = require('../scripts/serve.cjs');
async function run() {
  const browser = await chromium.launch({headless:true, ...(process.env.BROWSER_CHANNEL ? {channel:process.env.BROWSER_CHANNEL} : {})});
  const server = createServer(); await new Promise(r => server.listen(0,'127.0.0.1',r));
  const url = `http://127.0.0.1:${server.address().port}`;
  const results = []; const errors = [];
  const context = await browser.newContext({ viewport:{width:1440,height:1000}, permissions:['clipboard-read','clipboard-write'] });
  context.setDefaultTimeout(10000);
  const page = await context.newPage(); page.on('pageerror',e=>errors.push(e.message));
  const check = async (name, fn) => { await fn(); results.push(name); console.log('PASS ' + name); };
  try {
    await page.goto(url); await page.getByText('Mais presença.').waitFor();
    await check('global search keeps focus and finds reversed multiword query',async()=>{
      const search = page.locator('#gs'); await search.pressSequentially('direito cotovelo',{delay:40});
      assert(await search.evaluate(el=>el===document.activeElement)); assert(await page.locator('.hit').count()>0); await search.fill('');
    });
    await check('module search keeps focus on each keystroke',async()=>{
      await page.getByRole('button',{name:'PRONTO-SOCORRO ›',exact:true}).click();
      const search = page.getByRole('searchbox',{name:'Pesquisar em Pronto-Socorro'});
      assert(await search.evaluate(el=>el===document.activeElement));
      await search.pressSequentially('contusao',{delay:50}); assert(await search.evaluate(el=>el===document.activeElement));
      await page.getByRole('button',{name:'CONTUSÃO',exact:true}).click();
    });
    await check('anatomy and mechanism fill text with grammatical agreement',async()=>{
      await page.locator('#segmentSelect').selectOption('joelho'); await page.locator('[data-side="D"]').click(); await page.locator('#mec').selectOption('queda de altura');
      assert((await page.locator('textarea').first().inputValue()).includes('NO JOELHO DIREITO APÓS QUEDA DE ALTURA'));
    });
    await check('editing text preserves bindings across region and side changes',async()=>{
      const ta = page.locator('textarea').first(); await ta.fill((await ta.inputValue())+'\nREVISADO PELO MÉDICO.');
      await page.locator('#segmentSelect').selectOption('mao'); await page.locator('[data-side="E"]').click();
      const text = await ta.inputValue(); assert(text.includes('NA MÃO ESQUERDA')); assert(text.includes('REVISADO PELO MÉDICO.'));
      await page.locator('#btCopiar').click(); assert((await page.evaluate(()=>navigator.clipboard.readText())).includes('NA MÃO ESQUERDA'));
      await ta.fill((await ta.inputValue()) + '\nEDIÇÃO MAIS RECENTE.');
      await page.locator('.bh button').first().click(); assert((await page.evaluate(()=>navigator.clipboard.readText())).includes('EDIÇÃO MAIS RECENTE.'));
    });
    await check('favorite state survives refresh without persisting session text',async()=>{
      await page.locator('#favorite').click(); await page.waitForTimeout(700);
      const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('doctemplate-ortopedia:4.0')));
      assert(state.favorites.length===1); assert(!JSON.stringify(state).includes('REVISADO PELO MÉDICO.')); assert(JSON.stringify(state).includes('{{NO_SEG}}'));
    });
    fs.mkdirSync(path.join(__dirname,'../qa'),{recursive:true});
    await page.screenshot({path:path.join(__dirname,'../qa/desktop.png'),fullPage:true});
    await check('1440 900 and 390 layouts have no horizontal overflow',async()=>{
      for(const width of [1440,900,390]) { await page.setViewportSize({width,height:900}); if(width<1200 && await page.locator('#closeAnatomy').isVisible()) await page.locator('#closeAnatomy').click(); await page.waitForTimeout(220); assert(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)); await page.screenshot({path:path.join(__dirname,`../qa/layout-${width}.png`),fullPage:true}); }
    });
    await page.setViewportSize({width:1440,height:1000});
    await check('hands and feet views resolve digit and side without losing edits',async()=>{
      await page.locator('[data-vista="maos"]').click(); await page.getByRole('button',{name:'polegar esquerdo',exact:true}).click();
      assert((await page.locator('textarea').first().inputValue()).includes('NO POLEGAR ESQUERDO'));
      await page.waitForTimeout(180);
      await page.screenshot({path:path.join(__dirname,'../qa/hands.png'),fullPage:true});
      await page.locator('[data-vista="pes"]').click(); await page.getByRole('button',{name:'hálux direito',exact:true}).click();
      assert((await page.locator('textarea').first().inputValue()).includes('NO HÁLUX DIREITO'));
    });
    await check('anatomical buttons support keyboard activation and spine has no side',async()=>{
      await page.locator('#segmentSelect').selectOption('cervical'); assert(await page.locator('#sideChoices').isHidden()); assert(await page.locator('#bilat').isHidden());
      await page.locator('[data-vista="corpo"]').click(); const knee=page.locator('[data-seg="joelho"][data-lado="D"]'); await knee.focus(); await knee.press('Enter');
      assert((await page.locator('#contextSummary').innerText()).includes('JOELHO DIREITO'));
    });
    await check('personalized template retains source variables after reload',async()=>{
      await page.locator('#editMode').click(); const ta=page.locator('textarea').first(); assert((await ta.inputValue()).includes('{{NO_SEG}}')); await ta.fill((await ta.inputValue())+'\nMODELO PERSONALIZADO.'); await page.waitForTimeout(700);
      page.once('dialog',d=>d.accept()); await page.reload();
      await page.locator('#gs').fill('contusao'); await page.locator('.hit').filter({hasText:'CONTUSÃO'}).first().click();
      assert((await page.locator('textarea').first().inputValue()).includes('MODELO PERSONALIZADO.'));
    });
    await check('offline reload retains app, search and saved models',async()=>{
      await page.evaluate(()=>navigator.serviceWorker.ready); await context.setOffline(true); await page.reload();
      await page.locator('#gs').fill('contusao'); assert(await page.locator('.hit').count()>0);
      await context.setOffline(false);
    });
    await check('custom modules and models import without disappearing',async()=>{
      const data={sections:[{id:'custom',label:'Meu módulo',templates:[{id:'custom-one',title:'MODELO IMPORTADO',blocks:[{title:'TEXTO',content:'MODELO DE TESTE'}]}]}],favorites:['custom-one'],recent:[],usage:{},deleted:[]};
      await page.locator('#arquivo').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({state:data}))});
      await page.locator('#gs').fill('modelo importado'); await page.locator('.hit').filter({hasText:'MODELO IMPORTADO'}).click(); assert.equal(await page.locator('textarea').first().inputValue(),'MODELO DE TESTE');
    });
    await check('specific clinical templates cannot switch to an unrelated region',async()=>{
      await page.locator('#gs').fill('dor ombro'); await page.locator('.hit').filter({hasText:'DOR NO OMBRO'}).first().click();
      assert(await page.locator('#segmentSelect option[value="joelho"]').isDisabled());
      await page.getByRole('button',{name:'joelho direito',exact:true}).click({force:true}); assert.equal(await page.locator('#segmentSelect').inputValue(),'ombro');
    });
    await check('3.2 migration preserves modified models, custom modules and favorites',async()=>{
      const legacy=await browser.newContext();
      const p=await legacy.newPage();
      const data={version:2,sections:[{id:'ps',label:'Pronto-Socorro',templates:[{id:'ps-contusao-1',title:'CONTUSÃO PERSONALIZADA',modified:1,blocks:[{title:'CONSULTA',content:'EDIÇÃO LEGADA {{NO_SEG}}'}]}]},{id:'legado',label:'Legado',templates:[{id:'legado-a',title:'LEGADO A',blocks:[{title:'TEXTO',content:'PRESERVADO'}]}]}],favorites:['legado-a'],recent:['ps-contusao-1'],usage:{'ps-contusao-1':5},deleted:[]};
      await p.addInitScript(state=>localStorage.setItem('doctemplate-ortopedia:3.0',JSON.stringify(state)),data);
      await p.goto(url); await p.locator('#gs').fill('contusao personalizada'); await p.locator('.hit').first().click();
      assert((await p.locator('textarea').first().inputValue()).includes('EDIÇÃO LEGADA'));
      const saved=await p.evaluate(()=>JSON.parse(localStorage.getItem('doctemplate-ortopedia:4.0')));
      assert(saved.sections.some(s=>s.id==='legado')); assert(saved.favorites.includes('legado-a'));
      assert(await p.evaluate(()=>localStorage.getItem('doctemplate-ortopedia:3.0')!==null)); await legacy.close();
    });
    await check('clipboard failures do not report successful copy',async()=>{
      await page.locator('#gs').fill('modelo importado'); await page.locator('.hit').first().click();
      await page.evaluate(()=>Object.defineProperty(navigator.clipboard,'writeText',{configurable:true,value:()=>Promise.reject(new Error('denied'))}));
      await page.locator('#btCopiar').click(); await page.getByText('A cópia foi bloqueada.',{exact:false}).waitFor(); assert.equal(await page.locator('#btCopiar').innerText(),'COPIAR TUDO');
    });
    await check('malformed import does not modify current models',async()=>{
      const before=await page.evaluate(()=>localStorage.getItem('doctemplate-ortopedia:4.0'));
      await page.locator('#arquivo').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{"sections":[{}]}')});
      await page.getByText('Não reconheci este arquivo.',{exact:false}).waitFor();
      assert.equal(await page.evaluate(()=>localStorage.getItem('doctemplate-ortopedia:4.0')),before);
    });
    assert.deepEqual(errors,[]); console.log(`${results.length} browser scenarios passed. No JavaScript errors.`);
  } finally { await browser.close(); server.close(); }
}
run().catch(e=>{console.error(e);process.exitCode=1});
