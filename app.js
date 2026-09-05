(function () {
  "use strict";

  const STORAGE_KEY = "doctemplate-ortopedia:3.0";
  const seed = window.DOCTEMPLATE_SEED;
  if (!seed || !Array.isArray(seed.sections)) {
    document.body.innerHTML = "<p style='padding:2rem'>Não foi possível carregar os modelos clínicos.</p>";
    return;
  }

  const groups = [
    { label: "EVOLUÇÕES", ids: ["ps", "ambulatorio", "enfermaria", "internacao"] },
    { label: "PRESCRIÇÕES", ids: ["prescricoes"] },
    { label: "EXAMES", ids: ["tc", "rnm", "usg"] },
    { label: "DOCUMENTOS E DESCRIÇÕES", ids: ["encaminhamentos", "fisioterapia", "acupuntura", "relatorios", "descricoes"] },
  ];

  const workGreetings = [
    "Que hoje você encontre serenidade nas decisões e propósito em cada cuidado.",
    "Um atendimento de cada vez, com atenção, clareza e humanidade.",
    "Que o seu conhecimento alivie dores e renove esperanças ao longo do dia.",
    "Faça o seu melhor com calma; a excelência também nasce da serenidade.",
    "Que não faltem sabedoria para decidir e sensibilidade para cuidar.",
    "Conhecimento orienta as mãos; humanidade dá sentido ao cuidado.",
    "Que hoje a pressa não seja maior que o cuidado.",
    "Que a experiência conduza, a prudência proteja e a empatia acompanhe.",
  ];

  const clone = (value) => JSON.parse(JSON.stringify(value));
  const normalize = (value) => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const uid = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const byId = (id) => document.getElementById(id);

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved && saved.version === seed.version && Array.isArray(saved.sections)) return saved;
    } catch (_) {}
    return { version: seed.version, sections: clone(seed.sections), favorites: [], recent: [], usage: {} };
  }

  let state = loadState();
  state.favorites = Array.isArray(state.favorites) ? state.favorites : [];
  state.recent = Array.isArray(state.recent) ? state.recent : [];
  state.usage = state.usage && typeof state.usage === "object" ? state.usage : {};
  let activeSectionId = null;
  let activeTemplateId = null;
  let expandedIds = new Set();
  let pendingSectionId = null;
  let toastTimer;

  const navigation = byId("navigation");
  const searchInput = byId("globalSearch");
  const searchPanel = byId("searchPanel");
  const welcomePanel = byId("welcomePanel");
  const editorView = byId("editorView");
  const templateTitle = byId("templateTitle");
  const blockList = byId("blockList");

  function getSection(id = activeSectionId) {
    return state.sections.find((section) => section.id === id);
  }

  function getTemplate(sectionId = activeSectionId, templateId = activeTemplateId) {
    return getSection(sectionId)?.templates.find((template) => template.id === templateId);
  }

  function allEntries() {
    return state.sections.flatMap((section) => section.templates.map((template) => ({ section, template })));
  }

  function persist(message = "Alterações salvas neste navegador.") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      byId("savedStatus").textContent = "● SALVO NESTE NAVEGADOR";
      showToast(message);
    } catch (_) {
      showToast("O navegador bloqueou o armazenamento local.");
    }
  }

  function showToast(message) {
    const toast = byId("toast");
    toast.textContent = message;
    toast.classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("visible"), 2200);
  }

  function setDirty() {
    byId("savedStatus").textContent = "● ALTERAÇÕES NÃO SALVAS";
  }

  function sectionDescription(sectionId, blockCount) {
    if (["tc", "rnm", "usg"].includes(sectionId)) return "Solicitação simples e relatório médico prontos para editar e copiar.";
    if (sectionId === "prescricoes") return "Edite, salve e copie cada prescrição separadamente.";
    if (sectionId === "relatorios") return "Relatório médico estruturado, editável e pronto para copiar.";
    if (sectionId === "descricoes") return "Diagnóstico, códigos, OPME e descrição cirúrgica em um texto completo.";
    if (sectionId === "encaminhamentos") return "Checklist clínico objetivo, pronto para ajustar ao caso.";
    return blockCount > 1 ? "Consulta inicial e reavaliação prontas para copiar." : "Evolução completa pronta para copiar.";
  }

  function documentLabel(sectionId) {
    if (["tc", "rnm", "usg"].includes(sectionId)) return "SOLICITAÇÃO DE EXAME";
    if (sectionId === "prescricoes") return "MEDICAÇÕES E PRESCRIÇÕES";
    if (["fisioterapia", "acupuntura"].includes(sectionId)) return getSection(sectionId)?.label.toUpperCase();
    if (["encaminhamentos", "relatorios", "descricoes"].includes(sectionId)) return getSection(sectionId)?.label.toUpperCase();
    return "PRONTUÁRIO MÉDICO";
  }

  function renderNavigation() {
    navigation.replaceChildren();
    groups.forEach((group) => {
      const section = document.createElement("section");
      section.className = "nav-group";
      const heading = document.createElement("div");
      heading.className = "group-title";
      const label = document.createElement("p");
      label.textContent = group.label;
      heading.append(label);
      section.append(heading);

      group.ids.forEach((sectionId) => {
        const module = getSection(sectionId);
        if (!module) return;
        const tree = document.createElement("div");
        tree.className = "module-tree";
        const row = document.createElement("div");
        row.className = `root-row${activeSectionId === sectionId ? " active-root" : ""}`;
        const rootButton = document.createElement("button");
        rootButton.className = "root-label-button";
        const text = document.createElement("span");
        text.textContent = module.label.toUpperCase();
        const arrow = document.createElement("b");
        arrow.textContent = expandedIds.has(sectionId) ? "⌄" : "›";
        rootButton.append(text, arrow);
        rootButton.addEventListener("click", () => {
          if (expandedIds.has(sectionId)) expandedIds.delete(sectionId);
          else expandedIds.add(sectionId);
          renderNavigation();
        });
        row.append(rootButton);
        tree.append(row);

        if (expandedIds.has(sectionId)) {
          const subtabs = document.createElement("div");
          subtabs.className = "subtabs";
          orderedTemplates(module).forEach((template) => {
            const button = document.createElement("button");
            button.textContent = template.title;
            button.className = `${template.id === activeTemplateId ? "active " : ""}${state.favorites.includes(template.id) ? "favorite" : ""}`.trim();
            button.addEventListener("click", () => openTemplate(sectionId, template.id));
            subtabs.append(button);
          });
          const newButton = document.createElement("button");
          newButton.className = "new-subtab";
          newButton.textContent = "＋ Nova subaba";
          newButton.addEventListener("click", () => openNewTemplateModal(sectionId));
          subtabs.append(newButton);
          tree.append(subtabs);
        }
        section.append(tree);
      });
      navigation.append(section);
    });
  }

  function orderedTemplates(section) {
    return [...section.templates].sort((a, b) => {
      const favoriteDifference = Number(state.favorites.includes(b.id)) - Number(state.favorites.includes(a.id));
      if (favoriteDifference) return favoriteDifference;
      const usageDifference = (state.usage[b.id] || 0) - (state.usage[a.id] || 0);
      return usageDifference || a.title.localeCompare(b.title, "pt-BR");
    });
  }

  function openTemplate(sectionId, templateId) {
    activeSectionId = sectionId;
    activeTemplateId = templateId;
    expandedIds.add(sectionId);
    state.usage[templateId] = (state.usage[templateId] || 0) + 1;
    state.recent = [templateId, ...state.recent.filter((id) => id !== templateId)].slice(0, 10);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) {}
    searchPanel.hidden = true;
    searchInput.value = "";
    closeMobileMenu();
    renderNavigation();
    renderEditor();
  }

  function renderEditor() {
    const section = getSection();
    const template = getTemplate();
    welcomePanel.hidden = Boolean(template);
    editorView.hidden = !template;
    if (!section || !template) return;

    byId("sectionLabel").textContent = section.label.toUpperCase();
    templateTitle.value = template.title;
    byId("templateDescription").textContent = sectionDescription(section.id, template.blocks.length);
    byId("documentLabel").textContent = documentLabel(section.id);
    byId("favoriteButton").textContent = state.favorites.includes(template.id) ? "★" : "☆";
    byId("copyAllButton").hidden = template.blocks.length < 2;
    blockList.className = `document-body${template.blocks.length === 1 ? " single" : ""}`;
    blockList.replaceChildren();

    template.blocks.forEach((block, index) => {
      const card = document.createElement("section");
      card.className = `text-section${index === 1 ? " reassessment" : ""}`;
      const heading = document.createElement("div");
      heading.className = "section-heading";
      const headingText = document.createElement("div");
      const boxLabel = document.createElement("span");
      boxLabel.textContent = `CAIXA ${index + 1}`;
      const titleInput = document.createElement("input");
      titleInput.className = "block-title-input";
      titleInput.value = block.title;
      titleInput.maxLength = 100;
      titleInput.setAttribute("aria-label", `Nome da caixa ${index + 1}`);
      titleInput.addEventListener("input", () => { block.title = titleInput.value; setDirty(); });
      headingText.append(boxLabel, titleInput);
      const actions = document.createElement("div");
      actions.className = "block-actions";
      const copyButton = document.createElement("button");
      copyButton.textContent = "COPIAR TEXTO";
      copyButton.addEventListener("click", async () => {
        await copyText(block.content);
        copyButton.textContent = "✓ COPIADO";
        copyButton.classList.add("copied");
        setTimeout(() => { copyButton.textContent = "COPIAR TEXTO"; copyButton.classList.remove("copied"); }, 1600);
      });
      const deleteButton = document.createElement("button");
      deleteButton.className = "delete-block-button";
      deleteButton.textContent = "EXCLUIR";
      deleteButton.disabled = template.blocks.length <= 1;
      deleteButton.addEventListener("click", () => {
        if (template.blocks.length <= 1) return;
        if (window.confirm("Excluir somente esta caixa de texto?")) {
          template.blocks.splice(index, 1);
          setDirty();
          renderEditor();
        }
      });
      actions.append(copyButton, deleteButton);
      heading.append(headingText, actions);
      const textarea = document.createElement("textarea");
      textarea.value = block.content;
      textarea.placeholder = "DIGITE OU COLE AQUI O TEXTO...";
      textarea.spellcheck = false;
      textarea.setAttribute("aria-label", `Conteúdo de ${block.title}`);
      textarea.addEventListener("input", () => { block.content = textarea.value; setDirty(); });
      card.append(heading, textarea);
      blockList.append(card);
    });
  }

  function searchEntries(term) {
    const normalized = normalize(term.trim());
    if (!normalized) return [];
    return allEntries().filter(({ section, template }) => normalize([section.label, template.title, ...template.blocks.flatMap((block) => [block.title, block.content])].join(" ")).includes(normalized));
  }

  function renderSearchPanel() {
    const term = searchInput.value.trim();
    let entries;
    let headingText;
    if (term) {
      entries = searchEntries(term);
      headingText = `${entries.length} ${entries.length === 1 ? "resultado" : "resultados"}`;
    } else {
      const promotedIds = [...state.favorites, ...state.recent, ...Object.keys(state.usage).sort((a, b) => (state.usage[b] || 0) - (state.usage[a] || 0))];
      const seen = new Set();
      entries = promotedIds.map((id) => allEntries().find(({ template }) => template.id === id)).filter((entry) => entry && !seen.has(entry.template.id) && seen.add(entry.template.id)).slice(0, 8);
      headingText = entries.length ? "FAVORITOS, RECENTES E MAIS UTILIZADOS" : "COMECE A PESQUISAR";
    }

    searchPanel.replaceChildren();
    const count = document.createElement("div");
    count.className = "search-panel-count";
    count.textContent = headingText;
    searchPanel.append(count);
    if (!entries.length) {
      const empty = document.createElement("div");
      empty.className = "search-panel-empty";
      empty.textContent = term ? "Nenhum resultado. Tente outro diagnóstico, CID ou região." : "Digite um diagnóstico, CID, exame ou região.";
      searchPanel.append(empty);
      return;
    }

    const grouped = new Map();
    entries.slice(0, 60).forEach((entry) => {
      const list = grouped.get(entry.section.label) || [];
      list.push(entry);
      grouped.set(entry.section.label, list);
    });
    grouped.forEach((items, sectionLabel) => {
      const group = document.createElement("section");
      group.className = "search-panel-group";
      const title = document.createElement("h2");
      title.textContent = sectionLabel.toUpperCase();
      group.append(title);
      items.forEach(({ section, template }) => {
        const button = document.createElement("button");
        button.className = "search-panel-item";
        const kind = document.createElement("span");
        kind.className = "search-panel-kind";
        kind.textContent = section.icon;
        const text = document.createElement("span");
        text.className = "search-panel-text";
        const strong = document.createElement("strong");
        strong.textContent = template.title;
        const small = document.createElement("small");
        small.textContent = section.label;
        text.append(strong, small);
        const star = document.createElement("span");
        star.className = "search-panel-star";
        star.textContent = state.favorites.includes(template.id) ? "★" : "";
        button.append(kind, text, star);
        button.addEventListener("click", () => openTemplate(section.id, template.id));
        group.append(button);
      });
      searchPanel.append(group);
    });
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      showToast("Texto copiado.");
    } catch (_) {
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.append(area);
      area.select();
      document.execCommand("copy");
      area.remove();
      showToast("Texto copiado.");
    }
  }

  function originalTemplate(id) {
    for (const section of seed.sections) {
      const template = section.templates.find((item) => item.id === id);
      if (template) return clone(template);
    }
    return null;
  }

  function openNewTemplateModal(sectionId) {
    pendingSectionId = sectionId;
    byId("newTemplateHeading").textContent = `Nova subaba de ${getSection(sectionId)?.label || "modelos"}`;
    byId("newTemplateDescription").textContent = `Ela será criada dentro de ${getSection(sectionId)?.label || "este módulo"}.`;
    byId("newTemplateName").value = "";
    byId("newTemplateModal").hidden = false;
    setTimeout(() => byId("newTemplateName").focus(), 0);
  }

  function closeNewTemplateModal() {
    byId("newTemplateModal").hidden = true;
    pendingSectionId = null;
  }

  function openMobileMenu() {
    byId("sidebar").classList.add("open");
    byId("backdrop").classList.add("visible");
  }

  function closeMobileMenu() {
    byId("sidebar").classList.remove("open");
    byId("backdrop").classList.remove("visible");
  }

  function setupWelcome() {
    const hour = new Date().getHours();
    const salutation = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
    byId("welcomeTitle").textContent = `${salutation}, Dr. Robson.`;
    byId("welcomeMessage").textContent = workGreetings[Math.floor(Math.random() * workGreetings.length)];
  }

  searchInput.addEventListener("focus", () => { renderSearchPanel(); searchPanel.hidden = false; });
  searchInput.addEventListener("input", () => { renderSearchPanel(); searchPanel.hidden = false; });
  searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Escape") { searchPanel.hidden = true; searchInput.blur(); }
    if (event.key === "Enter") searchPanel.querySelector(".search-panel-item")?.click();
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".sidebar-search-area")) searchPanel.hidden = true;
  });
  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      searchInput.focus();
    }
  });
  templateTitle.addEventListener("input", () => { const template = getTemplate(); if (template) { template.title = templateTitle.value; setDirty(); } });
  byId("saveButton").addEventListener("click", () => { persist(); renderNavigation(); });
  byId("copyAllButton").addEventListener("click", () => { const template = getTemplate(); if (template) copyText(template.blocks.map((block) => block.content.trim()).filter(Boolean).join("\n\n")); });
  byId("favoriteButton").addEventListener("click", () => {
    const template = getTemplate();
    if (!template) return;
    const index = state.favorites.indexOf(template.id);
    if (index >= 0) state.favorites.splice(index, 1);
    else state.favorites.unshift(template.id);
    persist(index >= 0 ? "Removido dos favoritos." : "Adicionado aos favoritos.");
    renderNavigation();
    renderEditor();
  });
  byId("addBlockButton").addEventListener("click", () => {
    const template = getTemplate();
    if (!template) return;
    template.blocks.push({ title: "NOVA CAIXA", content: "" });
    setDirty();
    renderEditor();
    blockList.lastElementChild?.scrollIntoView({ behavior: "smooth" });
  });
  byId("resetButton").addEventListener("click", () => {
    const section = getSection();
    const template = getTemplate();
    if (!section || !template) return;
    const original = originalTemplate(template.id);
    if (!original) return showToast("Modelos criados por você não possuem versão original.");
    if (!window.confirm("Restaurar este modelo para o conteúdo original?")) return;
    const index = section.templates.findIndex((item) => item.id === template.id);
    section.templates[index] = original;
    persist("Modelo restaurado.");
    renderNavigation();
    renderEditor();
  });
  byId("deleteTemplateButton").addEventListener("click", () => {
    const section = getSection();
    const template = getTemplate();
    if (!section || !template || !window.confirm(`Excluir a subaba “${template.title}”?`)) return;
    section.templates = section.templates.filter((item) => item.id !== template.id);
    state.favorites = state.favorites.filter((id) => id !== template.id);
    state.recent = state.recent.filter((id) => id !== template.id);
    activeTemplateId = null;
    persist("Subaba excluída.");
    renderNavigation();
    renderEditor();
  });
  byId("confirmNewTemplate").addEventListener("click", () => {
    const name = byId("newTemplateName").value.trim();
    const section = getSection(pendingSectionId);
    if (!name || !section) return;
    const template = { id: uid(section.id), title: name.toUpperCase(), blocks: [{ title: "CAIXA 1", content: "" }] };
    section.templates.push(template);
    const sectionId = section.id;
    closeNewTemplateModal();
    openTemplate(sectionId, template.id);
    setDirty();
  });
  byId("newTemplateName").addEventListener("keydown", (event) => { if (event.key === "Enter") byId("confirmNewTemplate").click(); if (event.key === "Escape") closeNewTemplateModal(); });
  document.querySelectorAll("[data-close-modal]").forEach((button) => button.addEventListener("click", closeNewTemplateModal));
  byId("newTemplateModal").addEventListener("click", (event) => { if (event.target === byId("newTemplateModal")) closeNewTemplateModal(); });
  byId("menuButton").addEventListener("click", openMobileMenu);
  byId("closeNav").addEventListener("click", closeMobileMenu);
  byId("backdrop").addEventListener("click", closeMobileMenu);

  setupWelcome();
  renderNavigation();
  renderEditor();
})();
