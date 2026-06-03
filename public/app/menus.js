const API_BASE = ""; // même domaine

const els = {
    grid: document.getElementById("menusGrid"),
    status: document.getElementById("status"),

    fTheme: document.getElementById("fTheme"),
    fDiet: document.getElementById("fDiet"),
    fMinPersons: document.getElementById("fMinPersons"),
    fPriceMin: document.getElementById("fPriceMin"),
    fPriceMax: document.getElementById("fPriceMax"),

    btnApply: document.getElementById("btnApply"),
    btnReset: document.getElementById("btnReset"),
};

/* -----------------------------
   Utils
----------------------------- */

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

function buildQuery() {
    const q = new URLSearchParams();

    if (els.fTheme.value) q.set("theme", els.fTheme.value);
    if (els.fDiet.value) q.set("diet", els.fDiet.value);

    if (els.fMinPersons.value) q.set("minPersons", els.fMinPersons.value);
    if (els.fPriceMin.value) q.set("priceMin", els.fPriceMin.value);
    if (els.fPriceMax.value) q.set("priceMax", els.fPriceMax.value);

    return q.toString();
}

/* -----------------------------
   Render menus
----------------------------- */

function renderMenus(items) {
    if (!items.length) {
        els.grid.innerHTML = `
      <div class="card">
        <p>Aucun menu ne correspond aux filtres.</p>
      </div>
    `;
        return;
    }

    els.grid.innerHTML = items.map(m => {

        const allergens = (m.allergens || []).join(", ");

        const dishes = (m.dishes || [])
            .sort((a, b) => a.type.localeCompare(b.type))
            .map(d => `
        <li>
          <span class="badge">${escapeHtml(d.type)}</span>
          ${escapeHtml(d.name)}
        </li>
      `)
            .join("");

        const img = (m.images && m.images.length > 0) ? m.images[0] : null;

        return `
      <article class="card menu-card">

        ${img ? `
          <img
            class="menu-img"
            src="${escapeHtml(img)}"
            alt="Illustration du menu ${escapeHtml(m.title)}"
          >
        ` : ""}

        <h3>${escapeHtml(m.title)}</h3>

        <p class="menu-meta">
          Thème : ${escapeHtml(m.theme)}
          · Régime : ${escapeHtml(m.diet)}
          · Min : ${m.minPersons} pers
        </p>

        <p>${escapeHtml(m.description || "")}</p>

        <h4>Plats inclus</h4>
        <ul class="menu-list">
          ${dishes}
        </ul>

        <p class="muted">
          Allergènes : ${escapeHtml(allergens || "Non précisé")}
        </p>

        <div class="menu-footer">
          <strong>${fmtMoney(m.price)}</strong>

          <a class="btn" href="./menu-detail.html?id=${m.id}">
            Voir détail
          </a>
        </div>

      </article>
    `;
    }).join("");
}

/* -----------------------------
   Hydrate themes dropdown
----------------------------- */

function hydrateThemes(items) {
    const themes = Array.from(
        new Set(items.map(m => m.theme).filter(Boolean))
    ).sort();

    const current = els.fTheme.value;

    els.fTheme.innerHTML =
        `<option value="">Tous</option>` +
        themes.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join("");

    if (themes.includes(current)) {
        els.fTheme.value = current;
    }
}

/* -----------------------------
   Fetch menus
----------------------------- */

async function fetchMenus() {
    els.status.textContent = "Chargement des menus...";

    const qs = buildQuery();
    const url = `${API_BASE}/api/menus${qs ? "?" + qs : ""}`;

    let res, data;

    try {
        res = await fetch(url, { method: "GET" });
        data = await res.json();
    } catch (err) {
        els.status.textContent = "Erreur réseau.";
        return;
    }

    if (!res.ok || !data.success) {
        els.status.textContent = "Erreur lors du chargement.";
        els.grid.innerHTML = `
      <div class="card">
        <p>Impossible de charger les menus.</p>
      </div>
    `;
        return;
    }

    els.status.textContent = `${data.items.length} menu(x) trouvé(s)`;

    renderMenus(data.items);
    hydrateThemes(data.items);
}

/* -----------------------------
   Reset filters
----------------------------- */

function resetFilters() {
    els.fTheme.value = "";
    els.fDiet.value = "";
    els.fMinPersons.value = "";
    els.fPriceMin.value = "";
    els.fPriceMax.value = "";
}

/* -----------------------------
   Events
----------------------------- */

els.btnApply.addEventListener("click", (e) => {
    e.preventDefault();
    fetchMenus();
});

els.btnReset.addEventListener("click", (e) => {
    e.preventDefault();
    resetFilters();
    fetchMenus();
});

/* -----------------------------
   Init
----------------------------- */

fetchMenus();
