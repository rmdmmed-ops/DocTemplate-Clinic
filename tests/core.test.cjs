const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const core = require('../core.js');
const v = { '{{NO_SEG}}':'NO JOELHO DIREITO', '{{DO_SEG}}':'DO JOELHO DIREITO', '{{APOS_MEC}}':'APÓS QUEDA' };
test('search ignores accents, case and word order', () => { assert(core.matches('CONTUSÃO DO JOELHO DIREITO', 'direito contusao')); assert(!core.matches('JOELHO', 'ombro')); });
test('editing a different sentence preserves all variables', () => {
  const source = 'DOR {{NO_SEG}}. EXAME {{DO_SEG}}. REVISAR.';
  const edited = core.edit(source, core.render(source,v).replace('REVISAR','REVISADO'), v);
  assert.equal(edited, 'DOR {{NO_SEG}}. EXAME {{DO_SEG}}. REVISADO.');
  assert(core.render(edited,{...v,'{{NO_SEG}}':'NA MÃO ESQUERDA'}).startsWith('DOR NA MÃO ESQUERDA'));
});
test('insertion at variable boundary preserves binding', () => { assert.equal(core.edit('{{NO_SEG}}.', 'OBS: NO JOELHO DIREITO.',v), 'OBS: {{NO_SEG}}.'); });
test('direct variable edit affects only that occurrence', () => { assert.equal(core.edit('{{NO_SEG}} e {{DO_SEG}}', 'NA MÃO e DO JOELHO DIREITO',v), 'NA MÃO e {{DO_SEG}}'); });
test('append, delete, replace and empty edits', () => {
  assert.equal(core.edit('a {{NO_SEG}}', 'a NO JOELHO DIREITO xyz',v),'a {{NO_SEG}} xyz');
  assert.equal(core.edit('{{NO_SEG}} trailing', 'NO JOELHO DIREITO',v),'{{NO_SEG}}');
  assert.equal(core.edit('{{NO_SEG}}','',v),'');
  assert.equal(core.edit('','hello',v),'hello');
});
test('catalog has unique valid models and 13 modules', () => {
  const ctx = {window:{}}; vm.runInNewContext(fs.readFileSync(require.resolve('../data.js'),'utf8'),ctx);
  core.validate(ctx.window.DOCTEMPLATE_SEED);
  assert.equal(ctx.window.DOCTEMPLATE_SEED.sections.length,13);
  assert.equal(ctx.window.DOCTEMPLATE_SEED.sections.flatMap(s=>s.templates).length,244);
});
test('malformed import rejected without partial mutation', () => {
  assert.throws(()=>core.validate({sections:[{id:'x',label:'X',templates:[{id:'x',title:'X',blocks:[{content:13}]}]}]}));
  assert.throws(()=>core.validate({sections:[{id:'x',label:'X',templates:[]},{id:'x',label:'Y',templates:[]}]}));
});
