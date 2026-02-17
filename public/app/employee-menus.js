const els = {
    status: document.getElementById("status"),
    grid: document.getElementById("menusGrid"),

    searchInput: document.getElementById("searchInput"),
    filterActive: document.getElementById("filterActive"),
    refreshBtn: document.getElementById("refreshBtn"),

    cTitle: document.getElementById("cTitle"),
    cTheme: document.getElementById("cTheme"),
    cRegime: document.getElementById("cRegime"),
    cMinPersons: document.getElementById("cMinPersons"),
    cBasePrice: document.getElementById("cBasePrice"),
    cStock: document.getElementById("cStock"),
    cDescription: document.getElementById("cDescription"),
    cConditions: document.getElementById("cConditions"),
    cIsActive: document.getElementById("cIsActive"),
    createBtn: document.getElementById("createBtn"),
};

let MENUS = [];

function escapeHtml(str) {
    return String(str ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function fmtMoney(n) {
    const v = Number(n || 0);
    return `${v.toFixed(2)} €`;
}

function setStatus(msg, type = "") {
    els.status.className = `msg ${type}`.trim();
    els.status.textContent = msg || "";
}

async function api(path, options = {}) {
    const res = await fetch(path, {
        credentials: "include",
        headers: { "Content-Type": "application/json", ...(options.headers || {}) },
        ...options,
    });
    const data = await res.json().catch(() => ({}));
    return { res, data };
}

function applyFilters(list) {
    const q = els.searchInput.value.trim().toLowerCase();
    const activeFilter = els.filterActive.value;

    return list.filter(m => {
        const hay = `${m.title} ${m.theme} ${m.regime}`.toLowerCase();
        if (q && !hay.includes(q)) return false;
        if (activeFilter === "active" && !m.isActive) return false;
        if (activeFilter === "inactive" && m.isActive) return false;
        return true;
    });
}

function render() {
    const list = applyFilters(MENUS);

    if (!list.length) {
        els.grid.innerHTML = `<div class="card"><p>Aucun menu.</p></div>`;
        return;
    }

    els.grid.innerHTML = list.map(m => {
        const badgeClass = m.isActive ? "badge" : "badge danger";
        const badgeText = m.isActive ? "ACTIF" : "INACTIF";

        return `
      <div class="card">
        <div class="row" style="align-items:flex-start;">
          <div>
            <h2 style="margin:0;">#${m.id} — ${escapeHtml(m.title)}</h2>
            <p class="muted small" style="margin:6px 0 0;">
              Thème: <b>${escapeHtml(m.theme)}</b> • Régime: <b>${escapeHtml(m.regime)}</b>
            </p>
          </div>
          <span class="${badgeClass}">${badgeText}</span>
        </div>

        <hr class="sep" />

        <div class="grid-2">
          <label>
            Min personnes
            <input type="number" min="1" value="${Number(m.minPersons || 1)}" data-field="minPersons" data-id="${m.id}">
          </label>

          <label>
            Prix de base (€ / pers)
            <input type="number" min="0" step="0.01" value="${Number(m.basePrice || 0).toFixed(2)}" data-field="basePrice" data-id="${m.id}">
          </label>

          <label>
            Stock
            <input type="number" min="0" value="${Number(m.stock || 0)}" data-field="stock" data-id="${m.id}">
          </label>

          <label>
            Actif ?
            <select data-field="isActive" data-id="${m.id}">
              <option value="true" ${m.isActive ? "selected" : ""}>Oui</option>
              <option value="false" ${!m.isActive ? "selected" : ""}>Non</option>
            </select>
          </label>

          <label style="grid-column:1/-1;">
            Titre
            <input type="text" value="${escapeHtml(m.title)}" data-field="title" data-id="${m.id}">
          </label>

          <label style="grid-column:1/-1;">
            Description
            <textarea rows="2" data-field="description" data-id="${m.id}">${escapeHtml(m.description ?? "")}</textarea>
          </label>

          <label style="grid-column:1/-1;">
            Conditions
            <textarea rows="2" data-field="conditionsText" data-id="${m.id}">${escapeHtml(m.conditionsText ?? "")}</textarea>
          </label>
        </div>

        <div class="row" style="justify-content:flex-end; margin-top:10px; flex-wrap:wrap;">
          <button class="btn secondary" data-action="save" data-id="${m.id}">Enregistrer</button>
          <button class="btn ${m.isActive ? "danger" : ""}" data-action="toggle" data-id="${m.id}">
            ${m.isActive ? "Désactiver" : "Activer"}
          </button>
        </div>
      </div>
    `;
    }).join("");
}

async function loadMenus() {
    setStatus("Chargement...");
    const { res, data } = await api("/api/employee/menus", { method: "GET" });

    if (res.status === 401) return setStatus("Non authentifié. Connecte-toi.", "error");
    if (res.status === 403) return setStatus("Accès refusé (ROLE_EMPLOYEE requis).", "error");
    if (!res.ok) return setStatus(data.error || "Erreur chargement menus.", "error");

    MENUS = Array.isArray(data) ? data : [];
    setStatus("");
    render();
}

function collectMenuEdits(id) {
    const fields = document.querySelectorAll(`[data-id="${id}"][data-field]`);
    const payload = {};

    fields.forEach(el => {
        const field = el.getAttribute("data-field");
        let value;

        if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") value = el.value;
        if (el.tagName === "SELECT") value = el.value;

        if (field === "minPersons" || field === "stock") value = Number(value || 0);
        if (field === "basePrice") value = String(Number(value || 0).toFixed(2));
        if (field === "isActive") value = (value === "true");

        payload[field] = value;
    });

    // ménage: titre obligatoire
    if (typeof payload.title === "string") payload.title = payload.title.trim();

    return payload;
}

async function saveMenu(id) {
    const payload = collectMenuEdits(id);
    if (!payload.title) return setStatus("Titre obligatoire.", "error");

    setStatus(`Enregistrement menu #${id}...`);
    const { res, data } = await api(`/api/employee/menus/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
    });

    if (!res.ok) return setStatus(data.error || "Erreur enregistrement.", "error");

    setStatus("Menu mis à jour ✅", "ok");
    await loadMenus();
}

async function toggleMenu(id) {
    setStatus(`Modification statut menu #${id}...`);
    const { res, data } = await api(`/api/employee/menus/${id}/toggle`, { method: "PATCH" });

    if (!res.ok) return setStatus(data.error || "Erreur toggle.", "error");

    setStatus("OK ✅", "ok");
    await loadMenus();
}

async function createMenu() {
    const payload = {
        title: els.cTitle.value.trim(),
        description: els.cDescription.value.trim(),
        theme: els.cTheme.value.trim() || "Classique",
        regime: els.cRegime.value.trim() || "Classique",
        minPersons: Number(els.cMinPersons.value || 1),
        basePrice: String(Number(els.cBasePrice.value || 0).toFixed(2)),
        conditionsText: els.cConditions.value.trim(),
        stock: Number(els.cStock.value || 0),
        isActive: !!els.cIsActive.checked,
    };

    if (!payload.title) return setStatus("Titre obligatoire.", "error");

    setStatus("Création...");
    const { res, data } = await api("/api/employee/menus", {
        method: "POST",
        body: JSON.stringify(payload),
    });

    if (!res.ok) return setStatus(data.error || "Erreur création menu.", "error");

    setStatus("Menu créé ✅", "ok");

    els.cTitle.value = "";
    els.cDescription.value = "";
    els.cConditions.value = "";
    els.cStock.value = "5";

    await loadMenus();
}

els.refreshBtn.addEventListener("click", loadMenus);
els.searchInput.addEventListener("input", render);
els.filterActive.addEventListener("change", render);
els.createBtn.addEventListener("click", createMenu);

document.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;

    const action = btn.getAttribute("data-action");
    const id = btn.getAttribute("data-id");

    if (action === "save") saveMenu(id);
    if (action === "toggle") toggleMenu(id);
});

loadMenus();
