const API_BASE = ""; // même domaine

const els = {
    grid: document.getElementById("menusGrid"),
    status: document.getElementById("status"),
    theme: document.getElementById("theme"),
    regime: document.getElementById("regime"),
    maxPrice: document.getElementById("maxPrice"),
    minPersons: document.getElementById("minPersons"),
    resetBtn: document.getElementById("resetBtn"),
    clearBtn: document.getElementById("clearFiltersBtn"),
};

let allMenus = [];

function escapeHtml(str) {
    return String(str)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function renderMenus(menus) {
    if (!menus.length) {
        els.grid.innerHTML = `<div class="card"><p>Aucun menu ne correspond aux filtres.</p></div>`;
        return;
    }

    els.grid.innerHTML = menus
        .map((m) => {
            return `
        <article class="card">
          <h3>${escapeHtml(m.title)}</h3>
          <p>${escapeHtml(m.description)}</p>

          <div class="badges">
            <span class="badge">${escapeHtml(m.theme)}</span>
            <span class="badge">${escapeHtml(m.regime)}</span>
          </div>

          <div class="row">
            <span><strong>${m.minPersons}</strong> pers. min</span>
            <span><strong>${Number(m.basePrice).toFixed(2)} €</strong></span>
          </div>

          <div class="row">
            <span>Stock: ${m.stock}</span>
            <a class="btn" href="./menu.html?id=${m.id}">Voir détail</a>
          </div>
        </article>
      `;
        })
        .join("");
}

function applyFilters() {
    const theme = els.theme.value.trim();
    const regime = els.regime.value.trim();
    const maxPrice = els.maxPrice.value ? Number(els.maxPrice.value) : null;
    const minPersons = els.minPersons.value ? Number(els.minPersons.value) : null;
    const anyActive = theme || regime || maxPrice !== null || minPersons !== null;

    if (els.clearBtn) {
        els.clearBtn.style.display = anyActive ? "inline-flex" : "none";
    }

    let filtered = [...allMenus];

    if (theme) filtered = filtered.filter((m) => m.theme === theme);
    if (regime) filtered = filtered.filter((m) => m.regime === regime);
    if (maxPrice !== null) filtered = filtered.filter((m) => Number(m.basePrice) <= maxPrice);
    if (minPersons !== null) filtered = filtered.filter((m) => Number(m.minPersons) >= minPersons);

    els.status.textContent = `${filtered.length} menu(s) affiché(s)`;
    renderMenus(filtered);
}

async function loadMenus() {
    els.status.textContent = "Chargement des menus…";
    const res = await fetch(`${API_BASE}/api/menus`, { headers: { "Accept": "application/json" } });

    if (!res.ok) {
        els.status.textContent = `Erreur chargement menus (HTTP ${res.status})`;
        els.grid.innerHTML = "";
        return;
    }

    allMenus = await res.json();
    els.status.textContent = `${allMenus.length} menu(s) disponible(s)`;
    applyFilters();

}

function resetFilters() {
    els.theme.value = "";
    els.regime.value = "";
    els.maxPrice.value = "";
    els.minPersons.value = "";
    applyFilters();
}

["change", "input"].forEach((evt) => {
    els.theme.addEventListener(evt, applyFilters);
    els.regime.addEventListener(evt, applyFilters);
    els.maxPrice.addEventListener(evt, applyFilters);
    els.minPersons.addEventListener(evt, applyFilters);
});
els.resetBtn.addEventListener("click", resetFilters);
if (els.clearBtn) {
    els.clearBtn.addEventListener("click", resetFilters);
}

loadMenus().catch((e) => {
    console.error(e);
    els.status.textContent = "Erreur inattendue au chargement.";
});
