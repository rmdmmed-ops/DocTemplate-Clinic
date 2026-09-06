(function (root) {
  'use strict';
  const normalize = text => String(text ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  function matches(text, query) {
    const target = normalize(text);
    return normalize(query).trim().split(/\s+/).every(word => target.includes(word));
  }
  function render(source, values) {
    return source.replace(/\{\{[A-Z_]+\}\}/g, token => values[token] || token);
  }
  // Preserve every untouched variable when editing the rendered document.
  // Only the edited interval is literalized; edits elsewhere keep their bindings.
  function edit(source, edited, values) {
    const previous = render(source, values);
    if (edited === previous) return source;
    let start = 0;
    while (start < previous.length && start < edited.length && previous[start] === edited[start]) start++;
    let end = previous.length, nextEnd = edited.length;
    while (end > start && nextEnd > start && previous[end - 1] === edited[nextEnd - 1]) { end--; nextEnd--; }
    let result = '', position = 0, offset = 0;
    const spans = [];
    for (const match of source.matchAll(/\{\{[A-Z_]+\}\}/g)) {
      const literal = source.slice(position, match.index);
      spans.push({ text: literal, from: offset, to: offset + literal.length }); offset += literal.length;
      const text = values[match[0]] || match[0];
      spans.push({ text, token: match[0], from: offset, to: offset + text.length });
      offset += text.length; position = match.index + match[0].length;
    }
    spans.push({ text: source.slice(position), from: offset, to: previous.length });
    const part = (a, b) => spans.map(span => {
      if (span.to <= a || span.from >= b) return '';
      if (span.token && span.from >= a && span.to <= b) return span.token;
      return span.text.slice(Math.max(a - span.from, 0), Math.min(b - span.from, span.text.length));
    }).join('');
    result = part(0, start) + edited.slice(start, nextEnd) + part(end, previous.length);
    return result;
  }
  function validate(state) {
    if (!state || !Array.isArray(state.sections)) throw new Error('Arquivo sem módulos.');
    const sections = new Set(), ids = new Set();
    for (const section of state.sections) {
      if (!section || typeof section.id !== 'string' || !section.id || sections.has(section.id) || typeof section.label !== 'string' || !Array.isArray(section.templates)) throw new Error('Módulo inválido.');
      sections.add(section.id);
      for (const t of section.templates) {
        if (!t || typeof t.id !== 'string' || !t.id || ids.has(t.id) || typeof t.title !== 'string' || !Array.isArray(t.blocks) || !t.blocks.length || t.blocks.some(b => !b || typeof b.title !== 'string' || typeof b.content !== 'string')) throw new Error('Modelo inválido ou repetido.');
        ids.add(t.id);
      }
    }
    for (const key of ['favorites', 'recent', 'deleted', 'deletedSections']) {
      if (state[key] !== undefined && (!Array.isArray(state[key]) || state[key].some(v => typeof v !== 'string'))) throw new Error('Lista inválida.');
    }
    if (state.usage !== undefined && (!state.usage || Array.isArray(state.usage) || typeof state.usage !== 'object' || Object.values(state.usage).some(v => !Number.isFinite(v) || v < 0))) throw new Error('Histórico inválido.');
    return state;
  }
  const api = { normalize, matches, render, edit, validate };
  if (typeof module !== 'undefined') module.exports = api;
  root.DocCore = api;
})(typeof window === 'undefined' ? globalThis : window);
