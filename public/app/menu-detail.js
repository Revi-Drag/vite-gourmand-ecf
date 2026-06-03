const API_BASE = ""; // même domaine

const els = {
    status: document.getElementById("status"),
    content: document.getElementById("content"),
};

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

function getIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    return id && /^\d+$/.test(id) ? id : null;
}

function groupDishes(dishes) {
    const groups = { STARTER: [], MAIN: [], DESSERT: [] };
    for (const d of (dishes || [])) {
        if (groups[d.type]) groups[d.type].push(d);
    }
    return groups;
}

function renderDishList(items) {
    if (!items.length) return `<p class="muted">Non précisé.</p>`;
    return `
    <ul class="menu-list">
      ${items.map(d => `
        <li>
          <strong>${escapeHtml(d.name)}</strong>
          ${d.description ? `<span class="muted small"> — ${escapeHtml(d.description)}</span>` : ""}
        </li>
      `).join("")}
    </ul>
  `;
}

function renderMenu(m) {
    const img = (m.images && m.images.length > 0) ? m.images[0] : null;
    const allergens = (m.allergens || []).join(", ");
    const groups = groupDishes(m.dishes);

    els.content.innerHTML = `
    ${img ? `
      <img class="menu-img" src="${escapeHtml(img)}" alt="Illustration du menu ${escapeHtml(m.title)}">
    ` : ""}

    <h1 style="margin: 0 0 6px;">${escapeHtml(m.title)}</h1>

    <p class="menu-meta">
      Thème : ${escapeHtml(m.theme)}
      · Régime : ${escapeHtml(m.diet)}
      · Min : ${m.minPersons} pers
    </p>

    <div class="row" style="margin: 12px 0;">
      <strong style="font-size: 18px;">${fmtMoney(m.price)}</strong>
      <span class="badge">Stock : ${m.stock}</span>
    </div>

    <p>${escapeHtml(m.description || "")}</p>

    <hr class="sep"/>

    <h2>Entrée</h2>
    ${renderDishList(groups.STARTER)}

    <h2>Plat</h2>
    ${renderDishList(groups.MAIN)}

    <h2>Dessert</h2>
    ${renderDishList(groups.DESSERT)}

    <hr class="sep"/>

    <p class="muted">Allergènes : ${escapeHtml(allergens || "Non précisé")}</p>

    ${m.conditions ? `<p class="muted">Conditions : ${escapeHtml(m.conditions)}</p>` : ""}

    <div class="menu-footer" style="margin-top: 12px;">
      <a class="btn" href="./order.html?menuId=${m.id}">Commander ce menu</a>
      <span class="muted small">Page commande : bloc suivant</span>
    </div>
  `;
}

async function main() {
    const id = getIdFromUrl();
    if (!id) {
        els.status.textContent = "ID manquant.";
        els.content.innerHTML = `<p>Menu introuvable.</p>`;
        return;
    }

    els.status.textContent = "Chargement...";

    let res, data;
    try {
        res = await fetch(`${API_BASE}/api/menus/${id}`, { method: "GET" });
        data = await res.json();
    } catch {
        els.status.textContent = "Erreur réseau.";
        els.content.innerHTML = `<p>Impossible de charger le menu.</p>`;
        return;
    }

    if (!res.ok || !data?.success) {
        els.status.textContent = "Menu introuvable.";
        els.content.innerHTML = `<p>Menu introuvable.</p>`;
        return;
    }

    els.status.textContent = "";
    renderMenu(data.item);
}

main();
