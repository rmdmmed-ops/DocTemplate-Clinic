(function () {
  "use strict";

  /* DocTemplate Ortopedia 4.0 — beta.
     Chave de armazenamento própria: a 3.2 na raiz continua intacta e em uso. */
  const CHAVE = "doctemplate-ortopedia:4.0";
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
  function doUsuario(t) {
    const o = doSeed(t.id);
    if (!o) return true;
    if (t.modified) return true;
    return difere(t, o);
  }
  function mesclar(salvo, base = novoEstado()) {
    const r = base;
    const apagados = new Set([...(r.deleted || []), ...(Array.isArray(salvo.deleted) ? salvo.deleted : [])]);
    r.deleted = [...apagados];
    (salvo.sections || []).forEach(ss => {
      const alvo = r.sections.find(s => s.id === ss.id);
      if (!alvo) return;
      (ss.templates || []).forEach(t => {
        if (!t || !t.id || !Array.isArray(t.blocks)) return;
        const i = alvo.templates.findIndex(x => x.id === t.id);
        if (i === -1) { if (!apagados.has(t.id) || !doSeed(t.id)) alvo.templates.push(clone(t)); return; }
        if (doUsuario(t)) {
          const atual = alvo.templates[i];
          if (atual.modified && difere(atual, t)) {
            alvo.templates.push(Object.assign(clone(t), { id: uid(alvo.id), title: `${t.title} (IMPORTADO)` }));
          } else {
            // o campo usa vem sempre do seed: é estrutura, não conteúdo do usuário
            alvo.templates[i] = Object.assign(clone(t), { usa: atual.usa || {}, mecanismoPadrao: atual.mecanismoPadrao, modified: t.modified || Date.now() });
          }
        }
      });
    });
    r.sections.forEach(s => { s.templates = s.templates.filter(t => !apagados.has(t.id) || !doSeed(t.id)); });
    const conhecidos = new Set(r.sections.flatMap(s => s.templates.map(t => t.id)));
    r.favorites = [...new Set([...(salvo.favorites || []), ...(r.favorites || [])])].filter(id => conhecidos.has(id));
    r.recent = [...new Set([...(salvo.recent || []), ...(r.recent || [])])].filter(id => conhecidos.has(id)).slice(0, 10);
    r.usage = Object.assign({}, r.usage || {}, salvo.usage || {});
    Object.keys(r.usage).forEach(id => { if (!conhecidos.has(id)) delete r.usage[id]; });
    r.version = seed.version;
    return r;
  }
  function lerJSON(chave) { try { return JSON.parse(localStorage.getItem(chave)); } catch (_) { return null; } }
  function carregar() {
    const s = lerJSON(CHAVE);
    if (s && Array.isArray(s.sections)) {
      if (s.version === seed.version) return s;
      const m = mesclar(s); m.migradoDe = s.version; return m;
    }
    return novoEstado();
  }

  let estado = carregar();
  estado.favorites = Array.isArray(estado.favorites) ? estado.favorites : [];
  estado.recent = Array.isArray(estado.recent) ? estado.recent : [];
  estado.usage = estado.usage && typeof estado.usage === "object" ? estado.usage : {};
  estado.deleted = Array.isArray(estado.deleted) ? estado.deleted : [];

  let abaAberta = null, tplSel = null, buscaAba = "";
  let seg = null, lado = null, bilateral = false, mecanismo = "", vista = "frente";
  let focarBusca = false, sujo = false, timerSalvar = null, timerToast = null, ultimoFoco = null;

  const tplAtual = () => { for (const s of estado.sections) { const t = s.templates.find(x => x.id === tplSel); if (t) return t; } return null; };
  const modAtual = () => estado.sections.find(s => s.templates.some(t => t.id === tplSel));
  const mod = id => estado.sections.find(s => s.id === id);
  const usaSeg = t => Boolean(t && t.usa && t.usa.segmento);
  const usaMec = t => Boolean(t && t.usa && t.usa.mecanismo);

  /* ---------- salvamento ---------- */
  function gravar() { estado.savedAt = Date.now(); localStorage.setItem(CHAVE, JSON.stringify(estado)); }
  function pintarStatus() {
    $("salvo").textContent = sujo ? "Salvando…" : (estado.savedAt ? "Salvo às " + hora(estado.savedAt) : "Salvo neste navegador");
    $("pt").classList.toggle("pend", sujo);
  }
  function salvarJa() {
    clearTimeout(timerSalvar); timerSalvar = null;
    try { gravar(); sujo = false; } catch (_) { aviso("O navegador bloqueou o armazenamento. Exporte seus modelos."); }
    pintarStatus();
  }
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
  const temVar = t => t.blocks.some(b => /\{\{[A-Z_]+\}\}/.test(b.content));

  /* ---------- desenho do corpo ---------- */
  function cap(cx, y1, w1, y2, w2, r) {
    const l1 = cx - w1, r1 = cx + w1, l2 = cx - w2, r2 = cx + w2;
    return `M${l1 + r},${y1} L${r1 - r},${y1} Q${r1},${y1} ${r1},${y1 + r} L${r2},${y2 - r} Q${r2},${y2} ${r2 - r},${y2} L${l2 + r},${y2} Q${l2},${y2} ${l2},${y2 - r} L${l1},${y1 + r} Q${l1},${y1} ${l1 + r},${y1} Z`;
  }
  const M = x => 320 - x;
  const MEMBROS = [
    ["ombro",118,100,25,134,19,15],["braco",112,136,18,214,15,13],["cotovelo",110,216,16,242,15,12],
    ["antebraco",107,244,15,318,12,11],["punho",105,320,12,338,11,9],["mao",103,340,14,386,11,12],
    ["quadril",140,300,23,338,21,15],["coxa",139,340,22,442,16,16],["joelho",138,444,17,474,15,13],
    ["perna",137,476,15,570,11,12],["tornozelo",136,572,11,592,10,8],["pe",135,594,12,630,16,11],
  ];
  const CABECA = `<ellipse cx="160" cy="48" rx="26" ry="32"/>`;
  const PESCOCO = `<path d="${cap(160,76,11,104,15,6)}"/>`;
  const TRONCO = `<path d="${cap(160,100,36,300,27,20)}"/>`;
  function reg(id, ld, d) {
    const g = SEG[id];
    const suf = ld && g.lat ? " " + (ld === "D" ? (g.gen === "f" ? "direita" : "direito") : (g.gen === "f" ? "esquerda" : "esquerdo")) : "";
    return `<path class="reg" data-seg="${id}" data-lado="${ld}" d="${d}"><title>${g.nome}${suf}</title></path>`;
  }
  function marcasLado() {
    return `<text class="lado-l" x="46" y="86" text-anchor="middle">D</text><text class="lado-s" x="46" y="99" text-anchor="middle">direito</text>`
         + `<text class="lado-l" x="274" y="86" text-anchor="middle">E</text><text class="lado-s" x="274" y="99" text-anchor="middle">esquerdo</text>`;
  }
  function svgFrente() {
    let s = `<svg viewBox="0 0 320 668" role="group" aria-label="Corpo humano, vista anterior">`;
    s += `<g class="ctx">${CABECA}${TRONCO}</g>` + marcasLado();
    s += reg("cervical", "", cap(160, 76, 11, 104, 14, 6));
    s += reg("torax", "", cap(160, 110, 29, 210, 26, 16));
    s += reg("pelve", "", cap(160, 258, 26, 302, 24, 14));
    for (const [id, cx, y1, w1, y2, w2, r] of MEMBROS) {
      s += reg(id, "D", cap(cx, y1, w1, y2, w2, r));
      s += reg(id, "E", cap(M(cx), y1, w1, y2, w2, r));
    }
    return s + `</svg>`;
  }
  function svgVerso() {
    let s = `<svg viewBox="0 0 320 668" role="group" aria-label="Corpo humano, vista posterior">`;
    s += `<g class="ctx">${CABECA}${PESCOCO}${TRONCO}`;
    for (const [id, cx, y1, w1, y2, w2, r] of MEMBROS)
      s += `<path d="${cap(cx,y1,w1,y2,w2,r)}"/><path d="${cap(M(cx),y1,w1,y2,w2,r)}"/>`;
    s += `</g>` + marcasLado();
    s += reg("cervical", "", cap(160, 78, 12, 106, 13, 6));
    s += reg("toracica", "", cap(160, 110, 14, 200, 14, 8));
    s += reg("lombar", "", cap(160, 204, 15, 262, 15, 8));
    s += reg("pelve", "", cap(160, 266, 26, 306, 24, 14));
    return s + `</svg>`;
  }

  /* ---------- painel 1 ---------- */
  const casa = (t, q) => !q || norm(t.title + " " + t.blocks.map(b => b.title + " " + b.content).join(" ")).includes(norm(q));
  function ordenados(m) {
    return [...m.templates].sort((a, b) =>
      (estado.usage[b.id] || 0) - (estado.usage[a.id] || 0) || a.title.localeCompare(b.title, "pt-BR"));
  }
  function pintaNav() {
    const nav = $("nav"); nav.replaceChildren();
    const q = $("gs").value.trim();
    if (q) {
      const hits = estado.sections.flatMap(s => s.templates.filter(t => casa(t, q)).map(t => ({ s, t })));
      const h = document.createElement("div"); h.className = "grp";
      h.textContent = `${hits.length} ${hits.length === 1 ? "RESULTADO" : "RESULTADOS"}`;
      nav.append(h);
      const cx = document.createElement("div"); cx.className = "hits";
      hits.slice(0, 40).forEach(({ s, t }) => {
        const b = document.createElement("button"); b.className = "hit";
        b.innerHTML = `${esc(t.title)}<small>${esc(s.label)}</small>`;
        b.onclick = () => { $("gs").value = ""; abrirModelo(s.id, t.id); };
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
      let n = 0; bts.forEach(b => { const ok = !q || b.dataset.busca.includes(q); b.hidden = !ok; if (ok) n++; });
      vazio.hidden = n > 0;
    };
    inp.addEventListener("input", filtra); filtra();
    box.append(rot, nm, bs, lista);
    if (focarBusca) { focarBusca = false; setTimeout(() => inp.focus(), 0); }
    return box;
  }
  function abrirModelo(secId, tplId) {
    tplSel = tplId;
    estado.usage[tplId] = (estado.usage[tplId] || 0) + 1;
    estado.recent = [tplId, ...estado.recent.filter(i => i !== tplId)].slice(0, 10);
    abaAberta = null; agendarSalvar(); fecharMenu(); pintaNav(); pintaTudo();
  }

  /* ---------- painel 2 ---------- */
  function pintaCorpo() {
    const t = tplAtual();
    const mostra = Boolean(t) && usaSeg(t);
    $("app").classList.toggle("sem-corpo", !mostra);
    if (!mostra) return;
    $("palco").innerHTML = vista === "frente" ? svgFrente() : svgVerso();
    $("vista").textContent = vista === "frente" ? "Frente" : "Verso";
    $("dica").textContent = "Toque no fundo para ver o " + (vista === "frente" ? "verso" : "frente") + ".";
    const m = usaMec(t);
    $("mecwrap").hidden = !m;
    if (m && !$("mec").options.length) {
      const s = $("mec");
      s.append(new Option("— escolha o mecanismo —", ""));
      MECANISMOS.forEach(x => s.append(new Option(x, x)));
      s.append(new Option("outro (descrever)", "__livre__"));
    }
    if (m) $("mec").value = MECANISMOS.includes(mecanismo) ? mecanismo : ($("mecLivre").hidden ? "" : "__livre__");
    marca();
  }
  function marca() {
    document.querySelectorAll(".reg").forEach(p => {
      const mesmo = p.dataset.seg === seg;
      const ok = !SEG[p.dataset.seg].lat || bilateral || !lado || p.dataset.lado === lado || p.dataset.lado === "";
      p.classList.toggle("sel", Boolean(seg) && mesmo && ok);
    });
    const n = nomeSeg();
    $("sel").innerHTML = n ? `Selecionado: <b>${esc(n.toLowerCase())}</b>` : "Nenhum segmento selecionado.";
    // Coluna, pelve e tórax não têm lado: a opção bilateral não faz sentido.
    $("bilat").hidden = !(seg && SEG[seg] && SEG[seg].lat);
    $("bilat").setAttribute("aria-pressed", String(bilateral));
  }
  $("palco").addEventListener("click", e => {
    const p = e.target.closest(".reg");
    if (!p) { vista = vista === "frente" ? "verso" : "frente"; pintaCorpo(); return; }
    seg = p.dataset.seg; lado = p.dataset.lado || null;
    marca(); pintaTexto();
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
    if (!t) {
      $("olho").textContent = "—"; $("nome").textContent = "Selecione um modelo";
      docs.innerHTML = `<div class="passo"><div class="num">1</div><p>Escolha um <strong>módulo</strong> e um <strong>modelo</strong> no menu.</p></div>`;
      return;
    }
    $("olho").textContent = m.label.toUpperCase();
    $("nome").textContent = t.title;
    $("btVars").hidden = false;
    $("btRestaurar").hidden = !doSeed(t.id);
    if (usaSeg(t) && !seg) {
      docs.innerHTML = `<div class="passo"><div class="num">2</div><p>Toque no <strong>segmento acometido</strong>. O texto aparece aqui preenchido.</p></div>`;
      return;
    }
    docs.replaceChildren();
    const faltaMec = usaMec(t) && !mecanismo && temVar(t);
    if (faltaMec) {
      const a = document.createElement("div"); a.className = "aviso";
      a.textContent = "Falta escolher o mecanismo de trauma — ele aparece marcado no texto até ser definido.";
      docs.append(a);
    }
    t.blocks.forEach((b, i) => {
      const card = document.createElement("section"); card.className = "blk";
      const bh = document.createElement("div"); bh.className = "bh";
      const sp = document.createElement("span"); sp.textContent = b.title;
      const cb = document.createElement("button"); cb.textContent = "Copiar";
      cb.onclick = async () => {
        const btn = cb;
        try { await navigator.clipboard.writeText(preencher(b.content)); } catch (_) {}
        btn.textContent = "✓ Copiado"; setTimeout(() => btn.textContent = "Copiar", 1400);
      };
      bh.append(sp, cb);
      const ta = document.createElement("textarea");
      ta.value = preencher(b.content);
      ta.spellcheck = false;
      ta.setAttribute("aria-label", "Conteúdo de " + b.title);
      ta.dataset.bloco = String(i);
      ta.addEventListener("focus", () => { ultimoFoco = ta; });
      ta.addEventListener("input", () => {
        // Edição direta grava no modelo. Se o texto tinha variável e o usuário
        // digitou por cima, o que ele escreveu vale — é o texto dele.
        b.content = ta.value; t.modified = Date.now(); agendarSalvar(); auto(ta);
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
    const txt = t.blocks.map(x => preencher(x.content).trim()).filter(Boolean).join("\n\n");
    try { await navigator.clipboard.writeText(txt); } catch (_) {}
    b.textContent = "✓ COPIADO"; b.classList.add("ok");
    setTimeout(() => { b.textContent = "COPIAR TUDO"; b.classList.remove("ok"); }, 1500);
  });
  $("btRestaurar").addEventListener("click", () => {
    const t = tplAtual(); const o = doSeed(t && t.id);
    if (!o || !window.confirm("Restaurar este modelo para o conteúdo original?")) return;
    const s = modAtual(); const i = s.templates.findIndex(x => x.id === t.id);
    s.templates[i] = clone(o); salvarJa(); aviso("Modelo restaurado."); pintaTudo();
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
        estado = mesclar(inc, estado); salvarJa(); pintaNav(); pintaTudo();
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
  document.addEventListener("keydown", e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); abrirMenu(); $("gs").focus(); }
    if (e.key === "Escape" && !$("modalVars").hidden) $("modalVars").hidden = true;
  });
  window.addEventListener("resize", () => { $("docs").querySelectorAll("textarea").forEach(auto); });

  /* ---------- início ---------- */
  pintaNav(); pintaTudo(); pintarStatus();
  if (estado.migradoDe !== undefined) { delete estado.migradoDe; salvarJa(); aviso("Modelos atualizados. Suas edições foram preservadas."); }
})();
