(function () {
  "use strict";

  const STORAGE_KEY = "doctemplate-clinico:v1";
  const seed = window.DOCTEMPLATE_SEED;
  if (!seed || !Array.isArray(seed.sections)) {
    document.body.innerHTML = "<p style='padding:2rem'>Não foi possível carregar os modelos clínicos.</p>";
    return;
  }

  const clone = (value) => JSON.parse(JSON.stringify(value));
  const normalize = (value) => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const uid = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved && saved.version === seed.version && Array.isArray(saved.sections)) return saved;
    } catch (_) {}
    return { version: seed.version, sections: clone(seed.sections), favorites: [] };
  }

  let state = loadState();
  state.favorites = Array.isArray(state.favorites) ? state.favorites : [];
  let activeSectionId = state.sections[0]?.id;
  let activeTemplateId = state.sections[0]?.templates[0]?.id ?? null;
  let query = "";
  let toastTimer;

  const el = (id) => document.getElementById(id);
  const sectionNav = el("sectionNav");
  const sectionTitle = el("sectionTitle");
  const templateList = el("templateList");
  const resultSummary = el("resultSummary");
  const globalSearch = el("globalSearch");
  const editor = el("editor");
  const emptyState = el("emptyState");
  const templateTitle = el("templateTitle");
  const blockList = el("blockList");
  const favoriteButton = el("favoriteButton");

  const activeSection = () => state.sections.find((section) => section.id === activeSectionId);
  const activeTemplate = () => activeSection()?.templates.find((template) => template.id === activeTemplateId);

  function persist(message = "Alterações salvas neste navegador.") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      el("storageStatus").textContent = "Salvo neste navegador";
      showToast(message);
    } catch (_) {
      showToast("O navegador bloqueou o armazenamento local.");
    }
  }

  function showToast(message) {
    const toast = el("toast");
    toast.textContent = message;
    toast.classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("visible"), 2200);
  }

  function matches(template, section) {
    if (!query) return true;
    return normalize([section.label, template.title, ...template.blocks.flatMap((block) => [block.title, block.content])].join(" ")).includes(normalize(query));
  }

  function searchResults() {
    if (!query) return (activeSection()?.templates ?? []).map((template) => ({ section: activeSection(), template }));
    return state.sections.flatMap((section) => section.templates.filter((template) => matches(template, section)).map((template) => ({ section, template })));
  }

  function renderNav() {
    sectionNav.replaceChildren();
    state.sections.forEach((section) => {
      const button = document.createElement("button");
      button.className = `nav-button${section.id === activeSectionId && !query ? " active" : ""}`;
      button.innerHTML = `<span class="nav-icon">${section.icon}</span><span>${section.label}</span><span class="nav-count">${section.templates.length}</span>`;
      button.addEventListener("click", () => {
        query = "";
        globalSearch.value = "";
        activeSectionId = section.id;
        activeTemplateId = section.templates[0]?.id ?? null;
        closeMenu();
        render();
      });
      sectionNav.append(button);
    });
  }

  function renderTemplates() {
    const results = searchResults();
    sectionTitle.textContent = query ? "Resultados da busca" : activeSection()?.label ?? "Modelos";
    resultSummary.textContent = query ? `${results.length} resultado${results.length === 1 ? "" : "s"} em todos os módulos` : `${results.length} modelo${results.length === 1 ? "" : "s"}`;
    templateList.replaceChildren();
    if (!results.length) {
      const empty = document.createElement("div");
      empty.className = "no-results";
      empty.textContent = "Nenhum modelo encontrado. Você pode criar um novo modelo.";
      templateList.append(empty);
      return;
    }
    results.forEach(({ section, template }) => {
      const button = document.createElement("button");
      button.className = `template-item${template.id === activeTemplateId ? " active" : ""}`;
      const favorite = state.favorites.includes(template.id) ? '<span class="favorite-dot">★</span>' : "";
      button.innerHTML = `<span>${query ? `${section.label} · ` : ""}${template.title}</span>${favorite}`;
      button.addEventListener("click", () => {
        activeSectionId = section.id;
        activeTemplateId = template.id;
        render();
        if (window.innerWidth < 981) el("editorPane").scrollIntoView({ behavior: "smooth" });
      });
      templateList.append(button);
    });
  }

  function renderEditor() {
    const template = activeTemplate();
    editor.hidden = !template;
    emptyState.hidden = Boolean(template);
    if (!template) return;
    templateTitle.value = template.title;
    favoriteButton.textContent = state.favorites.includes(template.id) ? "★" : "☆";
    favoriteButton.title = state.favorites.includes(template.id) ? "Remover dos favoritos" : "Adicionar aos favoritos";
    blockList.replaceChildren();
    template.blocks.forEach((block, index) => {
      const card = document.createElement("section");
      card.className = "block-card";
      const toolbar = document.createElement("div");
      toolbar.className = "block-toolbar";
      const title = document.createElement("input");
      title.className = "block-title";
      title.value = block.title;
      title.setAttribute("aria-label", `Título do bloco ${index + 1}`);
      title.addEventListener("input", () => { block.title = title.value; });
      const copyButton = document.createElement("button");
      copyButton.className = "mini-button";
      copyButton.textContent = "Copiar";
      copyButton.addEventListener("click", () => copyText(block.content));
      const removeButton = document.createElement("button");
      removeButton.className = "mini-button remove";
      removeButton.textContent = "Excluir";
      removeButton.addEventListener("click", () => {
        if (template.blocks.length === 1) return showToast("O modelo precisa ter pelo menos um bloco.");
        if (window.confirm("Excluir este bloco?")) {
          template.blocks.splice(index, 1);
          renderEditor();
        }
      });
      const content = document.createElement("textarea");
      content.className = "block-content";
      content.value = block.content;
      content.setAttribute("aria-label", `Conteúdo de ${block.title}`);
      content.addEventListener("input", () => { block.content = content.value; });
      toolbar.append(title, copyButton, removeButton);
      card.append(toolbar, content);
      blockList.append(card);
    });
  }

  function render() {
    renderNav();
    renderTemplates();
    renderEditor();
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

  function openMenu() {
    el("sidebar").classList.add("open");
    el("backdrop").classList.add("visible");
  }
  function closeMenu() {
    el("sidebar").classList.remove("open");
    el("backdrop").classList.remove("visible");
  }

  globalSearch.addEventListener("input", () => { query = globalSearch.value.trim(); render(); });
  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      globalSearch.focus();
    }
  });
  templateTitle.addEventListener("input", () => {
    const template = activeTemplate();
    if (template) template.title = templateTitle.value;
  });
  el("saveButton").addEventListener("click", () => { persist(); render(); });
  el("copyAllButton").addEventListener("click", () => {
    const template = activeTemplate();
    if (template) copyText(template.blocks.map((block) => block.content).join("\n\n"));
  });
  favoriteButton.addEventListener("click", () => {
    const template = activeTemplate();
    if (!template) return;
    const index = state.favorites.indexOf(template.id);
    if (index >= 0) state.favorites.splice(index, 1);
    else state.favorites.push(template.id);
    persist(index >= 0 ? "Removido dos favoritos." : "Adicionado aos favoritos.");
    render();
  });
  el("addTemplateButton").addEventListener("click", () => {
    const section = activeSection();
    if (!section) return;
    const template = { id: uid(section.id), title: "Novo modelo", blocks: [{ title: "TEXTO", content: "" }] };
    section.templates.unshift(template);
    activeTemplateId = template.id;
    query = "";
    globalSearch.value = "";
    render();
    templateTitle.focus();
    templateTitle.select();
  });
  el("addBlockButton").addEventListener("click", () => {
    const template = activeTemplate();
    if (!template) return;
    template.blocks.push({ title: "NOVO BLOCO", content: "" });
    renderEditor();
    blockList.lastElementChild?.scrollIntoView({ behavior: "smooth" });
  });
  el("deleteTemplateButton").addEventListener("click", () => {
    const section = activeSection();
    const template = activeTemplate();
    if (!section || !template || !window.confirm(`Excluir o modelo “${template.title}”?`)) return;
    section.templates = section.templates.filter((item) => item.id !== template.id);
    state.favorites = state.favorites.filter((id) => id !== template.id);
    activeTemplateId = section.templates[0]?.id ?? null;
    persist("Modelo excluído.");
    render();
  });
  el("resetButton").addEventListener("click", () => {
    const section = activeSection();
    const template = activeTemplate();
    if (!section || !template) return;
    const original = originalTemplate(template.id);
    if (!original) return showToast("Modelos criados por você não têm versão original.");
    if (!window.confirm("Restaurar este modelo para o conteúdo original?")) return;
    const index = section.templates.findIndex((item) => item.id === template.id);
    section.templates[index] = original;
    persist("Modelo restaurado.");
    render();
  });
  el("menuButton").addEventListener("click", openMenu);
  el("backdrop").addEventListener("click", closeMenu);

  render();
})();
