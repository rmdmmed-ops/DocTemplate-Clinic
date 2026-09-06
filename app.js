(function () {
  "use strict";

  /* DocTemplate Ortopedia 4.0 — versão principal.
     A 3.2 continua publicada em /3.2/ como rota de volta, e a chave dela no
     navegador nunca é apagada. */
  const CHAVE = "doctemplate-ortopedia:4.0";
  // Chave da 3.0/3.1/3.2. Quem já usava o app tem as suas edições aqui, e elas
  // precisam atravessar para a 4.0 na primeira abertura. Nunca apagamos esta
  // chave: ela é a rede de segurança se for preciso voltar para a 3.2.
  const CHAVE_ANTERIOR = "doctemplate-ortopedia:3.0";
  const ATRASO_SALVAR = 600;

  const seed = window.DOCTEMPLATE_SEED;
  if (!seed || !Array.isArray(seed.sections)) {
    document.body.innerHTML = "<p style='padding:2rem'>Não foi possível carregar os modelos clínicos.</p>";
    return;
  }

  const GRUPOS = [
    ["EVOLUÇÕES", ["ps", "ambulatorio", "enfermaria", "internacao"]],
    ["PRESCRIÇÕES", ["prescricoes"]],
    ["EXAMES", ["tc", "rnm", "usg"]],
    ["DOCUMENTOS E DESCRIÇÕES", ["encaminhamentos", "fisioterapia", "acupuntura", "relatorios", "descricoes"]],
  ];

  const MECANISMOS = ["queda da própria altura","queda de altura","acidente motociclístico",
    "acidente automobilístico","atropelamento","trauma direto","torção","esmagamento","lesão esportiva"];

  // Vocabulário de segmentos validado no uso real (Agenda Cirúrgica HMTS).
  const SEG = {};
  const def = (id, nome, gen, lat) => { SEG[id] = { nome, gen, lat }; };
  def("cervical","coluna cervical","f",false); def("toracica","coluna torácica","f",false);
  def("lombar","coluna lombar","f",false); def("pelve","pelve","f",false); def("torax","tórax","m",false);
  def("ombro","ombro","m",true); def("braco","braço","m",true); def("cotovelo","cotovelo","m",true);
  def("antebraco","antebraço","m",true); def("punho","punho","m",true); def("mao","mão","f",true);
  def("quadril","quadril","m",true); def("coxa","coxa","f",true); def("joelho","joelho","m",true);
  def("perna","perna","f",true); def("tornozelo","tornozelo","m",true); def("pe","pé","m",true);
  // Dedos: nomenclatura de prontuário — polegar e quirodáctilos, hálux e pododáctilos.
  def("mao1","polegar","m",true);
  for (let i = 2; i <= 5; i++) def("mao" + i, i + "º quirodáctilo", "m", true);
  def("pe1","hálux","m",true);
  for (let i = 2; i <= 5; i++) def("pe" + i, i + "º pododáctilo", "m", true);
  // A qual vista de detalhe cada dedo pertence.
  const DETALHE = { mao: "maos", pe: "pes" };
  const dedoDe = id => (/^mao[1-5]$/.test(id) ? "maos" : /^pe[1-5]$/.test(id) ? "pes" : null);

  const VARIAVEIS = [
    ["{{SEG}}", "PÉ DIREITO", "o nome do segmento, sem preposição"],
    ["{{NO_SEG}}", "NO PÉ DIREITO · NA MÃO DIREITA", "com em — concorda com o gênero"],
    ["{{DO_SEG}}", "DO PÉ DIREITO · DA MÃO DIREITA", "com de — concorda com o gênero"],
    ["{{AO_SEG}}", "AO PÉ DIREITO · À MÃO DIREITA", "com a — concorda com o gênero"],
    ["{{APOS_MEC}}", "APÓS QUEDA DE ALTURA", "o mecanismo de trauma escolhido"],
  ];

  const clone = v => JSON.parse(JSON.stringify(v));
  const norm = v => String(v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const uid = p => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const $ = id => document.getElementById(id);
  const esc = t => String(t).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const hora = ts => new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  /* ---------- estado e migração (mesma lógica provada na 3.1) ---------- */
  function novoEstado() {
    return { version: seed.version, sections: clone(seed.sections), favorites: [], recent: [], usage: {}, deleted: [], savedAt: null };
  }
  function doSeed(id) {
    for (const s of seed.sections) { const t = s.templates.find(x => x.id === id); if (t) return t; }
    return null;
  }
  const difere = (a, b) => JSON.stringify(a.blocks) !== JSON.stringify(b.blocks);
  /* Um modelo é "do usuário" quando ele criou ou editou — nunca só porque o
     texto do seed mudou. Comparar com o seed NOVO marcaria os 244 como
     editados e nenhuma melhoria de texto chegaria a quem já usa o app.
     Desde a 3.1 toda edição grava `modified`; é essa a prova de autoria. */
  function doUsuario(t, mesmaSafra) {
    const o = doSeed(t.id);
    if (!o) return true;                     // criado pelo usuário
    if (t.modified) return true;             // editado por ele
    return mesmaSafra ? difere(t, o) : false; // safra anterior sem marca: o seed novo entra
  }
  function mesclar(salvo, base = novoEstado()) {
    const r = base;
    const mesmaSafra = salvo.version === seed.version;
    const apagados = new Set([...(r.deleted || []), ...(Array.isArray(salvo.deleted) ? salvo.deleted : [])]);
    r.deleted = [...apagados];
    r.deletedSections = [...new Set([...(r.deletedSections || []), ...(salvo.deletedSections || [])])];
    (salvo.sections || []).forEach(ss => {
      let alvo = r.sections.find(s => s.id === ss.id);
      if (!alvo) { alvo = { ...clone(ss), templates: [] }; r.sections.push(alvo); }
      (ss.templates || []).forEach(t => {
        if (!t || !t.id || !Array.isArray(t.blocks)) return;
        const i = alvo.templates.findIndex(x => x.id === t.id);
        if (i === -1) { if (!apagados.has(t.id) || !doSeed(t.id)) alvo.templates.push(clone(t)); return; }
        if (doUsuario(t, mesmaSafra)) {
          const atual = alvo.templates[i];
          if (atual.modified && difere(atual, t)) {
            alvo.templates.push(Object.assign(clone(t), { id: uid(alvo.id), title: `${t.title} (IMPORTADO)` }));
          } else {
            // o campo usa vem sempre do seed: é estrutura, não conteúdo do usuário
            // a estrutura (o que o mapa preenche) vem sempre do seed; só o
            // texto é do usuário
            alvo.templates[i] = Object.assign(clone(t), {
              usa: t.usa || atual.usa || {}, mecanismoPadrao: atual.mecanismoPadrao,
              segPadrao: atual.segPadrao, fixo: atual.fixo,
              modified: t.modified || Date.now(),
            });
          }
        }
      });
    });
    r.sections = r.sections.filter(s => !r.deletedSections.includes(s.id));
    r.sections.forEach(s => { s.templates = s.templates.filter(t => !apagados.has(t.id)); });
    const conhecidos = new Set(r.sections.flatMap(s => s.templates.map(t => t.id)));
    r.favorites = [...new Set([...(salvo.favorites || []), ...(r.favorites || [])])].filter(id => conhecidos.has(id));
    r.recent = [...new Set([...(salvo.recent || []), ...(r.recent || [])])].filter(id => conhecidos.has(id)).slice(0, 10);
    r.usage = Object.assign({}, r.usage || {}, salvo.usage || {});
    Object.keys(r.usage).forEach(id => { if (!conhecidos.has(id)) delete r.usage[id]; });
    r.version = seed.version;
    return r;
  }
  function lerJSON(chave) { try { const value = JSON.parse(localStorage.getItem(chave)); return value ? DocCore.validate(value) : null; } catch (_) { return null; } }
  function carregar() {
    const s = lerJSON(CHAVE);
    if (s && Array.isArray(s.sections)) {
      if (s.version === seed.version) return s;
      const m = mesclar(s); m.migradoDe = s.version; return m;
    }
    // Primeira abertura da 4.0: traz o que existir da 3.2, sem apagar o original.
    const a = lerJSON(CHAVE_ANTERIOR);
    if (a && Array.isArray(a.sections)) {
      const m = mesclar(a);
      m.migradoDe = a.version;
      m.vindoDa32 = true;
      return m;
    }
    return novoEstado();
  }

  let estado = carregar();
  estado.favorites = Array.isArray(estado.favorites) ? estado.favorites : [];
  estado.recent = Array.isArray(estado.recent) ? estado.recent : [];
  estado.usage = estado.usage && typeof estado.usage === "object" ? estado.usage : {};
  estado.deleted = Array.isArray(estado.deleted) ? estado.deleted : [];

  let abaAberta = null, tplSel = null, buscaAba = "";
  let filtro = 'all', editando = false;
  const rascunhos = new Map();
  const blocosAtuais = () => rascunhos.get(tplSel) || tplAtual()?.blocks || [];
  let seg = null, lado = null, bilateral = false, mecanismo = "", vista = "frente";
  let focarBusca = false, sujo = false, timerSalvar = null, timerToast = null, ultimoFoco = null;

  const tplAtual = () => { for (const s of estado.sections) { const t = s.templates.find(x => x.id === tplSel); if (t) return t; } return null; };
  const modAtual = () => estado.sections.find(s => s.templates.some(t => t.id === tplSel));
  const mod = id => estado.sections.find(s => s.id === id);
  const usaSeg = t => Boolean(t && (t.usa?.segmento || t.blocks.some(b => /\{\{(?:SEG|NO_SEG|DO_SEG|AO_SEG)\}\}/.test(b.content))));
  const usaMec = t => Boolean(t && (t.usa?.mecanismo || t.blocks.some(b => b.content.includes('{{APOS_MEC}}'))));
  // O modelo já é de um lado (ex.: "TC — COTOVELO DIREITO"): o mapa mostra e explica.
  const fixoDe = t => (t && t.fixo && SEG[t.fixo.seg]) ? t.fixo : null;
  const mostraCorpo = t => Boolean(t) && (usaSeg(t) || Boolean(fixoDe(t)));
  // Regra do esqueleto apendicular: quem tem lado, pede lado.
  const temLado = id => Boolean(id && SEG[id] && SEG[id].lat);
  const aceitaRegiao = id => !tplAtual()?.segPadrao || tplAtual().segPadrao === id || (tplAtual().segPadrao === 'mao' && /^mao[1-5]$/.test(id));
  function aplicarPadroes(t) {
    const fx = fixoDe(t);
    if (fx) { seg = fx.seg; lado = fx.lado || null; bilateral = Boolean(fx.bilateral); return; }
    // O lado é do paciente, não do modelo: quando já foi escolhido, ele permanece.
    if (t && t.segPadrao && SEG[t.segPadrao]) seg = t.segPadrao;
    if (seg && !temLado(seg)) { lado = null; bilateral = false; }
  }

  /* ---------- salvamento ---------- */
  function gravar() { estado.savedAt = Date.now(); localStorage.setItem(CHAVE, JSON.stringify(estado)); }
  function pintarStatus() {
    $("salvo").textContent = sujo ? "Salvando…" : (estado.savedAt ? "Salvo às " + hora(estado.savedAt) : "Salvo neste navegador");
    $("pt").classList.toggle("pend", sujo);
  }
  function salvarJa() {
    clearTimeout(timerSalvar); timerSalvar = null;
    try { gravar(); sujo = false; } catch (_) { aviso("Não foi possível salvar. Exporte seus modelos para conservar as alterações."); }
    pintarStatus();
    if (sujo) $("salvo").textContent = 'Não salvo · exporte uma cópia';
    return !sujo;
  }
  window.DocFlush = salvarJa;
  function agendarSalvar() { sujo = true; pintarStatus(); clearTimeout(timerSalvar); timerSalvar = setTimeout(salvarJa, ATRASO_SALVAR); }
  window.addEventListener("beforeunload", () => { if (sujo) salvarJa(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden && sujo) salvarJa(); });
  function aviso(msg) {
    const t = $("toast"); t.textContent = msg; t.classList.add("on");
    clearTimeout(timerToast); timerToast = setTimeout(() => t.classList.remove("on"), 2600);
  }

  /* ---------- texto ---------- */
  function nomeSeg() {
    if (!seg) return null;
    const g = SEG[seg]; let n = g.nome;
    if (g.lat) {
      if (bilateral) n += g.gen === "f" ? " direita e esquerda" : " direito e esquerdo";
      else if (lado) n += lado === "D" ? (g.gen === "f" ? " direita" : " direito") : (g.gen === "f" ? " esquerda" : " esquerdo");
    }
    return n.toUpperCase();
  }
  function preencher(txt) {
    let r = txt;
    const n = nomeSeg();
    if (n) {
      const g = SEG[seg];
      const a = g.gen === "f" ? { do: "DA", no: "NA", ao: "À" } : { do: "DO", no: "NO", ao: "AO" };
      r = r.replace(/\{\{DO_SEG\}\}/g, `${a.do} ${n}`).replace(/\{\{NO_SEG\}\}/g, `${a.no} ${n}`)
           .replace(/\{\{AO_SEG\}\}/g, `${a.ao} ${n}`).replace(/\{\{SEG\}\}/g, n);
    }
    if (mecanismo) r = r.replace(/\{\{APOS_MEC\}\}/g, "APÓS " + mecanismo.toUpperCase());
    return r;
  }
  function valores() { return Object.fromEntries(VARIAVEIS.map(([v]) => [v, preencher(v)])); }
  function faltas(text) {
    const list = [];
    if (usaSeg(tplAtual()) && !fixoDe(tplAtual()) && (!seg || (temLado(seg) && !lado && !bilateral))) list.push(!seg ? 'região' : 'lateralidade');
    if (/\{\{APOS_MEC\}\}/.test(text)) list.push('mecanismo de trauma');
    if (/\{\{[A-Z_]+\}\}/.test(text) && !list.length) list.push('campos do modelo');
    return list;
  }
  async function copiar(text, button) {
    const missing = faltas(text);
    if (missing.length) { aviso('Preencha: ' + missing.join(', ') + '.'); return; }
    try { await navigator.clipboard.writeText(text); }
    catch (_) { aviso('A cópia foi bloqueada. Selecione o texto e use Ctrl+C.'); return; }
    const label = button.textContent; button.textContent = '✓ Copiado';
    setTimeout(() => button.textContent = label, 1400);
  }
  const temVar = t => t.blocks.some(b => /\{\{[A-Z_]+\}\}/.test(b.content));

  /* Anatomical selector. Source silhouettes: anatomy/ATTRIBUTION.md. */
  const elipse = (cx, cy, rx, ry) => `M${cx-rx},${cy}a${rx},${ry} 0 1,0 ${2*rx},0a${rx},${ry} 0 1,0 ${-2*rx},0Z`;
  function reg(id, ld, d) {
    const g = SEG[id];
    const suf = ld && g.lat ? ' ' + (ld === 'D' ? (g.gen === 'f' ? 'direita' : 'direito') : (g.gen === 'f' ? 'esquerda' : 'esquerdo')) : '';
    return `<path role="button" tabindex="0" aria-label="${g.nome}${suf}" class="reg" data-seg="${id}" data-lado="${ld}" d="${d}"><title>${g.nome}${suf}</title></path>`;
  }

  function corpoSVG(frente) {
    // MIT silhouette assets; overlay geometry is the functional region selector.
    let s = `<svg viewBox="0 70 724 1310" role="group" aria-label="Corpo humano, vista ${frente ? 'anterior' : 'posterior'}"><image href="anatomy/body-${frente ? 'front' : 'back'}.svg" x="0" y="70" width="724" height="1310" aria-hidden="true"/><g class="anatomy-targets">`;
    const regions = [ ['ombro',235,348,48,53], ['braco',216,429,31,38], ['cotovelo',198,493,31,25], ['antebraco',169,585,28,60], ['punho',136,675,27,23], ['mao',112,749,46,62], ['quadril',285,693,37,44], ['coxa',294,819,39,68], ['joelho',292,958,36,37], ['perna',287,1094,36,84], ['tornozelo',289,1237,28,26], ['pe',275,1309,40,39] ];
    for (const [id,x,y,rx,ry] of regions) {
      s += reg(id,frente ? 'D' : 'E',elipse(x,y,rx,ry));
      s += reg(id,frente ? 'E' : 'D',elipse(728-x,y,rx,ry));
    }
    s += reg('cervical','',elipse(364,270,31,27));
    s += reg('pelve','',elipse(364,662,43,47));
    if(frente) s += reg('torax','',elipse(364,382,77,73));
    else { s += reg('toracica','',elipse(364,398,36,90)); s += reg('lombar','',elipse(364,552,39,59)); }
    return s + `</g><text class="anatomy-side" x="90" y="330">${frente ? 'D' : 'E'}</text><text class="anatomy-side" x="628" y="330">${frente ? 'E' : 'D'}</text></svg>`;
  }

  function detalheSVG(qual) {
    const mao = qual === 'maos';
    const base = mao ? 'mao' : 'pe';
    const digits = mao ? [[60,741,10,12],[65,790,10,12],[83,806,10,12],[109,805,10,12],[134,784,10,12]] : [[298,1335,8,10],[279,1340,7,9],[265,1339,6,8],[252,1335,6,8],[242,1327,5,8]];
    const crop = mao ? [40,680,128,148] : [228,1258,96,104];
    let svg = `<svg viewBox="0 0 340 260" role="group" aria-label="${mao ? 'Mãos' : 'Pés'}, vista anterior"><text class="lado-l" x="70" y="22">D · direito</text><text class="lado-l" x="238" y="22">E · esquerdo</text>`;
    for (const [side, x] of [['D',0],['E',174]]) {
      const left = side === 'D', mx = cx => left ? cx : 728-cx;
      svg += `<svg x="${x}" y="35" width="166" height="220" viewBox="${left ? crop[0] : 728-crop[0]-crop[2]} ${crop[1]} ${crop[2]} ${crop[3]}"><image href="anatomy/body-front.svg" x="0" y="70" width="724" height="1310"/><g class="detail-targets">`;
      svg += reg(base,side,elipse(mx(mao ? 121 : 286),mao ? 726 : 1290,mao ? 22 : 23,mao ? 28 : 20));
      digits.forEach(([cx,cy,rx,ry],i) => svg += reg(base+(i+1),side,elipse(mx(cx),cy,rx,ry)));
      svg += '</g></svg>';
    }
    return svg + '</svg>';
  }

  /* ---------- painel 1 ---------- */
  const casa = (t, q) => DocCore.matches(t.title + ' ' + t.blocks.map(b => b.title + ' ' + b.content).join(' '), q);
  function ordenados(m) {
    return [...m.templates].sort((a, b) =>
      (estado.usage[b.id] || 0) - (estado.usage[a.id] || 0) || a.title.localeCompare(b.title, "pt-BR"));
  }
  function pintaNav() {
    const nav = $("nav"); nav.replaceChildren();
    const q = $("gs").value.trim();
    if (q || filtro !== 'all') {
      const hits = estado.sections.flatMap(s => s.templates.filter(t => casa(t, q) && (filtro === 'all' || (filtro === 'favorites' ? estado.favorites : estado.recent).includes(t.id))).map(t => ({ s, t })));
      hits.sort((a,b) => filtro === 'recent' ? estado.recent.indexOf(a.t.id) - estado.recent.indexOf(b.t.id) : Number(DocCore.matches(b.t.title,q)) - Number(DocCore.matches(a.t.title,q)));
      const h = document.createElement("div"); h.className = "grp";
      h.textContent = filtro === 'favorites' ? 'FAVORITOS' : filtro === 'recent' ? 'RECENTES' : 'RESULTADOS';
      nav.append(h);
      const cx = document.createElement("div"); cx.className = "hits";
      hits.forEach(({ s, t }) => {
        const b = document.createElement("button"); b.className = "hit";
        b.innerHTML = `${esc(t.title)}<small>${esc(s.label)}</small>`;
        if (q) {
          const content = t.blocks.map(x => x.content).join(' ').replace(/\s+/g,' ');
          const at = Math.max(0, norm(content).indexOf(norm(q).split(/\s+/)[0]));
          const excerpt = document.createElement('small'); excerpt.className = 'search-excerpt';
          excerpt.textContent = (at > 24 ? '…' : '') + content.slice(Math.max(0,at-24),at+100) + '…'; b.append(excerpt);
        }
        b.onclick = () => { abrirModelo(s.id, t.id); };
        cx.append(b);
      });
      if (!hits.length) { const e = document.createElement("div"); e.className = "vazio-l"; e.textContent = "Nenhum resultado."; cx.append(e); }
      nav.append(cx); return;
    }
    if (abaAberta) nav.append(caixaAba(abaAberta));
    GRUPOS.forEach(([rot, ids]) => {
      const visiveis = ids.filter(id => mod(id) && id !== abaAberta);
      if (!visiveis.length) return;
      const g = document.createElement("div"); g.className = "grp"; g.textContent = rot; nav.append(g);
      visiveis.forEach(id => {
        const m = mod(id);
        const b = document.createElement("button"); b.className = "mod";
        b.innerHTML = `<span>${esc(m.label.toUpperCase())}</span><b>›</b>`;
        b.onclick = () => { abaAberta = id; buscaAba = ""; focarBusca = true; pintaNav(); };
        nav.append(b);
      });
    });
    estado.sections.filter(m => !GRUPOS.some(([, ids]) => ids.includes(m.id)) && m.id !== abaAberta).forEach(m => {
      const b = document.createElement('button'); b.className = 'mod'; b.textContent = m.label;
      b.onclick = () => { abaAberta = m.id; buscaAba = ''; focarBusca = true; pintaNav(); }; nav.append(b);
    });
  }
  function caixaAba(id) {
    const m = mod(id);
    const box = document.createElement("div"); box.className = "aba";
    const rot = document.createElement("div"); rot.className = "rot"; rot.textContent = "ABA ATIVA";
    const nm = document.createElement("div"); nm.className = "nome";
    const sp = document.createElement("span"); sp.textContent = m.label.toUpperCase();
    const fx = document.createElement("button"); fx.textContent = "×"; fx.setAttribute("aria-label", "Fechar aba");
    fx.onclick = () => { abaAberta = null; pintaNav(); };
    nm.append(sp, fx);
    const del = document.createElement('button'); del.textContent = 'Excluir'; del.className = 'delete-module';
    del.onclick = () => {
      if (!confirm('Excluir o módulo ' + m.label + ' e seus modelos? Você poderá desfazer agora.')) return;
      const backup = clone(estado); estado.deletedSections = [...(estado.deletedSections || []), m.id];
      estado.sections = estado.sections.filter(s => s.id !== m.id); abaAberta = null; tplSel = null; salvarJa(); pintaNav(); pintaTudo(); oferecerDesfazer(backup);
    }; nm.append(del);
    const bs = document.createElement("div"); bs.className = "abaBusca";
    bs.innerHTML = `<span class="ic" aria-hidden="true">⌕</span>`;
    const inp = document.createElement("input"); inp.type = "search";
    inp.placeholder = `Pesquisar em ${m.label.toLowerCase()}…`;
    inp.setAttribute("aria-label", `Pesquisar em ${m.label}`); inp.value = buscaAba;
    bs.append(inp);
    const lista = document.createElement("div"); lista.className = "lista";
    const vazio = document.createElement("div"); vazio.className = "vazio-l";
    vazio.textContent = "Nada encontrado neste módulo."; vazio.hidden = true;
    // Todos os modelos ficam no documento; a busca só mostra e esconde.
    // Redesenhar a cada tecla destrói o campo e faz perder o foco.
    const bts = ordenados(m).map((t, i) => {
      const x = document.createElement("button"); x.className = "tpl"; x.textContent = t.title;
      if ((estado.usage[t.id] || 0) > 0 && i < 3) {
        const u = document.createElement("span"); u.className = "uso"; u.textContent = "mais usado"; x.append(u);
      }
      x.dataset.busca = norm(t.title + " " + t.blocks.map(b => b.title + " " + b.content).join(" "));
      x.setAttribute("aria-current", String(tplSel === t.id));
      x.onclick = () => abrirModelo(m.id, t.id);
      lista.append(x); return x;
    });
    lista.append(vazio);
    const filtra = () => {
      const q = norm(inp.value.trim()); buscaAba = inp.value;
      let n = 0; bts.forEach(b => { const ok = DocCore.matches(b.dataset.busca, q); b.hidden = !ok; if (ok) n++; });
      vazio.hidden = n > 0;
    };
    inp.addEventListener("input", filtra); filtra();
    box.append(rot, nm, bs, lista);
    if (focarBusca) { focarBusca = false; setTimeout(() => inp.focus(), 0); }
    return box;
  }
  function abrirModelo(secId, tplId) {
    editando = false;
    tplSel = tplId;
    aplicarPadroes(tplAtual());
    estado.usage[tplId] = (estado.usage[tplId] || 0) + 1;
    estado.recent = [tplId, ...estado.recent.filter(i => i !== tplId)].slice(0, 10);
    abaAberta = secId; agendarSalvar(); fecharMenu(); pintaNav(); pintaTudo();
    $("app").classList.toggle('anatomy-open', mostraCorpo(tplAtual()) && !seg);
  }

  /* ---------- painel 2 ---------- */
  function pintaCorpo() {
    const t = tplAtual();
    const mostra = mostraCorpo(t);
    $("app").classList.toggle("sem-corpo", !mostra);
    if (!mostra) return;
    const det = vista === "maos" || vista === "pes";
    $("palco").innerHTML = det ? detalheSVG(vista) : corpoSVG(vista === "frente");
    $("vista").textContent = vista === "maos" ? "Mãos" : vista === "pes" ? "Pés"
                           : vista === "frente" ? "Frente" : "Verso";
    document.querySelectorAll("#vistas button").forEach(b => {
      const alvo = b.dataset.vista;
      b.setAttribute("aria-pressed", String(alvo === "corpo" ? vista === 'frente' : alvo === vista));
    });
    const m = usaMec(t);
    if (m && !$("mec").options.length) {
      const s = $("mec");
      s.append(new Option("— escolha o mecanismo —", ""));
      MECANISMOS.forEach(x => s.append(new Option(x, x)));
      s.append(new Option("outro (descrever)", "__livre__"));
    }
    if (m) { $("mec").value = MECANISMOS.includes(mecanismo) ? mecanismo : (mecanismo ? '__livre__' : ''); $("mecLivre").hidden = !mecanismo || MECANISMOS.includes(mecanismo); $("mecLivre").value = mecanismo; }
    marca();
  }
  function marca() {
    const t = tplAtual(), fx = fixoDe(t);
    $("palco").classList.toggle("fixo", Boolean(fx));
    document.querySelectorAll(".reg").forEach(p => {
      const mesmo = p.dataset.seg === seg;
      const ok = !SEG[p.dataset.seg].lat || bilateral || !lado || p.dataset.lado === lado || p.dataset.lado === "";
      p.classList.toggle("sel", Boolean(seg) && mesmo && ok);
    });
    const n = nomeSeg();
    $("segmentSelect").value = seg || ''; $("segmentSelect").disabled = Boolean(fx);
    [...$('segmentSelect').options].forEach(o => o.disabled = Boolean(o.value) && !aceitaRegiao(o.value));
    document.querySelectorAll('.reg').forEach(p => p.setAttribute('aria-disabled', String(Boolean(fx) || !aceitaRegiao(p.dataset.seg))));
    $("sideChoices").hidden = Boolean(fx) || !temLado(seg);
    document.querySelectorAll('[data-side]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.side === lado && !bilateral)));
    $("sel").innerHTML = n ? `Selecionado: <b>${esc(n.toLowerCase())}</b>` : "Nenhum segmento selecionado.";
    // Coluna, pelve e tórax não têm lado: a opção bilateral não faz sentido.
    $("bilat").hidden = Boolean(fx) || !temLado(seg);
    $("bilat").setAttribute("aria-pressed", String(bilateral));
    $("mecwrap").hidden = Boolean(fx) || !usaMec(t);
    if (fx) {
      $("dica").textContent = "Este modelo já é deste lado. Para trocar, use o modelo do outro lado.";
    } else if (temLado(seg) && !lado && !bilateral) {
      $("dica").textContent = "Toque no lado acometido — direito à esquerda de quem olha.";
    } else {
      $("dica").textContent = t?.segPadrao ? 'Modelo específico de ' + SEG[t.segPadrao].nome + '. Para outra região, escolha o modelo correspondente.' : "Use o mapa ou a lista. Frente e verso mantêm o lado do paciente.";
    }
  }
  $("palco").addEventListener("click", e => {
    const p = e.target.closest(".reg");
    if (!p) {
      // No corpo, o fundo alterna frente e verso. Ampliado, o fundo volta ao corpo.
      vista = vista === "frente" ? "verso" : vista === "verso" ? "frente" : "frente";
      pintaCorpo(); return;
    }
    if (fixoDe(tplAtual())) { aviso("Este modelo já é de um lado definido."); return; }
    if (!aceitaRegiao(p.dataset.seg)) { aviso('Este modelo é específico de ' + SEG[tplAtual().segPadrao].nome + '. Escolha um modelo correspondente à nova região.'); return; }
    seg = p.dataset.seg; lado = p.dataset.lado || null; bilateral = false;
    // Tocar na mão ou no pé no corpo já amplia: o dedo fica a um toque.
    const d = DETALHE[seg];
    if (d && vista !== d) { vista = d; pintaCorpo(); pintaTexto(); return; }
    marca(); pintaTexto();
  });
  $('palco').addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.reg')) { e.preventDefault(); e.target.dispatchEvent(new MouseEvent('click', { bubbles: true })); } });
  $("vistas").addEventListener("click", e => {
    const b = e.target.closest("button[data-vista]");
    if (!b) return;
    vista = b.dataset.vista === "corpo" ? "frente" : b.dataset.vista;
    pintaCorpo();
  });
  $("bilat").addEventListener("click", e => {
    bilateral = !bilateral; e.currentTarget.setAttribute("aria-pressed", String(bilateral));
    marca(); pintaTexto();
  });
  $("mec").addEventListener("change", e => {
    if (e.target.value === "__livre__") { $("mecLivre").hidden = false; mecanismo = $("mecLivre").value; $("mecLivre").focus(); }
    else { $("mecLivre").hidden = true; mecanismo = e.target.value; }
    pintaTexto();
  });
  $("mecLivre").addEventListener("input", e => { mecanismo = e.target.value; pintaTexto(); });

  /* ---------- painel 3 ---------- */
  function pintaTexto() {
    const t = tplAtual(), m = modAtual(), docs = $("docs");
    $("btCopiar").hidden = true; $("btVars").hidden = true; $("btRestaurar").hidden = true;
    $("favorite").hidden = !t; $("editMode").hidden = !t;
    $("contextBar").hidden = !mostraCorpo(t);
    $("modeNote").hidden = !t;
    $('editTools').hidden = !t || !editando;
    $("modeNote").textContent = editando ? 'Personalizando o modelo · alterações salvas automaticamente. Mantenha as variáveis para o texto acompanhar a região.' : 'Revise o documento antes de copiar. Edições aqui ficam somente nesta sessão.';
    $("modeNote").classList.toggle('editing', editando);
    $("editMode").textContent = editando ? 'Concluir personalização' : 'Personalizar modelo';
    $("editMode").setAttribute('aria-pressed', String(editando));
    $("favorite").textContent = estado.favorites.includes(tplSel) ? '★' : '☆';
    $("favorite").setAttribute('aria-pressed', String(estado.favorites.includes(tplSel)));
    $("contextSummary").textContent = [nomeSeg(), usaMec(t) ? mecanismo : ''].filter(Boolean).join(' · ');
    $("showAnatomy").textContent = seg ? 'Alterar região' : 'Selecionar região';
    if (!t) {
      $("olho").textContent = "—"; $("nome").textContent = "Selecione um modelo";
      docs.innerHTML = `<div class="welcome"><span class="welcome-kicker">SEU ESPAÇO CLÍNICO</span><h1>Mais presença.<br>Menos digitação.</h1><p>Encontre o modelo, ajuste a região e revise o texto.</p><button class="copiar" id="startSearch">Encontrar um modelo <kbd>Ctrl K</kbd></button><div class="welcome-modules"></div></div>`;
      $('startSearch').onclick = () => { abrirMenu(); $('gs').focus(); };
      estado.sections.slice(0, 4).forEach(s => { const b = document.createElement('button'); b.textContent = s.label + ' ↗'; b.onclick = () => { abaAberta = s.id; focarBusca = true; abrirMenu(); pintaNav(); }; docs.querySelector('.welcome-modules').append(b); });
      return;
    }
    $("olho").textContent = m.label.toUpperCase();
    $("nome").textContent = t.title;
    $("btVars").hidden = !editando;
    $("btRestaurar").hidden = !editando || !doSeed(t.id);
    docs.replaceChildren();
    if (usaSeg(t) && temLado(seg) && !lado && !bilateral && temVar(t)) {
      const a = document.createElement("div"); a.className = "aviso";
      a.textContent = "Falta o lado — toque no " + SEG[seg].nome + " direito ou esquerdo no mapa.";
      docs.append(a);
    }
    if (usaMec(t) && !mecanismo && temVar(t)) {
      const a = document.createElement("div"); a.className = "aviso";
      a.textContent = "Falta escolher o mecanismo de trauma — ele aparece marcado no texto até ser definido.";
      docs.append(a);
    }
    (editando ? t.blocks : blocosAtuais()).forEach((b, i) => {
      const card = document.createElement("section"); card.className = "blk";
      const bh = document.createElement("div"); bh.className = "bh";
      const sp = document.createElement("span"); sp.textContent = b.title;
      if (editando) {
        sp.contentEditable = 'plaintext-only'; sp.setAttribute('role','textbox'); sp.setAttribute('aria-label','Título da caixa ' + (i+1));
        sp.oninput = () => { b.title = sp.textContent; t.modified = Date.now(); agendarSalvar(); };
      }
      const cb = document.createElement("button"); cb.textContent = "Copiar";
      cb.onclick = async () => {
        const current = (editando ? tplAtual().blocks : blocosAtuais())[i];
        await copiar(preencher(current.content), cb);
      };
      bh.append(sp, cb);
      if (editando && t.blocks.length > 1) {
        const remove = document.createElement('button'); remove.textContent = 'Excluir caixa';
        remove.onclick = () => { if (!confirm('Excluir esta caixa de texto do modelo?')) return; t.blocks.splice(i,1); t.modified = Date.now(); salvarJa(); pintaTexto(); }; bh.append(remove);
      }
      const ta = document.createElement("textarea");
      ta.value = editando ? b.content : preencher(b.content);
      ta.spellcheck = false;
      ta.setAttribute("aria-label", "Conteúdo de " + b.title);
      ta.dataset.bloco = String(i);
      ta.addEventListener("focus", () => { ultimoFoco = ta; });
      ta.addEventListener("input", () => {
        // Edição direta grava no modelo. Se o texto tinha variável e o usuário
        // digitou por cima, o que ele escreveu vale — é o texto dele.
        if (editando) { b.content = ta.value; t.modified = Date.now(); agendarSalvar(); }
        else {
          const blocks = clone(blocosAtuais()); blocks[i].content = DocCore.edit(blocks[i].content, ta.value, valores());
          rascunhos.set(tplSel, blocks); window.DocHasDrafts = true;
        }
        auto(ta);
      });
      card.append(bh, ta); docs.append(card); auto(ta);
    });
    $("btCopiar").hidden = false;
  }
  function auto(ta) { ta.style.height = "auto"; ta.style.height = (ta.scrollHeight + 2) + "px"; }
  function pintaTudo() { pintaCorpo(); pintaTexto(); }

  $("btCopiar").addEventListener("click", async e => {
    const b = e.currentTarget, t = tplAtual();
    if (!t) return;
    const txt = (editando ? t.blocks : blocosAtuais()).map(x => preencher(x.content).trim()).filter(Boolean).join("\n\n");
    await copiar(txt, b);
  });
  $("btRestaurar").addEventListener("click", () => {
    const t = tplAtual(); const o = doSeed(t && t.id);
    if (!o || !window.confirm("Restaurar este modelo para o conteúdo original?")) return;
    const s = modAtual(); const i = s.templates.findIndex(x => x.id === t.id);
    s.templates[i] = clone(o); rascunhos.delete(tplSel); salvarJa(); aviso("Modelo restaurado."); pintaTudo();
  });

  /* ---------- inserir variável ---------- */
  $("btVars").addEventListener("click", () => {
    const g = $("vgrid"); g.replaceChildren();
    VARIAVEIS.forEach(([v, ex, desc]) => {
      const b = document.createElement("button");
      b.innerHTML = `<code>${esc(v)}</code> → ${esc(ex)}<small>${esc(desc)}</small>`;
      b.onclick = () => inserir(v);
      g.append(b);
    });
    $("modalVars").hidden = false;
  });
  function inserir(v) {
    const t = tplAtual();
    const ta = ultimoFoco && document.body.contains(ultimoFoco) ? ultimoFoco : $("docs").querySelector("textarea");
    if (!t || !ta) return;
    const i = Number(ta.dataset.bloco);
    const p = ta.selectionStart ?? ta.value.length;
    ta.value = ta.value.slice(0, p) + v + ta.value.slice(ta.selectionEnd ?? p);
    t.blocks[i].content = ta.value;
    // ligar automaticamente o recurso correspondente
    t.usa = t.usa || {};
    if (v.includes("SEG")) { t.usa.segmento = true; t.usa.lateralidade = true; }
    if (v.includes("MEC")) t.usa.mecanismo = true;
    t.modified = Date.now();
    salvarJa(); $("modalVars").hidden = true;
    aviso("Variável inserida. O modelo agora usa " + (v.includes("MEC") ? "mecanismo de trauma." : "segmento anatômico."));
    pintaTudo();
    setTimeout(() => { const n = $("docs").querySelectorAll("textarea")[i]; if (n) { n.focus(); n.setSelectionRange(p + v.length, p + v.length); } }, 0);
  }
  document.querySelectorAll("[data-fecha]").forEach(b => b.onclick = () => $("modalVars").hidden = true);
  $("modalVars").addEventListener("click", e => { if (e.target === $("modalVars")) $("modalVars").hidden = true; });

  /* ---------- exportar / importar ---------- */
  $("btExportar").addEventListener("click", () => {
    salvarJa();
    const blob = new Blob([JSON.stringify({ app: "DocTemplate Ortopedia", format: 1, seedVersion: seed.version, exportedAt: new Date().toISOString(), state: estado }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = `doctemplate-4.0-${new Date().toISOString().slice(0,16).replace(/[:T]/g,"-")}.json`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    aviso("Arquivo exportado.");
  });
  $("btImportar").addEventListener("click", () => $("arquivo").click());
  $("arquivo").addEventListener("change", e => {
    const f = e.target.files && e.target.files[0]; e.target.value = "";
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const p = JSON.parse(String(r.result));
        const inc = p && p.state && Array.isArray(p.state.sections) ? p.state : (p && Array.isArray(p.sections) ? p : null);
        if (!inc) throw new Error("formato");
        DocCore.validate(inc);
        estado = mesclar(inc, clone(estado)); salvarJa(); pintaNav(); pintaTudo();
        aviso("Arquivo importado e mesclado.");
      } catch (_) { aviso("Não reconheci este arquivo. Use um .json exportado pelo DocTemplate."); }
    };
    r.readAsText(f);
  });

  /* ---------- menu no celular ---------- */
  function abrirMenu() { $("c1").classList.add("open"); $("veu").classList.add("on"); }
  function fecharMenu() { $("c1").classList.remove("open"); $("veu").classList.remove("on"); }
  $("menuBt").addEventListener("click", abrirMenu);
  $("fechaMenu").addEventListener("click", fecharMenu);
  $("veu").addEventListener("click", fecharMenu);

  $("gs").addEventListener("input", pintaNav);
  document.querySelectorAll('[data-filter]').forEach(b => b.onclick = () => {
    filtro = b.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); pintaNav();
  });
  $('favorite').onclick = () => { estado.favorites = estado.favorites.includes(tplSel) ? estado.favorites.filter(id => id !== tplSel) : [...estado.favorites, tplSel]; agendarSalvar(); pintaTexto(); pintaNav(); };
  $('editMode').onclick = () => { if (sujo) salvarJa(); editando = !editando; if (!editando) { rascunhos.delete(tplSel); window.DocHasDrafts = rascunhos.size > 0; } pintaTudo(); };
  Object.entries(SEG).forEach(([id, s]) => $('segmentSelect').append(new Option(s.nome, id)));
  $('segmentSelect').onchange = e => { seg = e.target.value || null; if (!temLado(seg)) { lado = null; bilateral = false; } if (['toracica','lombar'].includes(seg)) vista = 'verso'; else if (dedoDe(seg)) vista = dedoDe(seg); pintaTudo(); };
  document.querySelectorAll('[data-side]').forEach(b => b.onclick = () => { lado = b.dataset.side; bilateral = false; marca(); pintaTexto(); });
  $('showAnatomy').onclick = () => $('app').classList.toggle('anatomy-open');
  $('closeAnatomy').onclick = () => $('app').classList.remove('anatomy-open');
  $('resetContext').onclick = () => {
    if (rascunhos.size && !confirm('Limpar as seleções e os rascunhos desta sessão?')) return;
    seg = lado = null; bilateral = false; mecanismo = ''; rascunhos.clear(); window.DocHasDrafts = false;
    aplicarPadroes(tplAtual()); pintaTudo();
  };
  function oferecerDesfazer(backup) {
    const note = $('modeNote'); note.hidden = false; note.textContent = 'Módulo excluído. ';
    const b = document.createElement('button'); b.textContent = 'Desfazer'; note.append(b);
    b.onclick = () => { estado = backup; salvarJa(); pintaNav(); pintaTudo(); };
  }
  $('newModule').onclick = () => {
    const label = prompt('Nome do módulo:'); if (!label?.trim()) return;
    const id = uid('mod'); estado.sections.push({ id, label: label.trim(), templates: [] }); abaAberta = id; filtro = 'all'; $('gs').value = ''; salvarJa(); pintaNav();
  };
  $('newTemplate').onclick = () => {
    const s = mod(abaAberta) || modAtual() || estado.sections[0]; if (!s) { aviso('Crie um módulo primeiro.'); return; }
    const title = prompt('Nome do modelo em ' + s.label + ':'); if (!title?.trim()) return;
    const t = { id: uid(s.id), title: title.trim(), modified: Date.now(), blocks: [{ title: 'DOCUMENTO', content: '' }] };
    s.templates.push(t); salvarJa(); abrirModelo(s.id, t.id); editando = true; pintaTudo();
  };
  $('renameTemplate').onclick = () => { const t = tplAtual(); const title = prompt('Nome do modelo:',t.title); if (!title?.trim()) return; t.title = title.trim(); t.modified = Date.now(); salvarJa(); pintaNav(); pintaTexto(); };
  $('addBlock').onclick = () => { const t = tplAtual(); t.blocks.push({title:'NOVA CAIXA',content:''}); t.modified = Date.now(); salvarJa(); pintaTexto(); $('docs').lastElementChild.querySelector('textarea').focus(); };
  $('deleteTemplate').onclick = () => {
    const t = tplAtual(); if (!confirm('Excluir o modelo ' + t.title + '?')) return;
    const backup = clone(estado); modAtual().templates = modAtual().templates.filter(x => x.id !== t.id); estado.deleted.push(t.id);
    rascunhos.delete(t.id); tplSel = null; editando = false; salvarJa(); pintaNav(); pintaTudo(); oferecerDesfazer(backup);
  };
  window.addEventListener('offline', () => $('networkStatus').textContent = 'Modo offline');
  window.addEventListener('online', () => $('networkStatus').textContent = navigator.serviceWorker?.controller ? 'Disponível offline' : 'Conectado');
  window.addEventListener('beforeunload', e => { if (window.DocHasDrafts) { e.preventDefault(); e.returnValue = ''; } });
  document.addEventListener("keydown", e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); abrirMenu(); $("gs").focus(); }
    if (e.key === "Escape" && !$("modalVars").hidden) $("modalVars").hidden = true;
  });
  window.addEventListener("resize", () => { $("docs").querySelectorAll("textarea").forEach(auto); });

  /* ---------- início ---------- */
  pintaNav(); pintaTudo(); pintarStatus();
  if (estado.migradoDe !== undefined) { delete estado.migradoDe; salvarJa(); aviso("Modelos atualizados. Suas edições foram preservadas."); }
})();
